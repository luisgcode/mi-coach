const C = require('../calc.js'); const R = C.DEFAULT_RULES;
const seed = require('fs').readFileSync(__dirname + '/../seed.js','utf8');
const S = new Function('DEFAULT_RULES', seed + '; return {SEED_EQUIPMENT, SEED_EXERCISES};')(R);
const ex = S.SEED_EXERCISES.map(e => ({blocked:false, ...e}));
let sessions = [];
for (const t of ['A','B','C']) for (let w = 0; w < 4; w++) {
  const date = C.addDays('2026-11-09', 7*w + (t==='A'?0:t==='B'?3:4));
  const b = C.buildSession({template:t,timeMin:60,energy:'bien',exercises:ex,equipment:S.SEED_EQUIPMENT,sessions,rules:R,date});
  console.log(t, 'w'+w, b.formatLabel, '|', b.items.map(i=>i.name.split(' ').slice(0,3).join(' ')+(i.anchor?'*':'')+(i.group?'('+i.group.replace('Superserie ','SS')+')':'')).join(', '), '|', b.finisher&&b.finisher.name);
  sessions.push({id:date+'-a', date, template:b.template, status:'done', items:b.items.map(i=>({...i, sets:i.planned.list.map(s=>({reps:s.reps, kg:20}))}))});
}
const sp = C.buildSession({template:'A',timeMin:45,energy:'normal',exercises:ex,equipment:S.SEED_EQUIPMENT,sessions,rules:R,date:'2026-12-07',surprise:4242});
console.log('surprise', sp.title, sp.items.map(i=>i.name).join(', '), sp.finisher&&sp.finisher.name);
