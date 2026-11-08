#!/usr/bin/env node
// Admin access to Luis's Mi Coach data (service role; bypasses RLS). For Claude Code / local use only.
// Secrets file (never committed): C:/Users/luisg/.secrets/mi-coach.env with
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=...
//   MI_COACH_OWNER=<auth user uuid>   (optional; defaults to the only user in the project)
// Usage:
//   node tools/db.mjs get <path>              e.g. get config/rules
//   node tools/db.mjs list <coll>             e.g. list days
//   node tools/db.mjs set <path> '<json>'     full replace
//   node tools/db.mjs update <path> '<json>'  shallow merge (doc must exist)
//   node tools/db.mjs delete <path>
//   node tools/db.mjs export [file.json]      every doc of the owner
//   node tools/db.mjs seed-private [file]     writes tools/seed-private.json docs that don't exist yet
//                                             (profile, weight history, day-0 baseline: kept out of the public repo)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const envFile = process.env.MI_COACH_ENV || path.join(homedir(), '.secrets', 'mi-coach.env');
if (!existsSync(envFile)) { console.error(`Missing ${envFile}`); process.exit(1); }
const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter(l => /^\s*[A-Z_]+\s*=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; }));
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in ' + envFile); process.exit(1); }
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function owner() {
  if (env.MI_COACH_OWNER) return env.MI_COACH_OWNER;
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) throw error;
  if (data.users.length !== 1) throw new Error(`Found ${data.users.length} users; set MI_COACH_OWNER in ${envFile}`);
  return data.users[0].id;
}
const parentColl = p => p.split('/').slice(0, -1).join('/');
const checkPath = p => { if (!p || p.split('/').length % 2 !== 0) throw new Error(`"${p}" is not a document path (even number of segments, e.g. days/2026-11-09)`); };
const parse = s => { try { const v = JSON.parse(s); if (!v || typeof v !== 'object' || Array.isArray(v)) throw 0; return v; } catch { throw new Error('JSON must be an object'); } };
const out = v => console.log(JSON.stringify(v, null, 2));

const [cmd, a, b] = process.argv.slice(2);
try {
  const uid = await owner();
  if (cmd === 'get') {
    checkPath(a);
    const { data, error } = await sb.from('docs').select('data,updated_at').eq('owner', uid).eq('path', a).maybeSingle();
    if (error) throw error; out(data ? data.data : null);
  } else if (cmd === 'list') {
    const { data, error } = await sb.from('docs').select('path,data,updated_at').eq('owner', uid).eq('coll', a).order('path');
    if (error) throw error; out(data.map(r => ({ id: r.path.split('/').pop(), updated_at: r.updated_at, data: r.data })));
  } else if (cmd === 'set') {
    checkPath(a);
    const { error } = await sb.from('docs').upsert({ owner: uid, path: a, coll: parentColl(a), data: parse(b), updated_at: new Date().toISOString() }, { onConflict: 'owner,path' });
    if (error) throw error; console.log('ok');
  } else if (cmd === 'update') {
    checkPath(a);
    const { data: cur, error: e1 } = await sb.from('docs').select('data').eq('owner', uid).eq('path', a).maybeSingle();
    if (e1) throw e1; if (!cur) throw new Error('document does not exist: ' + a);
    const { error } = await sb.from('docs').update({ data: { ...cur.data, ...parse(b) }, updated_at: new Date().toISOString() }).eq('owner', uid).eq('path', a);
    if (error) throw error; console.log('ok');
  } else if (cmd === 'delete') {
    checkPath(a);
    const { error } = await sb.from('docs').delete().eq('owner', uid).eq('path', a);
    if (error) throw error; console.log('ok');
  } else if (cmd === 'export') {
    const all = []; let from = 0;
    for (;;) { const { data, error } = await sb.from('docs').select('path,coll,data,updated_at').eq('owner', uid).order('path').range(from, from + 999); if (error) throw error; all.push(...data); if (data.length < 1000) break; from += 1000; }
    const file = a || `mi-coach-export-${new Date().toISOString().slice(0, 10)}.json`;
    writeFileSync(file, JSON.stringify(all, null, 2)); console.log(`${all.length} docs -> ${file}`);
  } else if (cmd === 'seed-private') {
    const file = a || path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed-private.json');
    const docs = JSON.parse(readFileSync(file, 'utf8'));
    for (const [p, data] of Object.entries(docs)) {
      checkPath(p);
      const { data: cur, error: e1 } = await sb.from('docs').select('path').eq('owner', uid).eq('path', p).maybeSingle();
      if (e1) throw e1;
      if (cur) { console.log('exists, skipped:', p); continue; }
      const { error } = await sb.from('docs').insert({ owner: uid, path: p, coll: parentColl(p), data: { ...data, seededAt: new Date().toISOString() } });
      if (error) throw error; console.log('seeded:', p);
    }
  } else {
    console.log('Commands: get <path> | list <coll> | set <path> <json> | update <path> <json> | delete <path> | export [file] | seed-private [file]');
    process.exit(cmd ? 1 : 0);
  }
} catch (e) { console.error('Error:', e.message || e); process.exit(1); }
