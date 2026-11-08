const C = require('../calc.js'); const R = C.DEFAULT_RULES;
const plan = { days: { mon:{kind:'gym',template:'A',title:'Gym A'}, tue:{kind:'rest'}, wed:{kind:'football',title:'Fútbol'}, thu:{kind:'gym',template:'B',title:'Gym B'}, fri:{kind:'gym',template:'C',title:'Gym C'}, sat:{kind:'flex'}, sun:{kind:'flex'} } };
const eq = new Set(['treadmill','elliptical','jump-rope','kettlebells','squash-court']);
function run(iso, day, label) { const now = C.tzNow(new Date(iso)); const b = C.dayBalance(day, {bmr:1700, bodyKg:81, rules:R, sessions:[]});
  const n = C.computeNudges({ now, today: now.date, daysByDate: {[now.date]: day}, sessions: [], rules: R, plan, availability: {overrides:{}}, mealTimes: {}, balance: b, nudgesStore: [], bodyKg: 81, lastWeekStats: null, equipmentIds: eq });
  console.log('--', label, now.date, now.hm); for (const x of n) console.log('  ', x.kind, x.text); }
run('2026-11-09T15:00:00Z', {}, 'Mon 10:00 WFH');
run('2026-11-12T23:00:00Z', { watch:{kcal:120, at:'17:00'}, foods:[{kcal:1500,protein:80,at:'12:30'},{kcal:600,protein:20,at:'15:00'}] }, 'Thu 18:00 gap + red (day after football)');
run('2026-11-14T22:00:00Z', { watch:{kcal:200, at:'16:00'}, foods:[{kcal:2300,protein:90,at:'13:00'}] }, 'Sat 17:00 over');
const a = C.buildSession({template:'B', timeMin:60, energy:'bien', exercises:[], equipment:[], sessions:[], rules:R, date:'2026-11-12'}); console.log('empty B:', a.items.length, a.finisher);
