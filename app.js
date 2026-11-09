'use strict';
/* Mi Coach web app. Pure logic lives in calc.js; backend access only through Platform (store/ai/files). */

/* =====================================================================
   STICK-FIGURE ILLUSTRATIONS (hand-drawn data, inline SVG, theme colored)
   viewBox 0 0 120 80. body = polylines, props = equipment in muted ink.
   ===================================================================== */
const FIGS = {
  bridge: { head: [26, 37], body: [[33, 43, 62, 38, 82, 40, 84, 66], [40, 42, 52, 52]], props: ['M8 46h30v6H8z', 'M54 33h16'], arrow: [62, 30, 62, 18], cap: 'Hombros en el banco, empuja la cadera arriba' },
  squat: { head: [60, 13], body: [[60, 22, 53, 45, 72, 50, 66, 70], [60, 26, 82, 30]], props: [], arrow: null, cap: 'Cadera atrás y abajo, rodillas siguen la punta del pie' },
  jump: { head: [60, 13], body: [[60, 22, 53, 45, 72, 50, 66, 70], [60, 26, 46, 40]], props: [], arrow: [88, 60, 88, 26], cap: 'Baja rápido y explota hacia arriba' },
  leg_press: { head: [20, 39], body: [[27, 44, 47, 57, 63, 37, 80, 40], [30, 46, 42, 60]], props: ['M10 60l40 6', 'M84 26l6 28'], arrow: [68, 50, 88, 50], cap: 'Espalda pegada al asiento, empuja la plataforma' },
  lunge: { head: [60, 9], body: [[60, 18, 60, 42, 78, 52, 78, 70], [60, 42, 48, 63, 34, 67], [60, 22, 60, 40]], props: [], arrow: [96, 30, 96, 56], cap: 'Torso alto, baja la rodilla de atrás' },
  hinge: { head: [79, 24], body: [[71, 28, 46, 31, 48, 51, 48, 70], [70, 30, 70, 52]], props: ['M64 54h12'], arrow: [92, 50, 92, 26], cap: 'Cadera atrás, espalda neutra, peso pegado a las piernas' },
  kickback: { head: [30, 27], body: [[36, 31, 60, 36, 60, 54, 60, 70], [60, 36, 84, 28], [38, 33, 34, 50]], props: ['M100 20v50'], arrow: [86, 40, 98, 24], cap: 'Pierna atrás desde la cadera, sin arquear la espalda' },
  abduction: { head: [60, 10], body: [[60, 19, 60, 41, 56, 70], [60, 41, 80, 66], [60, 24, 46, 34]], props: ['M36 34h10'], arrow: [86, 56, 100, 52], cap: 'Lleva la pierna hacia afuera con el glúteo' },
  row: { head: [40, 21], body: [[42, 30, 40, 55, 62, 52, 78, 60], [42, 33, 30, 41, 50, 41]], props: ['M50 41h50', 'M100 30v30', 'M28 58h22'], arrow: [70, 34, 50, 34], cap: 'Pecho alto, codos atrás, junta omóplatos' },
  press: { head: [22, 45], body: [[31, 46, 64, 46, 80, 46, 84, 68], [36, 46, 36, 22]], props: ['M14 51h62v5H14z', 'M24 22h24'], arrow: [56, 36, 56, 16], cap: 'Pies firmes, baja controlado y empuja' },
  pulldown: { head: [60, 25], body: [[60, 33, 60, 56, 78, 56, 80, 72], [60, 36, 46, 26, 44, 12], [60, 36, 74, 26, 76, 12]], props: ['M30 12h60', 'M60 12V2', 'M50 60h22'], arrow: [100, 14, 100, 36], cap: 'Jala la barra al pecho con los codos' },
  plank: { head: [22, 51], body: [[30, 55, 66, 58, 98, 62], [30, 56, 30, 68, 42, 68]], props: ['M10 70h100'], arrow: null, cap: 'Línea recta de cabeza a talones, abdomen firme' },
  rotation: { head: [50, 11], body: [[50, 20, 50, 44, 42, 70], [50, 44, 60, 70], [50, 24, 82, 30]], props: ['M100 20v50', 'M82 30l18-4'], arrow: [30, 34, 70, 34], cap: 'Gira desde el torso, cadera estable' },
  treadmill: { head: [58, 9], body: [[56, 18, 52, 40, 64, 50, 60, 63], [52, 40, 44, 52, 38, 63], [56, 22, 66, 32], [56, 22, 46, 30]], props: ['M18 66h86v4H18z', 'M98 66L90 22h10'], arrow: null, cap: 'Postura alta, pasos cortos' },
  carry: { head: [60, 10], body: [[60, 19, 60, 42, 54, 70], [60, 42, 66, 70], [60, 23, 72, 44]], props: ['M68 46h8'], arrow: [90, 60, 106, 60], cap: 'Camina erguido, abdomen firme' }
};
const PATTERN_FIG = { leg_curl: 'hinge', curl: 'row', hip_thrust: 'bridge', squat: 'squat', leg_press: 'leg_press', jump: 'jump', lunge: 'lunge', hinge: 'hinge', glute_iso: 'kickback', abduction: 'abduction', row: 'row', press: 'press', pulldown: 'pulldown', core: 'plank', rotation: 'rotation', carry: 'carry', cardio: 'treadmill', other: 'squat' };
function figSVG(pattern, size = 'md') {
  const f = FIGS[PATTERN_FIG[pattern] || 'squat'];
  const pl = pts => { let s = ''; for (let i = 0; i < pts.length; i += 2) s += (i ? ' ' : '') + pts[i] + ',' + pts[i + 1]; return s; };
  const body = f.body.map(p => `<polyline points="${pl(p)}"/>`).join('');
  const props = f.props.map(d => `<path d="${d}"/>`).join('');
  const ar = f.arrow ? `<g class="fig-arrow"><line x1="${f.arrow[0]}" y1="${f.arrow[1]}" x2="${f.arrow[2]}" y2="${f.arrow[3]}"/><circle cx="${f.arrow[2]}" cy="${f.arrow[3]}" r="2.6"/></g>` : '';
  return `<svg class="fig fig-${size}" viewBox="0 0 120 80" role="img" aria-label="${esc(f.cap)}"><g class="fig-props">${props}</g><g class="fig-body">${body}<circle cx="${f.head[0]}" cy="${f.head[1]}" r="6"/></g>${ar}</svg>`;
}
function figCaption(pattern) { return (FIGS[PATTERN_FIG[pattern] || 'squat'] || {}).cap || ''; }


/* =====================================================================
   PLATFORM ADAPTERS (web): Supabase DB + Storage + Edge Function "coach-ai".
   The ONLY place that talks to the backend. Same interface as the artifact version:
   store: get/set/update/delete/list/query/subscribe
   ai:    ask(messages, opts) -> {text, truncated}; json(messages, opts) -> value; limits()
          opts = {system, images, tools:[{name, description, input_schema}], handlers, onText, signal, tier, effort}
   files: upload(blob, {type}) -> {id, url}; urlFor(id) -> url ('' until the signed URL resolves)
   viewer: canWrite(); auth: signIn(email, password), signOut()
   ===================================================================== */
const Platform = (() => {
  const conf = window.MI_COACH_CONFIG || {};
  const configured = !!(conf.SUPABASE_URL && conf.SUPABASE_ANON_KEY && !/YOUR[-_]/i.test(conf.SUPABASE_URL + conf.SUPABASE_ANON_KEY) && window.supabase);
  const sb = configured ? window.supabase.createClient(conf.SUPABASE_URL, conf.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mi-coach-auth' } }) : null;
  let uid = null;
  const parentColl = path => path.split('/').slice(0, -1).join('/');
  const idOf = path => path.split('/').pop();
  const err = (code, message) => ({ code, message: message || code });
  function dbErr(e) {
    if (!e) return err('unavailable');
    if (e.code === '42501' || /row-level security/i.test(e.message || '')) return err('invalid_argument', e.message);
    if (e.code === 'PGRST301' || e.status === 401) return err('revoked', e.message);
    return err('unavailable', e.message);
  }

  // ---------- store ----------
  function applyQuery(rows, o = {}) {
    let out = rows;
    for (const [f, op, v] of o.where || []) out = out.filter(r => { const x = r.data[f]; return op === '==' ? x === v : op === '!=' ? x !== v : op === '<' ? x < v : op === '<=' ? x <= v : op === '>' ? x > v : op === '>=' ? x >= v : op === 'in' ? v.includes(x) : op === 'not-in' ? !v.includes(x) : op === 'array-contains' ? Array.isArray(x) && x.includes(v) : true; });
    if (o.orderBy) { const k = o.orderBy, d = o.dir === 'desc' ? -1 : 1; out = out.slice().sort((a, b) => (a.data[k] ?? '￿') < (b.data[k] ?? '￿') ? -d : (a.data[k] ?? '￿') > (b.data[k] ?? '￿') ? d : 0); }
    else out = out.slice().sort((a, b) => a.id < b.id ? -1 : 1);
    if (o.limit) out = out.slice(0, o.limit);
    return out;
  }
  async function fetchColl(coll) {
    const { data, error } = await sb.from('docs').select('path,data').eq('coll', coll);
    if (error) throw dbErr(error);
    return (data || []).map(r => ({ id: idOf(r.path), data: r.data }));
  }
  const store = {
    available: () => !!(sb && uid),
    get: async path => { const { data, error } = await sb.from('docs').select('data').eq('path', path).maybeSingle(); if (error) throw dbErr(error); return data ? data.data : null; },
    set: async (path, data) => { const { error } = await sb.from('docs').upsert({ owner: uid, path, coll: parentColl(path), data, updated_at: new Date().toISOString() }, { onConflict: 'owner,path' }); if (error) throw dbErr(error); },
    // Shallow jsonb merge server-side; rejects if the doc does not exist (same contract as the artifact db).
    update: async (path, patch) => { const { data, error } = await sb.rpc('merge_doc', { p_path: path, p_patch: patch }); if (error) throw dbErr(error); if (!data) throw err('invalid_argument', 'document does not exist'); },
    delete: async path => { const { error } = await sb.from('docs').delete().eq('path', path); if (error) throw dbErr(error); },
    list: async (coll, o = {}) => applyQuery(await fetchColl(coll), o),
    query: async (coll, o = {}) => applyQuery(await fetchColl(coll), o),
    // Initial fetch + Supabase Realtime (postgres_changes on docs, filtered by owner). Any change refetches.
    subscribe: (target, o, next, error) => {
      const l = { target, o, next, error, timer: 0 };
      listeners.add(l); refetch(l); ensureChannel();
      return () => { listeners.delete(l); };
    }
  };
  const listeners = new Set();
  let channel = null;
  async function refetch(l) {
    try {
      if (l.o.kind === 'doc') { const d = await store.get(l.target); l.next({ exists: d != null, data: d, fresh: true }); }
      else l.next({ docs: applyQuery(await fetchColl(l.target), l.o), fresh: true });
    } catch (e) { if (e.code === 'revoked' && l.error) l.error(e); }
  }
  function touch(path) {
    for (const l of listeners) {
      const hit = l.o.kind === 'doc' ? l.target === path : parentColl(path) === l.target;
      if (hit) { clearTimeout(l.timer); l.timer = setTimeout(() => refetch(l), 120); }
    }
  }
  function ensureChannel() {
    if (channel || !sb || !uid) return;
    channel = sb.channel('docs-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'owner=eq.' + uid }, p => { const path = (p.new && p.new.path) || (p.old && p.old.path); if (path) touch(path); })
      .subscribe(status => { if (status === 'SUBSCRIBED') for (const l of listeners) refetch(l); });
  }
  // Phone wakes up / tab comes back: catch up on anything missed while asleep.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') for (const l of listeners) refetch(l); });

  // ---------- files (private bucket "fotos", signed URLs) ----------
  const signed = new Map(); // id -> {url, exp} | 'pending'
  const files = {
    available: () => !!(sb && uid),
    upload: async (blob, o = {}) => {
      const id = `${uid}/${crypto.randomUUID()}.jpg`;
      const { error } = await sb.storage.from('fotos').upload(id, blob, { contentType: o.type || 'image/jpeg', upsert: false });
      if (error) throw err(/quota|size/i.test(error.message || '') ? 'quota_exceeded' : 'unavailable', error.message);
      return { id, url: await signUrl(id) };
    },
    urlFor: id => {
      const s = signed.get(id);
      if (s && s !== 'pending' && s.exp > Date.now()) return s.url;
      if (s !== 'pending') { signed.set(id, 'pending'); signUrl(id).then(() => { if (typeof schedule === 'function') schedule(); }).catch(() => signed.delete(id)); }
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
  };
  async function signUrl(id) {
    const { data, error } = await sb.storage.from('fotos').createSignedUrl(id, 60 * 60 * 24);
    if (error) throw error;
    signed.set(id, { url: data.signedUrl, exp: Date.now() + 23 * 3600 * 1000 });
    return data.signedUrl;
  }

  // ---------- ai (Edge Function coach-ai; the tool loop runs here, max 8 calls) ----------
  async function blobToB64(b) { const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); }
  async function callFn(body, signal) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw err('session_expired');
    let res;
    try {
      res = await fetch(conf.SUPABASE_URL + '/functions/v1/coach-ai', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token, apikey: conf.SUPABASE_ANON_KEY }, body: JSON.stringify(body) });
    } catch (e) { throw err(e && e.name === 'AbortError' ? 'cancelled' : 'upstream_error', String(e && e.message)); }
    let j = null; try { j = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !j || j.error) throw err((j && j.error && j.error.code) || (res.status === 401 ? 'session_expired' : 'upstream_error'), j && j.error && j.error.message);
    return j;
  }
  async function ask(messages, o = {}) {
    const msgs = (typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages.map(m => ({ role: m.role, content: m.content }))).filter(m => m.content);
    if (o.images && o.images.length) {
      const last = msgs[msgs.length - 1];
      const blocks = [];
      for (const b of o.images) blocks.push({ type: 'image', source: { type: 'base64', media_type: b.type && /^image\/(jpeg|png|webp|gif)$/.test(b.type) ? b.type : 'image/jpeg', data: await blobToB64(b) } });
      last.content = [...blocks, { type: 'text', text: typeof last.content === 'string' ? last.content : '' }];
    }
    const tools = o.tools && o.tools.length ? o.tools : undefined;
    let text = '', truncated = false;
    for (let i = 0; i < 8; i++) {
      if (o.signal && o.signal.aborted) throw err('cancelled', text);
      const r = await callFn({ messages: msgs, tools, tier: o.tier || 'default', system: o.system, effort: o.effort }, o.signal).catch(e => { e.text = text || undefined; throw e; });
      const t = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      if (t) { text = text ? text + '\n\n' + t : t; if (o.onText) o.onText({ text, delta: t }); }
      if (r.stop_reason === 'refusal') throw { code: 'refused', message: (r.stop_details && r.stop_details.category) || 'refusal' };
      if (r.stop_reason === 'max_tokens') { truncated = true; break; }
      if (r.stop_reason === 'pause_turn') { msgs.push({ role: 'assistant', content: r.content }); continue; }
      if (r.stop_reason !== 'tool_use' || !tools) break;
      // Echo the assistant content unchanged (thinking blocks included), then the tool results.
      msgs.push({ role: 'assistant', content: r.content });
      const results = [];
      for (const b of r.content.filter(x => x.type === 'tool_use')) {
        try {
          const fn = o.handlers && o.handlers[b.name]; if (!fn) throw new Error('herramienta desconocida: ' + b.name);
          const out = await fn(b.input || {});
          results.push({ type: 'tool_result', tool_use_id: b.id, content: typeof out === 'string' ? out : JSON.stringify(out ?? { ok: true }).slice(0, 32000) });
        } catch (e) { results.push({ type: 'tool_result', tool_use_id: b.id, content: 'Error: ' + (e && e.message || e), is_error: true }); }
      }
      // Last round: the wrap-up instruction goes as a text block AFTER the tool results, in the same user turn.
      if (i === 7) results.push({ type: 'text', text: 'Termina ahora con una respuesta corta para Luis, sin más herramientas.' });
      msgs.push({ role: 'user', content: results });
      if (i === 7) { const f = await callFn({ messages: msgs, tools, tier: o.tier || 'default', system: o.system, effort: o.effort }, o.signal); const ft = (f.content || []).filter(b => b.type === 'text').map(b => b.text).join(''); if (ft) { text = text ? text + '\n\n' + ft : ft; if (o.onText) o.onText({ text, delta: ft }); } }
    }
    if (!text.trim()) throw err('empty_completion');
    return { text, truncated, modelTierApplied: o.tier || 'default' };
  }
  // Tolerant JSON read: whole reply, else a fenced block, else first {/[ to last }/].
  function parseJson(t) {
    const tries = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
    const a = Math.min(...['{', '['].map(c => t.indexOf(c)).filter(i => i >= 0)), b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    if (Number.isFinite(a) && b > a) tries.push(t.slice(a, b + 1));
    for (const x of tries) { if (!x) continue; try { return JSON.parse(x); } catch (e) { /* next */ } }
    throw { code: 'invalid_json', message: 'no JSON', text: t };
  }
  const ai = {
    available: () => !!(sb && uid),
    limits: async () => ({ maxPromptBytes: 4000000, images: { maxCount: 5, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] }, tools: { maxCount: 64 } }),
    ask,
    json: async (messages, o = {}) => { const r = await ask(messages, { ...o, tools: undefined, system: (o.system ? o.system + '\n' : '') + 'Tu respuesta será leída por una máquina: responde SOLO con el JSON pedido.' }); if (r.truncated) throw { code: 'invalid_json', text: r.text }; return parseJson(r.text); }
  };

  const viewer = { canWrite: async () => (uid ? true : false) };

  // ---------- auth + login screen ----------
  const auth = {
    configured,
    signIn: async (email, password) => { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; return data.session; },
    signOut: async () => { if (sb) await sb.auth.signOut(); location.reload(); }
  };
  function showLogin(onDone) {
    const box = document.getElementById('login'); box.hidden = false;
    const form = document.getElementById('loginForm'), msg = document.getElementById('loginMsg');
    form.onsubmit = async ev => {
      ev.preventDefault(); msg.textContent = 'Entrando…';
      try { const s = await auth.signIn(document.getElementById('loginEmail').value.trim(), document.getElementById('loginPass').value); box.hidden = true; msg.textContent = ''; onDone(s); }
      catch (e) { msg.textContent = /invalid/i.test(e.message || '') ? 'Correo o contraseña incorrectos.' : 'No se pudo entrar. Revisa tu conexión.'; }
    };
    setTimeout(() => document.getElementById('loginEmail').focus(), 50);
  }
  async function init(onReady) {
    if (!configured) { onReady('ai'); onReady('store'); return; }
    const { data: { session } } = await sb.auth.getSession();
    const go = s => { uid = s.user.id; onReady('user'); onReady('files'); onReady('ai'); onReady('store'); };
    if (session) go(session); else showLogin(go);
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.reload(); });
  }
  return { store, ai, files, viewer, auth, init, configured };
})();
const { store, ai, files } = Platform;


/* =====================================================================
   APP CORE: local mirror of the db, serialized writes, seed, events.
   ===================================================================== */
const $ = s => document.querySelector(s);
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || uid(); }
function lsGet(k, d) { try { const v = localStorage.getItem('coach.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem('coach.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

let dbState = 'loading'; // loading | ready | none | slow
let canWrite = true;
const cache = new Map(); // local mirror: path -> body (kept live by store.subscribe)
const aiState = { state: 'unknown', images: false, tools: true, msg: '' }; // state: unknown | ok | off | none
const ui = {
  tab: lsGet('tab', 'hoy'), confirm: null, weighPending: null, weighManual: false, weighBusy: false,
  foodPending: null, foodText: '', foodImgs: [], foodBusy: false, libQ: '', manualFood: false,
  actForm: false, actType: 'walk', gymTime: null, gymEnergy: 'normal', gymTemplate: null, gymLocation: 'gym',
  eqForm: false, eqPhoto: null, painOffer: null, parseBusy: null, howBusy: false, howOpen: {},
  range: lsGet('range', '90'), weekAI: null, weekBusy: false, sheet: null, finishOffer: null,
  chat: { local: [], busy: false, ctl: null, imgs: [], draft: '', viewDate: null, showDays: false }
};

// ---------- Selectors ----------
const DEFAULTS = { profile: SEED_PROFILE, rules: SEED_RULES, plan: SEED_PLAN, availability: SEED_AVAIL, pantry: SEED_PANTRY };
function cfg(name) {
  const base = clone(DEFAULTS[name]) || {};
  const cur = cache.get('config/' + name);
  if (!cur) return base;
  const out = Object.assign(base, cur);
  if (name === 'rules') { out.coffee = Object.assign({}, base.coffee || DEFAULT_RULES.coffee, cur.coffee || {}); out.mets = Object.assign({}, DEFAULT_RULES.mets, cur.mets || {}); }
  return out;
}
function coll(name) { const out = []; const pre = name + '/'; for (const [k, v] of cache) if (k.startsWith(pre) && k.indexOf('/', pre.length) < 0) out.push({ id: k.slice(pre.length), ...v }); return out; }
const daysArr = () => coll('days').map(d => ({ ...d, date: d.date || d.id })).sort((a, b) => a.date < b.date ? -1 : 1);
const dayOf = date => cache.get('days/' + date) || null;
const sessionsArr = () => coll('sessions').sort((a, b) => (a.date + a.id) < (b.date + b.id) ? -1 : 1);
const exArr = () => coll('exercises').sort((a, b) => a.name < b.name ? -1 : 1);
const eqArr = () => coll('equipment').sort((a, b) => a.name < b.name ? -1 : 1);
const foodsLib = () => coll('foods');
function exById() { const m = {}; for (const e of exArr()) m[e.id] = e; return m; }
function daysByDate() { const m = {}; for (const d of daysArr()) m[d.date] = d; return m; }
function series() { return weightSeries((cache.get('history/weights') || SEED_HISTORY).points, daysArr()); }
function bodyKg() { const s = series(); return s.length ? s[s.length - 1].kg : (num(cfg('profile').startKg) || 80); }
function bmrFor(date) {
  const ds = daysArr().filter(d => d.date <= date && num(d.weighIn && d.weighIn.bmr_scale_kcal));
  return ds.length ? num(ds[ds.length - 1].weighIn.bmr_scale_kcal) : cfg('rules').bmrFallback;
}
function balanceFor(date) {
  return dayBalance(dayOf(date) || {}, { bmr: bmrFor(date), bodyKg: bodyKg(), rules: cfg('rules'), sessions: sessionsArr().filter(s => s.date === date), exById: exById() });
}
function blockedFoods() { return cfg('rules').blockedFoods || []; }
function isBlockedFood(name) { const n = norm(name); return blockedFoods().some(b => n.includes(norm(b))); }
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const voice = { on: false, rec: null, base: '', finalTxt: '', send: false };
function today() { return tzNow().date; }
// Default session length when he doesn't say: Mon/Fri (home office, free from 16:00) 90 min; other days 60.
function defaultSessionMin(dow = tzNow().dow) { return dow === 1 || dow === 5 ? 90 : 60; }
function lastRunWalk() {
  const out = [];
  for (const d of daysArr()) for (const a of d.activities || []) if (a.type === 'runwalk' || a.type === 'treadmill_int') out.push({ date: d.date, ...a });
  for (const s of sessionsArr()) if (s.cardio && s.cardio.done && s.cardio.type === 'runwalk') out.push({ date: s.date, ...s.cardio });
  out.sort((a, b) => a.date < b.date ? -1 : 1);
  return out[out.length - 1] || null;
}

// ---------- Writes: one at a time per doc, optimistic ----------
const wq = {};
function writeDoc(path, mutate, opts = {}) {
  const run = async () => {
    // Start from the server copy, not the local mirror: the phone and the PC can both write the same doc
    // (pantry, rules, today's day) and realtime may not have delivered the other device's change yet.
    let cur = cache.has(path) ? clone(cache.get(path)) : null;
    if (!opts.noRead && store.available() && canWrite !== false) { try { const srv = await store.get(path); cur = srv == null ? null : srv; } catch (e) { /* offline: use the mirror */ } }
    const next = mutate(cur);
    if (!next) return null;
    next.updatedAt = new Date().toISOString();
    cache.set(path, next); schedule();
    if (store.available() && canWrite !== false) {
      try { await store.set(path, next); if (/^(days|sessions|goals)\//.test(path)) setTimeout(checkGoals, 400); }
      catch (e) { onWriteError(e); throw e; }
    }
    return next;
  };
  const p = (wq[path] || Promise.resolve()).then(run, run);
  wq[path] = p.catch(() => { });
  return p;
}
function deleteDoc(path) {
  const run = async () => { cache.delete(path); schedule(); if (store.available() && canWrite !== false) { try { await store.delete(path); } catch (e) { onWriteError(e); throw e; } } };
  const p = (wq[path] || Promise.resolve()).then(run, run);
  wq[path] = p.catch(() => { });
  return p;
}
function updateDay(date, fn) {
  return writeDoc('days/' + date, cur => {
    const d = cur || { date, foods: [], activities: [], notes: [] };
    d.date = date; d.foods = d.foods || []; d.activities = d.activities || []; d.notes = d.notes || [];
    return fn(d) === false ? null : d;
  });
}
function updateCfg(name, fn) { return writeDoc('config/' + name, cur => { const c = cur || clone(DEFAULTS[name]) || {}; return fn(c) === false ? null : c; }); }
function onWriteError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument' && canWrite === null) { canWrite = false; toast('No tienes permiso para guardar aquí.'); return; }
  if (code === 'quota_exceeded') toast('La base de datos está llena. Borra notas o recordatorios viejos.');
  else if (code === 'revoked') { dbState = 'none'; toast('Se perdió el acceso a los datos.'); }
  else toast('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
}

// ---------- Render scheduling (never clobber a focused input) ----------
let renderPending = false, rafId = 0;
function schedule() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    const ae = document.activeElement;
    if (ae && ae.closest && ae.closest('#view, #sheetHost') && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.type !== 'checkbox' && ae.type !== 'file') { renderPending = true; return; }
    render();
  });
}
document.addEventListener('focusout', () => { if (renderPending) setTimeout(() => { if (!renderPending) return; const ae = document.activeElement; if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest('#view, #sheetHost')) return; renderPending = false; render(); }, 30); });

// ---------- Toast ----------
let toastTimer = 0, toastUndo = null;
function toast(msg, undo) {
  const t = $('#toast'); $('#toastMsg').textContent = msg; t.style.display = 'flex';
  toastUndo = undo || null; $('#toastUndo').hidden = !undo;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.display = 'none'; toastUndo = null; }, undo ? 6000 : 3200);
}
$('#toastUndo').addEventListener('click', () => { const u = toastUndo; toastUndo = null; $('#toast').style.display = 'none'; if (u) u(); });

// ---------- Seed: create docs only if they do not exist ----------
async function seed() {
  if (!store.available() || canWrite === false) return;
  const docs = [
    ['config/rules', SEED_RULES], ['config/plan', SEED_PLAN], ['config/availability', SEED_AVAIL], ['config/pantry', SEED_PANTRY]
  ];
  for (const e of SEED_EQUIPMENT) docs.push(['equipment/' + e.id, (({ id, ...r }) => ({ ...r, addedAt: '2026-11-08', source: 'seed' }))(e)]);
  for (const e of SEED_EXERCISES) docs.push(['exercises/' + e.id, (({ id, ...r }) => ({ ...r, blocked: false }))(e)]);
  for (const f of SEED_FOODS) docs.push(['foods/' + f.id, (({ id, ...r }) => r)(f)]);
  for (const g of SEED_GOALS) docs.push(['goals/' + g.id, (({ id, ...r }) => ({ ...r, createdAt: '2026-11-08' }))(g)]);
  const existing = new Set();
  try { for (const c of [...new Set(docs.map(([p]) => p.split('/')[0]))]) for (const r of await store.list(c)) existing.add(c + '/' + r.id); }
  catch (e) { return; }
  for (const [path, body] of docs) {
    if (existing.has(path)) continue;
    try { await store.set(path, { ...clone(body), seededAt: new Date().toISOString() }); }
    catch (e) { if (e && (e.code === 'invalid_argument' || e.code === 'revoked')) return; }
  }
}

// ---------- Subscriptions (once each) ----------
function applyCol(name, docs) {
  const pre = name + '/';
  for (const k of [...cache.keys()]) if (k.startsWith(pre) && k.indexOf('/', pre.length) < 0) cache.delete(k);
  for (const d of docs) cache.set(pre + d.id, d.data);
}
let goalsChecked = false;
function subscribe() {
  let firstFresh = false;
  const slow = setTimeout(() => { if (!firstFresh) { dbState = 'slow'; schedule(); } }, 10000);
  const fresh = f => { if (f && !firstFresh) { firstFresh = true; clearTimeout(slow); dbState = 'ready'; } };
  const onErr = e => { clearTimeout(slow); if (e && e.code === 'revoked') dbState = 'none'; schedule(); };
  const docSub = path => store.subscribe(path, { kind: 'doc' }, p => { if (p.exists) cache.set(path, p.data); else cache.delete(path); fresh(p.fresh); schedule(); }, onErr);
  for (const name of ['profile', 'rules', 'plan', 'availability', 'pantry']) docSub('config/' + name);
  docSub('history/weights');
  store.subscribe('days', { kind: 'col', orderBy: 'date', dir: 'desc', limit: 500 }, p => { applyCol('days', p.docs); fresh(p.fresh); if (dbState === 'loading') dbState = 'ready'; schedule(); }, onErr);
  store.subscribe('sessions', { kind: 'col', orderBy: 'date', dir: 'desc', limit: 300 }, p => { applyCol('sessions', p.docs); schedule(); }, onErr);
  for (const name of ['equipment', 'exercises', 'foods', 'nudges', 'notes', 'goals', 'chat']) store.subscribe(name, { kind: 'col' }, p => { applyCol(name, p.docs); schedule(); }, onErr);
  chatEnsureSubs();
}

// ---------- Boot ----------
function applyTheme() { const t = lsGet('theme', 'auto'); if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; }
applyTheme();
async function boot() {
  render();
  await Platform.init(async part => {
    if (part === 'user') { const v = await Platform.viewer.canWrite().catch(() => null); if (v === false) canWrite = false; else if (v === null) canWrite = null; schedule(); }
    if (part === 'files') schedule();
    if (part === 'ai') {
      if (!ai.available()) { aiState.state = 'none'; schedule(); return; }
      try { const lim = await ai.limits(); aiState.images = !!lim.images; aiState.tools = !!lim.tools; aiState.imgMax = lim.images ? lim.images.maxCount : 0; } catch (e) { aiState.images = false; }
      aiState.state = 'ok'; schedule();
    }
    if (part === 'store') {
      if (!store.available()) { dbState = 'none'; render(); return; }
      subscribe();
      seed().catch(() => { });
    }
  });
}

