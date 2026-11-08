// Review pass: progression -10 %, no leg day before football, nudges (pre-football, weekend rebound, movement), pantry merge.
const assert = require('assert');
const C = require('../calc.js'); const R = C.DEFAULT_RULES;

// --- "Not completed -> keep or -10 %": the lighter weight is really lighter (rounding used to give the same weight back).
assert.strictEqual(C.lighter(10, 2.5), 7.5, '10 kg -> 7,5 kg (9 rounded to 10 would be no change)');
assert.strictEqual(C.lighter(25, 5), 20, '25 lb -> 20 lb');
assert.strictEqual(C.lighter(40, 2.5), 35, '40 kg -> 36 -> 35');
assert.strictEqual(C.lighter(2, 2.5), 0, 'never negative');
const downKg = C.nextStrength({ planned: { sets: 3, reps: 10 }, sets: [{ reps: 5, w: 10, unit: 'kg' }, { reps: 4, w: 10, unit: 'kg' }, { reps: 3, w: 10, unit: 'kg' }], feel: 'dificil' });
assert.strictEqual(downKg.action, 'down');
assert.ok(downKg.sets.every(s => s.w < 10), 'down in kg goes below 10: ' + downKg.text);
const downLb = C.nextStrength({ planned: { sets: 3, reps: 10 }, sets: [{ reps: 4, w: 25, unit: 'lb' }, { reps: 4, w: 25, unit: 'lb' }, { reps: 3, w: 25, unit: 'lb' }], feel: 'dificil' });
assert.strictEqual(downLb.unit, 'lb');
assert.ok(downLb.sets.every(s => s.w === 20), 'down in lb: 25 -> 20 lb: ' + downLb.text);
// Easy in lb: half the sets go up one plate step, same unit.
const upLb = C.nextStrength({ planned: { sets: 4, reps: 12 }, sets: Array.from({ length: 4 }, () => ({ reps: 12, w: 25, unit: 'lb' })), feel: 'facil' });
assert.deepStrictEqual(upLb.sets.map(s => s.w), [25, 25, 30, 30], 'lb: +5 lb on half the sets');

