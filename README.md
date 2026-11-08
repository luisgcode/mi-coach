# Mi Coach

Personal coach for weight loss, body recomposition and the gym. It is a static web app (GitHub Pages) backed by Supabase:
- **Postgres**: one `docs` table with Row Level Security.
- **Realtime**: keeps the phone and the PC in sync.
- **Storage**: private bucket `fotos`.
- **Edge Function `coach-ai`**: calls Claude server-side, so the API key never reaches the browser.

It works without AI too. Manual logging, plans, progress and reminders all run in the browser.

## Files

| Path | What it is |
|---|---|
| `index.html`, `styles.css` | The page (one screen, four tabs) |
| `config.js` | `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public values, protected by RLS) |
| `calc.js` | Pure logic: kcal balance, progression, planner, nudges, goals (tested in `tests/`) |
| `seed.js` | Non-personal defaults, written once on first login (rules, plan, equipment, exercises, recipes, goals) |
| `app.js` | UI + `Platform` adapters (`store`, `ai`, `files`); the only code that talks to Supabase |
| `manifest.webmanifest`, `icons/` | Home-screen install (regenerate with `npm run icons`) |
| `supabase/migrations/0001_init.sql` | Table, RLS, `merge_doc()`, realtime, bucket + policies |
| `supabase/functions/coach-ai/index.ts` | One Messages API call per request (`@anthropic-ai/sdk@1.6.0`, pinned); the browser runs the tool loop (max 8) |
| `tools/db.mjs` | Admin CLI with the service-role key (local only) |
| `tools/seed-private.json` | Profile, weight history and day-0 baseline. **Gitignored**: it's health data and the repo is public |

## Deploy

### 1. Supabase project
1. Create a project at https://supabase.com. Write down the project ref, the URL and the anon key (Project Settings → API).
2. In Authentication → Users → **Add user**, create Luis's email and password and tick "Auto confirm".
3. In Authentication → Sign In / Providers, **turn off "Allow new users to sign up"** (single user).
4. Fill in `config.js` with the URL and anon key.

### 2. Database and function (from this folder)
```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase functions deploy coach-ai
```

### 3. Claude API key (Luis sets this himself)
In the dashboard, open Edge Functions → Secrets → add `ANTHROPIC_API_KEY`. Optional extra secrets:
- `ALLOWED_USER_ID`: Luis's auth user id. Only that account may call the AI.
- `ALLOWED_ORIGIN`: e.g. `https://<github-user>.github.io` (CORS; the default is `*`).

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to functions automatically.

### 4. GitHub Pages
1. Create the public repo `mi-coach`, commit this folder and push to `main`.
2. In Settings → Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The app is served at `https://<github-user>.github.io/mi-coach/`.
4. On the iPhone, open it in Safari, then Share → **Add to Home Screen**.

### 5. Personal seed data (once, from the PC)
```bash
npm install
# C:/Users/luisg/.secrets/mi-coach.env  (never commit)
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service role key>
#   MI_COACH_OWNER=<Luis's auth user id>   (optional if there is one user)
node tools/db.mjs seed-private
```
The rest of the seed (rules, plan, equipment…) is written by the app on first login, and only for docs that don't exist yet.

## Admin CLI
```bash
node tools/db.mjs get config/rules
node tools/db.mjs list days
node tools/db.mjs set notes/n1 '{"text":"..."}'
node tools/db.mjs update config/rules '{"movementTarget":450}'
node tools/db.mjs delete nudges/n-abc
node tools/db.mjs export            # mi-coach-export-YYYY-MM-DD.json (gitignored)
```

## Chat transcript
- Each message is one doc, `chat/{YYYY-MM-DD}/m/{id}` (`role`, `text`, `at`, optional `imagePaths` in the `fotos` bucket, never base64). `chat/{YYYY-MM-DD}` marks the day.
- One doc per message means the phone and the PC never overwrite each other. Both subscribe to today's messages, so a message sent on one shows up on the other.
- The Chat tab shows today. "Ver días anteriores" opens past days (read-only).
- The model gets the context builder plus only the last ~10 turns of today (after the last "Nueva conversación"), never the whole history.

## AI routing (coach-ai)
- `quick` uses `claude-haiku-5-5` at effort `low`. It handles scale photos, simple food logs and free-text sets.
- `default` uses `claude-opus-5-5` at effort `medium`. It handles the chat, food photos and how-to cues.
- `complex` uses `claude-opus-5-5` at effort `high`. It handles "Analizar mi semana".
- The static system prompt carries an explicit cache breakpoint; top-level automatic caching covers the tool-loop tail. No `thinking` field (always on for these models) and no forced `tool_choice`.
- Opus requests opt into server-side refusal fallbacks (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). Haiku 5.5 has none.
- The function returns errors as `{error:{code}}`: `no_credit`, `rate_limited`, `overloaded`, `not_configured`, `session_expired`, `bad_request`. The UI shows a message and keeps working manually.

## Tests
```bash
npm test
```
