// Watch snapshots: extra = max(0, estimate - watch delta); without readings, 100 % of the estimate.
const assert = require('assert');
const C = require('../calc.js'); const R = C.DEFAULT_RULES;
assert.strictEqual(R.strengthExtraFactor, 1, 'strength factor defaults to 1.0');
assert.strictEqual(R.movementTarget, 250, 'movement target defaults to 250');
const sets = Array.from({ length: 4 }, () => ({ reps: 10, kg: 40 }));
const sess = { items: [{ exId: 'a', name: 'Prensa', sets }, { exId: 'b', name: 'Remo', sets }] };
const none = C.sessionKcal(sess, 81, R);
assert.strictEqual(none.watchDelta, null);
assert.strictEqual(none.extra, none.estimate, 'no readings: 100 % of the estimate');
const some = C.sessionKcal({ ...sess, watchStart: 120, watchEnd: 140 }, 81, R);
assert.strictEqual(some.watchDelta, 20);
assert.strictEqual(some.extra, some.estimate - 20, 'estimate minus what the watch saw');
const lots = C.sessionKcal({ ...sess, watchStart: 100, watchEnd: 600 }, 81, R);
assert.strictEqual(lots.extra, 0, 'never negative');
// Cardio the watch counted is inside the delta: it must not reduce the strength extra.
const cardio = { runMin: 1, walkMin: 2, rounds: 4, done: true, watchCounted: true };
const cardioKcal = C.sessionKcal({ items: [], cardio }, 81, R).gross;
const withCardio = C.sessionKcal({ ...sess, watchStart: 100, watchEnd: 100 + cardioKcal + 20, cardio }, 81, R);
assert.strictEqual(withCardio.strengthSeen, 20, 'only the non-cardio part of the delta counts against strength');
assert.strictEqual(withCardio.extra, withCardio.estimate - 20);
// Flex day: ONE activity, never "y/o".
const t = C.pickFlexActivity({ rules: R, today: '2026-11-14', now: { dow: 6 }, bodyKg: 81 });
assert.ok(t.text && !/y\/o|\bo\b/.test(t.text), 'one activity: ' + t.text);
console.log('session-kcal + flex tests ok:', none.estimate, some.extra, lots.extra, '|', t.text);