// ---------- AI error handling ----------
function aiError(e, where) {
  const code = e && e.code;
  if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { aiState.state = 'off'; aiState.msg = 'La IA no está activada para esta página. Todo lo manual sigue funcionando.'; schedule(); return aiState.msg; }
  if (code === 'images_unavailable') { aiState.images = false; schedule(); return 'No puedo leer fotos aquí. Escríbemelo en el chat.'; }
  if (code === 'tools_unavailable') { aiState.tools = false; return 'El chat no puede guardar datos en esta vista.'; }
  if (code === 'rate_limited') return 'Llegaste al límite de uso de Claude por ahora. Intenta en un rato.';
  if (code === 'no_credit') return 'La cuenta de la API de Claude no tiene crédito. Todo lo manual sigue funcionando.';
  if (code === 'not_configured') return 'Falta configurar la API de Claude (secreto ANTHROPIC_API_KEY en Supabase). Todo lo manual sigue funcionando.';
  if (code === 'overloaded') return 'Claude está saturado. Intenta en un rato.';
  if (code === 'empty_completion') return 'No recibí respuesta. Intenta de nuevo.';
  if (code === 'cancelled') return '';
  if (code === 'image_rejected') return 'No pude abrir esa foto. Prueba con otra.';
  if (code === 'invalid_json') return 'No entendí la respuesta. Intenta de nuevo.';
  if (code === 'session_expired') return 'Tu sesión expiró. Vuelve a entrar a Claude.';
  if (code === 'refused') return 'Claude no quiso responder eso. Prueba con otras palabras.';
  return 'Algo falló' + (where ? ' al ' + where : '') + '. Intenta de nuevo.';
}
const aiOn = () => aiState.state === 'ok' && ai.available();

// ---------- Images: downscale to <= 1280 px JPEG ----------
async function downscale(file, max = 1280) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
  const w = bmp.width, h = bmp.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.85));
}
let pickCb = null;
function pickImages(multi, cb) { pickCb = cb; const el = multi ? $('#filePickMulti') : $('#filePick'); el.value = ''; el.click(); }
for (const id of ['#filePick', '#filePickMulti']) $(id).addEventListener('change', async ev => {
  const files = [...ev.target.files].slice(0, aiState.imgMax || 4); const cb = pickCb; pickCb = null;
  if (!files.length || !cb) return;
  try { const blobs = []; for (const f of files) blobs.push(await downscale(f)); cb(blobs); } catch (e) { toast('No pude abrir esa foto.'); }
});

// ---------- Event delegation ----------
const ACTIONS = {};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  ev.preventDefault();
  try { fn(el.dataset.arg, el, ev); } catch (e) { console.error(e); toast('Ups, algo falló.'); }
});
// Bound inputs: data-bind="ui.path" keeps transient form state across re-renders.
document.addEventListener('input', ev => {
  const el = ev.target; const b = el.dataset && el.dataset.bind;
  if (b) setPath(ui, b, el.type === 'checkbox' ? el.checked : el.value);
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset && el.dataset.bind && el.type === 'checkbox') setPath(ui, el.dataset.bind, el.checked);
  const fn = el.dataset && ACTIONS[el.dataset.change];
  if (fn) { try { fn(el.dataset.arg, el, ev); } catch (e) { console.error(e); } }
});
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
function getPath(obj, path) { return path.split('.').reduce((o, k) => o == null ? o : o[k], obj); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }

ACTIONS.tab = t => { ui.tab = t; lsSet('tab', t); render(); window.scrollTo(0, 0); $('#view').focus({ preventScroll: true }); };
ACTIONS.openSheet = k => { ui.sheet = k; render(); };
ACTIONS.closeSheet = () => { ui.sheet = null; render(); };
ACTIONS.ask = (k) => { ui.confirm = k; render(); };
ACTIONS.cancelAsk = () => { ui.confirm = null; render(); };


/* =====================================================================
   RENDER SHELL + HOY TAB
   ===================================================================== */
function render() {
  renderPending = false;
  const T = tzNow();
  $('#hdrDate').textContent = fmtDateEs(T.date, true) + ' · ' + T.hm;
  let bn = '';
  if (!Platform.configured) bn = 'Falta configurar Supabase en config.js. Puedes mirar la app, pero nada se guarda.';
  else if (dbState === 'none') bn = 'No hay conexión con tu base de datos: lo que registres ahora no se guardará al cerrar.';
  else if (dbState === 'slow') bn = 'Tus datos tardan en llegar. Lo que ves puede estar desactualizado.';
  else if (canWrite === false) bn = 'Solo lectura: esta cuenta no puede guardar datos aquí.';
  $('#banner').innerHTML = bn ? `<div class="banner">${esc(bn)}</div>` : '';
  for (const t of ['hoy', 'gym', 'progreso', 'chat']) $('#tab-' + t).setAttribute('aria-selected', String(ui.tab === t));
  const v = $('#view');
  if (dbState === 'loading' && !cache.size) {
    v.innerHTML = `<div class="card"><div class="skel" style="width:40%"></div><div class="skel"></div><div class="skel" style="width:70%"></div><p class="muted small">Cargando tus datos…</p></div>`;
  } else {
    v.className = ui.tab === 'hoy' || ui.tab === 'gym' ? 'cols' : 'narrow';
    v.innerHTML = ui.tab === 'gym' ? viewGym() : ui.tab === 'progreso' ? viewProgreso() : ui.tab === 'chat' ? viewChat() : viewHoy();
  }
  $('#sheetHost').innerHTML = ui.sheet ? viewSheet(ui.sheet) : '';
  if (ui.tab === 'progreso') bindCharts();
  if (ui.tab === 'chat') { const m = $('#msgs'); if (m && !ui.chat.viewDate) m.scrollTop = m.scrollHeight; }
  chatEnsureSubs();
}

const fmt = n => n == null || !Number.isFinite(+n) ? '—' : Math.round(+n).toLocaleString('es');
const fmt1 = n => n == null || !Number.isFinite(+n) ? '—' : (Math.round(+n * 10) / 10).toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtW = (w, u) => w == null || w === '' ? '' : `${String(r1(+w)).replace('.', ',')} ${u || 'kg'}`;
const STATUS_TXT = { ok: 'En meta', warn: 'Déficit corto', over: 'Por encima' };
const KIND_TXT = { alerta: 'Alerta', hacer: 'Hacer', pendiente: 'Pendiente', considerar: 'Ojo' };
function confirmBtns(key, yesAct, yesArg, yesLabel = 'Sí, borrar') {
  if (ui.confirm !== key) return null;
  return `<span class="row"><button class="sm danger" data-act="${yesAct}" data-arg="${esc(yesArg)}">${yesLabel}</button><button class="sm ghost" data-act="cancelAsk">No</button></span>`;
}

function nudgesNow() {
  const T = tzNow(), d = T.date, dbd = daysByDate();
  const ws = weekStart(d), prevWs = addDays(ws, -7);
  const ctx = { daysByDate: dbd, sessions: sessionsArr(), rules: cfg('rules'), bmrFor, bodyKg: bodyKg(), plan: cfg('plan'), exById: exById(), today: addDays(d, -1) };
  // last 7 completed days, as a rolling window
  // Derail detection only once a full week of the plan exists (plan starts Mon 2026-11-09).
  const planStart = cfg('profile').planStart || '2026-11-09';
  const lastWeekStats = d >= addDays(planStart, 7) ? weekStats(addDays(d, -7), { ...ctx, today: addDays(d, -1) }) : null;
  const seenKey = 'mvSeen.' + d, seen = lsGet(seenKey, null);
  const out = computeNudges({ movementSeen: seen, now: T, today: d, daysByDate: dbd, sessions: sessionsArr(), rules: cfg('rules'), plan: cfg('plan'), availability: cfg('availability'), mealTimes: learnMealTimes(daysArr(), d), balance: balanceFor(d), nudgesStore: coll('nudges'), bodyKg: bodyKg(), lastWeekStats, prevWs, planStart, equipmentIds: new Set(availEquipment().map(e => e.id)) });
  if (!seen) { const mv = out.find(n => n.mv); if (mv) lsSet(seenKey, { key: mv.key, kind: mv.kind, text: mv.text, act: mv.act }); }
  return out;
}

function viewHoy() {
  const T = tzNow(), d = T.date, day = dayOf(d) || {}, rules = cfg('rules');
  if (beforePlan(d)) return viewBeforePlan(T, d);
  const plan = cfg('plan').days[DOW_KEYS[T.dow]] || {};
  const nudges = nudgesNow();
  let h = celebrateCard();
  // Plan + nudges (read-only; every action goes through the chat)
  h += `<section class="card" aria-labelledby="h-plan"><div class="row sp nw"><h2 id="h-plan" class="grow">Hoy: ${esc(dayTitle(plan, T))}</h2>${d === '2026-11-08' ? '<span class="pill warn">día 0</span>' : ''}</div>`;
  if (plan.detail && plan.kind !== 'flex') h += `<p class="small ink2" style="margin:0 0 6px">${esc(plan.detail)}</p>`;
  if (nudges.length) h += nudges.map(n => `<div class="nudge"><span class="tag ${n.kind}">${KIND_TXT[n.kind] || n.kind}</span><div class="nudge-text small">${esc(n.text)}${n.act ? `<div><button class="sm ghost nudge-go" data-act="nudgeGo" data-arg="${esc(n.act)}">${n.act === 'gym' ? 'Ir a Gym' : 'Abrir chat'}</button></div>` : ''}</div><button class="xbtn" data-act="dismissNudge" data-arg="${esc(n.key)}" aria-label="Descartar recordatorio">×</button></div>`).join('');
  else h += `<p class="small muted" style="margin:0">Nada pendiente por ahora.</p>`;
  h += `</section>`;
  h += cardWeigh(d, day) + cardWatch(d, day) + cardLedger(d, day, rules) + cardActivities(d, day);
  h += `<p class="tiny muted" style="text-align:center;margin:14px 0">Todo se registra en el Chat: fotos, texto y correcciones. Toca un dato para corregirlo.</p>`;
  return h;
}
// Before planStart: no plan, no nudges, no deficits. Just when it starts and the day-0 baseline.
function viewBeforePlan(T, d) {
  const ps = planStartDate(), n = daysBetween(d, ps), first = cfg('plan').days[DOW_KEYS[dowIndex(ps)]] || {};
  const when = n === 1 ? 'mañana ' + DOW_ES[dowIndex(ps)] : 'el ' + fmtDateEs(ps, true);
  const base = daysArr().find(x => (x.tags || []).includes('dia0') && x.weighIn) || daysArr().find(x => x.date <= d && x.weighIn);
  let h = celebrateCard() + `<section class="card" aria-labelledby="h-start"><h2 id="h-start">Empiezas ${esc(when)}</h2><p class="small ink2" style="margin:0">Hoy no hay nada que registrar. ${first.title ? 'Arrancas con ' + esc(first.title) + '.' : ''} Mañana en ayunas, mándale al chat la captura de Fitdays.</p></section>`;
  if (base) { const w = base.weighIn; h += `<section class="card" aria-labelledby="h-base"><h2 id="h-base">Tu punto de partida (día 0)</h2><div class="row sp"><div><span class="big" style="font-size:34px;font-weight:700">${fmt1(w.weight_kg)}</span> <span class="muted">kg</span></div><span class="small ink2">${fmtDateEs(base.date)}</span></div><div class="grid3" style="margin-top:8px">` + KEY_METRICS.slice(1).map(k => { const m = METRICS.find(x => x[0] === k); return `<div><div class="tiny muted">${m[1]}</div><div class="num" style="font-size:18px">${w[k] != null ? esc(String(w[k]).replace('.', ',')) : '—'} <span class="tiny muted">${m[2]}</span></div></div>`; }).join('') + `</div><details class="how"><summary>Ver todas las métricas</summary><table class="ledger">${METRICS.map(([k, l, u]) => w[k] != null ? `<tr class="sub"><td>${l}</td><td class="n">${esc(String(w[k]).replace('.', ','))} ${u}</td></tr>` : '').join('')}</table></details></section>`; }
  return h;
}
// The day title is ONE activity, never "A y/o B".
function dayTitle(plan, T) {
  if (!plan || !plan.kind) return 'libre';
  if (plan.kind !== 'flex') return plan.title || 'libre';
  return flexActivity(T).text;
}
function flexActivity(T) {
  if (typeof pickFlexActivity === 'function') return pickFlexActivity({ rules: cfg('rules'), equipmentIds: new Set(availEquipment().map(e => e.id)), bodyKg: bodyKg(), today: T.date, now: T });
  return { text: '30 min de cinta en subida, intervalos 1/1' };
}

// Opens the chat with a prefilled intent (Hoy never has its own entry controls).
function openChat(draft, send) {
  ui.chat.draft = draft || '';
  ACTIONS.tab('chat');
  if (send && aiOn()) { sendChat(); return; }
  setTimeout(() => { const t = document.getElementById('chatIn'); if (t) { t.focus(); try { t.setSelectionRange(t.value.length, t.value.length); } catch (e) { } } }, 60);
}
ACTIONS.correct = desc => openChat('Corrige: ' + desc + ' → ');

// ---------- Weigh-in (read-only) ----------
const KEY_METRICS = ['weight_kg', 'body_fat_pct', 'muscle_mass_kg', 'body_water_pct', 'visceral_fat', 'bmr_scale_kcal'];
function prevWeighIn(date) { const ds = daysArr().filter(x => x.date < date && x.weighIn && num(x.weighIn.weight_kg)); return ds.length ? ds[ds.length - 1] : null; }
function cardWeigh(d, day) {
  let h = `<section class="card" aria-labelledby="h-peso"><h2 id="h-peso">Pesaje de la mañana</h2>`;
  if (day.weighIn && num(day.weighIn.weight_kg)) {
    const w = day.weighIn, p = prevWeighIn(d);
    const delta = p ? num(w.weight_kg) - num(p.weighIn.weight_kg) : null;
    h += `<button class="tapitem" data-act="correct" data-arg="${esc('pesaje de hoy ' + fmt1(w.weight_kg) + ' kg')}" aria-label="Corregir el pesaje en el chat"><div class="row sp"><div><span class="big" style="font-size:34px;font-weight:700">${fmt1(w.weight_kg)}</span> <span class="muted">kg</span></div>${delta != null ? `<div class="small ink2">${delta > 0 ? '+' : ''}${fmt1(delta)} kg vs ${fmtDateEs(p.date)}</div>` : ''}</div>`;
    h += `<div class="grid3" style="margin-top:8px">` + KEY_METRICS.slice(1).map(k => { const m = METRICS.find(x => x[0] === k); return `<div><div class="tiny muted">${m[1]}</div><div class="num" style="font-size:18px">${w[k] != null ? esc(String(w[k]).replace('.', ',')) : '—'} <span class="tiny muted">${m[2]}</span></div></div>`; }).join('') + `</div></button>`;
    h += `<details class="how"><summary>Ver todas las métricas</summary><table class="ledger">${METRICS.map(([k, l, u]) => w[k] != null ? `<tr class="sub"><td>${l}</td><td class="n">${esc(String(w[k]).replace('.', ','))} ${u}</td></tr>` : '').join('')}</table></details>`;
    if (w.flag && !w.flagCleared) h += `<p class="small warn" style="margin:8px 0 0">Marcado: ${esc(w.flag)}. No cuenta para logros. Si fue normal, díselo al chat.</p>`;
    if (dowIndex(d) === 1 || dowIndex(d) === 2) h += weekendNote(d, w);
  } else h += `<p class="small ink2" style="margin:0">Aún sin pesaje. En ayunas, mándale la captura de Fitdays al chat.</p>`;
  return h + `</section>`;
}
function weekendNote(d, w) {
  const fri = addDays(weekStart(d), -3), f = dayOf(fri);
  if (!f || !f.weighIn) return '';
  const diff = num(w.weight_kg) - num(f.weighIn.weight_kg);
  if (diff < 0.4) return '';
  return `<p class="small" style="margin:8px 0 0">+${fmt1(diff)} kg vs el viernes. Tranquilo: es agua y sal del finde (más carbohidratos y sodio retienen agua). Suele bajar en 2–4 días si retomas.</p>`;
}
ACTIONS.manualWeigh = () => { const p = prevWeighIn(today()); ui.weighPending = { bmr_scale_kcal: p ? p.weighIn.bmr_scale_kcal : cfg('rules').bmrFallback }; render(); };
ACTIONS.editWeigh = () => { ui.weighPending = clone((dayOf(today()) || {}).weighIn) || {}; render(); };
ACTIONS.cancelWeigh = () => { ui.weighPending = null; render(); };
ACTIONS.saveWeigh = () => {
  const p = ui.weighPending || {}; const w = {};
  for (const [k] of METRICS) { const n = num(p[k]); if (n != null) w[k] = n; }
  if (!w.weight_kg || w.weight_kg < 40 || w.weight_kg > 200) { toast('Falta el peso (kg).'); return; }
  const prev = (dayOf(today()) || {}).weighIn;
  w.time = (prev && prev.time) || tzNow().hm; w.source = p.source || (prev && prev.source) || 'manual';
  const fl = saunaFlag(today(), w.time); if (fl && !(prev && prev.flagCleared)) w.flag = fl; else if (prev && prev.flagCleared) w.flagCleared = true;
  ui.weighPending = null;
  updateDay(today(), d => { d.weighIn = w; });
  toast('Pesaje guardado.');
};

// ---------- Watch (read-only) ----------
function cardWatch(d, day) {
  const w = day.watch;
  return `<section class="card" aria-labelledby="h-reloj"><div class="row sp nw"><h2 id="h-reloj" class="grow">Reloj</h2>${w ? `<button class="sm ghost" data-act="correct" data-arg="${esc('reloj ' + w.kcal + ' kcal')}">${fmt(w.kcal)} kcal · ${esc(w.at)}</button>` : ''}</div>
  ${movementBar(w)}
  <p class="tiny muted" style="margin:0">Contador general de Amazfit, nunca el número de una sesión de Zepp. Dile al chat el último valor: gana el más reciente.</p></section>`;
}
function movementBar(w) {
  const r = cfg('rules'), tgt = r.movementTarget || 250, k = num(w && w.kcal) || 0, pct = Math.min(100, k / tgt * 100), gap = Math.max(0, tgt - k);
  const cls = k >= tgt ? '' : tzNow().hour >= 16 && gap > 100 ? 'warn' : '';
  return `<div style="margin:6px 0 8px"><div class="row sp small"><span>Movimiento <b class="num">${fmt(k)}</b> / ${tgt}</span><span class="${k >= tgt ? 'ok' : 'ink2'}">${k >= tgt ? 'meta cumplida' : 'faltan ' + fmt(gap)}</span></div><div class="bar ${cls}" style="margin-top:4px" role="img" aria-label="Movimiento ${fmt(k)} de ${tgt} kcal"><i style="width:${pct}%"></i></div></div>`;
}
ACTIONS.saveWatch = () => {
  const k = num(val('watchIn'));
  if (k == null || k < 0 || k > 6000) { toast('Escribe las kcal del contador general.'); return; }
  const prev = (dayOf(today()) || {}).watch;
  updateDay(today(), d => { const at = tzNow().hm; d.watch = { kcal: Math.round(k), at }; d.watchLog = (d.watchLog || []).concat({ kcal: Math.round(k), at }).slice(-20); });
  toast(prev && k < prev.kcal ? 'Guardado. Ojo: es menor que el anterior (el contador solo sube).' : 'Reloj actualizado.');
};

// ---------- Ledger (familiar order, read-only) ----------
function exerciseLines(d, day) {
  const rules = cfg('rules'), kg = bodyKg(), lines = [];
  for (const a of day.activities || []) { const k = activityKcal(a, kg, rules); lines.push({ label: (ACT_TYPES[a.type] || ACT_TYPES.other).label, extra: k.extra, gross: k.gross, counted: k.watchCounted }); }
  for (const s of sessionsArr().filter(s => s.date === d && s.status !== 'discarded')) {
    const k = sessionKcal(s, kg, rules, exById());
    if (k.gross) lines.push({ label: s.title || 'Sesión de gym', extra: k.extra, gross: k.gross, counted: false, watchDelta: k.watchDelta, note: k.watchDelta != null ? `estimado ${fmt(k.estimate)} − reloj ${fmt(k.strengthSeen)} = +${fmt(k.extra)}` : `estimado ${fmt(k.estimate)} (sin lecturas del reloj: cuenta 100 %)` });
  }
  return lines;
}
// "Meta de hoy: 1.650 base + 125 por el gym = 1.775" (spec 13).
function targetLine(b, date) {
  const day = date ? dayOf(date) || {} : {}, fb = (day.activities || []).some(a => a.type === 'football'), gym = date && sessionsArr().some(s => s.date === date && s.status !== 'discarded');
  const src = fb && !gym ? 'el fútbol' : gym && !fb && !b.watchExtra ? 'el gym' : 'el ejercicio y el movimiento extra';
  let t = `Meta de hoy: ${fmt(b.baseTarget)} base`;
  if (b.eatBack) t += ` + ${fmt(b.eatBack)} por ${src}`;
  if (b.floored) return `Meta de hoy: ${fmt(b.target)} (mínimo del día; ${fmt(b.baseTarget + b.eatBack)} sería muy poco).`;
  return b.eatBack ? `${t} = ${fmt(b.target)}.` : `${t}.`;
}
function cardLedger(d, day, rules) {
  const b = balanceFor(d), lines = exerciseLines(d, day);
  const bmrDay = daysArr().filter(x => x.date <= d && x.weighIn && num(x.weighIn.bmr_scale_kcal)).slice(-1)[0];
  let h = `<section class="card" aria-labelledby="h-bal"><div class="row sp nw"><h2 id="h-bal" class="grow">Balance de hoy</h2>${b.hasFood ? `<span class="pill ${b.status}">${STATUS_TXT[b.status]}</span>` : ''}</div><table class="ledger">`;
  h += `<tr><td>BMR <span class="tiny muted">${bmrDay ? 'báscula ' + fmtDateEs(bmrDay.date) : 'regla'} × ${rules.activityFactor}</span></td><td class="n">${fmt(b.base)}</td></tr>`;
  h += `<tr><td>Reloj sobre ${rules.movementTarget} <span class="tiny muted">${day.watch ? 'contador general ' + fmt(b.watch) + ' (' + esc(day.watch.at) + ')' : 'sin dato aún'}</span></td><td class="n">${fmt(b.watchExtra)}</td></tr>`;
  h += `<tr><td>Ejercicios <span class="tiny muted">lo que el reloj no contó</span></td><td class="n">${fmt(b.exExtra)}</td></tr>`;
  for (const l of lines) h += `<tr class="sub"><td>· ${esc(l.label)}${l.counted ? ' <span class="tiny">(ya en el reloj, ' + fmt(l.gross) + ')</span>' : ''}${l.note ? `<div class="tiny muted">${esc(l.note)}</div>` : ''}</td><td class="n">${l.counted ? '0' : fmt(l.extra)}</td></tr>`;
  h += `<tr class="tot"><td>Gasto de hoy</td><td class="n">${fmt(b.burned)}</td></tr>`;
  const foods = (day.foods || []).slice().sort((a, b2) => (a.at || '') < (b2.at || '') ? -1 : 1);
  if (!foods.length) h += `<tr class="sub"><td colspan="2">Aún no registras comida. Cuéntasela al chat (texto o foto).</td></tr>`;
  for (const f of foods) {
    const key = 'food:' + f.id, c = confirmBtns(key, 'delFood', f.id);
    h += `<tr><td><button class="tapitem" data-act="correct" data-arg="${esc(f.name + ' (' + fmt(f.kcal) + ' kcal, ' + fmt(f.protein) + ' g)')}" aria-label="Corregir ${esc(f.name)} en el chat">${esc(f.name)}${f.qty ? ` <span class="tiny muted">${esc(f.qty)}</span>` : ''}<span class="tiny muted" style="display:block">${esc(f.at || '')} · ${fmt(f.protein)} g proteína</span></button>${c ? `<div>${c}</div>` : ''}</td><td class="n">${fmt(f.kcal)}<button class="xbtn" data-act="ask" data-arg="${esc(key)}" aria-label="Borrar ${esc(f.name)}">×</button></td></tr>`;
  }
  h += `<tr class="tot"><td>Total consumido</td><td class="n">${fmt(b.consumed)}</td></tr>`;
  h += `<tr class="def"><td>Déficit</td><td class="n ${b.hasFood ? b.status : ''}">${fmt(b.deficit)}</td></tr></table>`;
  const pct = Math.min(100, b.burned ? b.consumed / b.burned * 100 : 0), tpct = b.burned ? Math.min(100, b.target / b.burned * 100) : 0;
  h += `<div style="margin-top:10px"><div class="row sp small"><span>Meta de hoy: <b class="num">${fmt(b.target)}</b> kcal</span><span class="${b.remaining < 0 ? 'over' : 'ink2'}">${b.remaining >= 0 ? 'te quedan ' + fmt(b.remaining) : 'te pasaste ' + fmt(-b.remaining)}</span></div>
    <div class="bar ${b.status === 'ok' ? '' : b.status}" style="margin-top:4px" role="img" aria-label="Consumido ${fmt(b.consumed)} de ${fmt(b.target)} de meta"><i style="width:${pct}%"></i><span class="mark" style="left:${tpct}%"></span></div>
    <p class="tiny muted" style="margin:4px 0 0">${esc(targetLine(b, d))}</p></div>`;
  const ppct = Math.min(100, b.protein / rules.proteinMax * 100);
  h += `<div style="margin-top:10px"><div class="row sp small"><span>Proteína <b class="num">${fmt(b.protein)}</b> / ${rules.proteinMin}–${rules.proteinMax} g</span><span class="${b.proteinStatus === 'ok' ? 'ok' : 'ink2'}">${b.proteinLeft ? 'faltan ' + b.proteinLeft + ' g' : 'logrado'}</span></div>
    <div class="bar ${b.proteinStatus === 'ok' ? '' : 'warn'}" style="margin-top:4px" role="img" aria-label="Proteína ${fmt(b.protein)} gramos"><i style="width:${ppct}%"></i><span class="mark" style="left:${rules.proteinMin / rules.proteinMax * 100}%"></span></div></div>`;
  return h + `</section>`;
}
ACTIONS.delFood = id => { ui.confirm = null; let removed = null; updateDay(today(), d => { const i = d.foods.findIndex(f => f.id === id); if (i < 0) return false; removed = d.foods.splice(i, 1)[0]; }); toast('Borrado.', () => { if (removed) updateDay(today(), d => { d.foods.push(removed); }); }); };

// ---------- Food helpers (used by the chat tools and the manual mode) ----------
ACTIONS.refresh = () => render();
function pushFoods(items) {
  const at = tzNow().hm;
  const rows = items.map(f => ({ id: uid(), name: String(f.name || 'Comida').slice(0, 80), kcal: Math.round(num(f.kcal) || 0), protein: Math.round(num(f.protein) || 0), qty: f.qty ? String(f.qty).slice(0, 40) : '', at: f.at || at, libId: f.libId || null, source: f.source || 'app' }));
  updateDay(today(), d => { d.foods.push(...rows); });
  for (const f of items) {
    if (f.libId && cache.has('foods/' + f.libId)) writeDoc('foods/' + f.libId, cur => cur ? { ...cur, timesEaten: (cur.timesEaten || 0) + 1, lastAt: today() } : null);
    else if (f.save) { const id = slug(f.name); writeDoc('foods/' + id, cur => ({ ...(cur || {}), name: f.name, kcal: Math.round(num(f.kcal) || 0), protein: Math.round(num(f.protein) || 0), portion: f.qty || (cur && cur.portion) || '', timesEaten: ((cur && cur.timesEaten) || 0) + 1, lastAt: today(), source: 'app', sharedNote: f.sharedNote || (cur && cur.sharedNote) || '' })); }
  }
  return rows;
}
function undoFoods(rows) { const ids = new Set(rows.map(r => r.id)); updateDay(today(), d => { d.foods = d.foods.filter(f => !ids.has(f.id)); }); }
ACTIONS.addCoffee = oz => { const c = cfg('rules').coffee; const k = oz === '14' ? c.kcal14 : c.kcal12; const rows = pushFoods([{ name: `Café French Vanilla ${oz} oz`, kcal: k, protein: 2, qty: oz + ' oz', libId: 'cafe-french-vanilla-' + oz }]); toast(`Café ${oz} oz: ${k} kcal${c.provisional ? ' (provisional)' : ''}.`, () => undoFoods(rows)); };
ACTIONS.addManualFood = () => {
  const name = val('mf-n').trim(), k = num(val('mf-k'));
  if (!name || k == null) { toast('Pon el nombre y las kcal.'); return; }
  const rows = pushFoods([{ name, kcal: k, protein: num(val('mf-p')) || 0, qty: val('mf-q'), save: document.getElementById('mf-s').checked }]);
  render(); toast('Agregado.', () => undoFoods(rows));
};

