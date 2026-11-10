// Long days (Mon/Fri, 90 min) must fill the time with more work; 60-min days stay within 60.
const assert = require('assert');
const C = require('../calc.js'); const R = C.DEFAULT_RULES;
const seed = require('fs').readFileSync(__dirname + '/../seed.js', 'utf8');
const S = new Function('DEFAULT_RULES', seed + '; return {SEED_EQUIPMENT, SEED_EXERCISES};')(R);
const ex = S.SEED_EXERCISES.map(e => ({ blocked: false, ...e }));
const mk = (t, m, d, energy = 'normal') => C.buildSession({ template: t, timeMin: m, energy, exercises: ex, equipment: S.SEED_EQUIPMENT, sessions: [], rules: R, date: d });
const sets = b => b.items.reduce((a, i) => a + i.planned.sets, 0);
for (const [t, d] of [['A', '2026-11-09'], ['C', '2026-11-13'], ['B', '2026-11-12'], ['A', '2026-11-23'], ['C', '2026-11-20']]) {
  const long = mk(t, 90, d), short = mk(t, 60, d);
  assert.ok(long.estMin >= 75 && long.estMin <= 90, `${t} ${d} 90 min uses the time (${long.estMin})`);
  assert.ok(short.estMin <= 60, `${t} ${d} 60 min fits (${short.estMin})`);
  assert.ok(sets(long) + (long.cardio ? long.cardio.rounds : 0) > sets(short) + (short.cardio ? short.cardio.rounds : 0), `${t} ${d} long day has more work`);
  for (const i of long.items) assert.strictEqual(i.sets.length, i.planned.list.length, 'set rows match plan');
}
const tired = mk('A', 90, '2026-11-09', 'cansado');
assert.ok(tired.items.every(i => i.planned.sets === 4), 'always 4 sets');
assert.ok(mk('B', 60, '2026-11-12').items.every(i => i.planned.sets === 4 && (i.pattern === 'core' || i.planned.reps === 12 || i.planned.list[0].reps === 12)), 'default 4x12');
console.log('long-day ok');
