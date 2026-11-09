'use strict';
/* =====================================================================
   PURE LOGIC (no DOM, no db). Tested with node.
   ===================================================================== */

// ---------- Time helpers, always America/Toronto ----------
const TZ = 'America/Toronto';
const _fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function tzNow(d = new Date()) {
  const o = {};
  for (const p of _fmt.formatToParts(d)) o[p.type] = p.value;
  const date = `${o.year}-${o.month}-${o.day}`;
  const hour = (+o.hour) % 24;
  return { date, hour, minute: +o.minute, hm: `${String(hour).padStart(2, '0')}:${o.minute}`, dow: dowIndex(date), mins: hour * 60 + (+o.minute) };
}
function dowIndex(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); } // 0 = Sunday
function addDays(iso, n) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
function weekStart(iso) { return addDays(iso, -((dowIndex(iso) + 6) % 7)); } // Monday
function hmToMin(hm) { if (!hm || !/^\d{1,2}:\d{2}/.test(hm)) return null; const [h, m] = hm.split(':').map(Number); return h * 60 + m; }
function minToHm(m) { m = Math.round(m); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MON_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDateEs(iso, withDow) { const [y, m, d] = iso.split('-').map(Number); return (withDow ? DOW_ES[dowIndex(iso)] + ' ' : '') + d + ' ' + MON_ES[m - 1]; }

// ---------- Number helpers ----------
const r0 = x => Math.round(x);
const r1 = x => Math.round(x * 10) / 10;
function num(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = typeof x === 'string' ? parseFloat(x.replace(',', '.')) : Number(x);
  return Number.isFinite(n) ? n : null;
}
const LB = 0.45359237;
function toKg(w, unit) { const v = num(w); if (v == null) return null; return unit === 'lb' ? Math.round(v * LB * 100) / 100 : v; }
function kgOf(s) { if (!s) return 0; if (s.w != null && s.w !== '') return toKg(s.w, s.unit) || 0; return num(s.kg) || 0; }
function fromKg(kg, unit) { return unit === 'lb' ? kg / LB : kg; }
function roundStep(x, step = 2.5) { return Math.round(x / step) * step; }
// About -10 %, rounded to the plate step, but always at least one step lighter (never back to the same weight).
function lighter(w, step = 2.5) { if (!(w > 0)) return w; const r = roundStep(w * 0.9, step); return Math.max(0, r < w ? r : w - step); }
function median(arr) { const a = arr.filter(Number.isFinite).sort((p, q) => p - q); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function avg(arr) { const a = arr.filter(Number.isFinite); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; }
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

// ---------- Defaults (also what seed() writes) ----------
const DEFAULT_RULES = {
  deficitTarget: 450, deficitMin: 400, deficitMax: 500,
  // Target (spec 13): base = BMR x activityFactor; target = base - deficitTarget + eatBackFactor x extra burn, never below targetFloor.
  activityFactor: 1.2, eatBackFactor: 0.5, targetFloor: 1600,
  proteinMin: 130, proteinMax: 150,
  bmrFallback: 1700, // generic; the real value (latest scale BMR) lives in the db (config/rules + weigh-ins)
  coffee: { name: 'French Vanilla (máquina de polvo del trabajo, 2 depósitos)', kcal12: 160, kcal14: 185, provisional: true, note: 'Provisional hasta foto de la etiqueta del polvo' },
  strengthExtraFactor: 1.0, // the Amazfit barely registers gym strength work
  pushupKcal: 0.4,
  mets: { strengthModerate: 3.5, strengthVigorous: 5.0, walk: 3.5, run: 9, intervals: 8, bike: 6.8, elliptical: 5, ellipticalVigorous: 7, rope: 10, sauna: 0, football: 7, squash: 7.3 },
  hydrationPerKg: [1, 1.5],
  blockedFoods: ['pepino', 'pasas', 'melón', 'almejas'],
  blockedActivities: [],
  noHeavyLegsBeforeFootball: true,
  maxSessionMin: 90,
  goalKg: 78,
  season: 'winter', // winter = zero outdoor activities; switch to 'summer' in spring
  movementTarget: 250, // daily watch general-counter goal (400 was the summer average, shown only as information)
  summerBaseline: 400,
  saunaWaterPer15min: 0.5
};

// ---------- Strength kcal ----------
// Estimated minutes for one set incl. rest: ~1.5 min, a bit longer for many reps or heavy loads.
function setMinutes(s) {
  const reps = num(s.reps) || 10, kg = kgOf(s);
  let m = 1.5 * (1 + 0.02 * (reps - 10));
  m = Math.min(2.0, Math.max(1.2, m));
  return m + Math.min(0.5, kg / 100);
}
// Returns {gross, extra, minutes}. extra = what we add on top of the watch.
function strengthKcal(sets, bodyKg, rules = DEFAULT_RULES, opts = {}) {
  const done = (sets || []).filter(s => num(s.reps) > 0);
  if (opts.pushups) {
    const reps = done.reduce((a, s) => a + num(s.reps), 0);
    const k = reps * (rules.pushupKcal ?? 0.4);
    return { gross: r1(k), extra: opts.watchCounted ? 0 : r1(k), minutes: done.length };
  }
  const minutes = done.reduce((a, s) => a + setMinutes(s), 0);
  const met = opts.vigorous ? rules.mets.strengthVigorous : rules.mets.strengthModerate;
  const gross = met * bodyKg * minutes / 60;
  const extra = opts.watchCounted ? 0 : gross * (rules.strengthExtraFactor ?? 1);
  return { gross: r1(gross), extra: r1(extra), minutes: r1(minutes) };
}

// ---------- Activities (cardio, football, squash, push-ups) ----------
const ACT_TYPES = {
  walk: { label: 'Caminata', met: 'walk', watchDefault: true },
  run: { label: 'Correr', met: 'run', watchDefault: true },
  runwalk: { label: 'Correr / caminar', met: null, watchDefault: true },
  treadmill_int: { label: 'Cinta: intervalos', met: 'intervals', watchDefault: true },
  bike: { label: 'Bici', met: 'bike', watchDefault: true },
  elliptical: { label: 'Elíptica', met: 'elliptical', watchDefault: true },
  football: { label: 'Fútbol', met: 'football', watchDefault: true },
  squash: { label: 'Squash', met: 'squash', watchDefault: true },
  pushups: { label: 'Flexiones', met: null, watchDefault: false },
  rope: { label: 'Cuerda', met: 'rope', watchDefault: true },
  sauna: { label: 'Sauna', met: 'sauna', watchDefault: true },
  other: { label: 'Otra', met: 'walk', watchDefault: true }
};
function footballStats(a) {
  const b = a.before || {}, f = a.after || {};
  const watchDelta = (num(f.watch) != null && num(b.watch) != null) ? num(f.watch) - num(b.watch) : null;
  const sweatKg = (num(b.kg) != null && num(f.kg) != null) ? r1((num(b.kg) - num(f.kg)) * 100) / 100 : null;
  return { watchDelta: watchDelta != null && watchDelta > 0 ? r0(watchDelta) : null, sweatKg };
}
// Returns {gross, extra, source}. extra is added to "burned" only when the watch did NOT count it.
function activityKcal(a, bodyKg, rules = DEFAULT_RULES) {
  const t = ACT_TYPES[a.type] ? a.type : 'other';
  const watchCounted = a.watchCounted ?? ACT_TYPES[t].watchDefault;
  let gross = 0, source = 'MET';
  if (t === 'pushups') {
    gross = (num(a.reps) || 0) * (rules.pushupKcal ?? 0.4); source = '0.4/flexión';
  } else if (t === 'football') {
    const fs = footballStats(a);
    if (fs.watchDelta != null) { gross = fs.watchDelta; source = 'reloj antes/después'; }
    else gross = rules.mets.football * bodyKg * ((num(a.minutes) || 60) / 60);
  } else if (t === 'sauna') {
    gross = 0; source = 'sin crédito (solo agua)';
  } else if (t === 'rope' && !num(a.minutes) && num(a.reps)) {
    gross = rules.mets.rope * bodyKg * (num(a.reps) / 120) / 60; // ~120 jumps per minute
  } else if (t === 'runwalk') {
    const rounds = num(a.rounds) || 1;
    const run = (num(a.runMin) || 0) * rounds, walk = (num(a.walkMin) || 0) * rounds;
    const met = a.treadmill ? rules.mets.intervals : rules.mets.run;
    gross = (met * run + rules.mets.walk * walk) * bodyKg / 60;
    if (!run && !walk) gross = rules.mets.walk * bodyKg * (num(a.minutes) || 0) / 60;
  } else {
    const metKey = t === 'elliptical' && a.vigorous ? 'ellipticalVigorous' : ACT_TYPES[t].met;
    gross = (rules.mets[metKey] || 3.5) * bodyKg * (num(a.minutes) || 0) / 60;
  }
  return { gross: r0(gross), extra: watchCounted ? 0 : r0(gross), source, watchCounted };
}
function runwalkMinutes(a) { const r = num(a.rounds) || 1; const m = ((num(a.runMin) || 0) + (num(a.walkMin) || 0)) * r; return m || num(a.minutes) || 0; }

// ---------- Session kcal ----------
// Strength + finisher are estimated with METs. If the watch general counter was read at the start and at the
// end of the session, the watch already caught (watchEnd - watchStart) of it: extra = max(0, estimate - delta).
// Without both readings, count the estimate x strengthExtraFactor (1.0 = 100 %). Cardio the watch counted is never added.
function sessionKcal(sess, bodyKg, rules = DEFAULT_RULES, exById = {}) {
  let est = 0, cardioGross = 0, cardioExtra = 0, cardioWatched = 0;
  for (const it of sess.items || []) {
    const ex = exById[it.exId] || {};
    est += strengthKcal(it.sets, bodyKg, rules, { vigorous: !!(ex.vigorous || it.vigorous), pushups: /flexi|push.?up/i.test(it.name || '') }).gross;
  }
  if (sess.finisher && sess.finisher.done) est += (sess.finisher.met || 8) * bodyKg * (num(sess.finisher.minutes) || 6) / 60;
  if (sess.cardio && (sess.cardio.done || sess.cardio.completed != null)) {
    const k = activityKcal({ type: 'runwalk', treadmill: true, ...sess.cardio }, bodyKg, rules);
    cardioGross += k.gross; cardioExtra += k.extra; if (k.watchCounted) cardioWatched += k.gross;
  }
  const ws = num(sess.watchStart), we = num(sess.watchEnd);
  const watchDelta = ws != null && we != null && we >= ws ? r0(we - ws) : null;
  // The part of the delta that belongs to strength work (cardio the watch counted is already in it).
  const strengthSeen = watchDelta != null ? Math.max(0, watchDelta - cardioWatched) : null;
  const strengthExtra = strengthSeen != null ? Math.max(0, est - strengthSeen) : est * (rules.strengthExtraFactor ?? 1);
  return { gross: r0(est + cardioGross), estimate: r0(est), watchDelta, strengthSeen: strengthSeen != null ? r0(strengthSeen) : null, extra: r0(strengthExtra + cardioExtra) };
}

// ---------- Day balance ----------
// ctx: {bmr, bodyKg, rules, sessions: sessions of that date}
// base = BMR x activityFactor (digestion + normal movement up to the movement target).
// extra = max(0, watch - movementTarget) + exercise the watch did not count.
// target = max(targetFloor, base - deficitTarget + eatBackFactor x extra).
// burned (what he sees, like his old chats) = BMR + the watch's general counter + exercise the watch did not count. deficit = burned - consumed.
function dayBalance(day, ctx) {
  const rules = ctx.rules || DEFAULT_RULES;
  const bmr = num(ctx.bmr) || rules.bmrFallback;
  const af = num(rules.activityFactor) || DEFAULT_RULES.activityFactor, eat = num(rules.eatBackFactor) ?? DEFAULT_RULES.eatBackFactor;
  const floor = num(rules.targetFloor) ?? DEFAULT_RULES.targetFloor, mvTarget = num(rules.movementTarget) ?? DEFAULT_RULES.movementTarget;
  const watch = num(day && day.watch && day.watch.kcal) || 0;
  let exExtra = 0;
  for (const a of (day && day.activities) || []) exExtra += activityKcal(a, ctx.bodyKg, rules).extra;
  for (const s of ctx.sessions || []) if (s.status !== 'discarded') exExtra += sessionKcal(s, ctx.bodyKg, rules, ctx.exById || {}).extra;
  const base = r0(bmr * af);
  const watchExtra = r0(Math.max(0, watch - mvTarget));
  const extra = r0(watchExtra + exExtra);
  const baseTarget = base - rules.deficitTarget;
  const eatBack = r0(eat * extra);
  const target = Math.max(floor, baseTarget + eatBack);
  const burned = r0(bmr + watch + exExtra); // the watch is the truth
  const foods = (day && day.foods) || [];
  const consumed = r0(foods.reduce((a, f) => a + (num(f.kcal) || 0), 0));
  const protein = r0(foods.reduce((a, f) => a + (num(f.protein) || 0), 0));
  const deficit = burned - consumed, remaining = target - consumed;
  let status = 'ok';
  if (remaining < 0) status = 'over';
  else if (deficit < rules.deficitMin) status = 'warn';
  const proteinStatus = protein >= rules.proteinMin ? 'ok' : 'warn';
  return { bmr, base, watch, watchExtra, exExtra: r0(exExtra), extra, baseTarget, eatBack, floored: target > baseTarget + eatBack, burned, consumed, protein, target, deficit, remaining, overBurn: consumed > burned, proteinLeft: Math.max(0, rules.proteinMin - protein), status, proteinStatus, hasFood: foods.length > 0, hasWatch: watch > 0 };
}

// ---------- Strength progression ----------
function describeSets(sets) {
  const groups = [];
  for (const s of sets) {
    const g = groups[groups.length - 1];
    const w = s.w != null ? num(s.w) : num(s.kg), u = s.unit || 'kg';
    if (g && g.reps === s.reps && g.w === w && g.u === u) g.n++; else groups.push({ n: 1, reps: s.reps, w, u });
  }
  return groups.map(g => `${g.n}×${g.reps}${g.w ? ' @ ' + fmtKg(g.w) + ' ' + g.u : ''}`).join(' + ');
}
function fmtKg(k) { return Number.isInteger(k) ? String(k) : String(r1(k)).replace('.', ','); }
// last = {planned:{sets,reps,kg}, sets:[{reps,kg}], feel:'facil'|'bien'|'dificil'|'dolor'}
function nextStrength(last, opts = {}) {
  if (!last) return null;
  const raw = (last.sets || []).filter(s => num(s.reps) > 0);
  if (!raw.length) return null;
  // Work in the unit he used last (lb or kg); values below are in that unit.
  const unit = opts.unit || raw[raw.length - 1].unit || 'kg';
  const step = unit === 'lb' ? (opts.stepLb || 5) : (opts.step || 2.5);
  const sets = raw.map(s => ({ reps: num(s.reps), kg: r1(fromKg(kgOf(s), unit) * 10) / 10 })).map(s => ({ ...s, kg: unit === 'lb' ? Math.round(s.kg) : s.kg }));
  const plannedSets = num(last.planned && last.planned.sets) || sets.length;
  const target = num(last.planned && last.planned.reps) || Math.max(...sets.map(s => s.reps));
  const n = Math.max(sets.length, plannedSets);
  const feel = last.feel || 'bien';
  const kgs = sets.map(s => s.kg);
  const low = Math.min(...kgs), high = Math.max(...kgs);
  const out = (arr, action, why) => { const conv = arr.map(x => ({ reps: x.reps, w: x.kg, unit, kg: toKg(x.kg, unit) })); return { action, unit, sets: conv, text: describeSets(conv), why }; };
  const fill = (k, kg, reps = target) => Array.from({ length: k }, () => ({ reps, kg }));
  if (feel === 'dolor') return { ...out(sets, 'block', 'Te dolió. ¿Lo bloqueo y lo cambio por uno parecido?') };
  const completed = sets.length >= plannedSets && sets.every(s => s.reps >= target);
  if (completed && (feel === 'facil' || feel === 'bien')) {
    const half = Math.ceil(n / 2), keep = n - half;
    if (high === 0) return out(fill(n, 0, target + 2), 'up', 'Fue fácil: +2 reps por serie.');
    if (high === low) {
      const heavy = roundStep(high + (unit === 'lb' ? step : (high < 20 ? step : Math.max(step, 5))), step);
      return out([...fill(keep, low), ...fill(half, heavy)], 'up', 'Completaste todo: sube el peso en la mitad de las series.');
      // (heavy is in the same unit as the last session)
    }
    const highCount = kgs.filter(k => k === high).length;
    if (highCount === 1 && high >= low * 1.5) {
      const heavy = roundStep(low + (high - low) * 0.7, step);
      return out([...fill(keep, low), ...fill(half, heavy)], 'up', `Probaste ${fmtKg(high)} ${unit} en una serie: consolida con la mitad de las series a ${fmtKg(heavy)} ${unit}.`);
    }
    return out(fill(n, high), 'up', `Ya dominas ${fmtKg(high)} ${unit} en varias series: llévalas todas a ese peso.`);
  }
  if (completed && feel === 'dificil') {
    const reps = Math.min(target + 1, target + 2);
    return out(sets.map(s => ({ reps, kg: s.kg })), 'repeat', 'Salió pero costó: mismo peso, apunta a +1 rep.');
  }
  const doneReps = sets.reduce((a, s) => a + s.reps, 0);
  if (doneReps < 0.8 * target * plannedSets) {
    return out(Array.from({ length: plannedSets }, (_, i) => ({ reps: target, kg: lighter((sets[i] || sets[sets.length - 1]).kg, step) })), 'down', 'No se completó: baja ~10% y busca las reps completas.');
  }
  return out(Array.from({ length: plannedSets }, (_, i) => ({ reps: target, kg: (sets[i] || sets[sets.length - 1]).kg })), 'keep', 'Casi: repite el mismo plan.');
}

// ---------- Cardio progression (run/walk intervals) ----------
function nextRunWalk(last) {
  const base = { runMin: 1, walkMin: 2, rounds: 4 };
  if (!last) return { ...base, text: '4 × (1 min trote + 2 min caminata)', why: 'Primera vez: arranca suave.' };
  const run = num(last.runMin) || 1, walk = num(last.walkMin) || 2, rounds = num(last.rounds) || 4;
  const ok = last.completed !== false && (last.feel === 'facil' || last.feel === 'bien' || !last.feel);
  const r = ok ? { runMin: run + 1, walkMin: Math.max(1, walk - 1), rounds } : { runMin: run, walkMin: walk, rounds };
  return { ...r, text: `${r.rounds} × (${r.runMin} min trote + ${r.walkMin} min caminata)`, why: ok ? 'Salió bien: +1 min trotando, −1 caminando.' : 'Costó: repite igual.' };
}

// ---------- Exercise catalog helpers ----------
const PATTERNS = {
  hip_thrust: 'Hip thrust / puente', squat: 'Sentadilla', leg_press: 'Prensa', lunge: 'Zancada / split squat', hinge: 'Bisagra (RDL)', swing: 'Swing con kettlebell',
  abduction: 'Abducción', glute_iso: 'Glúteo aislado (patada)', leg_curl: 'Curl femoral', curl: 'Curl de bíceps', jump: 'Saltos', press: 'Empuje (press)', row: 'Remo', pulldown: 'Jalón',
  core: 'Core / plancha', rotation: 'Rotación', throw: 'Lanzamiento / slam', carry: 'Cargada / caminata', cardio: 'Cardio', other: 'Otro'
};
// Each day keeps its goal-driven pattern; anchor slots stay fixed for measurable progress, the rest rotate weekly.
const TEMPLATES = {
  A: { title: 'Gym A · Piernas y glúteos (potencia)', goal: 'potencia', heavyLegs: true, focus: ['gluteos', 'potencia'],
    slots: [{ p: ['hip_thrust'], anchor: true }, { p: ['leg_press', 'squat'], anchor: true }, { p: ['lunge'] }, { p: ['hinge', 'swing', 'leg_curl'] }, { p: ['abduction', 'glute_iso'] }, { p: ['jump', 'throw'] }] },
  B: { title: 'Gym B · Core, rotación y tren superior', goal: 'fuerza', heavyLegs: false, focus: ['fuerza', 'core'],
    slots: [{ p: ['pulldown'], anchor: true }, { p: ['press'], anchor: true }, { p: ['row'] }, { p: ['rotation', 'throw'] }, { p: ['core'] }, { p: ['press', 'row'] }] },
  C: { title: 'Gym C · Glúteos + intervalos para fútbol', goal: 'gluteos', heavyLegs: true, intervals: true, focus: ['gluteos', 'resistencia'],
    slots: [{ p: ['hip_thrust', 'lunge', 'swing'] }, { p: ['hinge'], anchor: true }, { p: ['abduction', 'glute_iso', 'lunge', 'leg_curl'] }, { p: ['core'] }] }
};
const HOME_SLOTS = [{ p: ['hip_thrust'] }, { p: ['squat'] }, { p: ['press'] }, { p: ['core'] }];
const PUSH = ['press'], PULL = ['row', 'pulldown'];
const DEFAULT_REPS = { jump: 5, hip_thrust: 10, squat: 8, leg_press: 10, hinge: 10, swing: 15, throw: 8, core: 12, rotation: 10, carry: 1 };
const FORMATS = { series: 'series normales', superserie: 'superseries', circuito: 'circuito' };

// Finishers (5–8 min) and football-style games. needs = equipment ids (all required).
const FINISHERS = [
  { id: 'emom-swing-slam', name: 'EMOM 6: swings + slams', kind: 'EMOM', minutes: 6, needs: ['kettlebells', 'medicine-balls'], desc: 'Minuto impar: 12 swings. Minuto par: 8 slams con balón. Descansa lo que sobre del minuto.', met: 8 },
  { id: 'amrap-7', name: 'AMRAP 7: goblet + slam + cuerda', kind: 'AMRAP', minutes: 7, needs: ['kettlebells', 'medicine-balls', 'jump-rope'], desc: '10 sentadillas goblet + 8 slams + 30 saltos de cuerda. Cuenta las rondas.', met: 8, scoreLabel: 'rondas' },
  { id: 'rope-half', name: 'Medio tiempo de cuerda', kind: 'Juego', minutes: 8, needs: ['jump-rope'], desc: '8 rondas de 45 s saltando + 15 s de pausa, como un medio tiempo intenso. Cuenta saltos.', met: 10, scoreLabel: 'saltos', countsRope: true },
  { id: 'ladder-tm', name: 'Escalera en cinta', kind: 'Juego', minutes: 8, needs: ['treadmill'], desc: 'Sprints de 20-30-40-50-40-30-20 s, con 40 s caminando entre cada uno.', met: 9 },
  { id: 'partido-90', name: 'Partido de 90', kind: 'Reto', minutes: 8, needs: ['kettlebells', 'medicine-balls'], desc: '90 reps en total, como los minutos de un partido: 30 swings, 30 slams, 30 sentadillas. Cronometra y bate tu tiempo.', met: 8, scoreLabel: 'min' },
  { id: 'elliptical-int', name: 'Elíptica 30/30', kind: 'Intervalos', minutes: 8, needs: ['elliptical'], desc: '8 × (30 s fuerte + 30 s suave). Sin impacto.', met: 7 },
  { id: 'emom-mb-throw', name: 'EMOM 6: lanzamientos rotacionales', kind: 'EMOM', minutes: 6, needs: ['medicine-balls'], desc: 'Cada minuto: 6 lanzamientos por lado contra la pared, girando desde la cadera (patada fuerte).', met: 7 }
];

function lastLogFor(exId, sessions, beforeDate) {
  const sorted = sessions.filter(s => s.status !== 'discarded' && (!beforeDate || s.date < beforeDate)).sort((a, b) => (a.date + (a.id || '') < b.date + (b.id || '') ? 1 : -1));
  for (const s of sorted) for (const it of s.items || []) if (it.exId === exId && (it.sets || []).some(x => num(x.reps) > 0)) return { ...it, date: s.date };
  return null;
}
function timesDone(exId, sessions) { let n = 0; for (const s of sessions) if ((s.items || []).some(it => it.exId === exId)) n++; return n; }

function similarExercise(ex, pool, exclude = []) {
  const cand = pool.filter(e => e.id !== ex.id && !e.blocked && !exclude.includes(e.id) && e.pattern !== 'cardio');
  const same = cand.find(e => e.pattern === ex.pattern);
  if (same) return same;
  const mus = new Set((ex.muscles || []).map(norm));
  return cand.map(e => ({ e, s: (e.muscles || []).filter(m => mus.has(norm(m))).length })).filter(x => x.s > 0).sort((a, b) => b.s - a.s)[0]?.e || null;
}
function weekIndex(date) { return Math.max(0, Math.floor(daysBetween('2026-11-09', weekStart(date || '2026-11-09')) / 7)); }
// Small deterministic PRNG for the "sorpresa" session.
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Builds a session ONLY from exercises whose equipment exists in the inventory.
// args: {template, timeMin, energy, exercises[], equipment[], sessions[], rules, date, tomorrowFootball, location, lastRunWalk, surprise}
function buildSession(args) {
  const rules = args.rules || DEFAULT_RULES;
  let tKey = args.template in TEMPLATES ? args.template : 'A';
  const warnings = [];
  if (TEMPLATES[tKey].heavyLegs && args.tomorrowFootball && rules.noHeavyLegsBeforeFootball) {
    warnings.push('Mañana hay fútbol: hoy toca Gym B, sin piernas pesadas, para no llegar cansado.');
    tKey = 'B';
  }
  const T = TEMPLATES[tKey];
  const timeMin = Math.min(rules.maxSessionMin || 90, Math.max(20, num(args.timeMin) || 45));
  const energy = args.energy || 'normal';
  const date = args.date || '2026-11-09';
  const wk = weekIndex(date) + (args.surprise ? 1 + Math.floor(rng(args.surprise)() * 5) : 0);
  const rand = args.surprise ? rng(args.surprise) : null;
  const blockedEq = blockedEquipmentIds(rules, args.date);
  const blockedAct = new Set(activeBlockedActivities(rules, args.date));
  const avail = (args.equipment || []).filter(e => e.available !== false && !blockedEq.has(e.id)); // 'NO la tengo' + blocked activities are excluded
  const eqIds = new Set(avail.map(e => e.id));
  const hasTreadmill = eqIds.has('treadmill') || avail.some(e => /cinta|treadmill/i.test(e.name));
  const home = args.location === 'casa';
  const usable = (args.exercises || []).filter(e => !e.blocked && e.pattern !== 'cardio' && (home ? e.location === 'casa' : e.location !== 'casa') && (e.equipmentIds || []).every(id => eqIds.has(id)));
  if (home) warnings.push('Rutina corta en casa, sin equipo.');
  // Format: rotates weekly; tired or short sessions get the simplest efficient option.
  const fmtKeys = ['series', 'superserie', 'circuito'];
  let format = home ? 'circuito' : fmtKeys[(wk + (tKey === 'B' ? 1 : tKey === 'C' ? 2 : 0)) % 3];
  if (energy === 'cansado' && !home) format = 'series';
  if (timeMin <= 30 && !home) format = 'circuito';
  const setsPer = format === 'circuito' ? 3 : energy === 'bien' ? 4 : 3;
  // Conditioning: run/walk progression on C; finisher (5–8 min) when there is time.
  let cardio = null, cardioMin = 0, finisher = null;
  const hasElliptical = eqIds.has('elliptical');
  if (T.intervals && hasTreadmill && !blockedAct.has('correr') && !home) {
    const p = nextRunWalk(args.lastRunWalk || null);
    if (energy === 'cansado') p.rounds = Math.max(2, p.rounds - 1);
    cardio = { type: 'runwalk', treadmill: true, runMin: p.runMin, walkMin: p.walkMin, rounds: p.rounds, why: p.why, watchCounted: true };
    cardioMin = (p.runMin + p.walkMin) * p.rounds;
    if (cardioMin > timeMin * 0.45) { cardio.rounds = Math.max(2, Math.floor(timeMin * 0.45 / (p.runMin + p.walkMin))); cardioMin = (p.runMin + p.walkMin) * cardio.rounds; }
    cardio.text = `${cardio.rounds} × (${cardio.runMin} min trote + ${cardio.walkMin} min caminata)`;
  } else if (T.intervals && hasElliptical && !home) {
    const rounds = energy === 'cansado' ? 6 : 8;
    cardio = { type: 'elliptical', runMin: 1, walkMin: 1, rounds, text: `${rounds} × (1 min fuerte + 1 min suave) en elíptica`, why: 'Intervalos sin impacto.', watchCounted: true };
    cardioMin = rounds * 2;
  } else if (T.intervals && !home) warnings.push('Sin cinta ni elíptica disponibles: los intervalos quedan fuera.');
  const finOpts = FINISHERS.filter(f => f.needs.every(n => eqIds.has(n)) && !(args.tomorrowFootball && f.met >= 9));
  if (!home && finOpts.length && timeMin - cardioMin >= 40 && energy !== 'cansado') {
    const f = finOpts[(wk + tKey.charCodeAt(0)) % finOpts.length];
    finisher = { id: f.id, name: f.name, kind: f.kind, minutes: f.minutes, desc: f.desc, met: f.met, scoreLabel: f.scoreLabel || null, countsRope: !!f.countsRope, watchCounted: true, done: false, score: '' };
  }
  const finMin = finisher ? finisher.minutes + 1 : 0;
  const perEx = format === 'circuito' ? setsPer * 1.6 + 1 : format === 'superserie' ? setsPer * 1.8 + 1 : setsPer * 2.25 + 1.5;
  const slotsN = Math.max(1, Math.min(6, Math.floor((timeMin - 5 - cardioMin - finMin) / perEx)));
  const logs = e => timesDone(e.id, args.sessions || []);
  const chosen = [], anchorIds = new Set();
  const slots = home ? HOME_SLOTS : T.slots;
  slots.forEach((slot, si) => {
    if (chosen.length >= slotsN) return;
    const cand = usable.filter(e => slot.p.includes(e.pattern) && !chosen.includes(e)).sort((a, b) => a.id < b.id ? -1 : 1);
    if (!cand.length) return;
    let pick;
    if (slot.anchor && !args.surprise) pick = cand.find(e => e.anchor) || cand.slice().sort((a, b) => logs(b) - logs(a))[0];
    else pick = rand ? cand[Math.floor(rand() * cand.length)] : cand[(wk + si) % cand.length];
    chosen.push(pick); if (slot.anchor && !args.surprise) anchorIds.add(pick.id);
  });
  // Fill remaining slots with anything that fits the day's patterns (glutes first on A/C).
  const tplPats = [...new Set(slots.flatMap(s => s.p))];
  const rest = usable.filter(e => !chosen.includes(e)).map(e => ({ e, s: (tplPats.includes(e.pattern) ? 2 : 0) + ((e.muscles || []).some(m => /glút|glut/i.test(m)) && tKey !== 'B' ? 1 : 0) + ((wk * 7 + e.id.length) % 3) * 0.1 })).filter(x => x.s >= 2).sort((a, b) => b.s - a.s);
  for (const x of rest) { if (chosen.length >= slotsN) break; chosen.push(x.e); }
  // Balance push/pull: never more than one extra push over pull (and vice versa).
  const isPush = e => PUSH.includes(e.pattern), isPull = e => PULL.includes(e.pattern);
  const pullPool = usable.filter(e => isPull(e) && !chosen.includes(e));
  const pushPool = usable.filter(e => isPush(e) && !chosen.includes(e));
  for (let guard = 0; guard < 6; guard++) {
    const pu = chosen.filter(isPush).length, pl = chosen.filter(isPull).length;
    if (pu - pl > 1) { const idx = chosen.map((e, i) => isPush(e) && !anchorIds.has(e.id) ? i : -1).filter(i => i >= 0).pop(); if (idx == null) break; if (pullPool.length) chosen[idx] = pullPool.shift(); else { chosen.splice(idx, 1); warnings.push('Quité un empuje para no desbalancear: me faltan ejercicios de jalón.'); } }
    else if (pl - pu > 1) { const idx = chosen.map((e, i) => isPull(e) && !anchorIds.has(e.id) ? i : -1).filter(i => i >= 0).pop(); if (idx == null) break; if (pushPool.length) chosen[idx] = pushPool.shift(); else { chosen.splice(idx, 1); warnings.push('Quité un jalón para balancear con los empujes.'); } }
    else break;
  }
  // Never the exact same session two weeks in a row: compare with the last session of this template.
  const prev = (args.sessions || []).filter(s => s.template === tKey && s.status === 'done' && s.date < date).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  if (prev && !args.surprise) {
    const prevIds = (prev.items || []).map(i => i.exId).sort().join(',');
    if (prevIds === chosen.map(e => e.id).sort().join(',')) {
      const swapIdx = chosen.map((e, i) => anchorIds.has(e.id) ? -1 : i).filter(i => i >= 0).pop();
      const alt = swapIdx != null ? similarExercise(chosen[swapIdx], usable, chosen.map(e => e.id)) : null;
      if (alt) chosen[swapIdx] = alt;
      else format = fmtKeys[(fmtKeys.indexOf(format) + 1) % 3];
    }
  }
  const nonAnchor = chosen.filter(e => !anchorIds.has(e.id));
  const items = chosen.map(e => {
    const last = lastLogFor(e.id, args.sessions || [], date);
    const step = avail.find(q => (e.equipmentIds || []).includes(q.id))?.incrementKg || 2.5;
    // Tired: no progression today. Repeat last time's weights (or the lower ones if it wasn't completed), then ~10 % lighter.
    const tired = energy === 'cansado';
    const prog = nextStrength(tired && last && last.feel !== 'dolor' ? { ...last, feel: 'dificil' } : last, { step });
    let planSets;
    if (prog && prog.action !== 'block') planSets = prog.sets.slice(0, setsPer).concat(prog.sets.length < setsPer ? Array.from({ length: setsPer - prog.sets.length }, () => prog.sets[prog.sets.length - 1]) : []);
    else planSets = Array.from({ length: setsPer }, () => ({ reps: DEFAULT_REPS[e.pattern] || 10, kg: null, w: null, unit: 'kg' }));
    if (tired && prog && prog.action !== 'down') planSets = planSets.map(s => { if (!s.w) return s; const st = s.unit === 'lb' ? 5 : step; const w = lighter(s.w, st); return { ...s, w, kg: toKg(w, s.unit) }; });
    const unit = (prog && prog.unit) || (last && (last.sets || []).slice(-1)[0]?.unit) || 'kg';
    const isNew = !last && timesDone(e.id, args.sessions || []) === 0;
    let group = null;
    if (format === 'superserie' && !anchorIds.has(e.id)) { const k = nonAnchor.indexOf(e); group = 'Superserie ' + (Math.floor(k / 2) + 1); }
    if (format === 'circuito' && !anchorIds.has(e.id)) group = 'Circuito';
    return {
      exId: e.id, name: e.name, pattern: e.pattern, vigorous: !!e.vigorous, anchor: anchorIds.has(e.id), group, isNew,
      planned: { sets: planSets.length, reps: planSets[0].reps, kg: planSets[0].kg ?? null, w: planSets[0].w ?? null, unit, list: planSets },
      why: (anchorIds.has(e.id) ? 'Ancla (medimos progreso). ' : '') + (prog ? (tired && prog.action !== 'block' ? 'Hoy cansado: el peso de la última vez con ~10 % menos, sin subir.' : prog.why) : 'Nuevo para ti: elige un peso con el que te sobren 2 reps.'),
      sets: planSets.map(() => ({ reps: '', w: '', unit, done: false })), feel: null
    };
  });
  // A superset group with a single exercise is just straight sets.
  const counts = {}; for (const it of items) if (it.group) counts[it.group] = (counts[it.group] || 0) + 1;
  for (const it of items) if (it.group && counts[it.group] < 2) it.group = null;
  // Long days (Mon/Fri, up to 90 min): use the spare time for results, not idle minutes.
  // 1) one more set on the first two exercises (main lifts, more stimulus); 2) a low-impact interval block on the elliptical.
  let est = 5 + items.length * perEx + cardioMin + finMin;
  if (!home && energy !== 'cansado' && format !== 'circuito' && timeMin - est >= 6) {
    for (const it of items.slice(0, 2)) {
      if (timeMin - est < 3) break;
      const lastSet = it.planned.list[it.planned.list.length - 1];
      it.planned.list = it.planned.list.concat([{ ...lastSet }]); it.planned.sets = it.planned.list.length;
      it.sets = it.sets.concat([{ reps: '', w: '', unit: it.planned.unit, done: false }]);
      it.why += ' Día largo: una serie más.';
      est += 2.25;
    }
  }
  // Circuit: extra full rounds (max 5) while the time allows.
  if (!home && energy !== 'cansado' && format === 'circuito' && items.length) {
    const roundMin = items.length * 1.6 + 1;
    while (timeMin - est >= roundMin && items[0].planned.list.length < 5) {
      for (const it of items) { const ls = it.planned.list[it.planned.list.length - 1]; it.planned.list = it.planned.list.concat([{ ...ls }]); it.planned.sets = it.planned.list.length; it.sets = it.sets.concat([{ reps: '', w: '', unit: it.planned.unit, done: false }]); }
      if (!/vuelta más/.test(items[0].why)) items[0].why += ' Día largo: vuelta más al circuito.';
      est += roundMin;
    }
  }
  if (!home && !cardio && hasElliptical && timeMin - est >= 10) {
    const rounds = Math.min(10, Math.floor((timeMin - est) / 2)), hard = energy === 'cansado' ? 'moderado' : 'fuerte';
    cardio = { type: 'elliptical', runMin: 1, walkMin: 1, rounds, text: `${rounds} × (1 min ${hard} + 1 min suave) en elíptica`, why: 'Día largo: intervalos sin impacto para quemar más y ganar aguante para el fútbol.', watchCounted: true, extra: true };
    cardioMin += rounds * 2; est += rounds * 2;
  }
  if (tKey === 'A' && energy === 'cansado') warnings.push('Cansado: saltos al final y solo si te sientes rápido.');
  const base = home ? 'En casa · ' + T.title.split('· ')[1] : T.title;
  return { template: tKey, location: home ? 'casa' : 'gym', title: (args.surprise ? 'Sorpresa · ' : '') + base, format, formatLabel: FORMATS[format], goal: T.goal, focus: T.focus, timeMin, energy, items, cardio, finisher, warnings, estMin: r0(est) };
}

// ---------- Indoor movement options (winter) ----------
// Estimated kcal from his weight. Used for nudges when the movement gap is large.
function movementOptions(bodyKg, rules, ctx = {}) {
  const k = (met, min) => r0(met * bodyKg * min / 60);
  const o = [
    { id: 'tm-incline', text: 'Cinta inclinada por intervalos, 20 min', kcal: k(7, 20), needs: 'treadmill' },
    { id: 'rope', text: 'Cuerda 1 min sí / 1 min no, 12 min', kcal: k(10, 6) + k(3, 6), needs: 'jump-rope' },
    { id: 'kb-circuit', text: 'Circuito kettlebell + balón medicinal, 15 min', kcal: k(8, 15), needs: 'kettlebells' },
    { id: 'elliptical', text: 'Elíptica por intervalos, 20 min' + (ctx.dayAfterFootball ? ' (ideal hoy, sin impacto)' : ''), kcal: k(7, 20), needs: 'elliptical' },
    { id: 'squash', text: 'Squash, 30 min', kcal: k(rules.mets.squash, 30), needs: 'squash-court' },
    { id: 'finisher', text: 'Finisher de 6–8 min después del gym', kcal: k(8, 7), needs: null },
    { id: 'home', text: 'En casa: 3 rondas de 15 sentadillas + 12 puentes + 10 flexiones', kcal: k(5, 12), needs: null }
  ];
  if (rules.season !== 'winter') o.unshift({ id: 'walk', text: 'Caminata afuera, 30 min', kcal: k(rules.mets.walk, 30), needs: null, act: 'caminar' });
  const eq = ctx.equipmentIds, bEq = blockedEquipmentIds(rules, ctx.today), bAct = new Set(activeBlockedActivities(rules, ctx.today));
  return o.filter(x => (!eq || !x.needs || eq.has(x.needs)) && !(x.needs && bEq.has(x.needs)) && !(x.act && bAct.has(x.act)));
}
const WFH_BREAKS = ['Sube y baja escaleras 5 min', '20 sentadillas + 20 puentes de glúteo', 'Camina por la casa durante la próxima llamada', '3 × 30 s de plancha', '15 flexiones contra el escritorio + 15 sentadillas'];

// ---------- Goals (his own + preset milestones) ----------
// goal: {label, metric, target, unit?, exerciseId?, month?, dir?, createdAt, achievedAt}
const GOAL_METRICS = {
  weight_kg: { label: 'Peso (kg)', dir: 'down' }, body_fat_pct: { label: 'Grasa corporal (%)', dir: 'down' }, muscle_mass_kg: { label: 'Masa muscular (kg)', dir: 'up' },
  lift: { label: 'Peso en un ejercicio', dir: 'up' }, run_minutes: { label: 'Minutos trotando seguidos', dir: 'up' },
  full_weeks: { label: 'Semanas completas seguidas', dir: 'up' }, days_logged_streak: { label: 'Días seguidos registrando', dir: 'up' },
  rope_month: { label: 'Saltos de cuerda en el mes', dir: 'up' }, sessions_month: { label: 'Sesiones de gym en el mes', dir: 'up' },
  movement_days_month: { label: 'Días con meta de movimiento en el mes', dir: 'up' }, new_exercises: { label: 'Ejercicios nuevos probados', dir: 'up' }
};
// ctx: {series, sessions, days, plan, today, rules}
function streaks(ctx) {
  // days logged streak (ending today or yesterday)
  const ps = ctx.planStart || '2026-11-09'; // streaks count from the plan start, never from day 0
  const logged = new Set(ctx.days.filter(d => d.date >= ps && ((d.foods || []).length || d.watch || d.weighIn)).map(d => d.date));
  let ds = 0, d = logged.has(ctx.today) ? ctx.today : addDays(ctx.today, -1);
  while (logged.has(d)) { ds++; d = addDays(d, -1); }
  // full weeks streak: completed weeks (before this one) where done gym sessions >= planned gym days
  const planned = Object.values((ctx.plan && ctx.plan.days) || {}).filter(p => p.kind === 'gym').length || 3;
  let ws = 0, w = addDays(weekStart(ctx.today), -7);
  for (let i = 0; i < 104; i++) {
    if (w < ps) break;
    const n = ctx.sessions.filter(s => s.status === 'done' && s.date >= w && s.date <= addDays(w, 6)).length;
    if (n >= planned) { ws++; w = addDays(w, -7); } else break;
  }
  const thisWeek = ctx.sessions.filter(s => s.status === 'done' && s.date >= weekStart(ctx.today)).length;
  return { daysLogged: ds, fullWeeks: ws, thisWeek, plannedPerWeek: planned };
}
function ropeJumps(ctx, month) {
  let n = 0;
  for (const d of ctx.days) if (d.date.slice(0, 7) === month) for (const a of d.activities || []) if (a.type === 'rope') n += num(a.reps) || 0;
  for (const s of ctx.sessions) if (s.date.slice(0, 7) === month && s.finisher && s.finisher.done && s.finisher.countsRope) n += num(s.finisher.score) || 0;
  return n;
}
function goalProgress(g, ctx) {
  const m = GOAL_METRICS[g.metric] || { dir: 'up' };
  const dir = g.dir || m.dir, target = num(g.target);
  const since = g.preset ? '2026-11-08' : (g.createdAt || '2026-11-08').slice(0, 10);
  const month = g.month || ctx.today.slice(0, 7);
  let cur = null, start = num(g.start), hitDate = null;
  const series = ctx.series.filter(p => p.date >= since);
  // Flagged readings (sauna/dehydration) never unlock a milestone.
  const firstHit = (key, test) => { const p = series.find(x => x[key] != null && !x.flag && test(x[key])); return p ? p.date : null; };
  if (g.metric === 'weight_kg' || g.metric === 'body_fat_pct' || g.metric === 'muscle_mass_kg') {
    const key = g.metric === 'weight_kg' ? 'kg' : g.metric === 'body_fat_pct' ? 'fat' : 'muscle';
    // Weekly (7-day rolling) average of unflagged readings: a single low day never unlocks a goal.
    const pts = ctx.series.filter(p => p[key] != null && !p.flag), avg7 = rolling7(pts, key).filter(p => p.v != null);
    cur = avg7.length ? r1(avg7[avg7.length - 1].v * 10) / 10 : null;
    if (start == null) { const all = ctx.series.filter(p => p[key] != null); start = g.metric === 'weight_kg' && num(ctx.startKg) ? num(ctx.startKg) : all.length ? all[0][key] : cur; }
    const hit = avg7.find(p => p.date >= since && (dir === 'down' ? p.v <= target : p.v >= target)); hitDate = hit ? hit.date : null;
  } else if (g.metric === 'lift') {
    let best = 0, bestDate = null;
    for (const s of ctx.sessions) if (s.status !== 'discarded') for (const it of s.items || []) if (it.exId === g.exerciseId) for (const st of it.sets || []) {
      if (!(num(st.reps) > 0)) continue;
      const v = (g.unit === 'lb') ? kgOf(st) / LB : kgOf(st);
      if (v > best) best = v;
      if (!bestDate && v >= target - 0.01 && s.date >= since) bestDate = s.date;
    }
    cur = r1(best); hitDate = bestDate; if (start == null) start = 0;
  } else if (g.metric === 'run_minutes') {
    let best = 0, bd = null;
    const all = [];
    for (const d of ctx.days) for (const a of d.activities || []) all.push({ date: d.date, ...a });
    for (const s of ctx.sessions) if (s.cardio && s.cardio.done) all.push({ date: s.date, type: 'runwalk', ...s.cardio });
    for (const a of all.sort((x, y) => x.date < y.date ? -1 : 1)) {
      const v = a.type === 'run' ? num(a.minutes) || 0 : (a.type === 'runwalk' || a.type === 'treadmill_int') && a.completed !== false ? num(a.runMin) || 0 : 0;
      if (v > best) best = v; if (!bd && v >= target && a.date >= since) bd = a.date;
    }
    cur = best; hitDate = bd; if (start == null) start = 0;
  } else if (g.metric === 'full_weeks') { cur = streaks(ctx).fullWeeks; if (cur >= target) hitDate = ctx.today; start = 0; }
  else if (g.metric === 'days_logged_streak') { cur = streaks(ctx).daysLogged; if (cur >= target) hitDate = ctx.today; start = 0; }
  else if (g.metric === 'rope_month') { cur = ropeJumps(ctx, month); if (cur >= target) hitDate = ctx.today; start = 0; }
  else if (g.metric === 'sessions_month') { cur = ctx.sessions.filter(s => s.status === 'done' && s.date.slice(0, 7) === month).length; if (cur >= target) hitDate = ctx.today; start = 0; }
  else if (g.metric === 'movement_days_month') { cur = ctx.days.filter(d => d.date.slice(0, 7) === month && num(d.watch && d.watch.kcal) >= (ctx.rules.movementTarget || 250)).length; if (cur >= target) hitDate = ctx.today; start = 0; }
  else if (g.metric === 'new_exercises') { const seen = new Set(); for (const s of ctx.sessions) if (s.status === 'done' && s.date >= since) for (const it of s.items || []) if ((it.sets || []).some(x => num(x.reps) > 0)) seen.add(it.exId); cur = seen.size; if (cur >= target) hitDate = ctx.today; start = 0; }
  let pct = 0;
  if (cur != null && target != null) pct = dir === 'down' ? (start - cur) / Math.max(0.01, start - target) : (cur - start) / Math.max(0.01, target - start);
  const monthOver = g.month && g.month < ctx.today.slice(0, 7);
  return { current: cur, pct: Math.max(0, Math.min(1, pct)), done: !!(g.achievedAt || hitDate), hitDate: g.achievedAt || hitDate, expired: monthOver && !g.achievedAt && !hitDate };
}
function goalPaused(g, rules, today) { return g.metric === 'rope_month' && activeBlockedActivities(rules || DEFAULT_RULES, today).includes('cuerda'); }
function nextGoalProposal(g, rules, today) {
  if (goalPaused(g, rules, today)) return null;
  const t = num(g.target);
  const step = { weight_kg: -1, body_fat_pct: -1, muscle_mass_kg: 0.5, run_minutes: 2, full_weeks: 1, days_logged_streak: 7, sessions_month: 2, movement_days_month: 3, new_exercises: 3 }[g.metric];
  if (g.metric === 'lift') { const s = g.unit === 'lb' ? 10 : 5; return { ...g, target: t + s, label: g.label.replace(/[\d.,]+\s*(kg|lb)/, (t + s) + ' ' + (g.unit || 'kg')) }; }
  if (g.metric === 'rope_month') { const n = Math.round(t * 1.25 / 100) * 100; return { ...g, target: n, label: `${n.toLocaleString('es')} saltos de cuerda este mes` }; }
  if (g.metric === 'weight_kg' && t + step < (g.floor || 78) - 0.01) return null;
  if (step == null) return null;
  const nt = r1(t + step);
  return { ...g, target: nt, label: g.label.replace(/[\d.,]+/, String(nt).replace('.', ',')) };
}
// Badges computed from data (no writes): first time each exercise was done.
function newExerciseBadges(sessions) {
  const first = {};
  for (const s of sessions.filter(x => x.status === 'done').sort((a, b) => a.date < b.date ? -1 : 1)) for (const it of s.items || []) if (!first[it.exId] && (it.sets || []).some(x => num(x.reps) > 0)) first[it.exId] = { name: it.name, date: s.date };
  return Object.values(first).sort((a, b) => a.date < b.date ? 1 : -1);
}

// ---------- Weight series ----------
// Merge history points + daily weigh-ins; one point per date (daily weigh-in wins).
function weightSeries(historyPoints, days) {
  const map = new Map();
  for (const p of historyPoints || []) if (num(p.kg)) map.set(p.date, { date: p.date, kg: num(p.kg), fat: num(p.fat), muscle: num(p.muscle), source: p.source || 'historial' });
  for (const d of days || []) {
    const w = d.weighIn; if (!w || !num(w.weight_kg)) continue;
    map.set(d.date, { date: d.date, kg: num(w.weight_kg), fat: num(w.body_fat_pct), muscle: num(w.muscle_mass_kg), source: w.source === 'baseline' ? 'dia0' : 'app', flag: w.flag && !w.flagCleared ? w.flag : null });
  }
  return [...map.values()].sort((a, b) => a.date < b.date ? -1 : 1);
}
// 7-day rolling average by calendar window (points in [d-6, d]).
function rolling7(series, key = 'kg') {
  return series.map((p, i) => {
    const vals = [];
    for (let j = i; j >= 0 && daysBetween(series[j].date, p.date) <= 6; j--) if (num(series[j][key]) != null) vals.push(series[j][key]);
    return { date: p.date, v: vals.length ? r1(avg(vals) * 100) / 100 : null };
  });
}

// ---------- Meal times (learned) ----------
function mealSlot(hm) { const m = hmToMin(hm); if (m == null) return null; if (m < 630) return 'desayuno'; if (m < 900) return 'almuerzo'; if (m < 1080) return 'merienda'; return 'cena'; }
function learnMealTimes(days, today) {
  const by = { desayuno: [], almuerzo: [], merienda: [], cena: [] };
  for (const d of days) {
    if (today && daysBetween(d.date, today) > 30) continue;
    const firstPerSlot = {};
    for (const f of d.foods || []) { const s = mealSlot(f.at); const m = hmToMin(f.at); if (s && (firstPerSlot[s] == null || m < firstPerSlot[s])) firstPerSlot[s] = m; }
    for (const s in firstPerSlot) by[s].push(firstPerSlot[s]);
  }
  const out = {};
  for (const s in by) out[s] = by[s].length >= 3 ? minToHm(median(by[s])) : null;
  return out;
}

// ---------- Weekly stats ----------
function weekStats(ws, ctx) {
  // ctx: {daysByDate, sessions[], rules, bmrFor(date), bodyKg, plan, exById}
  const dates = Array.from({ length: 7 }, (_, i) => addDays(ws, i)).filter(d => !ctx.today || d <= ctx.today);
  const weights = [], deficits = [], proteins = [];
  let logged = 0;
  for (const d of dates) {
    const day = ctx.daysByDate[d];
    if (day && num(day.weighIn && day.weighIn.weight_kg)) weights.push(num(day.weighIn.weight_kg));
    const any = day && ((day.foods || []).length || day.watch || day.weighIn);
    if (any) logged++;
    if (day && (day.foods || []).length) {
      const b = dayBalance(day, { bmr: ctx.bmrFor(d), bodyKg: ctx.bodyKg, rules: ctx.rules, sessions: ctx.sessions.filter(s => s.date === d), exById: ctx.exById });
      if (b.hasWatch) deficits.push(b.deficit);
      proteins.push(b.protein);
    }
  }
  const sessionsDone = ctx.sessions.filter(s => s.status === 'done' && dates.includes(s.date)).length;
  let gymPlanned = 0;
  for (const d of dates) { const p = ctx.plan && ctx.plan.days && ctx.plan.days[DOW_KEYS[dowIndex(d)]]; if (p && p.kind === 'gym' && (!ctx.today || d < ctx.today)) gymPlanned++; }
  return { ws, days: dates.length, logged, avgWeight: weights.length ? r1(avg(weights) * 10) / 10 : null, avgDeficit: deficits.length ? r0(avg(deficits)) : null, avgProtein: proteins.length ? r0(avg(proteins)) : null, sessionsDone, gymPlanned, gymMissed: Math.max(0, gymPlanned - sessionsDone) };
}

// Weight change from Friday to Monday (or Tuesday) of the week that contains `iso`; null without both weigh-ins.
function weekendRebound(daysByDate, iso) {
  const ws = weekStart(iso), fri = addDays(ws, -3);
  const wFri = num(((daysByDate[fri] || {}).weighIn || {}).weight_kg);
  const wMon = num(((daysByDate[ws] || {}).weighIn || {}).weight_kg), wTue = num(((daysByDate[addDays(ws, 1)] || {}).weighIn || {}).weight_kg);
  const wNow = iso === ws ? wMon : (dowIndex(iso) === 2 ? (wTue ?? wMon) : (wMon ?? wTue));
  return wFri && wNow ? wNow - wFri : null;
}

// ---------- Rule-based nudges ----------
// S: {today, now(tzNow), daysByDate, days[], sessions[], rules, plan, availability, mealTimes, balance, nudgesStore, weightSeries}
function computeNudges(S) {
  const out = [];
  const t = S.now, today = S.today, day = S.daysByDate[today] || {};
  // Before the plan starts (day 0 is only the weight baseline) there is nothing to remind.
  if (S.planStart && today < S.planStart) return out;
  const dk = DOW_KEYS[t.dow];
  const planToday = S.plan && S.plan.days && S.plan.days[dk];
  const add = (key, kind, text, act) => out.push({ key: key + '-' + today, kind, text, act });
  // One movement suggestion per day view; a pending gym session IS the movement action.
  const gymPending = planToday && planToday.kind === 'gym' && !S.sessions.some(s => s.date === today && s.status === 'done') && t.hour < 22;
  let moved = false;
  const move = (key, kind, prefix, gap) => {
    if (moved) return; moved = true;
    if (gymPending) { add(key, kind, `${prefix} Hoy toca gym: haz la sesión completa con el final incluido.`, 'gym'); out[out.length - 1].mv = true; return; }
    const o = pickMovement(S, gap); add(key, kind, `${prefix} Hoy: ${o.text} (~${o.kcal} kcal).`, 'activity'); out[out.length - 1].mv = true;
  };
  // Weigh-in
  if (!day.weighIn) {
    if (t.hour < 12) add('pesaje', 'hacer', 'Pésate en ayunas y sube la foto de Fitdays.', 'weigh');
    else add('pesaje', 'pendiente', 'Hoy no hay pesaje. Mañana temprano, en ayunas.', 'weigh');
  }
  // Watch
  if (!day.watch && t.hour >= 13) add('reloj', 'hacer', 'Actualiza el contador general del reloj (no el de la sesión de Zepp).', 'watch');
  else if (day.watch && t.hour >= 20 && hmToMin(day.watch.at) != null && t.mins - hmToMin(day.watch.at) > 240) add('reloj-tarde', 'considerar', `El reloj está en ${day.watch.kcal} kcal desde las ${day.watch.at}. Actualízalo antes de dormir.`, 'watch');
  // Meals (learned times)
  const mt = S.mealTimes || {};
  for (const slot of ['desayuno', 'almuerzo', 'cena']) {
    const m = hmToMin(mt[slot]);
    if (m == null) continue;
    const has = (day.foods || []).some(f => mealSlot(f.at) === slot);
    if (!has && t.mins > m + 75 && t.mins < m + 300) add('comida-' + slot, 'pendiente', `Sueles comer el ${slot} a las ${mt[slot]}. ¿Ya lo hiciste? Regístralo.`, 'food');
  }
  const b = S.balance;
  if (b && b.hasFood) {
    if (b.overBurn) move('exceso', 'alerta', `Vas ${-b.deficit} kcal por encima de lo que gastas hoy.`, -b.deficit);
    else if (b.remaining < 0) move('pasado', 'alerta', `Vas ${-b.remaining} kcal pasado de tu meta de hoy (${b.target}).`, -b.remaining);
    else {
      // Projection: if dinner is not logged yet, assume a typical dinner (~500 kcal).
      const dinnerLogged = (day.foods || []).some(f => mealSlot(f.at) === 'cena');
      const projected = b.consumed + (t.hour >= 15 && !dinnerLogged ? 500 : 0);
      const over = projected - b.target;
      if (t.hour >= 15 && over > 50) {
        move('cierre-rojo', 'alerta', `Hoy apunta a cerrar ~${r0(over)} kcal por encima de tu meta${dinnerLogged ? '' : ' (contando una cena normal)'}.`, over);
      }
    }
    if (t.hour >= 17 && b.proteinLeft > 30) add('proteina', 'considerar', `Te faltan ${b.proteinLeft} g de proteína. Algo alto en proteína para la cena.`, 'food');
    if (t.hour >= 21 && b.deficit > S.rules.deficitMax + 400) add('muy-bajo', 'considerar', `Déficit de ${b.deficit} kcal: es mucho. Come algo con proteína, no hace falta pasar hambre.`, 'food');
  }
  // Gym planned today
  if (planToday && planToday.kind === 'gym') {
    const done = S.sessions.some(s => s.date === today && s.status === 'done');
    const freeFrom = (t.dow === 1 || t.dow === 5) ? 16 * 60 : 18 * 60;
    if (!done && t.mins >= freeFrom - 30 && t.hour < 22 && !moved) { moved = true; add('gym', 'hacer', `Hoy toca ${planToday.title || 'gym'}. Cuando llegues, dile al chat cuánto tiempo tienes y lo que marca el reloj.`, 'gym'); }
    if (!done && t.hour >= 22) add('gym-perdido', 'pendiente', 'Hoy tocaba gym y no quedó registrado. Lo reacomodo en la semana si me dices.', 'chat');
  }
  // Football Wednesday
  if (planToday && planToday.kind === 'football') {
    const fb = (day.activities || []).find(a => a.type === 'football');
    if (!fb && t.hour >= 17) add('futbol-antes', 'hacer', 'Fútbol hoy a las 21:00: pésate y anota el reloj ANTES de salir.', 'football');
    if (fb && fb.before && !fb.after && t.hour >= 22) add('futbol-despues', 'hacer', 'Al volver del fútbol: pésate otra vez y anota el reloj.', 'football');
    if (fb && fb.after) { const fs = footballStats(fb); if (fs.sweatKg > 0) add('hidratar', 'considerar', `Perdiste ${fs.sweatKg} kg de sudor: toma ${String(r1(fs.sweatKg * S.rules.hydrationPerKg[0])).replace('.', ',')}–${String(r1(fs.sweatKg * S.rules.hydrationPerKg[1])).replace('.', ',')} L de agua en las próximas horas.`, null); }
  }
  // Day before football: no heavy legs
  const planTomorrow = S.plan && S.plan.days && S.plan.days[DOW_KEYS[(t.dow + 1) % 7]];
  if (planTomorrow && planTomorrow.kind === 'football') { const bl = new Set(activeBlockedActivities(S.rules, today)); const easy = !bl.has('eliptica') ? '20 min de elíptica suave' : !bl.has('cinta') ? '20 min de cinta caminando' : 'estira 10 min en casa'; add('pre-futbol', 'considerar', `Mañana hay fútbol: hoy nada de piernas pesadas. ${easy} y listo.`, null); }
  // Friday: weekend availability
  if (t.dow === 5) {
    const sat = addDays(today, 1), sun = addDays(today, 2);
    const ov = (S.availability && S.availability.overrides) || {};
    if (!ov[sat] && !ov[sun]) add('finde', 'hacer', '¿Cómo tienes el finde? Dime en el chat tus ventanas libres (ej. "sábado libre de 9 a 12").', 'chat-finde');
  }
  // Weekend: high intake
  if ((t.dow === 6 || t.dow === 0) && b && b.hasFood && b.deficit < S.rules.deficitMin) move('finde-mover', 'considerar', 'Día de finde con más comida.', S.rules.deficitMin - b.deficit);
  // Monday/Tuesday after the weekend: weight rebound, read calmly. ONE adjustment; an alert only if it repeats.
  if (t.dow === 1 || t.dow === 2) {
    const reb = weekendRebound(S.daysByDate, today);
    if (reb != null && reb >= 0.5) {
      const prev = weekendRebound(S.daysByDate, addDays(today, -7));
      const again = prev != null && prev >= 0.5;
      add('rebote', again ? 'alerta' : 'considerar', again
        ? `Segundo finde seguido que subes (${String(r1(reb)).replace('.', ',')} kg desde el viernes). Esta semana suma una sesión extra de 20 min de cinta en subida.`
        : `Subiste ${String(r1(reb)).replace('.', ',')} kg desde el viernes. Es agua y sal del finde, no grasa: baja en 2–4 días. Hoy cena ligera.`, null);
    }
  }
  // Weekly derail (look at the last 7 completed days)
  const w = S.lastWeekStats;
  if (w && w.days >= 4) {
    const reasons = [];
    if (w.days - w.logged >= 3) reasons.push(`${w.days - w.logged} días sin registrar`);
    if (w.avgDeficit != null && w.avgDeficit < 0) reasons.push('déficit promedio negativo');
    if (w.avgProtein != null && w.avgProtein < S.rules.proteinMin - 15) reasons.push(`proteína promedio ${w.avgProtein} g`);
    if (w.gymMissed >= 2) reasons.push(`${w.gymMissed} sesiones de gym perdidas`);
    if (reasons.length >= 2) add('descarrilado', 'alerta', `Esta semana vas descarrilado: ${reasons.join(', ')}. Sin drama: elige una cosa para mañana y arrancamos.`, 'chat');
  }
  // Movement target (watch general counter), gap late in the day: ONE indoor activity.
  const mv = S.rules.movementTarget || 250, wk = num(day.watch && day.watch.kcal) || 0;
  if (t.hour >= 16 && t.hour < 22 && mv - wk >= 50) move('movimiento', 'hacer', `Te faltan ${r0(mv - wk)} kcal de movimiento.`, mv - wk);
  // Work-from-home days (Mon/Fri 8–16): a 5-min movement break, one at a time.
  if ((t.dow === 1 || t.dow === 5) && t.hour >= 8 && t.hour < 16) { const slot = Math.floor((t.mins - 480) / 90); add('pausa-' + slot, 'hacer', `Pausa activa de 5 min: ${WFH_BREAKS[(slot + t.dow) % WFH_BREAKS.length]}.`, null); }
  // Sauna: rehydrate; weigh-in after sauna is water.
  const sauna = (day.activities || []).filter(a => a.type === 'sauna');
  if (sauna.length) { const m = sauna.reduce((x, a) => x + (num(a.minutes) || 15), 0); add('sauna-agua', 'considerar', `Sauna ${m} min: toma ~${String(r1(Math.max(0.5, m / 17.5 * (S.rules.saunaWaterPer15min || 0.5)))).replace('.', ',')} L de agua. Lo que bajes ahí es agua.`, null); }
  if (day.weighIn && day.weighIn.flag && !day.weighIn.flagCleared) add('peso-flag', 'considerar', `Pesaje marcado: ${day.weighIn.flag}. No cuenta para logros hasta confirmarlo otro día.`, null);
  // Coffee rule still provisional
  if (S.rules.coffee && S.rules.coffee.provisional && (day.foods || []).some(f => /caf[eé]|vanilla/i.test(f.name))) add('cafe-etiqueta', 'considerar', 'El café está en kcal provisionales. Tómale foto a la etiqueta del polvo y la ajusto.', 'chat');
  // Chat-created nudges
  for (const n of S.nudgesStore || []) if (!n.dismissed && n.text && (!n.due || n.due <= today)) out.push({ key: n.id, kind: n.kind || 'hacer', text: n.text, stored: true });
  // Movement nudge at most once per day: once one was shown (S.movementSeen, saved by the app), the day keeps that same
  // nudge while it still applies, and never a different one; dismissing it ends movement nudges for the day.
  const seen = S.movementSeen && S.movementSeen.key && S.movementSeen.key.endsWith('-' + today) ? S.movementSeen : null;
  if (seen) { const i = out.findIndex(n => n.mv); if (i >= 0) out[i] = { ...seen, mv: true }; }
  const dismissed = new Set((S.nudgesStore || []).filter(n => n.dismissed).map(n => n.id));
  const order = { alerta: 0, hacer: 1, pendiente: 2, considerar: 3 };
  return out.filter(n => n.stored || !dismissed.has(safeId(n.key))).sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
}
// ONE indoor activity that fits (never a menu). Rotates by day so it stays fun.
function pickMovement(S, gapKcal) {
  const dayAfterFootball = S.plan && S.plan.days && (S.plan.days[DOW_KEYS[(S.now.dow + 6) % 7]] || {}).kind === 'football';
  const opts = movementOptions(S.bodyKg, S.rules, { dayAfterFootball, equipmentIds: S.equipmentIds, today: S.today });
  if (dayAfterFootball) { const e = opts.find(o => o.id === 'elliptical'); if (e) return e; }
  const late = S.now.hour >= 20;
  const pool = opts.filter(o => (late ? o.id === 'home' || o.id === 'rope' : o.id !== 'finisher'));
  const fit = pool.filter(o => o.kcal >= Math.min(gapKcal || 0, 200));
  const list = fit.length ? fit : pool.length ? pool : opts;
  return list[(daysBetween('2026-11-09', S.today) % list.length + list.length) % list.length];
}
// ONE activity for a flexible (weekend) day. Squash on Saturday, treadmill intervals on Sunday,
// elliptical the day after football; falls back to the next allowed indoor option.
function pickFlexActivity(S) {
  const rules = S.rules || DEFAULT_RULES, eq = S.equipmentIds || new Set(['squash-court', 'treadmill', 'elliptical']);
  const blocked = new Set(activeBlockedActivities(rules, S.today).map(norm));
  const kg = S.bodyKg || 80, k = (met, min) => r0(met * kg * min / 60);
  const opts = [
    { id: 'squash', needs: 'squash-court', text: 'squash 30 min', kcal: k(rules.mets.squash, 30) },
    { id: 'cinta', needs: 'treadmill', text: '30 min de cinta en subida, intervalos 1/1', kcal: k(7, 30) },
    { id: 'eliptica', needs: 'elliptical', text: '30 min de elíptica, intervalos 1/1', kcal: k(7, 30) },
    { id: 'casa', needs: null, text: 'rutina corta en casa: 3 rondas de 15 sentadillas, 12 puentes y 10 flexiones', kcal: k(5, 15) }
  ].filter(o => (!o.needs || eq.has(o.needs)) && !blocked.has(o.id));
  const dow = S.now ? S.now.dow : dowIndex(S.today);
  const pref = dow === 6 ? ['squash', 'cinta', 'eliptica', 'casa'] : ['cinta', 'squash', 'eliptica', 'casa'];
  pref.sort((a, b) => (opts.findIndex(o => o.id === a) < 0) - (opts.findIndex(o => o.id === b) < 0));
  return opts.find(o => o.id === pref.find(p => opts.some(x => x.id === p))) || { id: 'casa', text: 'rutina corta en casa', kcal: k(5, 15) };
}
// Activities he can block ("no quiero jugar squash"), permanently or until a date ("esta semana no").
// rules.blockedActivities: [{name, until: 'YYYY-MM-DD' | null, reason}]
const ACTIVITIES = {
  squash: { label: 'squash', equipment: 'squash-court', aliases: ['squash'] },
  cuerda: { label: 'cuerda', equipment: 'jump-rope', aliases: ['cuerda', 'saltar la cuerda', 'cuerda para saltar', 'jump rope', 'saltos de cuerda'] },
  eliptica: { label: 'elíptica', equipment: 'elliptical', aliases: ['eliptica', 'elíptica', 'elliptical'] },
  cinta: { label: 'cinta', equipment: 'treadmill', aliases: ['cinta', 'caminadora', 'treadmill', 'trotadora'] },
  caminar: { label: 'caminar', equipment: null, aliases: ['caminar', 'caminata', 'caminatas', 'walk'] },
  correr: { label: 'correr', equipment: null, aliases: ['correr', 'trotar', 'trote', 'run'] },
  sauna: { label: 'sauna', equipment: 'sauna', aliases: ['sauna'] },
  bici: { label: 'bici', equipment: null, aliases: ['bici', 'bicicleta', 'bike', 'spinning'] }
};
function canonicalActivity(name) {
  const n = norm(name);
  for (const [k, v] of Object.entries(ACTIVITIES)) if (k === n || v.aliases.some(a => norm(a) === n || n.includes(norm(a)))) return k;
  return null;
}
function activeBlockedActivities(rules, today) {
  return (rules.blockedActivities || []).filter(b => typeof b === 'string' || !b.until || !today || b.until >= today).map(b => canonicalActivity(typeof b === 'string' ? b : b.name)).filter(Boolean);
}
function blockedEquipmentIds(rules, today) { return new Set(activeBlockedActivities(rules, today).map(a => ACTIVITIES[a].equipment).filter(Boolean)); }
function safeId(s) { return String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, '-').slice(0, 150); }

// ---------- Goals / PRs ----------
function prsFrom(sessions) {
  const best = {};
  for (const s of sessions) for (const it of s.items || []) for (const st of it.sets || []) {
    const reps = num(st.reps), kg = kgOf(st); if (!reps) continue;
    const e1 = kg * (1 + reps / 30);
    const cur = best[it.exId];
    if (!cur || kg > cur.kg || (kg === cur.kg && reps > cur.reps)) best[it.exId] = { exId: it.exId, name: it.name, kg, reps, w: st.w != null && st.w !== '' ? num(st.w) : kg, unit: st.unit || 'kg', date: s.date, e1rm: r1(e1) };
  }
  return Object.values(best).sort((a, b) => a.name < b.name ? -1 : 1);
}
function goalsFrom(series, sessions, goalKg) {
  const G = [
    { id: 'w80', label: 'Bajar de 80 kg', test: p => p.kg < 80 },
    { id: 'w79', label: 'Llegar a 79 kg', test: p => p.kg <= 79 },
    { id: 'w78', label: `Meta: ${goalKg} kg`, test: p => p.kg <= goalKg },
    { id: 'f24', label: 'Grasa por debajo de 24 %', test: p => p.fat != null && p.fat < 24 },
    { id: 'f22', label: 'Grasa por debajo de 22 %', test: p => p.fat != null && p.fat < 22 },
    { id: 'm60', label: 'Músculo ≥ 60 kg', test: p => p.muscle != null && p.muscle >= 60 }
  ];
  const fromDay0 = series.filter(p => p.date >= '2026-11-08');
  const res = G.map(g => { const hit = fromDay0.find(g.test); return { id: g.id, label: g.label, done: !!hit, date: hit ? hit.date : null }; });
  const done = sessions.filter(s => s.status === 'done').sort((a, b) => a.date < b.date ? -1 : 1);
  res.push({ id: 's1', label: 'Primera sesión de gym registrada', done: done.length >= 1, date: done[0]?.date || null });
  res.push({ id: 's12', label: '12 sesiones de gym', done: done.length >= 12, date: done[11]?.date || null });
  return res;
}

// ---------- Pantry (config/pantry.items: [{name, category, qty, addedAt, updatedAt}]) ----------
// Matching key: accents, case, punctuation and simple Spanish plurals don't matter ("Huevos" == "huevo", "limones" == "limón").
function pantryKey(name) {
  return norm(name).replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter(Boolean).map(w => w.length > 3 && /[^aeiou]es$/.test(w) && /[nrldj]$/.test(w.slice(0, -2)) ? w.slice(0, -2) : w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w).join(' ');
}
// Pure merge used by the chat tool and Ajustes. Never drops an item it was not asked to drop.
// op: {add:[{name, category?, qty?}], remove:[name], clear?:bool}. Returns {items, added, updated, removed, notFound, ambiguous}.
function applyPantry(items, op, today) {
  let out = op && op.clear ? [] : (items || []).map(i => ({ ...i }));
  const res = { added: [], updated: [], removed: op && op.clear ? (items || []).map(i => i.name) : [], notFound: [], ambiguous: [] };
  for (const raw of (op && op.remove) || []) {
    const k = pantryKey(raw); if (!k) continue;
    let idx = out.map((i, n) => pantryKey(i.name) === k ? n : -1).filter(n => n >= 0);
    if (!idx.length) { // no exact match: a whole-word match, only when it points to ONE item ("pollo" -> "Pechuga de pollo")
      const re = new RegExp('(^| )' + k + '( |$)'); // k only has [a-z0-9ñ ] (pantryKey)
      const hits = out.map((i, n) => re.test(pantryKey(i.name)) ? n : -1).filter(n => n >= 0);
      if (hits.length === 1) idx = hits; else { (hits.length ? res.ambiguous : res.notFound).push(String(raw)); if (hits.length) res.ambiguousMatches = (res.ambiguousMatches || []).concat(hits.map(n => out[n].name)); continue; }
    }
    for (const n of idx.sort((a, b) => b - a)) res.removed.push(out.splice(n, 1)[0].name);
  }
  for (const a of ((op && op.add) || []).slice(0, 100)) {
    const name = String((a && a.name) || '').trim().slice(0, 80); if (!name) continue;
    const k = pantryKey(name), cur = out.find(i => pantryKey(i.name) === k);
    const qty = a.qty != null && String(a.qty).trim() ? String(a.qty).trim().slice(0, 60) : null, cat = a.category ? String(a.category).slice(0, 20) : null;
    if (cur) { let ch = false; if (qty && cur.qty !== qty) { cur.qty = qty; ch = true; } if (cat && cur.category !== cat) { cur.category = cat; ch = true; } if (ch) { cur.updatedAt = today || null; res.updated.push(cur.name); } }
    else { out.push({ name, category: cat || '', ...(qty ? { qty } : {}), addedAt: today || null }); res.added.push(name); }
  }
  if (out.length > 300) out = out.slice(-300);
  return { items: out, ...res };
}

// ---------- Chat transcript (shared by phone and PC) ----------
// One doc per message: chat/{date}/m/{id} (even segment count, no read-merge needed); chat/{date} marks the day.
function chatMsgId(ms, rnd) { return String(ms).padStart(13, '0') + '-' + String(rnd || '').replace(/[^a-z0-9]/gi, '').slice(0, 6); }
function chatMsgPath(date, id) { return `chat/${date}/m/${id}`; }
// Model context: only the last `max` user/assistant turns after the last "reset", oldest first, starting with a user turn;
// consecutive same-role turns are merged. Images are never sent again (only the current message carries them).
function chatTurns(messages, max = 10) {
  const sorted = (messages || []).filter(m => m && m.role).slice().sort((a, b) => (a.at || '') < (b.at || '') ? -1 : (a.at || '') > (b.at || '') ? 1 : (a.id || '') < (b.id || '') ? -1 : 1);
  let start = 0; sorted.forEach((m, i) => { if (m.role === 'reset') start = i + 1; });
  const turns = [];
  for (const m of sorted.slice(start)) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const nImg = m.role === 'user' ? (num(m.imgCount) || (m.imagePaths || []).length) : 0;
    const text = (String(m.text || '').trim() || (nImg ? 'Mira la foto.' : '')) + (nImg ? `\n[Adjunté ${nImg} foto(s)]` : ''); if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + text; else turns.push({ role: m.role, content: text });
  }
  let out = turns.slice(-max); while (out.length && out[0].role !== 'user') out = out.slice(1);
  return out;
}

if (typeof module !== 'undefined') module.exports = { lighter, weekendRebound, pantryKey, applyPantry, chatMsgId, chatMsgPath, chatTurns, TEMPLATES, canonicalActivity, blockedEquipmentIds, goalPaused, ACTIVITIES, pickFlexActivity, activeBlockedActivities, goalProgress, nextGoalProposal, streaks, movementOptions, pickMovement, FINISHERS, weekIndex, toKg, kgOf, tzNow, addDays, daysBetween, weekStart, dowIndex, strengthKcal, activityKcal, footballStats, sessionKcal, dayBalance, nextStrength, nextRunWalk, describeSets, buildSession, weightSeries, rolling7, learnMealTimes, weekStats, computeNudges, prsFrom, goalsFrom, DEFAULT_RULES, mealSlot };
