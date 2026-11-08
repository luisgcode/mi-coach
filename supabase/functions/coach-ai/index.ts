// coach-ai: one Messages API call per request. The browser runs the tool loop.
// Body: { messages, tools?, tier?: "quick"|"default"|"complex", system?, effort? }
// Returns: { content, stop_reason, stop_details, model, usage } or { error: { code, message } }.
// Pinned: 1.6.0 has beta.messages `fallbacks`, top-level `cache_control` and `output_config.effort`.
import Anthropic from "npm:@anthropic-ai/sdk@1.6.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

// quick -> Haiku 5.5 (scale photos, simple food logs, free-text sets). default/complex -> Opus 5.5.
const ROUTES: Record<string, { model: string; effort: string; maxTokens: number; fallbacks: boolean }> = {
  quick: { model: "claude-haiku-5-5", effort: "low", maxTokens: 8000, fallbacks: false }, // Haiku 5.5 has no server-side fallback
  default: { model: "claude-opus-5-5", effort: "medium", maxTokens: 16000, fallbacks: true },
  complex: { model: "claude-opus-5-5", effort: "high", maxTokens: 32000, fallbacks: true },
};
const EFFORTS = new Set(["low", "medium", "high"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "bad_request", "POST only");

  // 1) Only the logged-in user (the gateway also verifies the JWT when verify_jwt = true).
  const authHeader = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return fail(401, "session_expired", "Not signed in");
  const allowed = Deno.env.get("ALLOWED_USER_ID");
  if (allowed && user.id !== allowed) return fail(403, "not_granted", "This account is not allowed");

  // 2) Input.
  let body: any;
  try { body = await req.json(); } catch { return fail(400, "bad_request", "Invalid JSON body"); }
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 80) return fail(400, "bad_request", "messages must be a non-empty array (max 80)");
  if (messages[0]?.role !== "user") return fail(400, "bad_request", "first message must be from the user");
  const tools = Array.isArray(body.tools) && body.tools.length ? body.tools.slice(0, 64) : undefined;
  const route = ROUTES[body.tier] ?? ROUTES.default;
  const effort = route.model.startsWith("claude-opus") && EFFORTS.has(body.effort) ? body.effort : route.effort;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return fail(500, "not_configured", "ANTHROPIC_API_KEY secret is not set");
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 140_000 });

  // Thinking is always on for these models: omit `thinking`, control depth with output_config.effort.
  // No tool_choice (forced tool use is rejected on Opus 5.5): the default `auto` applies.
  // Caching: an explicit breakpoint on the static system prompt (tools + system are read back on every chat send),
  // plus top-level automatic caching for the growing tool-loop tail.
  const params: any = {
    model: route.model,
    max_tokens: route.maxTokens,
    messages,
    output_config: { effort },
    cache_control: { type: "ephemeral" },
  };
  if (typeof body.system === "string" && body.system.trim()) params.system = [{ type: "text", text: body.system, cache_control: { type: "ephemeral" } }];
  if (tools) params.tools = tools;

  try {
    const resp: any = route.fallbacks
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as any)
      : await client.messages.create(params);
    return json({ content: resp.content, stop_reason: resp.stop_reason, stop_details: resp.stop_details ?? null, model: resp.model, usage: resp.usage });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      const s = e.status ?? 0;
      if (s === 402) return fail(402, "no_credit", "Sin crédito en la cuenta de la API de Claude");
      if (s === 429) return fail(429, "rate_limited", "Límite de uso alcanzado; intenta en un rato");
      if (s === 529 || s === 503) return fail(503, "overloaded", "Claude está saturado; intenta en un rato");
      if (s === 401) return fail(500, "not_configured", "La API key de Claude no es válida");
      if (s === 403) return fail(403, "not_granted", "La API key no tiene permiso para este modelo");
      if (s === 413) return fail(413, "prompt_too_large", "La solicitud es demasiado grande");
      if (s === 400) return fail(400, "bad_request", e.message);
      return fail(502, "upstream_error", e.message);
    }
    return fail(502, "upstream_error", String((e as Error)?.message ?? e));
  }
});