// --- Never legs the day before football: A and C both switch to B.
const SEED = (() => { const vm = require('vm'), fs = require('fs'); const ctx = { DEFAULT_RULES: R }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../seed.js', 'utf8') + ';this.EQ=SEED_EQUIPMENT;this.EX=SEED_EXERCISES;', ctx); return ctx; })();
for (const tpl of ['A', 'C']) {
  const s = C.buildSession({ template: tpl, timeMin: 60, energy: 'normal', exercises: SEED.EX, equipment: SEED.EQ, sessions: [], rules: R, date: '2026-11-10', tomorrowFootball: true });
  assert.strictEqual(s.template, 'B', tpl + ' before football becomes B');
}
assert.strictEqual(C.buildSession({ template: 'C', timeMin: 60, exercises: SEED.EX, equipment: SEED.EQ, sessions: [], rules: R, date: '2026-11-13' }).template, 'C', 'C stays C on a normal Friday');
// Missing equipment never shows up.
for (const tpl of ['A', 'B', 'C']) for (let w = 0; w < 6; w++) {
  const s = C.buildSession({ template: tpl, timeMin: 90, energy: 'bien', exercises: SEED.EX, equipment: SEED.EQ, sessions: [], rules: R, date: C.addDays('2026-11-09', 7 * w) });
  const missing = new Set(SEED.EQ.filter(e => e.available === false).map(e => e.id));
  for (const it of s.items) { const ex = SEED.EX.find(e => e.id === it.exId); assert.ok(!(ex.equipmentIds || []).some(id => missing.has(id)), 'no missing machine: ' + it.name); }
}
// Tired: the -10 % really lowers the planned weight.
const lastHip = [{ date: '2026-11-09', status: 'done', template: 'A', items: [{ exId: 'db-hip-thrust', name: 'Hip thrust', sets: Array.from({ length: 3 }, () => ({ reps: 10, w: 20, unit: 'kg' })), feel: 'bien' }] }];
const tired = C.buildSession({ template: 'A', timeMin: 60, energy: 'cansado', exercises: SEED.EX, equipment: SEED.EQ, sessions: lastHip, rules: R, date: '2026-11-16' });
const hip = tired.items.find(i => i.exId === 'db-hip-thrust');
assert.ok(hip && hip.planned.list.every(s => s.w < 20), 'tired: lighter than last time: ' + JSON.stringify(hip && hip.planned.list));

// --- Nudges
const plan = { days: { mon: { kind: 'gym', template: 'A' }, tue: { kind: 'rest' }, wed: { kind: 'football' }, thu: { kind: 'gym', template: 'B' }, fri: { kind: 'gym', template: 'C' }, sat: { kind: 'flex' }, sun: { kind: 'flex' } } };
const nudges = (iso, daysByDate = {}, p = plan) => { const now = C.tzNow(new Date(iso)), today = now.date; return C.computeNudges({ now, today, daysByDate, sessions: [], rules: R, plan: p, availability: {}, mealTimes: {}, balance: null, nudgesStore: [], bodyKg: 80, planStart: '2026-11-09' }); };
// Pre-football follows the plan, not a hard-coded Tuesday.
assert.ok(nudges('2026-11-10T15:00:00Z').some(n => n.key.startsWith('pre-futbol')), 'Tuesday before Wednesday football');
const moved = { days: { ...plan.days, wed: { kind: 'rest' }, thu: { kind: 'football' } } };
assert.ok(!nudges('2026-11-10T15:00:00Z', {}, moved).some(n => n.key.startsWith('pre-futbol')), 'no pre-football nudge when football moved');
assert.ok(nudges('2026-11-11T15:00:00Z', {}, moved).some(n => n.key.startsWith('pre-futbol')), 'pre-football the day before the moved match');
// Weekend rebound: calm, ONE action; an alert only when it repeats.
const w = (d, kg) => ({ [d]: { date: d, weighIn: { weight_kg: kg } } });
const once = nudges('2026-11-16T13:00:00Z', { ...w('2026-11-13', 80), ...w('2026-11-16', 81) }).find(n => n.key.startsWith('rebote'));
assert.ok(once && once.kind === 'considerar', 'first rebound is calm');
assert.ok(!/ y |, o | o /.test(once.text.split('no grasa:')[1]), 'one action only: ' + once.text);
const twice = nudges('2026-11-23T13:00:00Z', { ...w('2026-11-13', 80), ...w('2026-11-16', 81), ...w('2026-11-20', 80.2), ...w('2026-11-23', 81) }).find(n => n.key.startsWith('rebote'));
assert.ok(twice && twice.kind === 'alerta', 'second weekend in a row is an alert');
// Movement: a 100 kcal gap at 17:00 (watch 150 of 250) gets ONE indoor action.
const mv = nudges('2026-11-10T22:00:00Z', { '2026-11-10': { date: '2026-11-10', watch: { kcal: 150, at: '17:00' }, weighIn: { weight_kg: 80 } } }).filter(n => n.key.startsWith('movimiento'));
assert.strictEqual(mv.length, 1, 'movement nudge for a 100 kcal gap');
assert.ok(!/y\/o| o /.test(mv[0].text), 'one activity: ' + mv[0].text);
// Movement nudge at most once per day: later the same day it stays the same nudge, never a new one.
const mvDay = h => ({ '2026-11-10': { date: '2026-11-10', watch: { kcal: 150, at: h }, weighIn: { weight_kg: 80 } } });
const seenMv = { key: mv[0].key, kind: mv[0].kind, text: mv[0].text, act: mv[0].act };
const later = C.computeNudges({ movementSeen: seenMv, now: C.tzNow(new Date('2026-11-11T01:30:00Z')), today: '2026-11-10', daysByDate: mvDay('20:30'), sessions: [], rules: R, plan, availability: {}, mealTimes: {}, balance: null, nudgesStore: [], bodyKg: 80, planStart: '2026-11-09' }).filter(n => n.mv);
assert.strictEqual(later.length, 1); assert.strictEqual(later[0].text, seenMv.text, 'same movement nudge later in the day');
const dis = C.computeNudges({ movementSeen: seenMv, now: C.tzNow(new Date('2026-11-11T01:30:00Z')), today: '2026-11-10', daysByDate: mvDay('20:30'), sessions: [], rules: R, plan, availability: {}, mealTimes: {}, balance: null, nudgesStore: [{ id: seenMv.key, dismissed: true }], bodyKg: 80, planStart: '2026-11-09' }).filter(n => n.mv);
assert.strictEqual(dis.length, 0, 'dismissed: no other movement nudge that day');
// Nothing before the plan starts.
assert.strictEqual(nudges('2026-11-08T15:00:00Z').length, 0);

// --- Pantry merge (his real list today has "Sal de mesa", "Sal con limón y pimienta", two black peppers…)
const items = ['Perejil seco en hojuelas', 'Semillas de sésamo', 'Caldo de pollo en polvo (Tasteful)', 'Sal de mesa', 'Pimienta negra en grano (molinillo)', 'Pimienta negra molida', 'Sal con limón y pimienta (lemon pepper)', 'Paprika'].map(name => ({ name, category: 'condimento', addedAt: '2026-11-08' }));
let r = C.applyPantry(items, { remove: ['sal'] }, '2026-11-08');
assert.strictEqual(r.items.length, items.length, '"sal" is ambiguous: nothing removed (used to wipe both salts)');
assert.deepStrictEqual(r.ambiguous, ['sal']);
r = C.applyPantry(items, { remove: ['sal de mesa'] }, '2026-11-08');
assert.deepStrictEqual(r.removed, ['Sal de mesa']); assert.strictEqual(r.items.length, items.length - 1);
r = C.applyPantry(items, { remove: ['pimienta'] }, '2026-11-08');
assert.strictEqual(r.removed.length, 0, '"pimienta" matches 3 items: ask, do not guess');
r = C.applyPantry(items, { remove: ['paprika', 'curry'] }, '2026-11-08');
assert.deepStrictEqual(r.removed, ['Paprika']); assert.deepStrictEqual(r.notFound, ['curry']);
r = C.applyPantry(items, { remove: ['caldo de pollo'] }, '2026-11-08');
assert.deepStrictEqual(r.removed, ['Caldo de pollo en polvo (Tasteful)'], 'a whole-word match that points to ONE item');
// Add: no duplicates (accents, case, plurals), quantities update in place, nothing else changes.
r = C.applyPantry([], { add: [{ name: 'Huevos', qty: '12', category: 'proteina' }, { name: 'huevo', qty: '10' }, { name: 'Limones' }, { name: 'limón' }] }, '2026-11-08');
assert.strictEqual(r.items.length, 2); assert.strictEqual(r.items[0].qty, '10', 'second mention updates the quantity'); assert.strictEqual(r.items[0].category, 'proteina');
r = C.applyPantry(items, { add: [{ name: 'Pechuga de pollo', qty: '2 pechugas', category: 'proteina' }] }, '2026-11-08');
assert.strictEqual(r.items.length, items.length + 1);
assert.deepStrictEqual(r.items.slice(0, items.length).map(i => i.name), items.map(i => i.name), 'existing items untouched');
r = C.applyPantry(r.items, { add: [{ name: 'pechugas de pollo', qty: 'media bolsa' }] }, '2026-11-09');
assert.strictEqual(r.items.length, items.length + 1); assert.deepStrictEqual(r.updated, ['Pechuga de pollo']); assert.strictEqual(r.items.find(i => i.name === 'Pechuga de pollo').qty, 'media bolsa');
// Idempotent: the same add twice changes nothing the second time.
const again = C.applyPantry(r.items, { add: [{ name: 'Pechuga de pollo', qty: 'media bolsa' }] }, '2026-11-09');
assert.deepStrictEqual(again.items, r.items); assert.strictEqual(again.added.length + again.updated.length, 0);
assert.strictEqual(C.applyPantry(items, { clear: true }).items.length, 0, 'clear only when asked');
assert.strictEqual(C.applyPantry(items, {}).items.length, items.length);

// --- No personal health numbers in the public defaults.
assert.strictEqual(R.bmrFallback, 1700, 'generic default: the real BMR lives in the db, not in the public repo');
console.log('review tests ok |', downKg.text, '|', downLb.text, '|', once.text);
