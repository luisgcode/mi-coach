// Spec 13: target = max(floor, BMR x 1.2 - 450 + 0.5 x extra); extra = watch over the movement target + exercise extra.
const assert = require('assert');
const C = require('../calc.js'); const R = C.DEFAULT_RULES;
assert.strictEqual(R.activityFactor, 1.2); assert.strictEqual(R.eatBackFactor, 0.5); assert.strictEqual(R.targetFloor, 1600);
const bal = (day, bmr = 1750, sessions = []) => C.dayBalance(day, { bmr, bodyKg: 80, rules: R, sessions });
const near = (v, x, msg) => assert.ok(Math.abs(v - x) <= 5, `${msg}: ${v} vs ~${x}`);
// Rest day: watch under the movement target adds nothing.
const rest = bal({ watch: { kcal: 200 } });
near(rest.target, 1650, 'rest day'); assert.strictEqual(rest.extra, 0); assert.strictEqual(rest.base, 2100);
// Gym +250 the watch did not see (session with no watch readings: 100 % of the estimate) -> +125.
const sets = Array.from({ length: 4 }, () => ({ reps: 10, kg: 40 }));
const sess = { status: 'done', items: [{ exId: 'a', name: 'Prensa', sets }, { exId: 'b', name: 'Remo', sets }] };
const est = C.sessionKcal(sess, 80, R).extra;
const scale = 250 / est; // build a session whose extra is ~250
const big = { status: 'done', items: Array.from({ length: Math.round(2 * scale) }, (_, i) => ({ exId: 'x' + i, name: 'Ej ' + i, sets })) };
const gym = bal({ watch: { kcal: 250 } }, 1750, [big]);
near(gym.extra, 250, 'gym extra'); near(gym.target, 1775, 'gym day');
// Football +650: the watch counted the match (watch 250 + 650), nothing double counted.
const fb = bal({ watch: { kcal: 900 }, activities: [{ type: 'football', before: { watch: 200 }, after: { watch: 850 } }] });
assert.strictEqual(fb.extra, 650, 'only the watch over 250 counts'); near(fb.target, 1975, 'football day');
// Deficit = base + extra - consumed, remaining = target - consumed.
const ate = bal({ watch: { kcal: 900 }, foods: [{ kcal: 1500, protein: 120 }] });
assert.strictEqual(ate.deficit, 2100 + 650 - 1500); assert.strictEqual(ate.remaining, ate.target - 1500); assert.strictEqual(ate.status, 'ok');
const over = bal({ watch: { kcal: 200 }, foods: [{ kcal: 1800, protein: 120 }] });
assert.strictEqual(over.status, 'over', 'past the target'); assert.ok(!over.overBurn, 'but still under what he spends');
// Floor: a low BMR never drops the target below 1600.
const low = bal({ watch: { kcal: 100 } }, 1300);
assert.strictEqual(low.target, 1600); assert.ok(low.floored);
// "vas pasado" nudge uses the new target.
const now = C.tzNow(new Date('2026-11-10T18:00:00Z'));
const n = C.computeNudges({ now, today: now.date, daysByDate: {}, sessions: [], rules: R, plan: { days: {} }, availability: {}, mealTimes: {}, balance: over, nudgesStore: [], bodyKg: 80, planStart: '2026-11-09' });
assert.ok(n.some(x => x.key.startsWith('pasado') && x.text.includes(String(over.target))), 'past-target nudge');
console.log('target tests ok | rest', rest.target, '| gym', gym.target, '| football', fb.target, '| floor', low.target);
