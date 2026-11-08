// "No quiero jugar squash": blocked activities disappear from every suggestion, permanently or for the week.
const assert = require('assert');
const fs = require('fs');
const C = require('../calc.js');
const R = JSON.parse(JSON.stringify(C.DEFAULT_RULES));
const seed = fs.readFileSync(__dirname + '/../seed.js', 'utf8').replace("'use strict';", '');
const S = new Function('DEFAULT_RULES', seed + '; return {SEED_EQUIPMENT, SEED_EXERCISES};')(C.DEFAULT_RULES);
const eqIds = new Set(S.SEED_EQUIPMENT.filter(e => e.available !== false).map(e => e.id));
assert.strictEqual(C.canonicalActivity('No quiero jugar Squash'), 'squash');
assert.strictEqual(C.canonicalActivity('la elíptica'), 'eliptica');
assert.strictEqual(C.canonicalActivity('caminadora'), 'cinta');
const sat = { rules: R, today: '2026-11-14', now: { dow: 6, hour: 17 }, bodyKg: 81, equipmentIds: eqIds };
assert.strictEqual(C.pickFlexActivity(sat).id, 'squash', 'Saturday defaults to squash');
// permanent block
R.blockedActivities = [{ name: 'squash', until: null }];
const flex = C.pickFlexActivity(sat);
assert.notStrictEqual(flex.id, 'squash'); assert.ok(!/squash|y\/o/i.test(flex.text), flex.text);
assert.ok(!C.movementOptions(81, R, { equipmentIds: eqIds, today: '2026-11-14' }).some(o => o.id === 'squash'));
const pm = C.pickMovement({ ...sat, plan: { days: {} }, now: { dow: 6, hour: 17 } }, 300); assert.ok(!/squash/i.test(pm.text), pm.text);
// week block on the rope: finishers never use it, the rope challenge is paused, but it is back next week
R.blockedActivities = [{ name: 'cuerda', until: '2026-11-15' }];
for (let w = 0; w < 6; w++) for (const t of ['A', 'B', 'C']) {
  const date = C.addDays('2026-11-09', 7 * w);
  const b = C.buildSession({ template: t, timeMin: 60, energy: 'bien', exercises: S.SEED_EXERCISES, equipment: S.SEED_EQUIPMENT, sessions: [], rules: R, date: '2026-11-10' });
  assert.ok(!b.finisher || !/cuerda/i.test(b.finisher.name + b.finisher.desc), 'no rope finisher this week: ' + (b.finisher && b.finisher.name));
}
assert.ok(C.goalPaused({ metric: 'rope_month' }, R, '2026-11-12'));
assert.ok(!C.goalPaused({ metric: 'rope_month' }, R, '2026-11-16'), 'week block expires');
assert.strictEqual(C.nextGoalProposal({ metric: 'rope_month', target: 1000, label: '1.000 saltos' }, R, '2026-11-12'), null);
// blocking the treadmill moves C-day intervals to the elliptical
R.blockedActivities = [{ name: 'cinta', until: null }];
const c = C.buildSession({ template: 'C', timeMin: 60, energy: 'bien', exercises: S.SEED_EXERCISES, equipment: S.SEED_EQUIPMENT, sessions: [], rules: R, date: '2026-11-13' });
assert.ok(c.cardio && /elíptica/.test(c.cardio.text), 'C intervals on the elliptical: ' + (c.cardio && c.cardio.text));
assert.ok(!c.finisher || !/cinta/i.test(c.finisher.name), 'no treadmill finisher');
// weight goal uses the weekly average: one low day does not unlock it
const series = [{ date: '2026-11-09', kg: 80.4 }, { date: '2026-11-10', kg: 80.3 }, { date: '2026-11-11', kg: 79.8 }, { date: '2026-11-12', kg: 80.5 }];
const g = C.goalProgress({ metric: 'weight_kg', target: 79.9, preset: true }, { series, sessions: [], days: [], plan: {}, today: '2026-11-12', rules: R, startKg: 90 });
assert.ok(!g.done, 'single day below 80 does not count');
console.log('blocked-activities + weekly-goal tests ok | flex without squash:', flex.text, '| C cardio:', c.cardio.text);
// Before planStart: no nudges at all; streaks count from planStart (day 0 is only the baseline).
{
  const now = C.tzNow(new Date('2026-11-08T19:00:00Z'));
  const n = C.computeNudges({ now, today: now.date, planStart: '2026-11-09', daysByDate: {}, sessions: [], rules: C.DEFAULT_RULES, plan: { days: {} }, availability: {}, mealTimes: {}, balance: null, nudgesStore: [{ id: 'x', text: 'chat nudge', kind: 'hacer' }], bodyKg: 81, lastWeekStats: null });
  assert.strictEqual(n.length, 0, 'no nudges before the plan starts');
  const after = C.tzNow(new Date('2026-11-09T15:00:00Z'));
  assert.ok(C.computeNudges({ now: after, today: after.date, planStart: '2026-11-09', daysByDate: {}, sessions: [], rules: C.DEFAULT_RULES, plan: { days: {} }, availability: {}, mealTimes: {}, balance: null, nudgesStore: [], bodyKg: 81, lastWeekStats: null }).length > 0, 'nudges run normally from planStart');
  const st = C.streaks({ planStart: '2026-11-09', today: '2026-11-09', days: [{ date: '2026-11-08', weighIn: { weight_kg: 81 } }], sessions: [], plan: {} });
  assert.strictEqual(st.daysLogged, 0, 'day 0 does not count as a logged day');
  console.log('planStart tests ok');
}