// ---------- Activities (read-only) ----------
function cardActivities(d, day) {
  const kg = bodyKg(), rules = cfg('rules');
  const acts = day.activities || [];
  let h = `<section class="card" aria-labelledby="h-act"><h2 id="h-act">Actividad</h2>`;
  if (!acts.length) h += `<p class="small muted" style="margin:0">Nada registrado hoy. Cuéntaselo al chat.</p>`;
  for (const a of acts) {
    const k = activityKcal(a, kg, rules), t = ACT_TYPES[a.type] || ACT_TYPES.other;
    const key = 'act:' + a.id, c = confirmBtns(key, 'delAct', a.id);
    const what = a.type === 'runwalk' ? `${a.rounds || 1} × (${a.runMin || 0} trote + ${a.walkMin || 0} caminata)` : a.type === 'pushups' ? `${a.reps || 0} flexiones` : a.type === 'rope' ? `${a.reps || 0} saltos${a.minutes ? ' · ' + a.minutes + ' min' : ''}` : (a.minutes ? a.minutes + ' min' : '');
    h += `<div class="actrow"><button class="tapitem grow" data-act="correct" data-arg="${esc(t.label + ' ' + what)}" aria-label="Corregir ${esc(t.label)} en el chat"><span class="row sp nw"><b>${esc(t.label)}</b><span class="num">${fmt(k.gross)} kcal</span></span>
      <span class="tiny muted" style="display:block">${esc(what)}${a.feel ? ' · ' + esc(a.feel) : ''} · ${k.watchCounted ? 'ya en el reloj' : 'suma al quemado'}</span></button>${c || `<button class="xbtn" data-act="ask" data-arg="${esc(key)}" aria-label="Borrar ${esc(t.label)}">×</button>`}</div>`;
    if (a.type === 'football') h += footballBlock(a, rules);
  }
  return h + `</section>`;
}
function footballBlock(a, rules) {
  const fs = footballStats(a), b = a.before || {}, f = a.after || {};
  let h = `<p class="tiny ink2" style="margin:2px 0 0">Antes: ${b.kg != null ? fmt1(b.kg) + ' kg' : '—'} · reloj ${b.watch != null ? fmt(b.watch) : '—'} — Después: ${f.kg != null ? fmt1(f.kg) + ' kg' : '—'} · reloj ${f.watch != null ? fmt(f.watch) : '—'}</p>`;
  if (fs.watchDelta != null) h += `<p class="small" style="margin:6px 0 0">Partido: <b class="num">${fmt(fs.watchDelta)}</b> kcal (reloj). Tu típico: ${typicalMatchKcal() ? fmt(typicalMatchKcal()) + ' kcal' : 'aún aprendiendo'}.</p>`;
  if (fs.sweatKg != null && fs.sweatKg > 0) h += `<p class="small" style="margin:4px 0 0">Sudor: <b class="num">${fmt1(fs.sweatKg)}</b> kg → toma ${fmt1(fs.sweatKg * rules.hydrationPerKg[0])}–${fmt1(fs.sweatKg * rules.hydrationPerKg[1])} L de agua.</p>`;
  return h;
}
function typicalMatchKcal() { const v = []; for (const d of daysArr()) for (const a of d.activities || []) if (a.type === 'football') { const s = footballStats(a); if (s.watchDelta) v.push(s.watchDelta); } return median(v); }
ACTIONS.saveAct = () => {
  const t = ui.actType, a = { id: uid(), type: t, at: tzNow().hm, feel: val('af-feel'), watchCounted: document.getElementById('af-watch').checked };
  if (t === 'runwalk') { a.runMin = num(val('af-run')) || 0; a.walkMin = num(val('af-walk')) || 0; a.rounds = num(val('af-rounds')) || 1; a.completed = true; }
  else if (t === 'pushups') a.reps = num(val('af-reps')) || 0;
  else if (t === 'rope') { a.reps = num(val('af-reps')) || 0; a.minutes = num(val('af-min')) || 0; }
  else if (t === 'football') { a.minutes = num(val('af-min')) || 60; a.before = { kg: num(val('af-bkg')), watch: num(val('af-bw')), at: a.at }; a.after = { kg: num(val('af-akg')), watch: num(val('af-aw')) }; }
  else a.minutes = num(val('af-min')) || 0;
  if (!['football', 'pushups', 'runwalk', 'rope'].includes(t) && !a.minutes) { toast('Pon los minutos.'); return; }
  updateDay(today(), d => { d.activities.push(a); });
  toast('Actividad guardada.');
};
ACTIONS.delAct = id => { ui.confirm = null; updateDay(today(), d => { d.activities = d.activities.filter(a => a.id !== id); }); };

// ---------- Manual mode (Ajustes → "Modo manual (sin IA)"), hidden by default ----------
function manualEditors() {
  const r = cfg('rules'), plan = cfg('plan'), av = cfg('availability'), pantry = cfg('pantry');
  const n = (id, label, v, step = 1) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" step="${step}" value="${esc(v)}"></div>`;
  let h = '';
  h += `<h3 style="margin-top:12px">Reglas</h3><div class="grid2">${n('r-dt', 'Déficit objetivo', r.deficitTarget)}${n('r-goal', 'Meta (kg)', r.goalKg, 0.1)}${n('r-dmin', 'Déficit mínimo', r.deficitMin)}${n('r-dmax', 'Déficit máximo', r.deficitMax)}${n('r-pmin', 'Proteína mín. (g)', r.proteinMin)}${n('r-pmax', 'Proteína máx. (g)', r.proteinMax)}${n('r-c12', 'Café 12 oz (kcal)', r.coffee.kcal12)}${n('r-c14', 'Café 14 oz (kcal)', r.coffee.kcal14)}${n('r-sf', 'Fuerza sin lecturas del reloj (%)', Math.round(r.strengthExtraFactor * 100))}${n('r-pu', 'Kcal por flexión', r.pushupKcal, 0.1)}${n('r-bmr', 'BMR si no hay báscula', r.bmrFallback)}${n('r-mv', 'Meta de movimiento (kcal reloj)', r.movementTarget)}<div class="field"><label for="r-season">Temporada</label><select id="r-season"><option value="winter" ${r.season === 'winter' ? 'selected' : ''}>Invierno (todo bajo techo)</option><option value="summer" ${r.season !== 'winter' ? 'selected' : ''}>Verano (se vale afuera)</option></select></div></div>
    <label class="row small" style="margin:8px 0"><input type="checkbox" id="r-prov" ${r.coffee.provisional ? 'checked' : ''}> Café provisional (falta foto de la etiqueta)</label><button class="primary" data-act="saveRules">Guardar reglas</button>`;
  h += `<h3 style="margin-top:12px">Plan de la semana</h3>`;
  for (const k of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) { const d = plan.days[k] || {}; h += `<div class="grid2" style="margin-top:6px"><div class="field"><label for="p-${k}">${DOW_ES[DOW_KEYS.indexOf(k)]}</label><select id="p-${k}">${[['gym:A', 'Gym A: piernas y glúteos'], ['gym:B', 'Gym B: core y tren superior'], ['gym:C', 'Gym C: glúteos e intervalos'], ['rest:', 'Descanso'], ['football:', 'Fútbol'], ['flex:', 'Flexible (una actividad bajo techo)']].map(([v, l]) => `<option value="${v}" ${(d.kind + ':' + (d.kind === 'gym' ? d.template : '')) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="pd-${k}">Detalle</label><input id="pd-${k}" value="${esc(d.detail || '')}"></div></div>`; }
  h += `<button class="primary" style="margin-top:8px" data-act="savePlan">Guardar plan</button>`;
  h += `<h3 style="margin-top:12px">Disponibilidad</h3><table class="ledger">${Object.entries(av.weekly || {}).map(([k, v]) => `<tr class="sub"><td>${DOW_ES[DOW_KEYS.indexOf(k)]}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  const ov = Object.entries(av.overrides || {}).filter(([d]) => d >= today()).sort();
  h += ov.length ? `<p class="small" style="margin:8px 0 2px"><b>Próximas fechas</b></p>${ov.map(([d, w]) => `<div class="row sp small"><span>${fmtDateEs(d, true)}: ${w.map(x => x.busy ? 'ocupado' : `${x.from || '?'}–${x.to || '?'}`).join(', ')} ${esc((w[0] || {}).note || '')}</span><button class="sm ghost" data-act="delAvail" data-arg="${d}">Quitar</button></div>`).join('')}` : `<p class="tiny muted">Dile al chat tus ventanas del finde (ej. "sábado libre de 9 a 12").</p>`;
  h += `<h3 style="margin-top:12px">Despensa</h3>${(pantry.items || []).length ? `<div class="chips">${pantry.items.map(i => `<button class="chip" data-act="delPantry" data-arg="${esc(i.name)}" aria-label="Quitar ${esc(i.name)}">${esc(pantryLabel(i))} ×</button>`).join('')}</div>` : `<p class="small muted">Vacía. Dile al chat qué tienes en la nevera.</p>`}<div class="row nw" style="margin-top:6px"><label class="sr" for="pantryIn">Agregar a la despensa</label><input id="pantryIn" class="grow" placeholder="Ej: salmón, brócoli"><button data-act="addPantry">Agregar</button></div>`;
  const ba = (r.blockedActivities || []).filter(b => !b.until || b.until >= today());
  h += `<h3 style="margin-top:12px">Actividades bloqueadas</h3>${ba.length ? `<div class="chips">${ba.map(b => `<button class="chip" data-act="unblockActivity" data-arg="${esc(b.name)}" aria-label="Desbloquear ${esc(b.name)}">${esc((ACTIVITIES[canonicalActivity(b.name)] || { label: b.name }).label)}${b.until ? ' (hasta ' + fmtDateEs(b.until) + ')' : ''} ×</button>`).join('')}</div>` : '<p class="small muted">Ninguna. Para bloquear una, díselo al chat (ej. "esta semana no quiero squash").</p>'}`;
  h += `<h3 style="margin-top:12px">Comidas bloqueadas</h3><div class="chips">${(r.blockedFoods || []).map(b => `<button class="chip" data-act="unblockFood" data-arg="${esc(b)}" aria-label="Desbloquear ${esc(b)}">${esc(b)} ×</button>`).join('')}</div><div class="row nw" style="margin-top:6px"><label class="sr" for="blockIn">Bloquear comida</label><input id="blockIn" class="grow" placeholder="Agregar comida bloqueada"><button data-act="blockFood">Bloquear</button></div>`;
  return h;
}
function viewManual() {
  const c = cfg('rules').coffee, t = ui.actType || 'walk';
  let h = `<details class="how" ${ui.manualOpen ? 'open' : ''} data-change="manualToggle"><summary>Modo manual (sin IA)</summary><p class="tiny muted" style="margin:0 0 8px">Solo si el chat no está disponible. Lo normal es registrar todo en el Chat.</p>`;
  // Weigh-in
  const wp = ui.weighPending;
  h += `<h3 style="margin-top:8px">Pesaje</h3>`;
  if (wp) { h += `<div class="grid2">`; for (const [k, label, unit] of METRICS) h += `<div class="field"><label for="w-${k}">${esc(label)}${unit ? ' (' + unit + ')' : ''}</label><input id="w-${k}" inputmode="decimal" data-bind="weighPending.${k}" value="${esc(wp[k] ?? '')}"></div>`; h += `</div><div class="row" style="margin-top:8px"><button class="primary" data-act="saveWeigh">Guardar pesaje</button><button class="ghost" data-act="cancelWeigh">Cancelar</button></div>`; }
  else h += `<button data-act="${(dayOf(today()) || {}).weighIn ? 'editWeigh' : 'manualWeigh'}">${(dayOf(today()) || {}).weighIn ? 'Editar pesaje de hoy' : 'Escribir pesaje'}</button>`;
  // Watch
  h += `<h3 style="margin-top:12px">Reloj</h3><div class="row nw"><div class="grow"><label class="sr" for="watchIn">Kcal del contador general</label><input id="watchIn" type="number" inputmode="numeric" placeholder="kcal del contador general"></div><button data-act="saveWatch">Guardar</button></div>`;
  // Food
  h += `<h3 style="margin-top:12px">Comida</h3><div class="chips" style="margin-bottom:8px"><button class="chip" data-act="addCoffee" data-arg="12">Café 12 oz · ${c.kcal12}</button><button class="chip" data-act="addCoffee" data-arg="14">Café 14 oz · ${c.kcal14}</button></div>
    <div class="grid3"><div class="field" style="grid-column:1/-1"><label for="mf-n">Comida</label><input id="mf-n"></div><div class="field"><label for="mf-k">kcal</label><input id="mf-k" inputmode="numeric"></div><div class="field"><label for="mf-p">Proteína g</label><input id="mf-p" inputmode="numeric"></div><div class="field"><label for="mf-q">Porción</label><input id="mf-q"></div></div>
    <label class="row small" style="margin:6px 0"><input type="checkbox" id="mf-s"> Guardar en mi biblioteca</label><button data-act="addManualFood">Agregar comida</button>`;
  // Activity
  h += `<h3 style="margin-top:12px">Actividad</h3><div class="field"><label for="af-type">Tipo</label><select id="af-type" data-bind="actType" data-change="refresh">${Object.entries(ACT_TYPES).map(([k, v]) => `<option value="${k}" ${k === t ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div><div class="grid3" style="margin-top:6px">`;
  if (t === 'runwalk') h += `<div class="field"><label for="af-run">Trote (min)</label><input id="af-run" inputmode="decimal"></div><div class="field"><label for="af-walk">Caminata (min)</label><input id="af-walk" inputmode="decimal"></div><div class="field"><label for="af-rounds">Rondas</label><input id="af-rounds" inputmode="numeric"></div>`;
  else if (t === 'pushups' || t === 'rope') h += `<div class="field"><label for="af-reps">${t === 'rope' ? 'Saltos' : 'Flexiones'}</label><input id="af-reps" inputmode="numeric"></div>${t === 'rope' ? '<div class="field"><label for="af-min">Minutos</label><input id="af-min" inputmode="numeric"></div>' : ''}`;
  else if (t === 'football') h += `<div class="field"><label for="af-bkg">Peso antes</label><input id="af-bkg" inputmode="decimal"></div><div class="field"><label for="af-bw">Reloj antes</label><input id="af-bw" inputmode="numeric"></div><div class="field"><label for="af-min">Minutos</label><input id="af-min" inputmode="numeric" value="60"></div><div class="field"><label for="af-akg">Peso después</label><input id="af-akg" inputmode="decimal"></div><div class="field"><label for="af-aw">Reloj después</label><input id="af-aw" inputmode="numeric"></div>`;
  else h += `<div class="field"><label for="af-min">Minutos</label><input id="af-min" inputmode="numeric"></div>`;
  h += `</div><div class="field" style="margin-top:6px"><label for="af-feel">¿Cómo salió?</label><select id="af-feel"><option value="bien">Bien</option><option value="facil">Fácil</option><option value="dificil">Difícil</option></select></div>
    <label class="row small" style="margin:8px 0"><input type="checkbox" id="af-watch" ${(ACT_TYPES[t] || ACT_TYPES.other).watchDefault ? 'checked' : ''}> El reloj ya lo contó</label><button data-act="saveAct">Guardar actividad</button>`;
  const s = activeSession();
  h += `<h3 style="margin-top:12px">Gym (manual)</h3>`;
  h += s ? viewSession(s) : `<button data-act="startSession">Empezar sesión manual</button>`;
  h += manualEditors();
  return h + `</details>`;
}
ACTIONS.manualToggle = (a, el) => { ui.manualOpen = el.open; };
document.addEventListener('toggle', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.change === 'manualToggle') ui.manualOpen = ev.target.open; }, true);

// ---------- Nudges ----------
ACTIONS.dismissNudge = key => {
  const n = cache.get('nudges/' + key);
  if (n) writeDoc('nudges/' + key, cur => cur ? { ...cur, dismissed: true, dismissedAt: today() } : null);
  else writeDoc('nudges/' + safeId(key), () => ({ dismissed: true, rule: true, dismissedAt: today() }));
};
// Every nudge action goes to the chat with a short prefilled intent (or to Gym).
const NUDGE_DRAFTS = { weigh: 'Registra mi peso de hoy (te mando la captura de Fitdays).', watch: 'El reloj marca ', food: 'Registra lo que comí: ', activity: 'Hice ', football: 'Fútbol: antes del partido peso  kg y el reloj marca ', chat: '', 'chat-finde': 'Este finde tengo libre: ' };
ACTIONS.nudgeGo = act => {
  if (act === 'gym') return ACTIONS.tab('gym');
  openChat(NUDGE_DRAFTS[act] ?? '');
};


/* =====================================================================
   GYM TAB
   ===================================================================== */
const FEELS = [['facil', 'Fácil'], ['bien', 'Bien'], ['dificil', 'Difícil'], ['dolor', 'Dolor']];
const ENERGY = [['bien', 'Bien'], ['normal', 'Normal'], ['cansado', 'Cansado']];
function activeSession() { const t = today(); return sessionsArr().filter(s => s.date === t && s.status === 'active').slice(-1)[0] || null; }
function availEquipment() { return eqArr().filter(e => e.available !== false); }
function missingEquipment() { return eqArr().filter(e => e.available === false); }
function exUsable(e) { const ids = new Set(availEquipment().map(q => q.id)); return (e.equipmentIds || []).every(id => ids.has(id)); }
function tomorrowFootball() { const p = cfg('plan').days[DOW_KEYS[(tzNow().dow + 1) % 7]]; return !!(p && p.kind === 'football'); }
function previewSession() {
  const T = tzNow(), plan = cfg('plan').days[DOW_KEYS[T.dow]] || {};
  return buildSession({ template: decidedTemplate(), location: ui.gymLocation, timeMin: ui.gymTime || defaultSessionMin(), energy: ui.gymEnergy, exercises: exArr(), equipment: eqArr(), sessions: sessionsArr(), rules: cfg('rules'), date: T.date, tomorrowFootball: tomorrowFootball(), lastRunWalk: lastRunWalk() });
}

// ONE decision: the plan's template, or (off-plan day) the gym day not yet done this week.
function decidedTemplate() {
  const T = tzNow(), plan = cfg('plan').days[DOW_KEYS[T.dow]] || {};
  if (plan.kind === 'gym' && plan.template) return plan.template;
  const ws = weekStart(T.date), done = new Set(sessionsArr().filter(s => s.status === 'done' && s.date >= ws).map(s => s.template));
  return ['A', 'C', 'B'].find(k => !done.has(k) && !(TEMPLATES[k].heavyLegs && tomorrowFootball())) || 'B';
}
function startSessionFrom(o) {
  const T = tzNow(), d = T.date;
  const p = buildSession({ template: o.template || decidedTemplate(), location: o.location || ui.gymLocation, timeMin: o.timeMin || ui.gymTime || defaultSessionMin(), energy: o.energy || ui.gymEnergy, exercises: exArr(), equipment: eqArr(), sessions: sessionsArr(), rules: cfg('rules'), date: d, tomorrowFootball: tomorrowFootball(), lastRunWalk: lastRunWalk(), surprise: o.surprise || 0 });
  if (!p.items.length && !p.finisher && !p.cardio) return p;
  const n = sessionsArr().filter(s => s.date === d).length;
  const id = d + '-' + 'abcdefghij'[Math.min(9, n)];
  writeDoc('sessions/' + id, () => ({ date: d, template: p.template, location: p.location, title: p.title, format: p.format, formatLabel: p.formatLabel, goal: p.goal, focus: p.focus, timeMin: p.timeMin, energy: p.energy, status: 'active', items: p.items, cardio: p.cardio, finisher: p.finisher, warnings: p.warnings, surprise: !!o.surprise, watchStart: o.watchStart ?? null, startedAt: new Date().toISOString() }));
  p.id = id;
  const missing = p.items.map(i => i.exId).filter(x => { const e = cache.get('exercises/' + x); return e && !e.howto; });
  if (missing.length && aiOn()) generateHowTo(missing);
  return p;
}
function viewGym() {
  return viewGymToday() + viewNextSession() + viewAnchors() + viewEquipmentRO() + viewRecentSessions();
}
function todaySession() { const d = today(); return sessionsArr().filter(s => s.date === d && s.status !== 'discarded').slice(-1)[0] || null; }
function setsText(it) { const done = (it.sets || []).filter(x => num(x.reps) > 0); return done.length ? describeSets(done.map(x => ({ reps: num(x.reps), w: x.w !== '' && x.w != null ? num(x.w) : num(x.kg), unit: x.unit || 'kg' }))) : ''; }
function planText(it) { const list = (it.planned && it.planned.list) || []; return list.length && (list[0].w || list[0].kg) ? describeSets(list) : `${(it.planned || {}).sets || 3}×${(it.planned || {}).reps || 10}`; }
// One routine card, used in the Gym tab and in the chat. Exercise names open the how-to.
function routineCard(s, compact) {
  const k = sessionKcal(s, bodyKg(), cfg('rules'), exById());
  let h = `<div class="routine"><div class="row sp nw"><b class="grow">${esc(s.title)}</b><span class="pill ${s.status === 'done' ? 'ok' : 'warn'}">${s.status === 'done' ? 'terminada' : 'en curso'}</span></div>`;
  h += `<p class="tiny muted" style="margin:2px 0 6px">${esc(s.formatLabel || 'series normales')} · ${s.timeMin || '—'} min${s.watchStart != null ? ' · reloj al empezar ' + fmt(s.watchStart) : ''}</p><ol class="rlist">`;
  for (const it of s.items || []) {
    const doneN = (it.sets || []).filter(x => x.done || num(x.reps) > 0).length, total = Math.max((it.sets || []).length, (it.planned || {}).sets || 0);
    const done = total && doneN >= total;
    h += `<li class="${done ? 'done' : ''}"><span class="rcheck" aria-hidden="true">${done ? '✓' : doneN ? doneN + '/' + total : ''}</span><span class="grow"><button class="linkbtn" data-act="howto" data-arg="${esc(it.exId)}">${esc(it.name)}</button>${it.anchor ? ' <span class="pill ok">ancla</span>' : ''}${it.group ? ` <span class="tiny ink2">${esc(it.group)}</span>` : ''}<span class="tiny muted" style="display:block">Plan: ${esc(planText(it))}${setsText(it) ? ' · hecho: ' + esc(setsText(it)) : ''}${it.feel ? ' · ' + esc(it.feel) : ''}</span></span></li>`;
  }
  if (s.cardio) h += `<li class="${s.cardio.done ? 'done' : ''}"><span class="rcheck" aria-hidden="true">${s.cardio.done ? '✓' : ''}</span><span class="grow"><b>Intervalos en ${s.cardio.type === 'elliptical' ? 'elíptica' : 'cinta'}</b><span class="tiny muted" style="display:block">${esc(s.cardio.text || '')}</span></span></li>`;
  if (s.finisher) h += `<li class="${s.finisher.done ? 'done' : ''}"><span class="rcheck" aria-hidden="true">${s.finisher.done ? '✓' : ''}</span><span class="grow"><b>Final: ${esc(s.finisher.name)}</b><span class="tiny muted" style="display:block">${esc(s.finisher.desc)}</span></span></li>`;
  h += `</ol>`;
  if (!compact || s.status === 'done') h += `<p class="tiny ink2" style="margin:6px 0 0">${k.watchDelta != null ? `estimado ${fmt(k.estimate)} − reloj ${fmt(k.strengthSeen)} = +${fmt(k.extra)} kcal` : (s.watchStart != null && s.status !== 'done' ? `estimado ${fmt(k.estimate)} kcal hasta ahora (falta la lectura final del reloj)` : `estimado ${fmt(k.estimate)} kcal (sin lecturas del reloj: cuenta 100 %)`)}</p>`;
  if (s.status === 'done') { const nx = (s.items || []).map(it => { const n = nextStrength(it, { unit: itemDisplayUnit(it) }); return n ? `${it.name}: ${n.action === 'block' ? 'bloquear (dolor)' : n.text}` : null; }).filter(Boolean); if (nx.length) h += `<p class="tiny" style="margin:6px 0 0"><b>Próxima vez:</b> ${esc(nx.join(' · '))}</p>`; }
  return h + `</div>`;
}
function viewGymToday() {
  const T = tzNow(), plan = cfg('plan').days[DOW_KEYS[T.dow]] || {}, s = todaySession();
  if (!s && beforePlan(T.date)) return `<section class="card" aria-labelledby="h-gymhoy"><h2 id="h-gymhoy">Hoy</h2><p class="small ink2" style="margin:0">Día 0: hoy descansas. El plan empieza el ${esc(fmtDateEs(planStartDate(), true))}.</p></section>`;
  let h = `<section class="card" aria-labelledby="h-gymhoy"><h2 id="h-gymhoy">Hoy</h2>`;
  if (s) h += routineCard(s);
  else {
    h += `<p class="small" style="margin:0 0 6px">${plan.kind === 'gym' ? 'Toca ' + esc(plan.title) + '.' : 'Plan de hoy: ' + esc(dayTitle(plan, T)) + '.'}</p>`;
    h += `<p class="small ink2" style="margin:0 0 10px">Cuando llegues, escríbele al chat: «acabo de llegar al gym, tengo 60 min, el reloj marca …». Él arma tu rutina y la ves aquí.</p>`;
    h += `<button class="primary full" data-act="gymChat">Abrir chat</button>`;
  }
  return h + `</section>`;
}
function nextGymDay() {
  const T = tzNow(), plan = cfg('plan');
  for (let i = todaySession() ? 1 : 0; i < 8; i++) { const d = addDays(T.date, i), p = plan.days[DOW_KEYS[dowIndex(d)]] || {}; if (p.kind === 'gym') return { date: d, plan: p }; }
  return null;
}
function viewNextSession() {
  const n = nextGymDay(); if (!n) return '';
  const tomorrowFb = (cfg('plan').days[DOW_KEYS[(dowIndex(n.date) + 1) % 7]] || {}).kind === 'football';
  const p = buildSession({ template: n.plan.template, timeMin: 60, energy: 'normal', exercises: exArr(), equipment: eqArr(), sessions: sessionsArr(), rules: cfg('rules'), date: n.date, tomorrowFootball: tomorrowFb, lastRunWalk: lastRunWalk() });
  return `<section class="card" aria-labelledby="h-next"><h2 id="h-next">Próxima sesión</h2><p class="small ink2" style="margin:0 0 6px">${fmtDateEs(n.date, true)} · ${esc(p.title)} · ~60 min</p><p class="small" style="margin:0">${p.items.map(i => esc(i.name)).join(' · ') || 'Aún no conozco equipo para esta sesión.'}${p.finisher ? ' · final: ' + esc(p.finisher.name) : ''}</p></section>`;
}
function viewAnchors() {
  const anchors = exArr().filter(e => e.anchor && !e.blocked); if (!anchors.length) return '';
  const done = sessionsArr().filter(s => s.status === 'done'), prs = Object.fromEntries(prsFrom(done).map(p => [p.exId, p]));
  const rows = anchors.map(e => { const last = lastLogFor(e.id, sessionsArr()), pr = prs[e.id]; return `<tr><td>${esc(e.name)}<span class="tiny muted" style="display:block">${last ? 'último ' + fmtDateEs(last.date) + ': ' + esc(setsText(last)) : 'sin registros aún'}</span></td><td class="n">${pr ? esc(fmtW(pr.w, pr.unit)) + ' × ' + pr.reps : '—'}</td></tr>`; }).join('');
  return `<section class="card" aria-labelledby="h-anc"><h2 id="h-anc">Progreso en tus anclas</h2><table class="ledger">${rows}</table><p class="tiny muted" style="margin:6px 0 0">A la derecha, tu mejor marca.</p></section>`;
}
function viewEquipmentRO() {
  const av = availEquipment().filter(e => !e.confirm), conf = availEquipment().filter(e => e.confirm), miss = missingEquipment();
  const item = e => `<li>${e.photoId ? `<img class="thumb sm" src="${esc(files.urlFor(e.photoId))}" alt="" loading="lazy">` : ''}<span class="grow">${esc(e.name)}${e.notes ? `<span class="tiny muted" style="display:block">${esc(e.notes)}</span>` : ''}</span></li>`;
  let h = `<section class="card" aria-labelledby="h-eq"><h2 id="h-eq">Equipo</h2>`;
  h += `<details class="how"><summary>Tiene (${av.length})</summary><ul class="eqlist">${av.map(item).join('')}</ul></details>`;
  if (conf.length) h += `<details class="how"><summary>Por confirmar (${conf.length})</summary><ul class="eqlist">${conf.map(item).join('')}</ul></details>`;
  if (miss.length) h += `<details class="how"><summary>No tiene (${miss.length})</summary><ul class="eqlist">${miss.map(e => `<li><span class="grow">${esc(e.name)}${(e.substitutes || []).length ? `<span class="tiny muted" style="display:block">En su lugar: ${esc(e.substitutes.join(' · '))}</span>` : ''}</span></li>`).join('')}</ul></details>`;
  h += `<button class="full" style="margin-top:10px" data-act="walkChat">Recorrer el gym (fotos por el chat)</button>`;
  return h + `</section>`;
}
ACTIONS.gymChat = () => openChat('Acabo de llegar al gym, tengo 60 min, el reloj marca ');
ACTIONS.walkChat = () => openChat('Modo inventario: estoy recorriendo el gym. Te mando una foto de cada máquina y del rack de accesorios.');
ACTIONS.howto = exId => { ui.sheet = 'howto:' + exId; render(); };

function viewPreSession() {
  const T = tzNow(), plan = cfg('plan').days[DOW_KEYS[T.dow]] || {};
  const chip = (act, v, cur, label) => `<button class="chip" data-act="${act}" data-arg="${v}" aria-pressed="${String(v) === String(cur)}">${label}</button>`;
  let h = `<section class="card" aria-labelledby="h-gymhoy"><h2 id="h-gymhoy">${plan.kind === 'gym' ? esc(plan.title) : 'Hoy no toca gym'}</h2>`;
  if (plan.kind !== 'gym') h += `<p class="small ink2" style="margin-top:0">Plan de hoy: ${esc(plan.title || 'libre')}. Si igual vas, esta es tu sesión:</p>`;
  h += `<p class="small ink2" style="margin:0 0 6px">¿Dónde?</p><div class="chips">${chip('gymLoc', 'gym', ui.gymLocation, 'Gym')}${chip('gymLoc', 'casa', ui.gymLocation, 'Casa')}</div>`;
  h += `<p class="small ink2" style="margin:10px 0 6px">¿Cuánto tiempo tienes?</p><div class="chips">${[30, 45, 60, 90].map(m => chip('gymTime', m, ui.gymTime || defaultSessionMin(), m + ' min')).join('')}</div>`;
  h += `<p class="small ink2" style="margin:10px 0 6px">¿Cómo está tu energía?</p><div class="chips">${ENERGY.map(([k, l]) => chip('gymEnergy', k, ui.gymEnergy, l)).join('')}</div>`;
  const p = previewSession();
  if (p.warnings.length) h += p.warnings.map(w => `<p class="small warn" style="margin:8px 0 0">${esc(w)}</p>`).join('');
  if (!p.items.length && !p.cardio) {
    h += `<div class="empty"><div class="big">Aún no conozco equipo para esta sesión</div><p class="small ink2">Solo armo sesiones con lo que hay en tu gym. Mándame fotos de las máquinas por el chat o agrégalas abajo.</p><div class="row" style="justify-content:center"><button class="primary" data-act="eqViaChat">Agregar por el chat</button><button data-act="toggleEqForm">Formulario</button></div></div>`;
  } else {
    h += `<div style="margin-top:12px"><h3>${esc(p.title)} · ~${p.estMin} min</h3><p class="tiny muted" style="margin:0">Formato: ${esc(p.formatLabel)}</p><ol class="small" style="padding-left:20px;margin:4px 0">`;
    h += p.items.map(it => `<li><b>${esc(it.name)}</b>${it.anchor ? ' <span class="pill ok">ancla</span>' : ''}${it.isNew ? ' <span class="pill warn">nuevo</span>' : ''} <span class="muted">${it.planned.list[0].w || it.planned.list[0].kg ? esc(describeSets(it.planned.list)) : it.planned.sets + '×' + it.planned.reps}${it.group ? ' · ' + esc(it.group) : ''}</span></li>`).join('');
    if (p.cardio) h += `<li><b>Intervalos en cinta</b> <span class="muted">${esc(p.cardio.text)}</span></li>`;
    if (p.finisher) h += `<li><b>Final: ${esc(p.finisher.name)}</b> <span class="muted">${esc(p.finisher.desc)}</span></li>`;
    h += `</ol>`;
    if (p.template === 'B' && !p.items.some(i => i.pattern === 'core' || i.pattern === 'rotation')) h += `<p class="tiny muted">Aún no tengo ejercicios de core/rotación en tu inventario. Dímelo en el chat cuando veas algo (pallof en polea, plancha, rueda).</p>`;
    h += `<button class="primary full" style="margin-top:8px" data-act="startSession">Empezar sesión</button><button class="ghost full" style="margin-top:6px" data-act="surprise">¿Algo distinto hoy? Sorpréndeme</button></div>`;
  }
  return h + `</section>`;
}
ACTIONS.gymLoc = v => { ui.gymLocation = v; render(); };
ACTIONS.gymTpl = v => { ui.gymTemplate = v; render(); };
ACTIONS.gymTime = v => { ui.gymTime = +v; render(); };
ACTIONS.gymEnergy = v => { ui.gymEnergy = v; render(); };
ACTIONS.eqViaChat = () => { ui.chat.draft = 'Quiero agregar equipo de mi gym: '; ACTIONS.tab('chat'); };
ACTIONS.startSession = () => startSessionFrom({});
ACTIONS.surprise = () => { const p = startSessionFrom({ surprise: Date.now() % 100000 + 1 }); if (!p.items.length) toast('No tengo equipo suficiente para una sorpresa hoy.'); else toast('Sesión sorpresa lista.'); };

function itemDisplayUnit(it) { return it.unit || (it.planned && it.planned.unit) || ((it.sets || []).find(s => s.unit) || {}).unit || 'kg'; }
function viewSession(s) {
  const kg = bodyKg(), k = sessionKcal(s, kg, cfg('rules'), exById());
  let h = `<section class="card" aria-labelledby="h-sess"><div class="row sp"><h2 id="h-sess">${esc(s.title)}</h2><span class="pill ok">en curso</span></div>
    <p class="small ink2" style="margin:0">${s.timeMin} min · ${esc(s.formatLabel || 'series normales')} · energía ${esc(s.energy)} · ~<b class="num">${fmt(k.gross)}</b> kcal (${fmt(k.extra)} extra al reloj)</p>`;
  for (const w of s.warnings || []) h += `<p class="small warn" style="margin:6px 0 0">${esc(w)}</p>`;
  h += `</section>`;
  (s.items || []).forEach((it, i) => { h += viewItem(s, it, i); });
  if (s.cardio) h += viewCardio(s);
  if (s.finisher) h += viewFinisher(s);
  const others = exArr().filter(e => !e.blocked && e.pattern !== 'cardio' && exUsable(e) && (s.location === 'casa' ? e.location === 'casa' : e.location !== 'casa') && !(s.items || []).some(it => it.exId === e.id));
  if (others.length) h += `<section class="card"><label for="addEx">Agregar ejercicio</label><div class="row nw"><select id="addEx" class="grow">${others.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select><button data-act="addExToSession">Agregar</button></div></section>`;
  const c1 = confirmBtns('finish', 'finishSession', s.id, 'Sí, terminar'), c2 = confirmBtns('discard', 'discardSession', s.id, 'Sí, descartar');
  h += `<section class="card"><div class="row">${c1 || `<button class="primary grow" data-act="ask" data-arg="finish">Terminar sesión</button>`}${c2 || `<button class="ghost" data-act="ask" data-arg="discard">Descartar</button>`}</div></section>`;
  return h;
}
function howToBlock(ex, it, s, forceOpen) {
  const open = forceOpen || timesDone(ex.id, sessionsArr()) <= 3;
  const ho = ex.howto;
  const focus = (s && s.focus) || [];
  let h = `<details class="how" ${open ? 'open' : ''}><summary>Cómo se hace</summary>${figSVG(ex.pattern || it.pattern, 'md')}<p class="tiny muted" style="text-align:center;margin:0">${esc(figCaption(ex.pattern || it.pattern))}</p>`;
  const eq = eqArr().find(q => (ex.equipmentIds || []).includes(q.id) && q.photoId);
  if (eq) h += `<img class="photo" src="${esc(files.urlFor(eq.photoId))}" alt="Foto de tu ${esc(eq.name)}" loading="lazy">`;
  if (ho) {
    if ((ho.setup || []).length) h += `<b class="small">Preparación</b><ul class="small">${ho.setup.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if ((ho.execution || []).length) h += `<b class="small">Ejecución</b><ul class="small">${ho.execution.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const vs = ho.variants || {};
    const vk = focus.find(f => vs[f]) || Object.keys(vs)[0];
    if (vk) h += `<p class="small" style="margin:4px 0"><b>Para hoy (${esc(vk)}):</b> ${esc(vs[vk])}</p>`;
    if ((ho.mistakes || []).length) h += `<b class="small">Errores comunes</b><ul class="small">${ho.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    if (ho.tempo) h += `<p class="small" style="margin:4px 0"><b>Tempo:</b> ${esc(ho.tempo)}</p>`;
  } else if (aiOn()) h += `<p class="small muted">Aún no tengo la guía de este ejercicio.</p><button class="sm" data-act="genHow" data-arg="${esc(ex.id)}" ${ui.howBusy ? 'disabled' : ''}>${ui.howBusy ? 'Generando…' : 'Generar guía'}</button>`;
  if (ex.notes) h += `<p class="tiny muted">${esc(ex.notes)}</p>`;
  h += `<p style="margin:8px 0 0"><a class="btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' técnica')}" target="_blank" rel="noopener noreferrer">Ver video ↗</a></p></details>`;
  return h;
}
function viewItem(s, it, i) {
  const ex = cache.get('exercises/' + it.exId) ? { id: it.exId, ...cache.get('exercises/' + it.exId) } : { id: it.exId, name: it.name, pattern: it.pattern };
  const unit = itemDisplayUnit(it), list = (it.planned && it.planned.list) || [];
  const planTxt = list.length && (list[0].w || list[0].kg) ? describeSets(list) : `${it.planned.sets}×${it.planned.reps}`;
  let h = `<section class="card" aria-labelledby="h-it${i}"><div class="exhead">${figSVG(it.pattern, 'sm')}<div class="grow"><h3 id="h-it${i}">${esc(it.name)}${it.anchor ? ' <span class="pill ok">ancla</span>' : ''}${it.isNew ? ' <span class="pill warn">nuevo</span>' : ''}</h3>${it.group ? `<div class="tiny ink2">${esc(it.group)}</div>` : ''}<div class="small"><b>Plan:</b> ${esc(planTxt)}</div><div class="tiny muted">${esc(it.why || '')}</div></div></div>`;
  h += howToBlock(ex, it, s);
  h += `<div class="row sp" style="margin-top:10px"><span class="small ink2">Series</span><span class="row"><span class="tiny muted">Unidad</span><button class="chip" style="min-height:36px" data-act="setUnit" data-arg="${i}.kg" aria-pressed="${unit === 'kg'}">kg</button><button class="chip" style="min-height:36px" data-act="setUnit" data-arg="${i}.lb" aria-pressed="${unit === 'lb'}">lb</button></span></div>`;
  (it.sets || []).forEach((st, j) => {
    const pl = list[j] || list[list.length - 1] || {};
    const done = !!st.done;
    h += `<div class="setrow"><button class="chk ${done ? 'done' : ''}" data-act="toggleSet" data-arg="${i}.${j}" aria-pressed="${done}" aria-label="Serie ${j + 1} ${done ? 'hecha' : 'pendiente'}">${done ? '✓' : j + 1}</button>
      <div><label class="sr" for="r-${i}-${j}">Reps serie ${j + 1}</label><input id="r-${i}-${j}" type="number" inputmode="numeric" placeholder="${esc(pl.reps ?? '')} reps" value="${esc(st.reps ?? '')}" data-change="setField" data-arg="${i}.${j}.reps"></div>
      <div><label class="sr" for="w-${i}-${j}">Peso serie ${j + 1} en ${unit}</label><input id="w-${i}-${j}" type="number" inputmode="decimal" step="any" placeholder="${pl.w ? esc(pl.w) + ' ' + esc(pl.unit || unit) : unit}" value="${esc(st.w ?? (st.kg ?? ''))}" data-change="setField" data-arg="${i}.${j}.w"></div></div>`;
  });
  const doneN = (it.sets || []).filter(x => x.done).length;
  h += `<div class="row sp" style="margin-top:6px"><span class="tiny muted">${doneN}/${(it.sets || []).length} hechas</span><button class="sm ghost" data-act="addSet" data-arg="${i}">+ serie</button></div>`;
  h += `<p class="small ink2" style="margin:8px 0 4px">¿Cómo se sintió?</p><div class="chips">${FEELS.map(([k, l]) => `<button class="chip" data-act="setFeel" data-arg="${i}.${k}" aria-pressed="${it.feel === k}">${l}</button>`).join('')}</div>`;
  if (ui.painOffer === i) {
    const alt = similarExercise(ex, exArr().filter(e => exUsable(e) && (s.location === 'casa' ? e.location === 'casa' : e.location !== 'casa') &&!(s.items || []).some(x => x.exId === e.id)));
    h += `<div class="card confirm" style="margin:8px 0 0"><p class="small" style="margin-top:0">Si te lastima, no lo hagas. ¿Lo bloqueo para próximas sesiones${alt ? ` y lo cambio por <b>${esc(alt.name)}</b>` : ''}?</p><div class="row"><button class="primary sm" data-act="blockEx" data-arg="${i}">Bloquear${alt ? ' y cambiar' : ''}</button>${alt ? `<button class="sm" data-act="swapEx" data-arg="${i}">Solo cambiar hoy</button>` : ''}<button class="sm ghost" data-act="closePain">No</button></div></div>`;
  }
  if (aiOn()) h += `<div class="row nw" style="margin-top:8px"><label class="sr" for="ft-${i}">Escribe lo que hiciste</label><input id="ft-${i}" class="grow" placeholder="Ej: hice 3 con 5 kg y la última con 12"><button class="sm" data-act="parseSets" data-arg="${i}" ${ui.parseBusy === i ? 'disabled' : ''}>${ui.parseBusy === i ? '…' : 'Anotar'}</button></div>`;
  const nx = nextStrength({ ...it, planned: it.planned }, { unit });
  if (nx && (it.sets || []).some(x => num(x.reps) > 0)) h += `<p class="small" style="margin:8px 0 0"><b>Próxima vez:</b> ${nx.action === 'block' ? 'bloquear y cambiar' : esc(nx.text)} <span class="tiny muted">${esc(nx.why)}</span></p>`;
  h += `<div class="row" style="margin-top:8px"><button class="sm ghost" data-act="swapEx" data-arg="${i}">Cambiar ejercicio</button><button class="sm ghost" data-act="removeItem" data-arg="${i}">Quitar</button></div>`;
  return h + `</section>`;
}
function viewFinisher(s) {
  const f = s.finisher;
  return `<section class="card" aria-labelledby="h-fin"><div class="row sp"><h3 id="h-fin" style="margin:0">Final: ${esc(f.name)}</h3><span class="pill warn">${esc(f.kind)} · ${f.minutes} min</span></div><p class="small" style="margin:6px 0">${esc(f.desc)}</p>
  ${f.scoreLabel ? `<div class="field"><label for="fin-score">Tu marca (${esc(f.scoreLabel)})</label><input id="fin-score" type="number" inputmode="decimal" value="${esc(f.score ?? '')}" data-change="setFinisher" data-arg="score"></div>` : ''}
  <label class="row small" style="margin:8px 0 0"><input type="checkbox" data-change="setFinisherChk" data-arg="watchCounted" ${f.watchCounted !== false ? 'checked' : ''}> El reloj ya lo contó</label>
  <button class="chk ${f.done ? 'done' : ''}" style="width:auto;padding:0 14px;margin-top:8px" data-act="finisherDone" aria-pressed="${!!f.done}">${f.done ? '✓ Hecho' : 'Marcar hecho'}</button></section>`;
}
ACTIONS.setFinisher = (f, el) => writeSess(curSessId(), s => { s.finisher[f] = num(el.value) ?? ''; });
ACTIONS.setFinisherChk = (f, el) => writeSess(curSessId(), s => { s.finisher[f] = el.checked; });
ACTIONS.finisherDone = () => writeSess(curSessId(), s => { s.finisher.done = !s.finisher.done; });
function viewCardio(s) {
  const c = s.cardio;
  return `<section class="card" aria-labelledby="h-card"><div class="exhead">${figSVG('cardio', 'sm')}<div class="grow"><h3 id="h-card">Intervalos en cinta</h3><div class="small"><b>Plan:</b> ${esc(c.text || '')}</div><div class="tiny muted">${esc(c.why || '')}</div></div></div>
  <div class="grid3" style="margin-top:8px"><div class="field"><label for="c-run">Trote min</label><input id="c-run" type="number" inputmode="decimal" value="${esc(c.runMin)}" data-change="setCardio" data-arg="runMin"></div><div class="field"><label for="c-walk">Caminata min</label><input id="c-walk" type="number" inputmode="decimal" value="${esc(c.walkMin)}" data-change="setCardio" data-arg="walkMin"></div><div class="field"><label for="c-rounds">Rondas</label><input id="c-rounds" type="number" inputmode="numeric" value="${esc(c.rounds)}" data-change="setCardio" data-arg="rounds"></div></div>
  <p class="small ink2" style="margin:8px 0 4px">¿Cómo salió?</p><div class="chips">${FEELS.slice(0, 3).map(([k, l]) => `<button class="chip" data-act="cardioFeel" data-arg="${k}" aria-pressed="${c.feel === k}">${l}</button>`).join('')}</div>
  <label class="row small" style="margin:8px 0 0"><input type="checkbox" data-change="setCardioChk" data-arg="completed" ${c.completed !== false ? 'checked' : ''}> Completé todas las rondas</label>
  <label class="row small" style="margin:6px 0 0"><input type="checkbox" data-change="setCardioChk" data-arg="watchCounted" ${c.watchCounted !== false ? 'checked' : ''}> El reloj ya lo contó</label>
  <button class="chk ${c.done ? 'done' : ''}" style="width:auto;padding:0 14px;margin-top:8px" data-act="cardioDone" aria-pressed="${!!c.done}">${c.done ? '✓ Hecho' : 'Marcar hecho'}</button></section>`;
}

function writeSess(id, fn) { return writeDoc('sessions/' + id, cur => { if (!cur) return null; return fn(cur) === false ? null : cur; }); }
function curSessId() { const s = activeSession(); return s && s.id; }
ACTIONS.setField = (arg, el) => {
  const [i, j, f] = arg.split('.'); const id = curSessId(); if (!id) return;
  const v = el.value === '' ? '' : num(el.value);
  writeSess(id, s => {
    const it = s.items[+i]; const st = it.sets[+j]; if (!st) return false;
    st[f] = v; st.unit = itemDisplayUnit(it);
    if (f === 'w') st.kg = v === '' ? '' : toKg(v, st.unit);
    if (f === 'reps') st.done = v !== '' && v > 0;
  });
};
ACTIONS.toggleSet = arg => {
  const [i, j] = arg.split('.').map(Number); const id = curSessId(); if (!id) return;
  writeSess(id, s => {
    const it = s.items[i], st = it.sets[j], pl = (it.planned.list || [])[j] || it.planned.list?.slice(-1)[0] || {};
    if (!st.done) {
      if (st.reps === '' || st.reps == null) st.reps = pl.reps || it.planned.reps || '';
      if ((st.w === '' || st.w == null) && pl.w) { st.w = pl.w; st.unit = pl.unit || itemDisplayUnit(it); st.kg = toKg(st.w, st.unit); }
      st.done = true;
    } else st.done = false;
  });
};
ACTIONS.setUnit = arg => { const [i, u] = arg.split('.'); const id = curSessId(); writeSess(id, s => { const it = s.items[+i]; it.unit = u; for (const st of it.sets) { st.unit = u; if (st.w !== '' && st.w != null) st.kg = toKg(st.w, u); } }); };
ACTIONS.addSet = i => writeSess(curSessId(), s => { const it = s.items[+i]; it.sets.push({ reps: '', w: '', unit: itemDisplayUnit(it), done: false }); });
ACTIONS.setFeel = arg => {
  const [i, f] = arg.split('.');
  writeSess(curSessId(), s => { s.items[+i].feel = f; });
  if (f === 'dolor') { ui.painOffer = +i; render(); }
};
ACTIONS.closePain = () => { ui.painOffer = null; render(); };
function swapItem(s, i) {
  const it = s.items[i]; const ex = { id: it.exId, ...(cache.get('exercises/' + it.exId) || { pattern: it.pattern, name: it.name }) };
  const pool = exArr().filter(e => exUsable(e) && (s.location === 'casa' ? e.location === 'casa' : e.location !== 'casa'));
  const alt = similarExercise(ex, pool, s.items.map(x => x.exId));
  if (!alt) return null;
  const sets = it.planned.sets || 3, reps = DEFAULT_REPS[alt.pattern] || 10;
  s.items[i] = { exId: alt.id, name: alt.name, pattern: alt.pattern, vigorous: !!alt.vigorous, swappedFrom: it.name, planned: { sets, reps, kg: null, w: null, unit: 'kg', list: Array.from({ length: sets }, () => ({ reps, kg: null, w: null, unit: 'kg' })) }, why: `En lugar de ${it.name}. Elige un peso con el que te sobren 2 reps.`, sets: Array.from({ length: sets }, () => ({ reps: '', w: '', unit: 'kg', done: false })), feel: null };
  return alt;
}
ACTIONS.swapEx = i => {
  const s = activeSession(); if (!s) return; ui.painOffer = null;
  let alt = null;
  writeSess(s.id, cur => { alt = swapItem(cur, +i); return alt ? undefined : false; }).then(() => { if (!alt) toast('No tengo otro ejercicio parecido con tu equipo.'); else { toast('Cambiado por ' + alt.name + '.'); if (!cache.get('exercises/' + alt.id)?.howto && aiOn()) generateHowTo([alt.id]); } });
};
ACTIONS.blockEx = i => {
  const s = activeSession(); if (!s) return; const it = s.items[+i]; ui.painOffer = null;
  writeDoc('exercises/' + it.exId, cur => cur ? { ...cur, blocked: true, blockedReason: 'dolor', blockedAt: today() } : null);
  ACTIONS.swapEx(i);
};
ACTIONS.removeItem = i => writeSess(curSessId(), s => { s.items.splice(+i, 1); });
ACTIONS.addExToSession = () => {
  const e = cache.get('exercises/' + val('addEx')); if (!e) return; const id = val('addEx');
  const s = activeSession(); const last = lastLogFor(id, sessionsArr(), s.date);
  const prog = nextStrength(last);
  const list = prog && prog.action !== 'block' ? prog.sets : Array.from({ length: 3 }, () => ({ reps: DEFAULT_REPS[e.pattern] || 10, kg: null, w: null, unit: 'kg' }));
  writeSess(s.id, cur => { cur.items.push({ exId: id, name: e.name, pattern: e.pattern, vigorous: !!e.vigorous, planned: { sets: list.length, reps: list[0].reps, kg: list[0].kg, w: list[0].w, unit: (prog && prog.unit) || 'kg', list }, why: prog ? prog.why : 'Primera vez: elige un peso con el que te sobren 2 reps.', sets: list.map(() => ({ reps: '', w: '', unit: (prog && prog.unit) || 'kg', done: false })), feel: null }); });
  if (!e.howto && aiOn()) generateHowTo([id]);
};
ACTIONS.setCardio = (f, el) => writeSess(curSessId(), s => { s.cardio[f] = num(el.value) || 0; });
ACTIONS.setCardioChk = (f, el) => writeSess(curSessId(), s => { s.cardio[f] = el.checked; });
ACTIONS.cardioFeel = f => writeSess(curSessId(), s => { s.cardio.feel = f; });
ACTIONS.cardioDone = () => writeSess(curSessId(), s => { s.cardio.done = !s.cardio.done; if (s.cardio.completed == null) s.cardio.completed = true; });
ACTIONS.finishSession = id => {
  ui.confirm = null;
  writeSess(id, s => {
    s.items = s.items.map(it => ({ ...it, sets: it.sets.filter(x => num(x.reps) > 0) })).filter(it => it.sets.length);
    const k = sessionKcal(s, bodyKg(), cfg('rules'), exById());
    s.kcalGross = k.gross; s.kcalExtra = k.extra; s.status = 'done'; s.finishedAt = new Date().toISOString();
  });
  ui.finishOffer = id; toast('Sesión guardada. ¡Bien!');
};
ACTIONS.discardSession = id => { ui.confirm = null; writeSess(id, s => { s.status = 'discarded'; }); };
ACTIONS.genHow = id => generateHowTo([id]);

function viewFinished() {
  if (!ui.finishOffer) return '';
  const s = cache.get('sessions/' + ui.finishOffer); if (!s || s.status !== 'done') return '';
  let h = `<section class="card confirm"><div class="row sp"><h2>Para la próxima</h2><button class="sm ghost" data-act="closeFinished" aria-label="Cerrar">×</button></div><p class="small" style="margin-top:0">${esc(s.title)}: ~${fmt(s.kcalGross)} kcal (${fmt(s.kcalExtra)} extra al reloj).</p><ul class="small" style="padding-left:18px">`;
  for (const it of s.items || []) { const nx = nextStrength(it, { unit: itemDisplayUnit(it) }); if (nx) h += `<li><b>${esc(it.name)}:</b> ${nx.action === 'block' ? 'bloquear (dolor)' : esc(nx.text)}</li>`; }
  if (s.cardio && s.cardio.done) { const n = nextRunWalk(s.cardio); h += `<li><b>Intervalos:</b> ${esc(n.text)}</li>`; }
  if (availEquipment().some(e => e.id === 'sauna')) h += `<li class="muted">Sauna opcional ahora: toma ~0,5 L de agua cada 15–20 min.</li>`;
  return h + `</ul></section>`;
}
ACTIONS.closeFinished = () => { ui.finishOffer = null; render(); };
function viewRecentSessions() {
  const done = sessionsArr().filter(s => s.status === 'done').slice(-6).reverse();
  if (!done.length) return '';
  return `<section class="card" aria-labelledby="h-rec"><h2 id="h-rec">Últimas sesiones</h2>${done.map(s => `<details class="how"><summary>${fmtDateEs(s.date, true)} · ${esc((s.title || '').split('· ')[1] || s.title)} · ${fmt(s.kcalGross)} kcal</summary><ul class="small" style="padding-left:18px">${(s.items || []).map(it => `<li>${esc(it.name)}: ${esc(describeSets(it.sets.map(x => ({ reps: num(x.reps), w: x.w !== '' && x.w != null ? num(x.w) : num(x.kg), unit: x.unit || 'kg' }))))}${it.feel ? ' · ' + esc(it.feel) : ''}</li>`).join('')}</ul></details>`).join('')}</section>`;
}

// ---------- Inventory ----------
function viewInventory() {
  const av = availEquipment(), miss = missingEquipment();
  let h = `<section class="card" aria-labelledby="h-inv"><h2 id="h-inv">Mi equipo (${av.length})</h2>`;
  if (!av.length) h += `<div class="empty"><p class="small ink2">Todavía no hay equipo. Mándame fotos por el chat o usa el formulario.</p></div>`;
  h += av.map(e => `<div class="row nw" style="padding:6px 0;border-bottom:1px solid var(--line)">${e.photoId ? `<img class="thumb" src="${esc(files.urlFor(e.photoId))}" alt="" loading="lazy">` : ''}<div class="grow"><b class="small">${esc(e.name)}</b>${e.confirm ? ' <span class="pill warn">por confirmar</span>' : ''}<div class="tiny muted">${esc(e.notes || '')}</div></div>${files.available() ? `<button class="sm ghost" data-act="eqPhoto" data-arg="${esc(e.id)}" aria-label="Foto de ${esc(e.name)}">Foto</button>` : ''}</div>`).join('');
  if (miss.length) h += `<h3 style="margin-top:12px">NO la tengo</h3>` + miss.map(e => `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><b class="small">${esc(e.name)}</b>${(e.substitutes || []).length ? `<ul class="tiny muted" style="padding-left:18px;margin:2px 0">${e.substitutes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('');
  if (ui.eqForm) {
    const kinds = [['machine', 'Máquina'], ['free', 'Peso libre'], ['bench', 'Banco'], ['cardio', 'Cardio'], ['attachment', 'Accesorio'], ['court', 'Cancha'], ['other', 'Otro']];
    h += `<div class="card confirm" style="margin:10px 0 0"><div class="field"><label for="eq-name">Nombre del equipo</label><input id="eq-name" placeholder="Ej: prensa 45°"></div>
      <div class="grid2" style="margin-top:6px"><div class="field"><label for="eq-kind">Tipo</label><select id="eq-kind">${kinds.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field"><label for="eq-inc">Salto de peso (kg)</label><input id="eq-inc" inputmode="decimal" placeholder="2.5"></div></div>
      <label class="row small" style="margin:8px 0"><input type="checkbox" id="eq-avail" checked> Sí la tengo (desmarca para la lista "NO la tengo")</label>
      <div class="grid2"><div class="field"><label for="eq-ex">Ejercicio con este equipo (opcional)</label><input id="eq-ex" placeholder="Ej: prensa para glúteos"></div><div class="field"><label for="eq-pat">Movimiento</label><select id="eq-pat">${Object.entries(PATTERNS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
      ${files.available() ? `<button class="sm" style="margin-top:8px" data-act="eqFormPhoto">${ui.eqPhoto ? 'Foto lista ✓' : 'Agregar foto'}</button>` : ''}
      <div class="row" style="margin-top:10px"><button class="primary" data-act="saveEq">Guardar</button><button class="ghost" data-act="toggleEqForm">Cancelar</button></div></div>`;
  } else h += `<div class="row" style="margin-top:8px"><button data-act="toggleEqForm">+ Agregar equipo</button><button class="ghost" data-act="eqViaChat">Por foto en el chat</button></div>`;
  const exs = exArr();
  h += `<details class="how"><summary>Ejercicios (${exs.length})</summary>${exs.map(e => { const key = 'blk:' + e.id; const c = confirmBtns(key, 'toggleBlock', e.id, 'Sí, bloquear'); return `<div class="row nw" style="padding:6px 0;border-bottom:1px solid var(--line)"><div class="grow small">${esc(e.name)} <span class="tiny muted">${esc(PATTERNS[e.pattern] || e.pattern || '')}${e.location === 'casa' ? ' · casa' : ''}${!exUsable(e) ? ' · falta equipo' : ''}</span>${e.blocked ? ' <span class="pill over">bloqueado</span>' : ''}</div>${e.blocked ? `<button class="sm" data-act="toggleBlock" data-arg="${esc(e.id)}">Desbloquear</button>` : (c || `<button class="sm ghost" data-act="ask" data-arg="${esc(key)}">Bloquear</button>`)}</div>`; }).join('')}</details>`;
  return h + `</section>`;
}
ACTIONS.toggleEqForm = () => { ui.eqForm = !ui.eqForm; ui.eqPhoto = null; render(); if (ui.eqForm) setTimeout(() => { const el = document.getElementById('eq-name'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 0); };
ACTIONS.eqFormPhoto = () => pickImages(false, b => { ui.eqPhoto = b[0]; render(); });
const uploads = new WeakMap(); // blob -> Promise<storage path | null>
function uploadPhoto(blob) {
  if (!files.available() || !blob) return Promise.resolve(null);
  if (!uploads.has(blob)) uploads.set(blob, files.upload(blob, { type: 'image/jpeg' }).then(r => r.id).catch(e => { uploads.delete(blob); toast(e && e.code === 'quota_exceeded' ? 'Sin espacio para fotos.' : 'No pude guardar la foto.'); return null; }));
  return uploads.get(blob);
}
ACTIONS.eqPhoto = id => pickImages(false, async b => { const pid = await uploadPhoto(b[0]); if (pid) writeDoc('equipment/' + id, cur => cur ? { ...cur, photoId: pid } : null); });
ACTIONS.saveEq = async () => {
  const name = val('eq-name').trim(); if (!name) { toast('Ponle nombre al equipo.'); return; }
  const id = slug(name), available = document.getElementById('eq-avail').checked;
  const exName = val('eq-ex').trim(), pat = val('eq-pat'), kind = val('eq-kind'), inc = num(val('eq-inc'));
  const photo = ui.eqPhoto; ui.eqForm = false; ui.eqPhoto = null; render();
  const photoId = await uploadPhoto(photo);
  await writeDoc('equipment/' + id, cur => ({ ...(cur || {}), name, kind, available, incrementKg: inc || (cur && cur.incrementKg) || null, photoId: photoId || (cur && cur.photoId) || null, addedAt: today(), source: 'app' }));
  if (exName && available) { const exId = slug(exName); await writeDoc('exercises/' + exId, cur => ({ ...(cur || {}), name: exName, equipmentIds: [id], pattern: pat, muscles: (cur && cur.muscles) || [], blocked: false, source: 'app' })); if (aiOn()) generateHowTo([exId]); }
  toast(available ? 'Equipo agregado.' : 'Anotado en "NO la tengo".');
};
ACTIONS.toggleBlock = id => { ui.confirm = null; writeDoc('exercises/' + id, cur => cur ? { ...cur, blocked: !cur.blocked, blockedReason: cur.blocked ? null : 'manual' } : null); };


/* =====================================================================
   PROGRESO TAB (plain SVG charts, drawn to scale, tap/hover tooltip)
   ===================================================================== */
const chartData = {};
function chartWidth() { const v = $('#view'); return Math.max(280, Math.min(528, (v && v.clientWidth ? v.clientWidth : 358) - 30)); }
function lineChart(o) {
  // o: {id, pts:[{date,v,src}], avg:[{date,v}], goal, unit, h, marker}
  const W = chartWidth(), H = o.h || 200, L = 36, R = 10, T = 10, B = 24;
  const pts = o.pts.filter(p => p.v != null);
  if (pts.length < 2) return `<p class="small muted">Aún no hay suficientes datos.</p>`;
  const t0 = Date.parse(pts[0].date), t1 = Date.parse(pts[pts.length - 1].date);
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (o.goal != null) { lo = Math.min(lo, o.goal); hi = Math.max(hi, o.goal); }
  const pad = Math.max(0.3, (hi - lo) * 0.08); lo -= pad; hi += pad;
  const span = hi - lo, step = span <= 4 ? 0.5 : span <= 8 ? 1 : span <= 16 ? 2 : 5;
  const X = t => L + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - L - R);
  const Y = v => T + (1 - (v - lo) / span) * (H - T - B);
  let g = '<g class="ax">';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${String(r1(v)).replace('.', ',')}</text>`;
  // x ticks: month starts (or weekly for short ranges)
  const days = (t1 - t0) / 864e5;
  const d0 = new Date(t0);
  let cur = days <= 45 ? new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() + ((8 - d0.getUTCDay()) % 7))) : new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1));
  let guard = 0, lastX = -99;
  while (cur.getTime() <= t1 && guard++ < 40) {
    const x = X(cur.getTime());
    if (x - lastX > 34) { g += `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle">${days <= 45 ? cur.getUTCDate() + ' ' + MON_ES[cur.getUTCMonth()] : MON_ES[cur.getUTCMonth()]}</text>`; lastX = x; }
    cur = days <= 45 ? new Date(cur.getTime() + 7 * 864e5) : new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  g += '</g>';
  if (o.goal != null) g += `<line x1="${L}" x2="${W - R}" y1="${Y(o.goal).toFixed(1)}" y2="${Y(o.goal).toFixed(1)}" stroke="var(--good)" stroke-width="2" stroke-dasharray="5 4"/><text x="${W - R}" y="${(Y(o.goal) - 5).toFixed(1)}" text-anchor="end" fill="var(--good)" font-size="11">meta ${o.goal}</text>`;
  if (o.marker && Date.parse(o.marker.date) >= t0 && Date.parse(o.marker.date) <= t1) { const x = X(Date.parse(o.marker.date)); const right = x > W - R - 44; g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T}" y2="${H - B}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 3"/><text x="${(right ? x - 4 : x + 4).toFixed(1)}" y="${T + 10}" text-anchor="${right ? 'end' : 'start'}" fill="var(--muted)" font-size="11">${esc(o.marker.label)}</text>`; }
  const avg = (o.avg || []).filter(p => p.v != null && Date.parse(p.date) >= t0);
  if (avg.length > 1) g += `<path d="${avg.map((p, i) => (i ? 'L' : 'M') + X(Date.parse(p.date)).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('')}" fill="none" stroke="var(--chart-avg)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  else if (!o.avg) g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(Date.parse(p.date)).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('')}" fill="none" stroke="var(--chart-pt)" stroke-width="2" stroke-linejoin="round"/>`;
  const meta = [];
  for (const p of pts) {
    const x = X(Date.parse(p.date)), y = Y(p.v), hollow = p.src === 'historial';
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${hollow ? 'var(--surface)' : 'var(--chart-pt)'}" stroke="${hollow ? 'var(--chart-pt)' : 'var(--surface)'}" stroke-width="2"/>`;
    const a = avg.find(q => q.date === p.date);
    meta.push({ x, y, label: `${fmtDateEs(p.date)}: ${String(r1(p.v)).replace('.', ',')} ${o.unit}${a && o.avg ? ' · prom. 7d ' + String(r1(a.v)).replace('.', ',') : ''}${hollow ? ' · historial' : ''}` });
  }
  chartData[o.id] = { meta, W, H, T, B };
  return `<div class="chartwrap" id="${o.id}" data-chart="${o.id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Gráfico')}">${g}<line class="xhair" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--ink2)" stroke-width="1" visibility="hidden"/></svg><div class="tip"></div></div>`;
}
function bindCharts() {
  for (const el of document.querySelectorAll('[data-chart]')) {
    const d = chartData[el.dataset.chart]; if (!d) continue;
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = svg.querySelector('.xhair');
    const show = ev => {
      const r = svg.getBoundingClientRect(); const sx = (ev.clientX - r.left) * d.W / r.width;
      let best = null; for (const m of d.meta) if (!best || Math.abs(m.x - sx) < Math.abs(best.x - sx)) best = m;
      if (!best) return;
      xh.setAttribute('x1', best.x); xh.setAttribute('x2', best.x); xh.setAttribute('visibility', 'visible');
      tip.textContent = best.label; tip.style.display = 'block';
      const px = best.x * r.width / d.W, py = best.y * r.height / d.H;
      tip.style.left = Math.max(70, Math.min(r.width - 70, px)) + 'px'; tip.style.top = py + 'px';
    };
    const hide = () => { tip.style.display = 'none'; xh.setAttribute('visibility', 'hidden'); };
    el.addEventListener('pointermove', show); el.addEventListener('pointerdown', show); el.addEventListener('pointerleave', hide);
  }
}
let resizeT = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (ui.tab === 'progreso') schedule(); }, 200); });

function viewProgreso() {
  const S = series(), R7 = rolling7(S), prof = cfg('profile'), rules = cfg('rules'), goal = rules.goalKg || prof.goalKg || 78;
  const cur = R7.length ? R7[R7.length - 1].v : null, last = S[S.length - 1];
  let h = celebrateCard();
  // Goal distance
  const start = num(prof.startKg) || (S[0] && S[0].kg) || cur;
  const pct = cur ? Math.max(0, Math.min(100, (start - cur) / (start - goal) * 100)) : 0;
  h += `<section class="card" aria-labelledby="h-meta"><h2 id="h-meta">Meta: ${goal} kg</h2><div class="kpis"><div class="kpi"><div class="big">${fmt1(cur)}</div><div class="lbl">promedio 7 días</div></div><div class="kpi"><div class="big ${cur && cur <= goal ? 'ok' : ''}">${cur ? fmt1(Math.max(0, cur - goal)) : '—'}</div><div class="lbl">kg para la meta</div></div><div class="kpi"><div class="big">${cur ? fmt1(start - cur) : '—'}</div><div class="lbl">bajados desde ${fmt1(start)}</div></div></div>
    <div class="bar" style="margin-top:10px" role="img" aria-label="${Math.round(pct)}% del camino"><i style="width:${pct}%"></i></div><p class="tiny muted" style="margin:4px 0 0">${Math.round(pct)} % del camino desde ${prof.startDate ? fmtDateEs(prof.startDate) : (S[0] ? fmtDateEs(S[0].date) : '—')}. Último pesaje: ${last ? fmt1(last.kg) + ' kg el ' + fmtDateEs(last.date) : '—'}.</p></section>`;
  // Weight chart
  const ranges = [['30', '30 d'], ['90', '90 d'], ['365', '1 año'], ['all', 'Todo']];
  const from = ui.range === 'all' ? '0000' : addDays(today(), -(+ui.range));
  const pts = S.filter(p => p.date >= from).map(p => ({ date: p.date, v: p.kg, src: p.source }));
  h += `<section class="card" aria-labelledby="h-peso2"><div class="row sp"><h2 id="h-peso2">Peso</h2></div><div class="chips" style="margin-bottom:8px">${ranges.map(([k, l]) => `<button class="chip" data-act="range" data-arg="${k}" aria-pressed="${ui.range === k}">${l}</button>`).join('')}</div>`;
  h += lineChart({ id: 'ch-w', pts, avg: R7.filter(p => p.date >= from), goal, unit: 'kg', h: 220, marker: { date: '2026-11-08', label: 'día 0' }, aria: 'Peso diario y promedio de 7 días' });
  h += `<div class="legend"><span><i class="dot"></i>pesaje en la app</span><span><i class="hollow"></i>historial</span><span><i></i>promedio 7 días</span><span><i class="goal"></i>meta</span></div></section>`;
  // Fat + muscle (separate charts, never a dual axis)
  const fp = S.filter(p => p.fat != null).map(p => ({ date: p.date, v: p.fat, src: p.source }));
  const mp = S.filter(p => p.muscle != null).map(p => ({ date: p.date, v: p.muscle, src: p.source }));
  h += `<section class="card" aria-labelledby="h-comp"><h2 id="h-comp">Grasa corporal (%)</h2>${lineChart({ id: 'ch-f', pts: fp, unit: '%', h: 150, aria: 'Tendencia de grasa corporal' })}<h2 style="margin-top:14px">Masa muscular (kg)</h2>${lineChart({ id: 'ch-m', pts: mp, unit: 'kg', h: 150, aria: 'Tendencia de masa muscular' })}<p class="tiny muted">Puntos huecos: historial aproximado de chats viejos.</p></section>`;
  // Weekly summary
  const ctx = { daysByDate: daysByDate(), sessions: sessionsArr(), rules, bmrFor, bodyKg: bodyKg(), plan: cfg('plan'), exById: exById(), today: today() };
  const ws = weekStart(today()), a = weekStats(ws, ctx), b = weekStats(addDays(ws, -7), ctx);
  const dw = a.avgWeight != null && b.avgWeight != null ? r1(a.avgWeight - b.avgWeight) : null;
  const cardK = (lbl, v, sub, cls = '') => `<div class="card"><div class="tiny muted">${lbl}</div><div class="big num ${cls}" style="font-size:24px;font-weight:700">${v}</div><div class="tiny ink2">${sub}</div></div>`;
  h += `<section aria-labelledby="h-sem"><h2 id="h-sem" style="margin-top:16px">Esta semana <span class="small muted">desde ${fmtDateEs(ws)}</span></h2><div class="weekgrid">`;
  h += cardK('Peso promedio', a.avgWeight != null ? fmt1(a.avgWeight) : '—', dw != null ? `${dw > 0 ? '+' : ''}${fmt1(dw)} vs semana pasada` : 'semana pasada: ' + (b.avgWeight != null ? fmt1(b.avgWeight) : '—'), dw != null ? (dw <= 0 ? 'ok' : 'warn') : '');
  h += cardK('Días registrados', `${a.logged}/${a.days}`, `semana pasada ${b.logged}/7`, a.logged >= a.days - 1 ? 'ok' : 'warn');
  h += cardK('Gym', `${a.sessionsDone}`, `${a.gymMissed ? a.gymMissed + ' perdida(s)' : 'al día'}`, a.gymMissed ? 'warn' : 'ok');
  h += cardK('Déficit promedio', a.avgDeficit != null ? fmt(a.avgDeficit) : '—', `meta ${rules.deficitMin}–${rules.deficitMax}`, a.avgDeficit == null ? '' : a.avgDeficit < 0 ? 'over' : a.avgDeficit < rules.deficitMin ? 'warn' : 'ok');
  h += cardK('Proteína promedio', a.avgProtein != null ? fmt(a.avgProtein) + ' g' : '—', `meta ${rules.proteinMin}–${rules.proteinMax} g`, a.avgProtein == null ? '' : a.avgProtein >= rules.proteinMin ? 'ok' : 'warn');
  h += `</div></section>`;
  const mw = movementWeek();
  h += `<section class="card" aria-labelledby="h-mov"><h2 id="h-mov">Movimiento vs verano</h2><p class="small ink2" style="margin-top:0">En verano, sin carro, tu reloj promediaba ~${mw.base} kcal/día. Esta semana: <b class="num">${mw.avg != null ? fmt(mw.avg) : '—'}</b>${mw.prev != null ? ` (semana pasada ${fmt(mw.prev)})` : ''}.</p><div class="bar ${mw.avg != null && mw.avg < mw.base * 0.6 ? 'warn' : ''}" role="img" aria-label="Movimiento promedio ${mw.avg || 0} de ${mw.base}"><i style="width:${Math.min(100, (mw.avg || 0) / mw.base * 100)}%"></i></div>${mw.avg != null && mw.avg < mw.base ? `<p class="tiny muted" style="margin:4px 0 0">Brecha de ~${fmt(mw.base - mw.avg)} kcal/día: es buena parte del estancamiento.</p>` : ''}</section>`;
  if (aiOn()) h += `<section class="card"><button class="primary full" data-act="analyzeWeek" ${ui.weekBusy ? 'disabled' : ''}>${ui.weekBusy ? 'Analizando…' : 'Analizar mi semana'}</button>${ui.weekAI ? `<div class="small" style="white-space:pre-wrap;margin-top:10px">${esc(ui.weekAI)}</div>` : ''}</section>`;
  // PRs
  const anchors = new Set(exArr().filter(e => e.anchor).map(e => e.id));
  const prs = prsFrom(sessionsArr().filter(s => s.status === 'done')).sort((x, y) => (anchors.has(y.exId) - anchors.has(x.exId)));
  h += `<section class="card" aria-labelledby="h-pr"><h2 id="h-pr">Récords</h2>${prs.length ? `<table class="ledger">${prs.map(p => `<tr><td class="small">${esc(p.name)}${anchors.has(p.exId) ? ' <span class="pill ok">ancla</span>' : ''}<div class="tiny muted">${fmtDateEs(p.date)} · 1RM est. ${fmt1(p.e1rm)} kg</div></td><td class="n">${p.w ? esc(fmtW(p.w, p.unit)) + ' × ' : ''}${p.reps}</td></tr>`).join('')}</table>` : '<p class="small muted">Tus mejores marcas aparecen al terminar sesiones.</p>'}</section>`;
  h += viewLogros();
  return h;
}
ACTIONS.range = k => { ui.range = k; lsSet('range', k); render(); };
ACTIONS.analyzeWeek = async () => {
  ui.weekBusy = true; ui.weekAI = ''; render();
  try {
    await ai.ask(ANALYZE_PROMPT(), { tier: 'complex', effort: 'high', fresh: true, onText: ({ text }) => { ui.weekAI = text; schedule(); } });
  } catch (e) { const m = aiError(e, 'analizar'); ui.weekAI = (e && e.text) || ''; if (m) toast(m); }
  finally { ui.weekBusy = false; render(); }
};


/* =====================================================================
   GOALS, ACHIEVEMENTS, STREAKS, SAUNA FLAG
   ===================================================================== */
function planStartDate() { return cfg('profile').planStart || '2026-11-09'; }
function beforePlan(d) { return (d || today()) < planStartDate(); }
function goalCtx() { return { planStart: planStartDate(), startKg: cfg('profile').startKg, series: series(), sessions: sessionsArr(), days: daysArr(), plan: cfg('plan'), today: today(), rules: cfg('rules') }; }
// Sauna before a weigh-in today, or a long sauna (>= 20 min) yesterday => possibly dehydrated.
function saunaFlag(date, time) {
  const d = dayOf(date) || {}, y = dayOf(addDays(date, -1)) || {};
  const before = (d.activities || []).some(a => a.type === 'sauna' && (!time || !a.at || a.at <= time));
  const longY = (y.activities || []).filter(a => a.type === 'sauna').reduce((s, a) => s + (num(a.minutes) || 0), 0) >= 20;
  return before ? 'después de sauna (posible deshidratación)' : longY ? 'mañana después de sauna larga (posible deshidratación)' : null;
}
ui.celebrate = null;
let checkingGoals = false;
// Runs after this page writes days/sessions/goals (a real state change), never from render.
async function checkGoals() {
  if (checkingGoals || !store.available()) return;
  checkingGoals = true;
  try {
    const ctx = goalCtx();
    for (const g of coll('goals')) {
      if (g.achievedAt) continue;
      const p = goalProgress(g, ctx);
      if (!p.done || p.expired) continue;
      if (goalPaused(g, cfg('rules'), today())) continue;
      const next = nextGoalProposal(g, cfg('rules'), today());
      await writeDoc('goals/' + g.id, cur => cur && !cur.achievedAt ? { ...cur, achievedAt: p.hitDate || today(), nextProposal: next ? { label: next.label, target: next.target } : null } : null);
      ui.celebrate = { text: `¡Logrado! ${g.label}.`, next: next ? next.label : null, goalId: g.id };
      toast('¡Logro desbloqueado! ' + g.label);
    }
  } finally { checkingGoals = false; schedule(); }
}
function celebrateCard() {
  const c = ui.celebrate; if (!c) return '';
  return `<section class="card confirm" role="status"><div class="row sp"><h2 style="margin:0">${esc(c.text)}</h2><button class="sm ghost" data-act="closeCelebrate" aria-label="Cerrar">×</button></div>${c.next ? `<p class="small" style="margin:6px 0">Siguiente: <b>${esc(c.next)}</b></p><button class="primary sm" data-act="acceptNext" data-arg="${esc(c.goalId)}">Ir por ella</button>` : '<p class="small" style="margin:6px 0 0">Bien hecho. Sigue así.</p>'}</section>`;
}
ACTIONS.closeCelebrate = () => { ui.celebrate = null; render(); };
ACTIONS.acceptNext = id => {
  const g = cache.get('goals/' + id); if (!g || !g.nextProposal) return;
  const nid = 'g-' + uid();
  writeDoc('goals/' + nid, () => ({ label: g.nextProposal.label, metric: g.metric, target: g.nextProposal.target, exerciseId: g.exerciseId || null, unit: g.unit || null, month: g.metric.endsWith('_month') ? today().slice(0, 7) : null, createdAt: new Date().toISOString(), source: 'siguiente', achievedAt: null }));
  writeDoc('goals/' + id, cur => cur ? { ...cur, nextProposal: null } : null);
  ui.celebrate = null; toast('Nueva meta: ' + g.nextProposal.label);
};

// ---------- Logros board (Progreso) ----------
function viewLogros() {
  const ctx = goalCtx(), st = streaks(ctx), goals = coll('goals');
  const open = goals.filter(g => !goalProgress(g, ctx).done && !goalProgress(g, ctx).expired && !goalPaused(g, ctx.rules, ctx.today)), done = goals.filter(g => goalProgress(g, ctx).done).sort((a, b) => (goalProgress(b, ctx).hitDate || '') < (goalProgress(a, ctx).hitDate || '') ? -1 : 1);
  let h = `<section class="card" aria-labelledby="h-logros"><h2 id="h-logros">Logros</h2><div class="kpis"><div class="kpi"><div class="big">${st.fullWeeks}</div><div class="lbl">semanas completas seguidas</div></div><div class="kpi"><div class="big">${st.daysLogged}</div><div class="lbl">días seguidos registrando</div></div><div class="kpi"><div class="big">${st.thisWeek}/${st.plannedPerWeek}</div><div class="lbl">gym esta semana</div></div></div>`;
  h += `<h3 style="margin-top:14px">Metas en curso</h3>`;
  h += open.map(g => { const p = goalProgress(g, ctx); const key = 'goal:' + g.id; const c = confirmBtns(key, 'delGoal', g.id); return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row sp small"><span>${esc(g.label)}</span><span class="num ink2">${p.current != null ? esc(String(r1(p.current)).replace('.', ',')) : '—'} / ${esc(String(g.target).replace('.', ','))}</span></div><div class="bar" style="margin-top:4px" role="img" aria-label="${Math.round(p.pct * 100)}%"><i style="width:${Math.round(p.pct * 100)}%"></i></div>${g.preset ? '' : `<div style="margin-top:4px">${c || `<button class="sm ghost" data-act="ask" data-arg="${esc(key)}">Borrar</button>`}</div>`}</div>`; }).join('') || '<p class="small muted">Sin metas abiertas. Pídele una al chat.</p>';
  if (done.length) h += `<h3 style="margin-top:14px">Logradas</h3>` + done.map(g => { const p = goalProgress(g, ctx); return `<div class="achv done"><span class="st">logrado</span><span class="grow small">${esc(g.label)}</span><span class="tiny muted">${p.hitDate ? fmtDateEs(p.hitDate) : ''}</span></div>${g.nextProposal ? `<div class="row small" style="padding:4px 0 8px"><span class="grow ink2">Siguiente: ${esc(g.nextProposal.label)}</span><button class="sm primary" data-act="acceptNext" data-arg="${esc(g.id)}">Ir por ella</button></div>` : ''}`; }).join('');
  const badges = newExerciseBadges(sessionsArr());
  if (badges.length) h += `<h3 style="margin-top:14px">Ejercicios nuevos probados (${badges.length})</h3><div class="chips">${badges.slice(0, 20).map(b => `<span class="chip" style="display:inline-flex;align-items:center">${esc(b.name)} <span class="tiny muted" style="margin-left:6px">${fmtDateEs(b.date)}</span></span>`).join('')}</div>`;
  // Add goal form
  if (ui.goalForm) {
    const m = ui.goalMetric || 'lift';
    h += `<div class="card confirm" style="margin:12px 0 0"><div class="field"><label for="g-metric">Qué medir</label><select id="g-metric" data-bind="goalMetric" data-change="refresh">${Object.entries(GOAL_METRICS).map(([k, v]) => `<option value="${k}" ${k === m ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>`;
    if (m === 'lift') h += `<div class="grid2" style="margin-top:6px"><div class="field"><label for="g-ex">Ejercicio</label><select id="g-ex">${exArr().filter(e => e.pattern !== 'cardio').map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('')}</select></div><div class="field"><label for="g-unit">Unidad</label><select id="g-unit"><option>kg</option><option>lb</option></select></div></div>`;
    h += `<div class="field" style="margin-top:6px"><label for="g-target">Meta (número)</label><input id="g-target" type="number" inputmode="decimal" step="any"></div><div class="row" style="margin-top:8px"><button class="primary" data-act="saveGoal">Crear meta</button><button class="ghost" data-act="toggleGoalForm">Cancelar</button></div></div>`;
  } else h += `<button class="full" style="margin-top:10px" data-act="toggleGoalForm">+ Nueva meta</button>`;
  return h + `</section>`;
}
ACTIONS.toggleGoalForm = () => { ui.goalForm = !ui.goalForm; render(); };
ACTIONS.saveGoal = () => {
  const m = ui.goalMetric || 'lift', t = num(val('g-target'));
  if (t == null) { toast('Pon la meta (un número).'); return; }
  const g = { metric: m, target: t, createdAt: new Date().toISOString(), source: 'app', achievedAt: null };
  if (m === 'lift') { const e = cache.get('exercises/' + val('g-ex')); g.exerciseId = val('g-ex'); g.unit = val('g-unit'); g.label = `${e ? e.name : 'Ejercicio'} ${t} ${g.unit}`; }
  else if (m.endsWith('_month')) { g.month = today().slice(0, 7); g.label = `${GOAL_METRICS[m].label}: ${t}`; }
  else g.label = `${GOAL_METRICS[m].label}: ${t}`;
  ui.goalForm = false;
  writeDoc('goals/g-' + uid(), () => g);
  toast('Meta creada.');
};
ACTIONS.delGoal = id => { ui.confirm = null; deleteDoc('goals/' + id); };

// ---------- Movement vs summer (weekly) ----------
function movementWeek() {
  const r = cfg('rules'), ws = weekStart(today());
  const vals = []; for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d > today()) break; const dd = dayOf(d); if (dd && dd.watch) vals.push(num(dd.watch.kcal) || 0); }
  const prev = []; for (let i = 0; i < 7; i++) { const dd = dayOf(addDays(ws, i - 7)); if (dd && dd.watch) prev.push(num(dd.watch.kcal) || 0); }
  return { avg: vals.length ? Math.round(avg(vals)) : null, prev: prev.length ? Math.round(avg(prev)) : null, base: r.summerBaseline || 400, target: r.movementTarget || 400, n: vals.length };
}
// Opening Progreso is a user action: re-check goals then (covers data written from outside the page).
{ const openTab = ACTIONS.tab; ACTIONS.tab = t => { openTab(t); if (t === 'progreso') checkGoals(); }; }


/* =====================================================================
   AI LAYER (sample): photo reading, parsing, how-to cues, chat + tools.
   Every call happens on a user action. No loops, no retries.
   ===================================================================== */
function nowLine() { const T = tzNow(); return `Ahora: ${DOW_ES[T.dow]} ${T.date} ${T.hm} (hora de Toronto).`; }

// ---------- Context builder (compact, rebuilt on every chat send) ----------
function buildContext() {
  const T = tzNow(), d = T.date, prof = cfg('profile'), rules = cfg('rules'), plan = cfg('plan'), av = cfg('availability'), pantry = cfg('pantry');
  const L = [];
  L.push(nowLine());
  L.push(`PERFIL: ${prof.name}, ${prof.heightCm} cm, ${prof.age} años (${prof.birthday}), ${prof.sex}, lesiones: ${prof.injuries}. ${prof.city}. Reloj: ${prof.watch}. Meta ${rules.goalKg || prof.goalKg} kg por ${prof.goalType}. Fútbol: ${prof.footballGoals.join(', ')}. Prioridad: ${prof.priorities.join(', ')}. Cocina con ${prof.cooksWith}. ${prof.context || ''} Día 0: ${prof.dayZero}; plan arranca ${prof.planStart}.`);
  L.push(`REGLAS: gasto base = BMR báscula (último ${bmrFor(d)}) × ${rules.activityFactor} (incluye digestión y movimiento normal hasta ${rules.movementTarget} kcal del reloj). Extra = reloj por encima de ${rules.movementTarget} + kcal de fuerza que el reloj no vio (estimado MET − delta del reloj durante la sesión; sin lecturas, 100 % del estimado). Meta de consumo = base − ${rules.deficitTarget} + ${rules.eatBackFactor} × extra, nunca menos de ${rules.targetFloor}. Déficit = base + extra − consumido. Proteína ${rules.proteinMin}–${rules.proteinMax} g/día. No hay tope fijo de kcal ni topes por comida. Café ${rules.coffee.name}: ${rules.coffee.kcal12} kcal 12 oz / ${rules.coffee.kcal14} kcal 14 oz${rules.coffee.provisional ? ' (PROVISIONAL hasta foto de la etiqueta del polvo)' : ''}. Flexiones ${rules.pushupKcal} kcal c/u. Cardio que el reloj ya contó no se suma. Fútbol: kcal = reloj después − antes; sudor = peso antes − después; agua ${rules.hydrationPerKg[0]}–${rules.hydrationPerKg[1]} L por kg perdido. Nunca piernas pesadas el día antes del fútbol.`);
  { const bl = activeBlockedActivities(rules, d); const eqIds = new Set(availEquipment().map(e => e.id)); const allowed = Object.entries(ACTIVITIES).filter(([k, v]) => !bl.includes(k) && (!v.equipment || eqIds.has(v.equipment)) && !(rules.season === 'winter' && (k === 'caminar' || k === 'correr' || k === 'bici'))).map(([, v]) => v.label); L.push(`ACTIVIDADES PERMITIDAS: ${allowed.concat('rutina corta en casa').join(', ')}. BLOQUEADAS: ${(rules.blockedActivities || []).filter(b => !b.until || b.until >= d).map(b => (ACTIVITIES[canonicalActivity(b.name)] || { label: b.name }).label + (b.until ? ' (hasta ' + b.until + ')' : '')).join(', ') || 'ninguna'}. Día flexible de hoy: ${flexActivity(tzNow()).text}.`); }
  L.push(`TEMPORADA: ${rules.season === 'winter' ? 'invierno (nada al aire libre)' : 'verano (se permite afuera)'}. MOVIMIENTO: meta ${rules.movementTarget} kcal/día en el contador general (verano ~${rules.summerBaseline}).`);
  L.push(`COCINA: ${(rules.cookingRules || []).join(' ')}`);
  L.push(`GUÍA DE COMIDAS (estilo, no topes): ${(rules.mealGuidance || []).join(' ')}`);
  L.push(`BLOQUEADOS comida: ${(rules.blockedFoods || []).join(', ') || 'ninguno'}. Ejercicios bloqueados: ${exArr().filter(e => e.blocked).map(e => e.name + (e.blockedReason ? ' (' + e.blockedReason + ')' : '')).join(', ') || 'ninguno'}.`);
  L.push(`DESPENSA ACTUAL (${(pantry.items || []).length}): ${(pantry.items || []).length ? pantry.items.map(i => pantryLabel(i) + (i.category ? ' [' + i.category + ']' : '')).join(', ') : 'VACÍA (pregúntale qué tiene en la nevera)'}.`);
  L.push(`EQUIPO QUE SÍ TIENE: ${availEquipment().map(e => e.name + (e.confirm ? ' (por confirmar)' : '')).join('; ') || 'ninguno'}.`);
  const miss = missingEquipment();
  if (miss.length) L.push(`NO TIENE (nunca lo recomiendes, usa sustitutos): ${miss.map(e => e.name + ((e.substitutes || []).length ? ' → ' + e.substitutes.join(' / ') : '')).join('; ')}.`);
  L.push(`EJERCICIOS (opciones, no obligatorios; id: nombre [patrón]): ${exArr().filter(e => !e.blocked).map(e => `${e.id}: ${e.name} [${e.pattern}${e.location === 'casa' ? ', casa' : ''}${!exUsable(e) ? ', FALTA EQUIPO' : ''}]`).join('; ')}.`);
  const lib = foodsLib().sort((a, b) => (b.timesEaten || 0) - (a.timesEaten || 0)).slice(0, 50);
  L.push(`BIBLIOTECA DE COMIDAS (kcal por persona): ${lib.map(f => `${f.name} ${f.kcal}kcal/${f.protein}g${f.reference ? ' (ref. chats viejos)' : ''}`).join('; ')}.`);
  L.push('PLAN SEMANAL: ' + DOW_KEYS.slice(1).concat('sun').map(k => `${k}: ${(plan.days[k] || {}).title || '—'}`).join(' | ') + (plan.note ? ' · ' + plan.note : ''));
  L.push('DISPONIBILIDAD: ' + Object.entries(av.weekly || {}).map(([k, v]) => `${k}: ${v}`).join(' | ') + '. Fechas puntuales: ' + (Object.entries(av.overrides || {}).filter(([dt]) => dt >= addDays(d, -1)).map(([dt, w]) => `${dt}: ${w.map(x => x.busy ? 'ocupado' : (x.from || '?') + '–' + (x.to || '?')).join(', ')}${w[0] && w[0].note ? ' (' + w[0].note + ')' : ''}`).join('; ') || 'ninguna'));
  const mt = learnMealTimes(daysArr(), d);
  L.push('HORAS DE COMIDA APRENDIDAS: ' + Object.entries(mt).map(([k, v]) => `${k} ${v || '¿?'}`).join(', '));
  const b = balanceFor(d), day = dayOf(d) || {};
  if (beforePlan(d)) L.push(`HOY ES ANTES DEL PLAN: el plan empieza el ${planStartDate()}. Hoy no hay plan ni recordatorios; el día 0 es solo la línea base de peso. No pidas registrar nada hoy.`);
  L.push(`HOY: peso ${day.weighIn ? day.weighIn.weight_kg + ' kg' : 'sin pesaje'}; reloj ${day.watch ? day.watch.kcal + ' kcal (' + day.watch.at + ')' : 'sin dato'}; gasto ${b.burned} (base ${b.base} + extra ${b.extra}); consumido ${b.consumed}; déficit ${b.deficit}; ${targetLine(b, d)} Quedan ${b.remaining}; proteína ${b.protein} g (faltan ${b.proteinLeft}). Comidas: ${(day.foods || []).map(f => `${f.at} ${f.name} ${f.kcal}/${f.protein}g`).join('; ') || 'ninguna'}. Actividad: ${(day.activities || []).map(a => a.type + (a.minutes ? ' ' + a.minutes + 'min' : '')).join(', ') || 'ninguna'}.`);
  const act = activeSession();
  if (act) L.push(`SESIÓN EN CURSO: ${act.title}: ${(act.items || []).map(it => it.name + ' plan ' + describeSets(it.planned.list || []) + ' hecho ' + describeSets((it.sets || []).filter(x => num(x.reps) > 0).map(x => ({ reps: num(x.reps), w: num(x.w), unit: x.unit })))).join('; ')}`);
  const rows = [];
  for (let i = 14; i >= 1; i--) { const dt = addDays(d, -i), dd = dayOf(dt); if (!dd) continue; const bb = balanceFor(dt); rows.push(`${dt}(${DOW_ES[dowIndex(dt)].slice(0, 3)}): ${dd.weighIn ? dd.weighIn.weight_kg + 'kg' : '-'} in ${bb.consumed} meta ${bb.target} gasto ${bb.burned} def ${bb.hasFood && bb.hasWatch ? bb.deficit : '?'} prot ${bb.protein}${sessionsArr().some(s => s.date === dt && s.status === 'done') ? ' gym' : ''}${(dd.activities || []).length ? ' ' + dd.activities.map(a => a.type).join('+') : ''}`); }
  L.push('ÚLTIMOS 14 DÍAS: ' + (rows.join(' | ') || 'sin datos'));
  const lastEx = exArr().map(e => { const l = lastLogFor(e.id, sessionsArr()); return l ? `${e.name} ${l.date}: ${describeSets(l.sets.map(x => ({ reps: num(x.reps), w: x.w !== '' && x.w != null ? num(x.w) : num(x.kg), unit: x.unit || 'kg' })))}${l.feel ? ' (' + l.feel + ')' : ''}` : null; }).filter(Boolean);
  L.push('ÚLTIMA VEZ POR EJERCICIO: ' + (lastEx.join('; ') || 'sin sesiones todavía'));
  const gctx = goalCtx(); L.push('METAS: ' + (coll('goals').map(g => { const p = goalProgress(g, gctx); return `[${g.id}] ${g.label}: ${p.done ? 'LOGRADA ' + p.hitDate : (p.current ?? '?') + '/' + g.target}`; }).join(' | ') || 'ninguna'));
  L.push('RECORDATORIOS ABIERTOS: ' + (nudgesNow().map(n => `[${n.key}] ${n.text}`).join(' | ') || 'ninguno'));
  const notes = coll('notes').sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? -1 : 1).slice(-40);
  L.push('NOTAS SOBRE LUIS: ' + (notes.map(n => n.text).join(' | ') || 'ninguna'));
  return L.join('\n');
}

const SYSTEM_PROMPT = `REGLA N.º 1 (la más importante): NUNCA le des opciones ni menús. Muchas opciones lo hacen dudar y no hacer nada. Da SIEMPRE UNA sola instrucción clara y decidida: una comida exacta ("Haz X: paso 1…" con kcal y proteína), una sesión ya decidida, una actividad concreta ("Hoy: 20 min de cinta en subida, intervalos 1/1"), un sustituto elegido por ti. Nada de "puedes hacer A o B". Si dice "cámbialo", da OTRA única respuesta.

Eres "Mi Coach", el coach personal de Luis (venezolano, vive en Canadá) para bajar de peso, recomposición corporal y gym. Hablas español como un venezolano que vive en Canadá, de tú. Eres cercano pero directo.
ESTILO: respuestas cortas (2–5 frases o una lista corta). Nada de sermones. No juzgues la comida: registra y ajusta. Celebra lo que hizo bien.
DATOS: todo lo que te diga que pesó, comió, hizo o marcó el reloj, GUÁRDALO con las herramientas (log_weight, log_food, set_watch_kcal, log_exercise_sets, log_activity…). Luego confirma en una línea lo guardado y lo que le queda (kcal/proteína). Si mandó foto de la báscula, lee TODAS las métricas y guárdalas con log_weight. Si mandó foto de comida, estima kcal y proteína por persona con números redondos. Si mandó foto de una máquina, identifícala y guárdala con add_equipment (use_attached_photo true) con los ejercicios que permite. Si dice "no hay X" o "no tengo X", add_equipment con available false.
RELOJ: usa solo el contador general de Amazfit, nunca el número de una sesión de Zepp. El último valor del día manda.
PESAS: guarda el peso con la unidad que dijo (kg o lb). Recomienda en la misma unidad que usó la última vez.
REGLAS: respeta comidas, ejercicios y actividades bloqueadas. "No quiero jugar squash" → block_activity (permanente); "esta semana no" → block_activity con scope week. "Ya quiero volver" → unblock_activity. Nunca recomiendes equipo que NO tiene: usa sus sustitutos. Nunca piernas pesadas el día antes del fútbol. Equilibra empujes y jalones en una sesión. Los ejercicios que ya hizo son opciones, no obligación: elige lo que sirve para el objetivo del día.
COMIDA: la única meta diaria es la meta de consumo del contexto (base − 450 + la mitad del gasto extra, mínimo 1600) y la proteína 130–150 g. Lo que le queda es meta − consumido. No hay topes por comida. Para sugerir comidas usa suggest_meal y decide UN plato: solo con lo que hay en la despensa o lo que él te diga en ese mensaje. Las recetas de "chats viejos" son referencia de técnica y kcal, no asumas que tiene esos ingredientes. Recetas paso a paso: da UN paso y espera a que diga "siguiente". Medidas en palabras simples, nunca fracciones ("llena la taza hasta la mitad y un poco más", no "3/4 de taza"). Si manda foto antes de comer y la porción es mucha, sugiere servir menos, nunca cambies el plato. Cuando te diga lo que tiene en casa, lo que compró o lo que se acabó, guárdalo con update_pantry (add con cantidad si la dice; remove con el nombre tal como está en la despensa). Si update_pantry devuelve ambiguous, pregúntale cuál en una línea.
FINES DE SEMANA SOCIALES: si solo registra el peso, interpreta la subida de sábado/domingo/lunes sin pánico (agua y sal, baja en 2–4 días) y da UN solo ajuste: cena ligera el lunes. Si se repite dos fines seguidos, avísale y suma UNA sesión extra bajo techo de 20 min esa semana.
TEMPORADA: invierno en Ontario = CERO actividades al aire libre (regla season; si cambia a 'summer' en primavera vuelven caminatas y trote afuera). Para moverse usa SOLO las ACTIVIDADES PERMITIDAS del contexto (las bloqueadas no existen para ti; elige la mejor restante sin comentarlo). Cuerda en casa solo si él dice que tiene. Caminar en un centro comercial solo si él lo pide. El fútbol de los miércoles es bajo techo y sigue.
MOVIMIENTO: en verano, sin carro, el contador general del reloj promediaba ~400 kcal/día; ahora con carro e invierno marca ~100–150. Esa brecha de ~300 kcal/día explica buena parte del estancamiento. Meta diaria de movimiento: el contador general llega a movementTarget. Si falta mucho tarde en el día, propón UNA actividad corta bajo techo que encaje, con kcal estimadas.
VARIEDAD: Luis se aburre rápido. Mantén el objetivo del día (A/B/C) y 1–2 ejercicios ancla para medir progreso, pero varía el resto, los formatos (series, superseries, circuitos, EMOM/AMRAP de 5–8 min) y usa juegos de fútbol (escalera en cinta, medio tiempo de cuerda, "partido de 90"). Si pregunta "¿algo distinto hoy?", usa surprise_session y dale esa única sesión.
METAS: crea, edita o borra metas con manage_goal (ej. "hip thrust 60 kg", "correr 10 min seguidos", "bajar a 79 kg"). Al lograr una, felicítalo en una línea y propón la siguiente.
SAUNA: no da kcal extra. Lo que baja ahí es agua: un pesaje después de sauna (o la mañana siguiente a una sauna larga) es posible deshidratación y no cuenta para logros. Recuérdale ~0,5 L de agua cada 15–20 min. Si dice que ese pesaje fue normal, usa clear_weight_flag. Es opcional después de entrenar, nunca en lugar de entrenar.
GYM POR CHAT: la pestaña Gym es solo lectura; la sesión la llevas tú.
- "Acabo de llegar, tengo 60 min, el reloj marca X" → start_session (time_min, energy, watch_kcal). La rutina sale como tarjeta: responde con UNA línea, no repitas la lista.
- Series ("hice 3x12 con 25 lb, la última costó") → log_sets (unidad tal cual). Ajusta lo que queda si hace falta.
- Dolor o "no me gusta" → swap_exercise con block true y di el sustituto en una línea.
- "Terminé, el reloj marca Y" → end_session y responde corto: kcal (estimado − reloj = extra), récords y la próxima vez.
- Foto de una máquina que ya existe ("esta es la prensa") → link_equipment_photo. Máquina nueva → add_equipment con use_attached_photo.
VIERNES: pregunta por la disponibilidad del finde y guárdala con set_availability.
TIEMPO DE SESIÓN: lunes y viernes trabaja desde casa y está libre desde las 16:00, así que son sus días largos: sesión de hasta 90 min (la más pesada de la semana o fuerza + cardio). Martes a jueves sale libre ~18:00: sesión de 60 min como máximo, más directa. Si no te dice cuánto tiempo tiene, usa eso sin preguntar; si te dice otro tiempo, usa el suyo.
SALUD: no prescribes dietas médicas ni diagnosticas. Para preguntas médicas o de suplementos, dile que lo consulte con su médico.
LÍMITES DE LA APP: si pide una pantalla, botón o función nueva que la app no tiene, dile que se lo pida a Claude Code; tú no puedes cambiar la app.
Nunca inventes datos que no estén en el contexto. Si algo no está claro (fecha, porción, unidad), pregunta en una línea.`;

// ---------- Photo of the Fitdays scale ----------
async function readScale(blobs) {
  const keys = METRICS.map(([k, l, u]) => `"${k}": ${l}${u ? ' (' + u + ')' : ''}`).join(', ');
  const prompt = `Estas imágenes son capturas de la app Fitdays (báscula inteligente) de Luis. Puede estar en español o inglés (Weight, BMI, Body Fat, Fat Mass, Fat-free Body Weight, Heart Rate, Cardiac Index, Muscle Mass, Muscle Rate, Skeletal Muscle, Bone Mass, Protein Mass, Protein, Body Water kg, Body Water %, Subcutaneous Fat, Visceral Fat, BMR, Body Age).
Lee todos los valores visibles. Responde SOLO un objeto JSON con estas claves (números, sin unidades; null si no aparece): {${keys}}. Si el peso está en lb, conviértelo a kg. Ejemplo: {"weight_kg": 80.0, "bmi": 27.0, "body_fat_pct": 25.0, ...}`;
  const r = await ai.json(prompt, { images: blobs, tier: 'quick' });
  const out = {};
  for (const [k] of METRICS) { const v = num(r && r[k]); if (v != null) out[k] = v; }
  if (!out.weight_kg) throw { code: 'invalid_json', message: 'no weight' };
  return out;
}

// ---------- Food from text and/or photo ----------
async function readFood(text, blobs) {
  const rules = cfg('rules');
  const lib = foodsLib().map(f => `${f.id} | ${f.name} | ${f.kcal} kcal | ${f.protein} g | ${f.portion || ''}`).join('\n');
  const prompt = `Estima kcal y proteína de lo que comió Luis. ${nowLine()}
Texto: "${text || '(solo foto)'}"${blobs.length ? `\nAdjunté ${blobs.length} foto(s) de la comida.` : ''}
Reglas: porciones por persona (cocina con su esposa). Números redondos. Si coincide con algo de su biblioteca, usa esos valores y pon su id en "libId". Café French Vanilla del trabajo: ${rules.coffee.kcal12} kcal 12 oz / ${rules.coffee.kcal14} kcal 14 oz. No juzgues. Si la foto parece de ANTES de comer y la porción es excesiva, pon en "note" una sugerencia de servir menos (nunca cambies el plato).
Biblioteca (id | nombre | kcal | proteína | porción):
${lib || '(vacía)'}
Responde SOLO un JSON: {"items":[{"name":"Pollo al wok con repollo","qty":"1 plato","kcal":450,"protein":40,"libId":null,"note":""}]}`;
  const r = await ai.json(prompt, { images: blobs.length ? blobs : undefined, tier: blobs.length ? 'default' : 'quick' });
  const items = (r && Array.isArray(r.items) ? r.items : []).map(x => ({ name: String(x.name || 'Comida'), qty: x.qty ? String(x.qty) : '', kcal: Math.round(num(x.kcal) || 0), protein: Math.round(num(x.protein) || 0), libId: x.libId && cache.has('foods/' + x.libId) ? x.libId : null, note: x.note ? String(x.note) : '', save: false }));
  if (!items.length) throw { code: 'invalid_json', message: 'no items' };
  return items;
}

// ---------- Free-text sets ("hice 3 con 5 kg y la última con 12", "con 25 libras") ----------
ACTIONS.parseSets = async i => {
  const s = activeSession(); if (!s) return; const it = s.items[+i]; const text = val('ft-' + i).trim();
  if (!text) { toast('Escribe lo que hiciste.'); return; }
  ui.parseBusy = +i; render();
  try {
    const prompt = `Convierte lo que escribió Luis en series de gym. Ejercicio: ${it.name}. Plan: ${describeSets(it.planned.list || [])} (${it.planned.reps} reps por serie si no dice otra cosa). Unidad usada antes: ${itemDisplayUnit(it)}.
Texto: "${text}"
"libras"/"lb"/"lbs" = lb; "kilos"/"kg" = kg. Si no dice unidad, usa ${itemDisplayUnit(it)}. Si no dice reps, usa las del plan. Guarda el peso tal cual lo dijo (no conviertas).
Responde SOLO JSON: {"sets":[{"reps":10,"weight":5,"unit":"kg"}],"feel":null} (feel: "facil","bien","dificil","dolor" o null).`;
    const r = await ai.json(prompt, { tier: 'quick' });
    const sets = (r && Array.isArray(r.sets) ? r.sets : []).map(x => { const unit = x.unit === 'lb' ? 'lb' : 'kg'; const w = num(x.weight); return { reps: num(x.reps) || it.planned.reps, w: w ?? '', unit, kg: w != null ? toKg(w, unit) : '', done: true }; }).slice(0, 12);
    if (!sets.length) throw { code: 'invalid_json' };
    await writeSess(s.id, cur => { const t = cur.items[+i]; t.sets = sets; t.unit = sets[sets.length - 1].unit; if (r.feel && FEELS.some(f => f[0] === r.feel)) t.feel = r.feel; });
    toast('Anotado: ' + describeSets(sets));
    if (r.feel === 'dolor') ui.painOffer = +i;
  } catch (e) { const m = aiError(e, 'interpretar'); if (m) toast(m); }
  finally { ui.parseBusy = null; render(); }
};

// ---------- "Cómo se hace" cues: generated once, stored in the exercise doc ----------
let howQueue = [];
async function generateHowTo(ids) {
  howQueue = [...new Set(howQueue.concat(ids))].filter(id => { const e = cache.get('exercises/' + id); return e && !e.howto; });
  if (ui.howBusy || !howQueue.length || !aiOn()) return;
  const batch = howQueue.splice(0, 6);
  ui.howBusy = true; schedule();
  try {
    const list = batch.map(id => { const e = cache.get('exercises/' + id); const eq = (e.equipmentIds || []).map(q => (cache.get('equipment/' + q) || {}).name).filter(Boolean).join(' + ') || 'peso corporal'; return `- id "${id}": ${e.name} · equipo: ${eq} · patrón: ${e.pattern}${e.notes ? ' · nota: ' + e.notes : ''}`; }).join('\n');
    const prompt = `Escribe guías breves de técnica, en español (de tú), para estos ejercicios de Luis (${[cfg('profile').age ? cfg('profile').age + ' años' : '', cfg('profile').injuries ? 'lesiones: ' + cfg('profile').injuries : '', (cfg('profile').priorities || []).length ? 'prioridad: ' + cfg('profile').priorities.join(', ') : '', 'juega fútbol'].filter(Boolean).join(', ')}). Cada máquina puede usarse distinto según el objetivo del día: incluye variantes por objetivo (por ejemplo prensa para glúteos: pies altos y abiertos; para cuádriceps: pies bajos; hip thrust para glúteos: retroversión pélvica y pausa de 1 s arriba).
${list}
Responde SOLO JSON con un objeto por id: {"<id>":{"setup":["2-3 frases cortas de preparación"],"execution":["2-3 frases cortas de ejecución"],"variants":{"gluteos":"…","cuadriceps":"…","potencia":"…","fuerza":"…","resistencia":"…"},"mistakes":["2-3 errores comunes"],"tempo":"ej. 2 s bajar, 1 s pausa, subir rápido"}}. Incluye solo las variantes que tengan sentido para ese ejercicio. Frases de máximo 15 palabras.`;
    const r = await ai.json(prompt, { tier: 'default' });
    for (const id of batch) {
      const h = r && r[id]; if (!h) continue;
      const clean = { setup: (h.setup || []).map(String).slice(0, 4), execution: (h.execution || []).map(String).slice(0, 4), variants: {}, mistakes: (h.mistakes || []).map(String).slice(0, 4), tempo: h.tempo ? String(h.tempo) : '', generatedAt: today() };
      for (const [k, v] of Object.entries(h.variants || {})) if (v) clean.variants[norm(k)] = String(v);
      await writeDoc('exercises/' + id, cur => cur ? { ...cur, howto: clean } : null);
    }
  } catch (e) { const m = aiError(e, 'generar la guía'); if (m) toast(m); howQueue = []; }
  finally { ui.howBusy = false; schedule(); }
  if (howQueue.length) generateHowTo([]);
}

// ---------- Analizar mi semana ----------
function ANALYZE_PROMPT() {
  const ctx = { daysByDate: daysByDate(), sessions: sessionsArr(), rules: cfg('rules'), bmrFor, bodyKg: bodyKg(), plan: cfg('plan'), exById: exById(), today: today() };
  const ws = weekStart(today()), a = weekStats(ws, ctx), b = weekStats(addDays(ws, -7), ctx);
  return `${SYSTEM_PROMPT}\n\nCONTEXTO:\n${buildContext()}\n\nRESUMEN SEMANA ACTUAL: ${JSON.stringify(a)}\nSEMANA PASADA: ${JSON.stringify(b)}\n\nTAREA: analiza la semana de Luis en máximo 8 líneas: (1) lo que va bien, (2) lo que hay que ajustar, (3) un plan concreto para los próximos 2–3 días (comida, gym y UNA actividad bajo techo por día, nada al aire libre en invierno), respetando su agenda y reglas. Una sola indicación por cosa, nunca opciones. Si el peso subió tras el fin de semana, explícalo con calma (agua y sal). Sin markdown pesado: frases cortas con guiones.`;
}

// ---------- Chat tools (each writes db; small results; throw on bad input) ----------
function findEx(name) {
  const n = norm(name); const all = exArr();
  return all.find(e => e.id === name) || all.find(e => norm(e.name) === n) || all.find(e => norm(e.name).includes(n) || n.includes(norm(e.name))) || null;
}
function dateArg(x) { const s = String(x || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; if (/ayer/i.test(s)) return addDays(today(), -1); return today(); }
function chatCard(sid) { chatPost({ id: 'card-' + sid, role: 'card', sid }); } // same id: the card moves to the latest position
function toolNote(text) { chatPost({ role: 'tool', text: '✓ ' + text }); }
const S_STR = { type: 'string' }, S_NUM = { type: 'number' };
const PANTRY_CATS = ['proteina', 'verdura', 'carbo', 'condimento', 'lacteo', 'fruta', 'extra'];
const pantryLabel = i => i.name + (i.qty ? ' (' + i.qty + ')' : '');
// Read-merge-write on config/pantry (writeDoc starts from the server copy): never loses items from the other device.
async function pantryOp(op) { let res = null; await updateCfg('pantry', p => { res = applyPantry(p.items || [], op, today()); p.items = res.items; if (p.note && /vac[ií]a a prop/i.test(p.note)) delete p.note; }); return res || { added: [], updated: [], removed: [], notFound: [], ambiguous: [] }; }
// Tool specs: plain JSON-schema definitions (reusable with the Messages API) + page handlers.
const TOOL_SPECS = [
  { name: 'log_weight', description: 'Guarda un pesaje (métricas de Fitdays). date YYYY-MM-DD opcional (hoy por defecto). Devuelve el peso guardado.', inputSchema: { type: 'object', properties: { date: S_STR, time: S_STR, metrics: { type: 'object', description: 'Claves: ' + METRICS.map(m => m[0]).join(', ') } }, required: ['metrics'] },
    execute: async (x) => { const date = dateArg(x.date), m = x.metrics || {}; const w = {}; for (const [k] of METRICS) { const v = num(m[k]); if (v != null) w[k] = v; } if (!w.weight_kg) throw new Error('falta weight_kg'); await updateDay(date, d => { const prev = d.weighIn || {}; d.weighIn = { ...prev, ...w, time: /^\d{1,2}:\d{2}$/.test(x.time || '') ? x.time.padStart(5, '0') : (prev.time || tzNow().hm), source: 'chat' }; const fl = saunaFlag(date, d.weighIn.time); if (fl && !prev.flagCleared) d.weighIn.flag = fl; else delete d.weighIn.flag; }); toolNote(`Pesaje ${w.weight_kg} kg (${date})`); return { ok: true, date, weight_kg: w.weight_kg }; } },
  { name: 'log_food', description: 'Registra comidas con kcal y proteína (g) por persona. save_to_library guarda cada item en su biblioteca. Devuelve totales del día.', inputSchema: { type: 'object', properties: { date: S_STR, items: { type: 'array', items: { type: 'object', properties: { name: S_STR, kcal: S_NUM, protein: S_NUM, qty: S_STR, time: { type: 'string', description: 'HH:MM' } }, required: ['name', 'kcal'] } }, save_to_library: { type: 'boolean' }, shared_note: { type: 'string', description: 'nota de porción compartida con su esposa' } }, required: ['items'] },
    execute: async (x) => {
      const date = dateArg(x.date), items = (x.items || []).slice(0, 15).filter(f => f && String(f.name || '').trim()).map(f => ({ name: String(f.name).trim().slice(0, 80), kcal: Math.min(5000, Math.max(0, num(f.kcal) || 0)), protein: Math.min(400, Math.max(0, num(f.protein) || 0)), qty: f.qty || '', at: /^\d{1,2}:\d{2}$/.test(f.time || '') ? f.time.padStart(5, '0') : undefined, save: !!x.save_to_library, sharedNote: x.shared_note || '', source: 'chat' }));
      if (!items.length) throw new Error('sin items');
      for (const f of items) { const lib = foodsLib().find(l => norm(l.name) === norm(f.name)); if (lib) f.libId = lib.id; }
      if (date === today()) pushFoods(items); else await updateDay(date, d => { d.foods.push(...items.map(f => ({ id: uid(), name: f.name, kcal: Math.round(f.kcal), protein: Math.round(f.protein), qty: f.qty, at: f.at || '12:00', source: 'chat' }))); });
      await (wq['days/' + date] || Promise.resolve());
      const b = balanceFor(date); toolNote(`${items.length} comida(s): ${items.reduce((a, f) => a + f.kcal, 0)} kcal`);
      return { ok: true, date, consumed: b.consumed, protein: b.protein, target_kcal: b.target, remaining_kcal: b.remaining, protein_left: b.proteinLeft, blocked_warning: items.filter(f => isBlockedFood(f.name)).map(f => f.name) };
    } },
  { name: 'clear_weight_flag', description: 'Quita la marca de sauna/deshidratación de un pesaje cuando Luis dice que fue normal ("ese peso fue normal"). Ese pesaje vuelve a contar para metas y logros.', inputSchema: { type: 'object', properties: { date: S_STR } },
    execute: async (x) => { const date = dateArg(x.date); let had = false; await updateDay(date, d => { if (!d.weighIn || !d.weighIn.flag) return false; had = true; d.weighIn.flagCleared = true; }); if (!had) throw new Error('ese día no tiene un pesaje marcado'); toolNote(`Pesaje del ${date} cuenta normal`); return { ok: true, date }; } },
  { name: 'set_watch_kcal', description: 'Guarda el CONTADOR GENERAL del reloj Amazfit (kcal). El último valor del día reemplaza al anterior.', inputSchema: { type: 'object', properties: { kcal: S_NUM, date: S_STR, time: S_STR }, required: ['kcal'] },
    execute: async (x) => { const k = num(x.kcal); if (k == null || k < 0 || k > 6000) throw new Error('kcal inválidas'); const date = dateArg(x.date), at = x.time || tzNow().hm; await updateDay(date, d => { d.watch = { kcal: Math.round(k), at }; d.watchLog = (d.watchLog || []).concat({ kcal: Math.round(k), at }).slice(-20); }); const b = balanceFor(date); toolNote(`Reloj ${Math.round(k)} kcal`); return { ok: true, target_kcal: b.target, remaining_kcal: b.remaining }; } },
  { name: 'start_session', description: 'Cuando llega al gym: arma y guarda la rutina de HOY (una sola, ya decidida) según plan, inventario, bloqueos, progresión y anclas. watch_kcal = contador general del reloj al empezar. Si ya hay una sesión en curso hoy, la devuelve. La rutina se muestra como tarjeta en el chat.', inputSchema: { type: 'object', properties: { time_min: S_NUM, energy: { type: 'string', enum: ['bien', 'normal', 'cansado'] }, watch_kcal: S_NUM, location: { type: 'string', enum: ['gym', 'casa'] }, surprise: { type: 'boolean' } } },
    execute: async (x) => {
      let s = activeSession();
      if (!s) {
        const p = startSessionFrom({ timeMin: Math.min(90, num(x.time_min) || defaultSessionMin()), energy: x.energy || 'normal', location: x.location || 'gym', surprise: x.surprise ? Date.now() % 100000 + 1 : 0, watchStart: num(x.watch_kcal) });
        if (!p.items.length && !p.finisher && !p.cardio) throw new Error('no tengo equipo suficiente para el objetivo de hoy');
        await (wq['sessions/' + p.id] || Promise.resolve()); s = activeSession();
      } else if (num(x.watch_kcal) != null && s.watchStart == null) await writeSess(s.id, c => { c.watchStart = num(x.watch_kcal); });
      if (!s) throw new Error('no se pudo crear la sesión');
      chatCard(s.id); toolNote('Rutina de hoy lista');
      return { id: s.id, title: s.title, format: s.formatLabel, exercises: (s.items || []).map(i => `${i.name}: ${planText(i)}${i.group ? ' (' + i.group + ')' : ''}`), cardio: s.cardio ? s.cardio.text : null, finisher: s.finisher ? s.finisher.name + ': ' + s.finisher.desc : null, watch_start: s.watchStart ?? null };
    } },
  { name: 'set_session_watch', description: 'Guarda la lectura del contador general del reloj al empezar (phase start) o al terminar (phase end) la sesión de gym de hoy.', inputSchema: { type: 'object', properties: { phase: { type: 'string', enum: ['start', 'end'] }, kcal: S_NUM }, required: ['phase', 'kcal'] },
    execute: async (x) => { const s = todaySession(); if (!s) throw new Error('no hay sesión hoy; usa start_session'); const k = num(x.kcal); if (k == null) throw new Error('kcal inválidas'); await writeSess(s.id, c => { c[x.phase === 'end' ? 'watchEnd' : 'watchStart'] = k; }); toolNote(`Reloj ${x.phase === 'end' ? 'al terminar' : 'al empezar'}: ${k}`); const kk = sessionKcal(cache.get('sessions/' + s.id), bodyKg(), cfg('rules'), exById()); return { ok: true, estimate: kk.estimate, watch_delta: kk.watchDelta, extra: kk.extra }; } },
  { name: 'swap_exercise', description: 'Cambia un ejercicio de la sesión de hoy por el mejor sustituto con su equipo (elige tú, sin preguntar). block true si le dolió o no le gusta (lo bloquea para siempre).', inputSchema: { type: 'object', properties: { exercise: S_STR, block: { type: 'boolean' }, reason: S_STR }, required: ['exercise'] },
    execute: async (x) => {
      const s = activeSession(); if (!s) throw new Error('no hay sesión en curso');
      const n = norm(x.exercise), i = (s.items || []).findIndex(it => it.exId === x.exercise || norm(it.name).includes(n) || n.includes(norm(it.name)));
      if (i < 0) throw new Error('ese ejercicio no está en la sesión de hoy');
      const old = s.items[i];
      if (x.block) await writeDoc('exercises/' + old.exId, cur => cur ? { ...cur, blocked: true, blockedReason: x.reason || 'dolor', blockedAt: today() } : null);
      let alt = null; await writeSess(s.id, cur => { alt = swapItem(cur, i); return alt ? undefined : false; });
      if (!alt) { await writeSess(s.id, cur => { cur.items.splice(i, 1); }); toolNote(`Quité ${old.name}`); return { removed: old.name, substitute: null }; }
      if (!cache.get('exercises/' + alt.id)?.howto) howQueue.push(alt.id);
      toolNote(`${old.name} → ${alt.name}`); chatCard(s.id);
      return { replaced: old.name, substitute: alt.name, blocked: !!x.block };
    } },
  { name: 'end_session', description: 'Cierra la sesión de gym de hoy. watch_kcal = contador general del reloj al terminar. Calcula kcal (estimado − lo que vio el reloj), récords y la recomendación para la próxima vez.', inputSchema: { type: 'object', properties: { watch_kcal: S_NUM, cardio_done: { type: 'boolean' }, finisher_done: { type: 'boolean' }, finisher_score: S_NUM } },
    execute: async (x) => {
      const s = activeSession(); if (!s) throw new Error('no hay sesión en curso');
      const before = Object.fromEntries(prsFrom(sessionsArr().filter(q => q.status === 'done')).map(p => [p.exId, p]));
      await writeSess(s.id, c => {
        if (num(x.watch_kcal) != null) c.watchEnd = num(x.watch_kcal);
        if (c.cardio && x.cardio_done != null) { c.cardio.done = !!x.cardio_done; if (c.cardio.completed == null) c.cardio.completed = true; }
        if (c.finisher && x.finisher_done != null) { c.finisher.done = !!x.finisher_done; if (num(x.finisher_score) != null) c.finisher.score = num(x.finisher_score); }
        c.items = c.items.map(it => ({ ...it, sets: it.sets.filter(q => num(q.reps) > 0) })).filter(it => it.sets.length);
        const k = sessionKcal(c, bodyKg(), cfg('rules'), exById()); c.kcalGross = k.gross; c.kcalExtra = k.extra; c.status = 'done'; c.finishedAt = new Date().toISOString();
      });
      const done = cache.get('sessions/' + s.id), k = sessionKcal(done, bodyKg(), cfg('rules'), exById());
      const after = prsFrom(sessionsArr().filter(q => q.status === 'done')), prs = after.filter(p => !before[p.exId] || p.kg > before[p.exId].kg || (p.kg === before[p.exId].kg && p.reps > before[p.exId].reps)).map(p => `${p.name} ${fmtW(p.w, p.unit)} × ${p.reps}`);
      chatCard(s.id); toolNote('Sesión cerrada'); setTimeout(checkGoals, 300);
      return { estimate: k.estimate, watch_seen: k.strengthSeen, extra_kcal: k.extra, breakdown: k.watchDelta != null ? `estimado ${k.estimate} − reloj ${k.strengthSeen} = +${k.extra}` : `estimado ${k.estimate} (sin lecturas: 100 %)`, new_prs: prs, next_time: (done.items || []).map(it => { const n = nextStrength(it, { unit: itemDisplayUnit(it) }); return n ? `${it.name}: ${n.text}` : null; }).filter(Boolean) };
    } },
  { name: 'link_equipment_photo', description: 'Vincula la foto adjunta a un equipo que ya existe ("esta es la prensa"). Si no existe, usa add_equipment.', inputSchema: { type: 'object', properties: { equipment: S_STR }, required: ['equipment'] },
    execute: async (x) => {
      const n = norm(x.equipment), e = eqArr().find(q => q.id === x.equipment || norm(q.name).includes(n) || n.includes(norm(q.name)));
      if (!e) throw new Error('no encuentro ese equipo; usa add_equipment');
      if (!(ui.chat.lastImgs && ui.chat.lastImgs[0])) throw new Error('no hay foto adjunta');
      const pid = await uploadPhoto(ui.chat.lastImgs[0]); if (!pid) throw new Error('no se pudo guardar la foto');
      await writeDoc('equipment/' + e.id, cur => cur ? { ...cur, photoId: pid, confirm: false } : null);
      toolNote('Foto de ' + e.name); return { ok: true, equipment: e.name };
    } },
  { name: 'log_sets', description: 'Registra series de un ejercicio (peso con su unidad kg o lb, tal como lo dijo). Por defecto SUMA estas series a las que ya anotó hoy en ese ejercicio; replace true solo para corregir (reemplaza todas). Usa la sesión en curso de ese día o crea un registro libre. Devuelve la recomendación para la próxima vez.', inputSchema: { type: 'object', properties: { exercise: S_STR, replace: { type: 'boolean', description: 'true = corrige y reemplaza las series anotadas' }, sets: { type: 'array', items: { type: 'object', properties: { reps: S_NUM, weight: S_NUM, unit: { type: 'string', enum: ['kg', 'lb'] } }, required: ['reps'] } }, feel: { type: 'string', enum: ['facil', 'bien', 'dificil', 'dolor'] }, date: S_STR, pattern: { type: 'string', enum: Object.keys(PATTERNS) } }, required: ['exercise', 'sets'] },
    execute: async (x) => {
      const date = dateArg(x.date);
      let ex = findEx(x.exercise);
      if (!ex) { const id = slug(x.exercise); await writeDoc('exercises/' + id, () => ({ name: String(x.exercise), equipmentIds: [], pattern: x.pattern || 'other', muscles: [], blocked: false, source: 'chat' })); ex = { id, ...cache.get('exercises/' + id) }; howQueue.push(id); }
      if (ex.blocked) throw new Error(`${ex.name} está bloqueado; pregúntale si quiere desbloquearlo`);
      const sets = (x.sets || []).slice(0, 12).map(s => { const unit = s.unit === 'lb' ? 'lb' : 'kg', w = num(s.weight); return { reps: Math.max(0, Math.round(num(s.reps) || 0)), w: w != null && w >= 0 ? w : '', unit, kg: w != null && w >= 0 ? toKg(w, unit) : '', done: true }; }).filter(s => s.reps > 0);
      if (!sets.length) throw new Error('faltan las reps');
      let saved = null;
      const act = sessionsArr().filter(s => s.date === date && s.status === 'active').slice(-1)[0];
      const sid = act ? act.id : date + '-libre';
      await writeDoc('sessions/' + sid, cur => {
        const s = cur || { date, title: 'Registro libre', template: null, location: 'gym', status: 'done', items: [], startedAt: new Date().toISOString() };
        let it = s.items.find(i => i.exId === ex.id);
        if (!it) { it = { exId: ex.id, name: ex.name, pattern: ex.pattern, planned: { sets: sets.length, reps: sets[0] ? sets[0].reps : 10, list: sets }, why: 'Registrado por chat', sets: [], feel: null }; s.items.push(it); }
        const logged = x.replace ? [] : (it.sets || []).filter(q => num(q.reps) > 0);
        it.sets = logged.concat(sets).slice(0, 20); it.unit = sets[sets.length - 1].unit; if (x.feel) it.feel = x.feel;
        if (s.status === 'done') { const k = sessionKcal(s, bodyKg(), cfg('rules'), exById()); s.kcalGross = k.gross; s.kcalExtra = k.extra; }
        saved = clone(it);
        return s;
      });
      const nx = saved && nextStrength({ planned: saved.planned && num(saved.planned.reps) ? saved.planned : { sets: saved.sets.length, reps: Math.max(...saved.sets.map(q => num(q.reps))) }, sets: saved.sets, feel: x.feel || saved.feel || 'bien' }, { unit: itemDisplayUnit(saved) });
      toolNote(`${ex.name}: ${describeSets(sets)}`);
      return { ok: true, exercise: ex.name, logged_today: saved ? describeSets(saved.sets) : null, next_time: nx ? nx.text : null, why: nx ? nx.why : null, offer_block: x.feel === 'dolor' };
    } },
  { name: 'log_activity', description: 'Registra actividad: walk, run, runwalk, treadmill_int, bike, elliptical, football, squash, pushups, rope (reps = saltos), sauna (sin kcal), other. Fútbol: before_kg/before_watch antes y after_kg/after_watch después (se fusiona con el partido del día). watch_counted: si el reloj ya lo contó. Devuelve kcal, sudor y agua sugerida.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: Object.keys(ACT_TYPES) }, minutes: S_NUM, run_min: S_NUM, walk_min: S_NUM, rounds: S_NUM, reps: S_NUM, feel: S_STR, watch_counted: { type: 'boolean' }, before_kg: S_NUM, before_watch: S_NUM, after_kg: S_NUM, after_watch: S_NUM, vigorous: { type: 'boolean' }, date: S_STR, note: S_STR }, required: ['type'] },
    execute: async (x) => {
      const date = dateArg(x.date), t = ACT_TYPES[x.type] ? x.type : 'other'; let saved;
      await updateDay(date, d => {
        let a = t === 'football' ? d.activities.find(q => q.type === 'football') : null;
        if (!a) { a = { id: uid(), type: t, at: tzNow().hm }; d.activities.push(a); }
        if (x.minutes != null) a.minutes = num(x.minutes); if (x.run_min != null) a.runMin = num(x.run_min); if (x.walk_min != null) a.walkMin = num(x.walk_min); if (x.rounds != null) a.rounds = num(x.rounds); if (x.reps != null) a.reps = num(x.reps);
        if (x.feel) a.feel = String(x.feel); if (x.note) a.note = String(x.note); if (x.vigorous != null) a.vigorous = !!x.vigorous;
        a.watchCounted = x.watch_counted != null ? !!x.watch_counted : (a.watchCounted ?? ACT_TYPES[t].watchDefault);
        if (t === 'football') { if (x.before_kg != null || x.before_watch != null) a.before = { ...(a.before || {}), ...(x.before_kg != null ? { kg: num(x.before_kg) } : {}), ...(x.before_watch != null ? { watch: num(x.before_watch) } : {}) }; if (x.after_kg != null || x.after_watch != null) a.after = { ...(a.after || {}), ...(x.after_kg != null ? { kg: num(x.after_kg) } : {}), ...(x.after_watch != null ? { watch: num(x.after_watch) } : {}), at: tzNow().hm }; if (!a.minutes) a.minutes = 60; }
        saved = clone(a);
      });
      const k = activityKcal(saved, bodyKg(), cfg('rules')), fs = t === 'football' ? footballStats(saved) : {};
      toolNote(`${ACT_TYPES[t].label}${k.gross ? ' ~' + k.gross + ' kcal' : ''}`);
      return { ok: true, kcal: k.gross, added_to_burned: k.extra, source: k.source, match_kcal: fs.watchDelta ?? null, sweat_kg: fs.sweatKg ?? null, water_l: fs.sweatKg > 0 ? [r1(fs.sweatKg * cfg('rules').hydrationPerKg[0]), r1(fs.sweatKg * cfg('rules').hydrationPerKg[1])] : null, typical_match_kcal: typicalMatchKcal() };
    } },
  { name: 'add_equipment', description: 'Agrega equipo de su gym (o available:false para "NO lo tengo", con substitutes). use_attached_photo guarda la foto adjunta. exercises: ejercicios que permite (pattern: ' + Object.keys(PATTERNS).join(',') + ').', inputSchema: { type: 'object', properties: { name: S_STR, kind: { type: 'string', enum: ['machine', 'free', 'bench', 'cardio', 'attachment', 'court', 'other'] }, available: { type: 'boolean' }, increment_kg: S_NUM, notes: S_STR, substitutes: { type: 'array', items: S_STR }, use_attached_photo: { type: 'boolean' }, exercises: { type: 'array', items: { type: 'object', properties: { name: S_STR, pattern: { type: 'string', enum: Object.keys(PATTERNS) }, muscles: { type: 'array', items: S_STR }, vigorous: { type: 'boolean' }, goal_tags: { type: 'array', items: S_STR } }, required: ['name', 'pattern'] } } }, required: ['name'] },
    execute: async (x) => {
      const id = slug(x.name), prevEq = cache.get('equipment/' + id), available = x.available != null ? x.available !== false : !(prevEq && prevEq.available === false);
      let photoId = null;
      if (x.use_attached_photo && ui.chat.lastImgs && ui.chat.lastImgs[0]) photoId = await uploadPhoto(ui.chat.lastImgs[0]);
      await writeDoc('equipment/' + id, cur => ({ ...(cur || {}), name: String(x.name), kind: x.kind || (cur && cur.kind) || 'machine', available, incrementKg: num(x.increment_kg) || (cur && cur.incrementKg) || null, notes: x.notes || (cur && cur.notes) || '', substitutes: x.substitutes || (cur && cur.substitutes) || [], photoId: photoId || (cur && cur.photoId) || null, confirm: x.available != null || photoId ? false : !!(cur && cur.confirm), addedAt: (cur && cur.addedAt) || today(), source: (cur && cur.source) || 'chat' }));
      const made = [];
      if (available) for (const e of (x.exercises || []).slice(0, 8)) { const eid = slug(e.name); await writeDoc('exercises/' + eid, cur => ({ ...(cur || {}), name: String(e.name), equipmentIds: [...new Set([...((cur && cur.equipmentIds) || []), id])], pattern: PATTERNS[e.pattern] ? e.pattern : (cur && cur.pattern) || 'other', muscles: (e.muscles && e.muscles.length ? e.muscles : (cur && cur.muscles)) || [], goalTags: (e.goal_tags && e.goal_tags.length ? e.goal_tags : (cur && cur.goalTags)) || [], vigorous: e.vigorous != null ? !!e.vigorous : !!(cur && cur.vigorous), blocked: !!(cur && cur.blocked), source: (cur && cur.source) || 'chat' })); made.push(eid); if (!(cache.get('exercises/' + eid) || {}).howto) howQueue.push(eid); }
      if (!available) for (const e of exArr()) if ((e.equipmentIds || []).includes(id)) made.push('sin-equipo:' + e.id);
      toolNote(available ? `Equipo: ${x.name}${made.length ? ' + ' + made.length + ' ejercicio(s)' : ''}` : `NO lo tienes: ${x.name}`);
      return { ok: true, id, available, exercises: made, photo_saved: !!photoId };
    } },
  { name: 'block_activity', description: 'Bloquea una actividad para que nunca (scope permanent) o no esta semana (scope week) se recomiende: squash, cuerda, elíptica, cinta, caminar, correr, sauna, bici.', inputSchema: { type: 'object', properties: { activity: S_STR, scope: { type: 'string', enum: ['permanent', 'week'] }, reason: S_STR }, required: ['activity'] },
    execute: async (x) => {
      const k = canonicalActivity(x.activity); if (!k) throw new Error('actividad desconocida: usa squash, cuerda, elíptica, cinta, caminar, correr, sauna o bici');
      const until = x.scope === 'week' ? addDays(weekStart(today()), 6) : null;
      await updateCfg('rules', r => { r.blockedActivities = (r.blockedActivities || []).filter(b => canonicalActivity(b.name || b) !== k).concat({ name: k, until, reason: x.reason || '' }); });
      toolNote(`Sin ${ACTIVITIES[k].label}${until ? ' esta semana' : ''}`);
      return { ok: true, blocked: k, until, today_flex: flexActivity(tzNow()).text };
    } },
  { name: 'unblock_activity', description: 'Vuelve a permitir una actividad bloqueada.', inputSchema: { type: 'object', properties: { activity: S_STR }, required: ['activity'] },
    execute: async (x) => { const k = canonicalActivity(x.activity); if (!k) throw new Error('actividad desconocida'); await updateCfg('rules', r => { r.blockedActivities = (r.blockedActivities || []).filter(b => canonicalActivity(b.name || b) !== k); }); toolNote(`${ACTIVITIES[k].label} de vuelta`); return { ok: true, unblocked: k }; } },
  { name: 'block_food', description: 'Bloquea una comida (nunca la sugeriré).', inputSchema: { type: 'object', properties: { name: S_STR }, required: ['name'] }, execute: async (x) => { const n = String(x.name).trim(); await updateCfg('rules', r => { r.blockedFoods = [...new Set([...(r.blockedFoods || []), n])]; }); toolNote('Bloqueado: ' + n); return { ok: true, blocked: cfg('rules').blockedFoods }; } },
  { name: 'unblock_food', description: 'Desbloquea una comida.', inputSchema: { type: 'object', properties: { name: S_STR }, required: ['name'] }, execute: async (x) => { const n = norm(x.name); await updateCfg('rules', r => { r.blockedFoods = (r.blockedFoods || []).filter(b => norm(b) !== n); }); toolNote('Desbloqueado: ' + x.name); return { ok: true, blocked: cfg('rules').blockedFoods }; } },
  { name: 'block_exercise', description: 'Bloquea un ejercicio (dolor o no le gusta). Se reemplaza por uno parecido.', inputSchema: { type: 'object', properties: { name: S_STR, reason: S_STR }, required: ['name'] }, execute: async (x) => { const e = findEx(x.name); if (!e) throw new Error('no encuentro ese ejercicio'); await writeDoc('exercises/' + e.id, cur => cur ? { ...cur, blocked: true, blockedReason: x.reason || 'chat', blockedAt: today() } : null); const alt = similarExercise(e, exArr().filter(exUsable)); toolNote('Bloqueado: ' + e.name); return { ok: true, blocked: e.name, substitute: alt ? alt.name : null }; } },
  { name: 'unblock_exercise', description: 'Desbloquea un ejercicio.', inputSchema: { type: 'object', properties: { name: S_STR }, required: ['name'] }, execute: async (x) => { const e = findEx(x.name); if (!e) throw new Error('no encuentro ese ejercicio'); await writeDoc('exercises/' + e.id, cur => cur ? { ...cur, blocked: false, blockedReason: null } : null); toolNote('Desbloqueado: ' + e.name); return { ok: true }; } },
  { name: 'update_rule', description: 'Cambia una regla. key: coffee_kcal_12, coffee_kcal_14, coffee_provisional, deficit_target, deficit_min, deficit_max, protein_min, protein_max, strength_extra_factor (0-1), pushup_kcal, bmr_fallback, goal_kg, movement_target, activity_factor (ej. 1.2), eat_back_factor (0-1), target_floor (kcal), season (winter|summer), add_cooking_rule, add_meal_guidance.', inputSchema: { type: 'object', properties: { key: S_STR, value: {} }, required: ['key', 'value'] },
    execute: async (x) => {
      const map = { coffee_kcal_12: ['coffee', 'kcal12'], coffee_kcal_14: ['coffee', 'kcal14'], coffee_provisional: ['coffee', 'provisional'], deficit_target: ['deficitTarget'], deficit_min: ['deficitMin'], deficit_max: ['deficitMax'], protein_min: ['proteinMin'], protein_max: ['proteinMax'], strength_extra_factor: ['strengthExtraFactor'], pushup_kcal: ['pushupKcal'], bmr_fallback: ['bmrFallback'], goal_kg: ['goalKg'], movement_target: ['movementTarget'], activity_factor: ['activityFactor'], eat_back_factor: ['eatBackFactor'], target_floor: ['targetFloor'] };
      const k = String(x.key);
      if (k === 'add_cooking_rule' || k === 'add_meal_guidance') { const f = k === 'add_cooking_rule' ? 'cookingRules' : 'mealGuidance'; await updateCfg('rules', r => { r[f] = [...(r[f] || []), String(x.value)]; }); toolNote('Regla agregada'); return { ok: true }; }
      if (k === 'season') { const v = String(x.value) === 'summer' ? 'summer' : 'winter'; await updateCfg('rules', r => { r.season = v; }); toolNote('Temporada: ' + (v === 'winter' ? 'invierno' : 'verano')); return { ok: true, season: v }; }
      const path = map[k]; if (!path) throw new Error('regla desconocida: ' + k);
      const v = path[1] === 'provisional' ? (x.value === true || x.value === 'true') : num(x.value);
      if (v == null || (typeof v === 'number' && v < 0)) throw new Error('valor inválido');
      if ((k === 'strength_extra_factor' || k === 'eat_back_factor') && v > 1) throw new Error('debe ser 0–1');
      if (k === 'activity_factor' && (v < 1 || v > 2)) throw new Error('debe estar entre 1 y 2');
      await updateCfg('rules', r => { if (path.length === 2) { r[path[0]] = { ...(r[path[0]] || DEFAULT_RULES[path[0]]), [path[1]]: v }; } else r[path[0]] = v; });
      toolNote(`Regla ${k} = ${v}`); return { ok: true, key: k, value: v };
    } },
  { name: 'set_availability', description: 'Guarda UNA ventana libre u ocupada para una fecha (ej. sábado libre 09:00–12:00). Una llamada por ventana; se suman a las de esa fecha. replace true borra las ventanas que esa fecha tenía antes.', inputSchema: { type: 'object', properties: { date: S_STR, from: { type: 'string', description: 'HH:MM' }, to: { type: 'string', description: 'HH:MM' }, busy: { type: 'boolean' }, note: S_STR, replace: { type: 'boolean' } }, required: ['date'] },
    execute: async (x) => { const date = dateArg(x.date), hm = v => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim()); return m && +m[1] < 24 && +m[2] < 60 ? m[1].padStart(2, '0') + ':' + m[2] : null; }; if ((x.from && !hm(x.from)) || (x.to && !hm(x.to))) throw new Error('usa HH:MM, ej. 09:00'); await updateCfg('availability', a => { a.overrides = a.overrides || {}; const w = { from: hm(x.from), to: hm(x.to), busy: !!x.busy, note: String(x.note || '').slice(0, 120) }; const prev = x.replace ? [] : (a.overrides[date] || []).filter(q => !(q.from === w.from && q.to === w.to && q.busy === w.busy)); a.overrides[date] = [...prev, w].slice(-6); for (const k of Object.keys(a.overrides)) if (k < addDays(today(), -14)) delete a.overrides[k]; }); toolNote(`Disponibilidad ${date}`); return { ok: true, date }; } },
  { name: 'plan_week', description: 'Reescribe el plan semanal. days: {mon..sun: {kind: gym|rest|football|flex, template: A|B|C (si gym), title, detail}}. Rechaza piernas (A o C) el día antes de fútbol.', inputSchema: { type: 'object', properties: { days: { type: 'object' }, note: S_STR }, required: ['days'] },
    execute: async (x) => {
      const cur = cfg('plan'), days = { ...cur.days };
      for (const k of DOW_KEYS) if (x.days && x.days[k]) { const v = x.days[k]; days[k] = { kind: ['gym', 'rest', 'football', 'flex'].includes(v.kind) ? v.kind : 'flex', template: ['A', 'B', 'C'].includes(v.template) ? v.template : undefined, title: String(v.title || '').slice(0, 80), detail: String(v.detail || '').slice(0, 200) }; }
      for (let i = 0; i < 7; i++) { const k = DOW_KEYS[i], nxt = DOW_KEYS[(i + 1) % 7]; if (days[k].kind === 'gym' && TEMPLATES[days[k].template] && TEMPLATES[days[k].template].heavyLegs && days[nxt].kind === 'football') throw new Error(`${k}: el día antes del fútbol no hay piernas (A ni C); pon Gym B o descanso`); }
      await updateCfg('plan', p => { p.days = days; if (x.note) p.note = String(x.note); p.weekOf = weekStart(today()); });
      toolNote('Plan semanal actualizado'); return { ok: true };
    } },
  { name: 'add_nudge', description: 'Crea un recordatorio visible en Hoy. kind: hacer|considerar|pendiente|alerta. due_date opcional (desde cuándo se muestra).', inputSchema: { type: 'object', properties: { text: S_STR, kind: { type: 'string', enum: ['hacer', 'considerar', 'pendiente', 'alerta'] }, due_date: S_STR }, required: ['text'] },
    execute: async (x) => { const id = 'n-' + uid(); await writeDoc('nudges/' + id, () => ({ text: String(x.text).slice(0, 240), kind: x.kind || 'hacer', due: x.due_date ? dateArg(x.due_date) : null, createdAt: new Date().toISOString(), dismissed: false, source: 'chat' })); toolNote('Recordatorio creado'); return { ok: true, id }; } },
  { name: 'dismiss_nudge', description: 'Descarta un recordatorio por su id (el que aparece entre [corchetes] en RECORDATORIOS ABIERTOS).', inputSchema: { type: 'object', properties: { id: S_STR }, required: ['id'] },
    execute: async (x) => { ACTIONS.dismissNudge(String(x.id)); toolNote('Recordatorio descartado'); return { ok: true }; } },
  { name: 'save_note', description: 'Guarda un dato sobre Luis para recordarlo siempre (gustos, horarios, contexto).', inputSchema: { type: 'object', properties: { text: S_STR, tag: S_STR }, required: ['text'] },
    execute: async (x) => { const id = uid(); await writeDoc('notes/' + id, () => ({ text: String(x.text).slice(0, 400), tag: x.tag || '', createdAt: new Date().toISOString() })); toolNote('Nota guardada'); return { ok: true }; } },
  { name: 'update_pantry', description: 'Actualiza la despensa sin borrar nada más. add: lo que tiene o compró (si ya existe, actualiza su cantidad o categoría; no duplica). remove: lo que se acabó, con el nombre del item tal como aparece en la despensa. qty en palabras simples ("2 pechugas", "media bolsa"). clear true solo si pide vaciar toda la despensa. category: proteina|verdura|carbo|condimento|lacteo|fruta|extra. Devuelve la despensa completa y lo que no encontró.', inputSchema: { type: 'object', properties: { add: { type: 'array', items: { type: 'object', properties: { name: S_STR, category: { type: 'string', enum: PANTRY_CATS }, qty: S_STR }, required: ['name'] } }, remove: { type: 'array', items: S_STR }, clear: { type: 'boolean' } } },
    execute: async (x) => {
      const add = Array.isArray(x.add) ? x.add.filter(a => a && typeof a.name === 'string') : [], remove = Array.isArray(x.remove) ? x.remove.map(String) : [];
      if (!add.length && !remove.length && !x.clear) throw new Error('nada que cambiar: usa add o remove');
      const r = await pantryOp({ add: add.map(a => ({ ...a, category: PANTRY_CATS.includes(a.category) ? a.category : '' })), remove, clear: !!x.clear });
      const bits = []; if (r.added.length) bits.push('+' + r.added.length); if (r.updated.length) bits.push(r.updated.length + ' actualizado(s)'); if (r.removed.length) bits.push('−' + r.removed.length);
      toolNote('Despensa: ' + (bits.join(', ') || 'sin cambios'));
      return { ok: true, added: r.added, updated: r.updated, removed: r.removed, not_found: r.notFound, ambiguous: r.ambiguous.length ? { asked: r.ambiguous, matches: r.ambiguousMatches || [] } : null, pantry: (cfg('pantry').items || []).map(pantryLabel) };
    } },
  { name: 'suggest_meal', description: 'Devuelve lo necesario para proponer una comida: kcal/proteína que le quedan hoy, despensa, lo que dijo que tiene, bloqueados y reglas de cocina. Tú escribes la receta (primer paso, espera "siguiente").', inputSchema: { type: 'object', properties: { fridge: { type: 'array', items: S_STR, description: 'lo que dijo que tiene en este mensaje' }, meal: { type: 'string', description: 'desayuno|almuerzo|merienda|cena' } } },
    execute: async (x) => { const b = balanceFor(today()), r = cfg('rules'), blocked = r.blockedFoods || []; const acts = ((dayOf(today()) || {}).activities || []).map(a => a.type); const gymToday = sessionsArr().some(s => s.date === today() && s.status !== 'discarded'); const activity_today = acts.concat(gymToday ? ['gym'] : []); const fridge = (x.fridge || []).map(String).filter(f => !isBlockedFood(f)); return { activity_today, recovery_note: activity_today.includes('football') ? 'Hoy hubo fútbol: prioriza hidratarse y proteína para recuperar.' : activity_today.includes('gym') ? 'Hoy entrenó: proteína alta.' : null, target_kcal_today: b.target, remaining_kcal_today: b.remaining, protein_left_g: b.proteinLeft, meal: x.meal || null, pantry: (cfg('pantry').items || []).filter(i => !isBlockedFood(i.name)).map(pantryLabel), fridge_from_message: fridge, blocked, cooking_rules: r.cookingRules, meal_guidance: r.mealGuidance, reference_recipes_old: foodsLib().filter(f => f.recipe).map(f => `${f.name} ~${f.kcal} kcal (técnica de referencia; no asumas ingredientes)`), instruction: 'Usa SOLO despensa + fridge_from_message. Si ambos están vacíos, pregúntale qué tiene. Da nombre, kcal y proteína por persona, y el PRIMER paso; espera "siguiente". Medidas en palabras simples.' }; } },
  { name: 'get_history', description: 'Lee días entre from y to (YYYY-MM-DD, máx. 62 días): peso, kcal, proteína, reloj, actividades y sesiones.', inputSchema: { type: 'object', properties: { from: S_STR, to: S_STR }, required: ['from', 'to'] },
    execute: async (x) => {
      let from = dateArg(x.from), to = dateArg(x.to); if (from > to) [from, to] = [to, from]; if (daysBetween(from, to) > 62) from = addDays(to, -62);
      const out = []; for (let d = from; d <= to; d = addDays(d, 1)) { const dd = dayOf(d); const ss = sessionsArr().filter(s => s.date === d && s.status === 'done'); if (!dd && !ss.length) continue; const b = balanceFor(d); out.push({ d, kg: dd && dd.weighIn ? dd.weighIn.weight_kg : null, fat: dd && dd.weighIn ? dd.weighIn.body_fat_pct : null, in: b.consumed, target: b.target, out: b.burned, prot: b.protein, watch: b.watch, act: ((dd && dd.activities) || []).map(a => a.type), gym: ss.map(s => s.title) }); }
      const hist = ((cache.get('history/weights') || SEED_HISTORY).points || []).filter(p => p.date >= from && p.date <= to);
      return { days: out, history_points: hist };
    } },
  { name: 'manage_goal', description: 'Crea, edita o borra una meta. metric: ' + Object.keys(GOAL_METRICS).join(', ') + '. Para lift usa exercise (nombre o id) y unit kg|lb. month YYYY-MM para metas del mes. Devuelve el progreso.', inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['create', 'update', 'delete'] }, id: S_STR, label: S_STR, metric: { type: 'string', enum: Object.keys(GOAL_METRICS) }, target: S_NUM, exercise: S_STR, unit: { type: 'string', enum: ['kg', 'lb'] }, month: S_STR }, required: ['action'] },
    execute: async (x) => {
      if (x.action === 'delete') { if (!x.id || !cache.has('goals/' + x.id)) throw new Error('no existe esa meta'); await deleteDoc('goals/' + x.id); toolNote('Meta borrada'); return { ok: true }; }
      const id = x.action === 'update' ? String(x.id || '') : 'g-' + uid();
      if (x.action === 'update' && !cache.has('goals/' + id)) throw new Error('no existe esa meta');
      let exerciseId; if (x.exercise) { const e = findEx(x.exercise); if (!e) throw new Error('no encuentro ese ejercicio'); exerciseId = e.id; }
      await writeDoc('goals/' + id, cur => { const g = { ...(cur || { createdAt: new Date().toISOString(), source: 'chat' }) }; if (x.label) g.label = String(x.label).slice(0, 80); if (x.metric) g.metric = x.metric; if (x.target != null) g.target = num(x.target); if (exerciseId) g.exerciseId = exerciseId; if (x.unit) g.unit = x.unit; if (x.month) g.month = x.month; if (!g.metric || g.target == null) return null; if (!g.label) { const e = g.exerciseId && cache.get('exercises/' + g.exerciseId); g.label = g.metric === 'lift' && e ? `${e.name} ${g.target} ${g.unit || 'kg'}` : GOAL_METRICS[g.metric].label + ': ' + g.target; } g.achievedAt = null; return g; });
      const g = cache.get('goals/' + id); if (!g) throw new Error('falta metric o target');
      const p = goalProgress(g, goalCtx()); toolNote('Meta: ' + g.label);
      return { ok: true, id, current: p.current, pct: Math.round(p.pct * 100), done: p.done };
    } },
  { name: 'surprise_session', description: 'Arma UNA sesión sorpresa (distinta) dentro de su inventario y el objetivo del día, y la deja lista en Gym. Devuelve la sesión.', inputSchema: { type: 'object', properties: { time_min: S_NUM, energy: { type: 'string', enum: ['bien', 'normal', 'cansado'] }, template: { type: 'string', enum: ['A', 'B', 'C'] } } },
    execute: async (x) => {
      if (activeSession()) throw new Error('ya hay una sesión en curso hoy');
      const p = startSessionFrom({ template: x.template, timeMin: Math.min(90, num(x.time_min) || defaultSessionMin()), energy: x.energy || 'normal', surprise: Date.now() % 100000 + 1 });
      if (!p.items.length && !p.finisher) throw new Error('no tengo equipo suficiente para ese objetivo');
      await (wq['sessions/' + p.id] || Promise.resolve());
      { const s2 = activeSession(); if (s2) chatCard(s2.id); }
      toolNote('Sesión sorpresa lista');
      return { title: p.title, format: p.formatLabel, exercises: p.items.map(i => i.name + (i.group ? ' (' + i.group + ')' : '')), finisher: p.finisher ? p.finisher.name + ': ' + p.finisher.desc : null, cardio: p.cardio ? p.cardio.text : null, est_min: p.estMin };
    } }
];
const TOOL_DEFS = TOOL_SPECS.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
const TOOL_HANDLERS = Object.fromEntries(TOOL_SPECS.map(t => [t.name, t.execute]));

// ---------- Chat transcript (chat/{date} marks the day, chat/{date}/m/{id} is one message; phone and PC see the same) ----------
const chatColl = d => `chat/${d}/m`;
function chatMessages(d) { return coll(chatColl(d)).sort((x, y) => (x.at || '') < (y.at || '') ? -1 : (x.at || '') > (y.at || '') ? 1 : x.id < y.id ? -1 : 1); }
// Writes one message doc (unique id, so two devices never overwrite each other). The mirror updates at once.
function chatPost(m) {
  const d = today(), ms = Date.now(), id = m.id || chatMsgId(ms, Math.random().toString(36).slice(2, 8)), path = chatMsgPath(d, id);
  const body = { role: m.role, text: String(m.text || '').slice(0, 20000), at: new Date(ms).toISOString() };
  if (m.sid) body.sid = m.sid; if (m.imgCount) body.imgCount = m.imgCount; if (m.imagePaths && m.imagePaths.length) body.imagePaths = m.imagePaths;
  cache.set(path, body); schedule();
  writeDoc(path, () => body, { noRead: true }).catch(() => { });
  if (!cache.has('chat/' + d)) { cache.set('chat/' + d, { date: d, startedAt: body.at }); writeDoc('chat/' + d, cur => cur ? null : { date: d, startedAt: body.at }).catch(() => { }); }
  return id;
}
// Live today, plus the past day being viewed (nothing else stays in memory).
const chatSubs = new Map();
function chatEnsureSubs() {
  if (!store.available()) return;
  const want = new Set([today(), ui.chat.viewDate].filter(Boolean));
  for (const [d, un] of chatSubs) if (!want.has(d)) { un(); chatSubs.delete(d); applyCol(chatColl(d), []); }
  for (const d of want) if (!chatSubs.has(d)) chatSubs.set(d, store.subscribe(chatColl(d), { kind: 'col' }, p => { applyCol(chatColl(d), p.docs); schedule(); }, () => { }));
}

// ---------- Chat ----------
async function sendChat() {
  const c = ui.chat;
  const ta = document.getElementById('chatIn'); if (ta) c.draft = ta.value;
  const text = (c.draft || '').trim(), imgs = c.imgs;
  if ((!text && !imgs.length) || c.busy) return;
  const d = today();
  c.viewDate = null; c.showDays = false;
  c.lastImgs = imgs; c.imgs = []; c.draft = '';
  c.local = []; // old error lines go away with a new message
  const userId = chatPost({ role: 'user', text, imgCount: imgs.length });
  // Photos go to Storage and the transcript keeps their paths (never base64). Tools reuse the same upload.
  if (imgs.length) Promise.all(imgs.map(uploadPhoto)).then(ps => { const paths = ps.filter(Boolean); if (paths.length) writeDoc(chatMsgPath(d, userId), cur => cur ? { ...cur, imagePaths: paths } : null).catch(() => { }); });
  const aiMsg = { role: 'ai', text: 'Pensando…', id: uid() }; c.local.push(aiMsg);
  c.busy = true; c.ctl = new AbortController();
  if (ta) ta.blur();
  render();
  // Compact model context: the context builder + the last ~10 turns of today's conversation (never the whole history).
  const turns = chatTurns(chatMessages(d), 10);
  const input = [{ role: 'user', content: 'CONTEXTO ACTUAL (léelo, no lo repitas):\n' + buildContext() }, ...turns];
  try {
    const opts = { fresh: true, system: SYSTEM_PROMPT, signal: c.ctl.signal, tier: 'default', effort: 'medium', onText: ({ text: t }) => { aiMsg.text = t; const el = document.getElementById('m-' + aiMsg.id); if (el) el.textContent = t; } };
    if (aiState.tools) { opts.tools = TOOL_DEFS; opts.handlers = TOOL_HANDLERS; }
    if (imgs.length) opts.images = imgs;
    const r = await ai.ask(input, opts);
    chatPost({ role: 'assistant', text: r.text });
    if (r.truncated) c.local.push({ role: 'err', text: 'La respuesta se cortó. Pide menos a la vez.' });
  } catch (e) {
    const m = aiError(e, 'responder');
    const partial = (e && e.text) || '';
    if (partial) chatPost({ role: 'assistant', text: partial });
    else if (e && e.code === 'cancelled') c.local.push({ role: 'err', text: '(detenido)' });
    if (m) c.local.push({ role: 'err', text: m });
  } finally {
    c.local = c.local.filter(x => x !== aiMsg);
    c.busy = false; c.ctl = null;
    render();
    if (howQueue.length && aiOn()) generateHowTo([]);
  }
}

/* =====================================================================
   "RECORRER EL GYM": photo-by-photo inventory, confirm with one tap
   ===================================================================== */
ui.walk = null; // {cards:[{id, blob, url, name, kind, allows:[{name,pattern}], attachments:[], busy}], noHay:''}
const EQ_KINDS = [['machine', 'Máquina'], ['free', 'Peso libre'], ['bench', 'Banco'], ['cardio', 'Cardio'], ['attachment', 'Accesorio'], ['court', 'Cancha'], ['other', 'Otro']];
function viewWalk() {
  if (!ui.walk) return `<section class="card"><h2>Recorrer el gym</h2><p class="small ink2" style="margin-top:0">Cuando estés en el gym: foto tras foto de máquinas y del rack de accesorios. Yo identifico y tú confirmas.</p><button class="primary full" data-act="walkStart">Empezar recorrido</button></section>`;
  let h = `<section class="card" aria-labelledby="h-walk"><div class="row sp"><h2 id="h-walk">Recorriendo el gym</h2><button class="sm ghost" data-act="walkEnd">Terminar</button></div>`;
  if (aiOn() && aiState.images) h += `<button class="primary full" data-act="walkPhoto">Tomar foto</button>`;
  else h += `<p class="small warn">No puedo leer fotos aquí: usa el formulario de abajo.</p>`;
  for (const c of ui.walk.cards) {
    if (c.busy) { h += `<div class="card" style="margin:10px 0 0"><div class="row nw"><img class="thumb" src="${c.url}" alt=""><p class="small muted grow">Identificando…</p></div></div>`; continue; }
    if (c.saved) { h += `<div class="row nw" style="padding:6px 0"><img class="thumb" src="${c.url}" alt=""><p class="small ok grow">✓ ${esc(c.name)} guardado</p></div>`; continue; }
    const i = ui.walk.cards.indexOf(c);
    h += `<div class="card confirm" style="margin:10px 0 0"><div class="row nw"><img class="thumb" src="${c.url}" alt="Foto"><div class="grow"><label for="wk-n${i}">Nombre</label><input id="wk-n${i}" data-bind="walk.cards.${i}.name" value="${esc(c.name)}"></div></div>
      <div class="field" style="margin-top:6px"><label for="wk-k${i}">Tipo</label><select id="wk-k${i}" data-bind="walk.cards.${i}.kind">${EQ_KINDS.map(([k, l]) => `<option value="${k}" ${c.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      ${c.allows.length ? `<p class="small" style="margin:8px 0 2px"><b>Permite:</b></p>${c.allows.map((a, j) => `<label class="row small" style="margin:2px 0"><input type="checkbox" data-bind="walk.cards.${i}.allows.${j}.on" ${a.on ? 'checked' : ''}> ${esc(a.name)} <span class="tiny muted">${esc(PATTERNS[a.pattern] || '')}</span></label>`).join('')}` : ''}
      ${c.attachments.length ? `<p class="small" style="margin:8px 0 2px"><b>Accesorios que veo:</b></p>${c.attachments.map((a, j) => `<label class="row small" style="margin:2px 0"><input type="checkbox" data-bind="walk.cards.${i}.attachments.${j}.on" ${a.on ? 'checked' : ''}> ${esc(a.name)}</label>`).join('')}` : ''}
      ${c.note ? `<p class="tiny muted">${esc(c.note)}</p>` : ''}
      <div class="row" style="margin-top:8px"><button class="primary" data-act="walkSave" data-arg="${i}">Sí, guardar</button><button class="ghost" data-act="walkDrop" data-arg="${i}">Descartar</button></div></div>`;
  }
  h += `<div class="row nw" style="margin-top:10px"><label class="sr" for="noHay">Equipo que no hay</label><input id="noHay" class="grow" placeholder="No hay… (ej. extensión de piernas)"><button data-act="walkNoHay">Anotar</button></div>`;
  const pend = eqArr().filter(e => e.confirm && e.available !== false);
  if (pend.length) {
    h += `<h3 style="margin-top:12px">Por confirmar</h3>`;
    h += pend.map(e => { const c = confirmBtns('eqdel:' + e.id, 'walkDelete', e.id); return `<div style="padding:6px 0;border-bottom:1px solid var(--line)"><div class="small"><b>${esc(e.name)}</b></div><div class="tiny muted">${esc(e.notes || '')}</div><div class="row" style="margin-top:4px"><button class="sm primary" data-act="walkConfirm" data-arg="${esc(e.id)}">Sí está</button>${files.available() ? `<button class="sm" data-act="eqPhoto" data-arg="${esc(e.id)}">Foto</button>` : ''}<button class="sm" data-act="walkMissing" data-arg="${esc(e.id)}">No hay</button>${c || `<button class="sm ghost" data-act="ask" data-arg="eqdel:${esc(e.id)}">Borrar</button>`}</div></div>`; }).join('');
  }
  return h + `</section>`;
}
ACTIONS.walkStart = () => { ui.walk = { cards: [] }; render(); };
ACTIONS.walkEnd = () => { for (const c of (ui.walk && ui.walk.cards) || []) try { URL.revokeObjectURL(c.url); } catch (e) { } ui.walk = null; render(); };
ACTIONS.walkDrop = i => { ui.walk.cards.splice(+i, 1); render(); };
ACTIONS.walkPhoto = () => pickImages(false, async ([blob]) => {
  const card = { id: uid(), blob, url: URL.createObjectURL(blob), name: '', kind: 'machine', allows: [], attachments: [], busy: true };
  ui.walk.cards.unshift(card); render();
  try {
    const have = eqArr().map(e => e.name).join('; ');
    const r = await ai.json(`Foto de una máquina, equipo o rack de accesorios del gym de Luis. Identifícalo. Ya tiene: ${have}.
Responde SOLO JSON: {"name":"nombre corto en español","kind":"machine|free|bench|cardio|attachment|court|other","allows":[{"name":"ejercicio en español","pattern":"${Object.keys(PATTERNS).join('|')}"}],"attachments":["cuerda","barra recta","barra V","manijas D","tobillera","barra EZ"],"note":"duda o detalle a confirmar, o vacío"}. Si es un rack de accesorios, kind "attachment" y lista cada accesorio en attachments. Máximo 5 ejercicios.`, { images: [blob], tier: 'default' });
    card.name = String(r.name || 'Equipo'); card.kind = EQ_KINDS.some(k => k[0] === r.kind) ? r.kind : 'machine';
    card.allows = (r.allows || []).slice(0, 5).map(a => ({ name: String(a.name), pattern: PATTERNS[a.pattern] ? a.pattern : 'other', on: true }));
    card.attachments = (r.attachments || []).slice(0, 10).map(a => ({ name: String(a), on: true }));
    card.note = r.note ? String(r.note) : '';
  } catch (e) { const m = aiError(e, 'identificar'); if (m) toast(m); card.name = ''; }
  card.busy = false; render();
});
ACTIONS.walkSave = async i => {
  const c = ui.walk.cards[+i]; if (!c || !c.name.trim()) { toast('Ponle nombre.'); return; }
  c.busy = true; render();
  const photoId = await uploadPhoto(c.blob);
  const isRack = c.kind === 'attachment' && c.attachments.length;
  const id = slug(c.name);
  if (!isRack) await writeDoc('equipment/' + id, cur => ({ ...(cur || {}), name: c.name.trim(), kind: c.kind, available: true, confirm: false, photoId: photoId || (cur && cur.photoId) || null, addedAt: today(), source: 'recorrido' }));
  for (const a of c.attachments.filter(a => a.on)) await writeDoc('equipment/' + slug(a.name), cur => ({ ...(cur || {}), name: a.name, kind: 'attachment', available: true, confirm: false, photoId: isRack ? (photoId || (cur && cur.photoId) || null) : (cur && cur.photoId) || null, addedAt: today(), source: 'recorrido' }));
  const newEx = [];
  if (!isRack) for (const a of c.allows.filter(a => a.on)) { const eid = slug(a.name); await writeDoc('exercises/' + eid, cur => ({ ...(cur || {}), name: a.name, equipmentIds: [...new Set([...((cur && cur.equipmentIds) || []), id])], pattern: a.pattern, muscles: (cur && cur.muscles) || [], blocked: false, source: 'recorrido' })); newEx.push(eid); }
  c.busy = false; c.saved = true; render();
  if (newEx.length && aiOn()) generateHowTo(newEx);
};
ACTIONS.walkNoHay = () => { const n = val('noHay').trim(); if (!n) return; writeDoc('equipment/' + slug(n), cur => ({ ...(cur || {}), name: n, kind: (cur && cur.kind) || 'machine', available: false, confirm: false, addedAt: today(), source: 'recorrido' })); toast('Anotado en "NO la tengo".'); render(); };
ACTIONS.walkConfirm = id => writeDoc('equipment/' + id, cur => cur ? { ...cur, confirm: false, confirmedAt: today() } : null);
ACTIONS.walkMissing = id => writeDoc('equipment/' + id, cur => cur ? { ...cur, available: false, confirm: false } : null);
ACTIONS.walkDelete = id => { ui.confirm = null; deleteDoc('equipment/' + id); };


/* =====================================================================
   CHAT TAB + SETTINGS SHEET + BOOT
   ===================================================================== */
const QUICK = ['¿Qué ceno hoy?', 'Planea mi semana', 'Este finde tengo libre…', '¿Cómo voy esta semana?'];
function chatBubble(m) {
  if (m.role === 'reset') return `<div class="msg tool" role="separator">— Nueva conversación —</div>`;
  if (m.role === 'card') { const sx = cache.get('sessions/' + m.sid); return sx ? `<div class="msg card-msg">${routineCard({ id: m.sid, ...sx }, true)}</div>` : ''; }
  const cls = m.role === 'user' ? 'me' : m.role === 'tool' ? 'tool' : m.role === 'err' ? 'err' : 'ai';
  const n = (m.imagePaths || []).length || num(m.imgCount) || 0;
  const pics = (m.imagePaths || []).length ? `<div class="row" style="gap:6px;margin-top:${m.text ? 6 : 0}px">${m.imagePaths.map(pth => `<img class="thumb" src="${esc(files.urlFor(pth))}" alt="Foto enviada" loading="lazy">`).join('')}</div>` : n ? `<div class="tiny">📷 ${n} foto(s)</div>` : '';
  return `<div class="msg ${cls}" ${m.id && m.role === 'ai' ? `id="m-${m.id}"` : ''}>${esc(m.text)}${pics}</div>`;
}
function viewChat() {
  const c = ui.chat;
  if (aiState.state === 'none' || aiState.state === 'off') return `<section class="card empty"><div class="big">El chat no está disponible aquí</div><p class="small ink2">${esc(aiState.msg || 'Claude no está conectado en esta vista.')} Todo lo demás (registro, gym, progreso, recordatorios) funciona igual.</p></section>`;
  const t = today(), vd = c.viewDate && c.viewDate !== t ? c.viewDate : t, isToday = vd === t;
  const msgs = chatMessages(vd), past = coll('chat').map(x => x.date || x.id).filter(x => x && x < t).sort().reverse();
  let h = `<section class="card" style="margin-bottom:0"><div class="row sp nw"><h2 class="grow" style="margin:0">${isToday ? 'Coach · hoy' : 'Chat del ' + esc(fmtDateEs(vd, true))}</h2>${isToday ? (msgs.length && !c.busy ? `<button class="sm ghost" data-act="chatNew">Nueva conversación</button>` : '') : `<button class="sm" data-act="chatDay" data-arg="">Volver a hoy</button>`}</div>`;
  h += `<p class="tiny muted" style="margin:4px 0 0">La conversación se guarda y se ve igual en el teléfono y en la PC. ${past.length ? `<button class="linkbtn tiny" data-act="chatDays" aria-expanded="${!!c.showDays}">Ver días anteriores</button>` : ''}</p>`;
  if (c.showDays && past.length) h += `<div class="chips" style="margin-top:6px">${past.slice(0, 30).map(d => `<button class="chip" data-act="chatDay" data-arg="${esc(d)}" aria-pressed="${d === vd}">${esc(fmtDateEs(d, true))}</button>`).join('')}</div>`;
  h += `</section><div class="msgs" id="msgs" aria-live="polite">`;
  if (isToday && !msgs.length && !c.local.length) h += `<div class="chips">${QUICK.map(q => `<button class="chip" data-act="chatQuick" data-arg="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  if (!isToday && !msgs.length) h += `<p class="small muted">Cargando…</p>`;
  for (const m of msgs) h += chatBubble(m);
  if (isToday) for (const m of c.local) h += chatBubble(m);
  h += `</div>`;
  if (!isToday) return h;
  h += `<div class="composer">`;
  if (c.imgs.length) h += `<p class="tiny ink2" style="margin:0 0 4px">📷 ${c.imgs.length} foto(s) lista(s) <button class="sm ghost" data-act="chatClearImgs">Quitar</button></p>`;
  h += `<div class="row nw" style="align-items:flex-end">${aiState.images ? `<button class="iconbtn" data-act="chatPhoto" aria-label="Adjuntar foto"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>` : ''}${SpeechRec && !c.busy ? `<button class="iconbtn${voice.on ? ' rec' : ''}" data-act="chatVoice" aria-label="${voice.on ? 'Terminar y enviar' : 'Hablar'}" aria-pressed="${voice.on}">${voice.on ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>` : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`}</button>` : ''}<div class="grow"><label class="sr" for="chatIn">Mensaje</label><textarea id="chatIn" rows="1" style="min-height:44px" data-bind="chat.draft" placeholder="${voice.on ? 'Te escucho… toca ■ para enviar' : 'Escríbeme…'}">${esc(c.draft)}</textarea></div>${c.busy ? `<button data-act="chatStop">Parar</button>` : `<button class="primary" data-act="chatSend">Enviar</button>`}</div></div>`;
  return h;
}
ACTIONS.chatDays = () => { ui.chat.showDays = !ui.chat.showDays; render(); };
ACTIONS.chatDay = d => { ui.chat.viewDate = d || null; ui.chat.showDays = false; render(); };
ACTIONS.chatSend = () => sendChat();
// ---------- Voice: the phone turns speech into text (on-device dictation), then it goes to the chat like a typed message ----------
function voiceText() { return (voice.base ? voice.base + ' ' : '') + voice.finalTxt; }
ACTIONS.chatVoice = () => {
  if (!SpeechRec) return;
  if (voice.on) { voice.send = true; try { voice.rec.stop(); } catch (e) { } return; }
  const ta = document.getElementById('chatIn'); if (ta) ui.chat.draft = ta.value;
  const r = new SpeechRec();
  r.lang = 'es-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
  Object.assign(voice, { on: true, rec: r, base: (ui.chat.draft || '').trim(), finalTxt: '', send: false });
  r.onresult = ev => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) voice.finalTxt = (voice.finalTxt + ' ' + t).trim(); else interim += t; }
    ui.chat.draft = (voiceText() + (interim ? ' ' + interim : '')).trim();
    const el = document.getElementById('chatIn'); if (el) el.value = ui.chat.draft;
  };
  r.onerror = ev => { if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') toast('Activa el micrófono para esta app en Ajustes del iPhone (y el Dictado en Teclado).'); else if (ev.error !== 'no-speech' && ev.error !== 'aborted') toast('No te escuché bien. Intenta otra vez.'); };
  r.onend = () => {
    const send = voice.send; voice.on = false; voice.rec = null;
    ui.chat.draft = (ui.chat.draft || '').trim();
    render();
    if (send && ui.chat.draft) sendChat();
  };
  try { r.start(); } catch (e) { voice.on = false; toast('No pude abrir el micrófono.'); }
  render();
};
ACTIONS.chatStop = () => { if (ui.chat.ctl) ui.chat.ctl.abort(); };
ACTIONS.chatQuick = q => { ui.chat.draft = q; if (q.endsWith('…')) { render(); const t = $('#chatIn'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } } else sendChat(); };
ACTIONS.chatNew = () => { if (ui.chat.busy) return; ui.chat.local = []; chatPost({ role: 'reset', text: 'Nueva conversación' }); };
ACTIONS.chatPhoto = () => pickImages(true, b => { ui.chat.imgs = b; render(); });
ACTIONS.chatClearImgs = () => { ui.chat.imgs = []; render(); };
document.addEventListener('keydown', ev => { if (ev.target && ev.target.id === 'chatIn' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); sendChat(); } if (ev.key === 'Escape' && ui.sheet) ACTIONS.closeSheet(); });

// ---------- Settings sheet ----------
function viewSheet(kind) {
  if (kind && kind.startsWith('howto:')) {
    const id = kind.slice(6), e = cache.get('exercises/' + id); const ex = e ? { id, ...e } : { id, name: id, pattern: 'other' };
    const s = todaySession(), it = s && (s.items || []).find(x => x.exId === id) || { pattern: ex.pattern };
    return `<div class="sheet" data-act="sheetBg"><div class="panel" role="dialog" aria-modal="true" aria-labelledby="h-how"><div class="row sp nw"><h2 id="h-how" class="grow" style="margin:0">${esc(ex.name)}</h2><button class="iconbtn" data-act="closeSheet" aria-label="Cerrar">×</button></div>${it.planned ? `<p class="small ink2">Plan: ${esc(planText(it))}</p>` : ''}${howToBlock(ex, it, s, true)}</div></div>`;
  }
  return viewSettings();
}
function viewSettings() {
  const r = cfg('rules'), plan = cfg('plan'), av = cfg('availability'), pantry = cfg('pantry'), theme = lsGet('theme', 'auto');
  let h = `<div class="sheet" data-act="sheetBg"><div class="panel" role="dialog" aria-modal="true" aria-labelledby="h-set"><div class="row sp"><h2 id="h-set" style="margin:0">Ajustes</h2><button class="iconbtn" data-act="closeSheet" aria-label="Cerrar">×</button></div>`;
  h += `<h3 style="margin-top:14px">Tema</h3><div class="chips">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button class="chip" data-act="setTheme" data-arg="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div>`;
  h += `<p class="small ink2" style="margin:14px 0 0">Las reglas, el plan, la despensa y los bloqueos se cambian por el chat (ej. "el café de 12 oz tiene 150 kcal", "compré brócoli"). Aquí solo se ven.</p>`;
  const kv = (l, v) => `<tr class="sub"><td>${l}</td><td class="n">${esc(v)}</td></tr>`;
  h += `<h3 style="margin-top:16px">Reglas</h3><table class="ledger">${kv('Meta de consumo', `BMR × ${r.activityFactor} − ${r.deficitTarget} + ${r.eatBackFactor} × extra (mín. ${r.targetFloor})`)}${kv('Déficit', `${r.deficitTarget} (${r.deficitMin}–${r.deficitMax})`)}${kv('Proteína', `${r.proteinMin}–${r.proteinMax} g`)}${kv('Meta', `${r.goalKg} kg`)}${kv('Movimiento (reloj)', `${r.movementTarget} kcal`)}${kv('Café 12 / 14 oz', `${r.coffee.kcal12} / ${r.coffee.kcal14} kcal${r.coffee.provisional ? ' (provisional)' : ''}`)}${kv('Flexiones', `${r.pushupKcal} kcal c/u`)}${kv('Fuerza sin lecturas del reloj', `${Math.round(r.strengthExtraFactor * 100)} %`)}${kv('BMR sin báscula', `${r.bmrFallback} kcal`)}${kv('Temporada', r.season === 'winter' ? 'invierno (todo bajo techo)' : 'verano')}</table>`;
  h += `<h3 style="margin-top:16px">Plan de la semana</h3><table class="ledger">${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => `<tr class="sub"><td>${DOW_ES[DOW_KEYS.indexOf(k)]}</td><td>${esc((plan.days[k] || {}).title || '—')}</td></tr>`).join('')}</table>`;
  const ovV = Object.entries(av.overrides || {}).filter(([d]) => d >= today()).sort();
  h += `<h3 style="margin-top:16px">Disponibilidad</h3><table class="ledger">${Object.entries(av.weekly || {}).map(([k, v]) => `<tr class="sub"><td>${DOW_ES[DOW_KEYS.indexOf(k)]}</td><td>${esc(v)}</td></tr>`).join('')}${ovV.map(([d, w]) => `<tr class="sub"><td>${fmtDateEs(d, true)}</td><td>${esc(w.map(x => x.busy ? 'ocupado' : `${x.from || '?'}–${x.to || '?'}`).join(', ') + ' ' + ((w[0] || {}).note || ''))}</td></tr>`).join('')}</table>`;
  h += `<h3 style="margin-top:16px">Despensa (${(pantry.items || []).length})</h3>${(pantry.items || []).length ? `<p class="small" style="margin:0">${esc(pantry.items.map(pantryLabel).join(' · '))}</p>` : `<p class="small muted">Vacía. Dile al chat qué tienes en la nevera.</p>`}`;
  const baV = (r.blockedActivities || []).filter(b => !b.until || b.until >= today());
  h += `<h3 style="margin-top:16px">Bloqueos</h3><p class="small" style="margin:0">Comidas: ${esc((r.blockedFoods || []).join(', ') || 'ninguna')}.<br>Actividades: ${esc(baV.map(b => (ACTIVITIES[canonicalActivity(b.name)] || { label: b.name }).label + (b.until ? ' (hasta ' + fmtDateEs(b.until) + ')' : '')).join(', ') || 'ninguna')}.</p>`;
  const notes = coll('notes').sort((a, b) => (a.createdAt || '') < (b.createdAt || '') ? 1 : -1);
  h += `<h3 style="margin-top:16px">Lo que sé de ti (${notes.length})</h3>${notes.map(nt => { const c = confirmBtns('note:' + nt.id, 'delNote', nt.id); return `<div class="row nw small" style="padding:4px 0;border-bottom:1px solid var(--line)"><span class="grow">${esc(nt.text)}</span>${c || `<button class="sm ghost" data-act="ask" data-arg="note:${esc(nt.id)}" aria-label="Borrar nota">×</button>`}</div>`; }).join('') || '<p class="small muted">El chat guarda aquí lo que deba recordar.</p>'}`;
  h += `<h3 style="margin-top:16px">Sin IA</h3>${viewManual()}<h3 style="margin-top:16px">Datos</h3><p class="small ink2">Base de datos: ${dbState === 'ready' ? 'conectada' : dbState === 'none' ? 'no disponible' : 'cargando'} · IA: ${aiOn() ? 'activa' : 'no disponible'}${aiState.images ? ' (fotos)' : ''} · Fotos: ${files.available() ? 'sí' : 'no'} · Servidor: Supabase.</p><p class="tiny muted">Para pantallas o funciones nuevas, pídeselo a Claude Code.</p>${Platform.configured ? '<button class="danger" style="margin-top:8px" data-act="signOut">Cerrar sesión</button>' : ''}`;
  return h + `</div></div>`;
}
ACTIONS.signOut = () => Platform.auth.signOut();
ACTIONS.sheetBg = (a, el, ev) => { if (ev.target === el) ACTIONS.closeSheet(); };
ACTIONS.setTheme = t => { lsSet('theme', t); applyTheme(); render(); };
ACTIONS.saveRules = () => {
  const g = id => num(val(id));
  updateCfg('rules', r => {
    const set = (k, v) => { if (v != null && v >= 0) r[k] = v; };
    set('deficitTarget', g('r-dt')); set('goalKg', g('r-goal')); set('deficitMin', g('r-dmin')); set('deficitMax', g('r-dmax')); set('proteinMin', g('r-pmin')); set('proteinMax', g('r-pmax'));
    set('pushupKcal', g('r-pu')); set('bmrFallback', g('r-bmr')); set('movementTarget', g('r-mv')); r.season = val('r-season') === 'summer' ? 'summer' : 'winter';
    const sf = g('r-sf'); if (sf != null && sf >= 0 && sf <= 100) r.strengthExtraFactor = sf / 100;
    r.coffee = { ...(r.coffee || DEFAULT_RULES.coffee), kcal12: g('r-c12') ?? r.coffee.kcal12, kcal14: g('r-c14') ?? r.coffee.kcal14, provisional: document.getElementById('r-prov').checked };
  });
  for (const [oz, id] of [['12', 'r-c12'], ['14', 'r-c14']]) { const k = g(id); if (k != null && cache.has('foods/cafe-french-vanilla-' + oz)) writeDoc('foods/cafe-french-vanilla-' + oz, cur => cur ? { ...cur, kcal: k, provisional: document.getElementById('r-prov').checked } : null); }
  toast('Reglas guardadas.');
};
ACTIONS.savePlan = () => {
  const days = {}; let bad = null;
  for (const k of DOW_KEYS) { const [kind, tpl] = val('p-' + k).split(':'); const title = kind === 'gym' ? TEMPLATES[tpl].title : { rest: 'Descanso', football: 'Fútbol', flex: 'Día flexible: una actividad bajo techo' }[kind]; days[k] = { kind, template: tpl || undefined, title, detail: val('pd-' + k) }; }
  for (let i = 0; i < 7; i++) { const k = DOW_KEYS[i], nx = DOW_KEYS[(i + 1) % 7]; if (days[k].kind === 'gym' && TEMPLATES[days[k].template] && TEMPLATES[days[k].template].heavyLegs && days[nx].kind === 'football') bad = DOW_ES[i]; }
  if (bad) { toast(`El ${bad} es antes del fútbol: ese día toca Gym B.`); return; }
  updateCfg('plan', p => { p.days = days; }); toast('Plan guardado.');
};
ACTIONS.delAvail = d => updateCfg('availability', a => { if (a.overrides) delete a.overrides[d]; });
ACTIONS.addPantry = () => { const v = val('pantryIn').split(',').map(s => s.trim()).filter(Boolean); if (!v.length) return; pantryOp({ add: v.map(name => ({ name })) }); };
ACTIONS.delPantry = n => updateCfg('pantry', p => { p.items = (p.items || []).filter(i => i.name !== n); });
ACTIONS.blockFood = () => { const v = val('blockIn').trim(); if (!v) return; updateCfg('rules', r => { r.blockedFoods = [...new Set([...(r.blockedFoods || []), v])]; }); };
ACTIONS.unblockActivity = n => updateCfg('rules', r => { r.blockedActivities = (r.blockedActivities || []).filter(b => b.name !== n); });
ACTIONS.unblockFood = b => updateCfg('rules', r => { r.blockedFoods = (r.blockedFoods || []).filter(x => x !== b); });
ACTIONS.delNote = id => { ui.confirm = null; deleteDoc('notes/' + id); };

// Refresh clock-derived nudges once a minute (render only; never writes).
setInterval(() => { if (document.visibilityState === 'visible' && ui.tab === 'hoy') schedule(); }, 60000);
boot();

// iOS keyboard: when the on-screen keyboard is up, hide the tab bar so the chat composer sits right above it.
(() => {
  const vv = window.visualViewport; if (!vv) return;
  const check = () => { const ae = document.activeElement; const typing = ae && /INPUT|TEXTAREA/.test(ae.tagName) && ae.type !== 'checkbox'; document.body.classList.toggle('kb', !!typing && vv.height < window.innerHeight - 120); };
  vv.addEventListener('resize', check); document.addEventListener('focusin', () => setTimeout(check, 250)); document.addEventListener('focusout', () => setTimeout(check, 250));
})();
