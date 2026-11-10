'use strict';
/* Seed data (non-personal): each doc is written once, on first login (seed() in app.js). */

/* =====================================================================
   SEED DATA. seed() writes each doc ONLY if it does not exist yet.
   ===================================================================== */
const METRICS = [
  ['weight_kg', 'Peso', 'kg'], ['bmi', 'IMC', ''], ['body_fat_pct', 'Grasa corporal', '%'], ['fat_mass_kg', 'Masa grasa', 'kg'],
  ['fat_free_kg', 'Peso sin grasa', 'kg'], ['heart_rate_bpm', 'Frecuencia cardiaca', 'lpm'], ['cardiac_index', 'Índice cardiaco', ''],
  ['muscle_mass_kg', 'Masa muscular', 'kg'], ['muscle_rate_pct', 'Tasa muscular', '%'], ['skeletal_muscle_pct', 'Músculo esquelético', '%'],
  ['bone_mass_kg', 'Masa ósea', 'kg'], ['protein_mass_kg', 'Masa proteica', 'kg'], ['protein_pct', 'Proteína', '%'],
  ['water_kg', 'Agua', 'kg'], ['body_water_pct', 'Agua corporal', '%'], ['subcutaneous_fat_pct', 'Grasa subcutánea', '%'],
  ['visceral_fat', 'Grasa visceral', ''], ['bmr_scale_kcal', 'Metabolismo basal', 'kcal'], ['body_age', 'Edad corporal', 'años']
];
// Generic placeholder; the real profile is written by tools/db.mjs seed-private (kept out of the public repo).
const SEED_PROFILE = {
  name: 'Luis', heightCm: null, age: null, birthday: '', sex: '', injuries: '', city: '', watch: 'Amazfit / Zepp (usar SIEMPRE el contador general, nunca el de la sesión)',
  goalKg: 78, goalType: 'recomposición', footballGoals: [], priorities: [], cooksWith: '', dayZero: '2026-11-08', planStart: '2026-11-09', startKg: null, startDate: null, context: ''
};
const SEED_RULES = Object.assign(JSON.parse(JSON.stringify(DEFAULT_RULES)), {
  cookingRules: [
    'En casa hay air fryer y arrocera: úsalas cuando convenga (proteína y papas en la air fryer, arroz o bulgur en la arrocera), sin forzarlas en todo.',
    'Antes del paso 1, da la VISTA GENERAL del plato: qué es, cuánto tarda en total, la lista COMPLETA de ingredientes con cantidades (incluidas latas, salsas, caldos y condimentos) y qué usará (sartén, air fryer, arrocera, olla). Pregunta si tiene todo; si le falta algo, ajusta la receta antes de empezar. Después da el paso a paso y espera a que diga "siguiente" antes de seguir. Nunca aparece en un paso un ingrediente que no estaba en esa lista.',
    'Si manda foto antes de comer y la porción es excesiva, sugiere servir menos; nunca cambies el plato.',
    'El repollo va primero al wok. La espinaca va de último, 30 s con el calor que queda.',
    'Nunca cocines el ajo solo más de 30 s.',
    'Aceite de sésamo solo al final, nunca para cocinar.',
    'El bulgur no se escurre: absorbe el agua.',
    'Explica medidas en palabras simples, nunca fracciones: "llena la taza hasta la mitad y un poco más" en vez de "3/4 de taza".'
  ],
  mealGuidance: [
    'La proteína es la base de cada plato (130–150 g al día).',
    'Las verduras son el acompañante principal y pueden ser ilimitadas.',
    'Carbohidratos en porción pequeña: media taza cocida.',
    'La cena más ligera que el almuerzo.',
    'Prioriza lo que ya hay en la nevera y las verduras que se dañan primero.',
    'No recomiendes frituras, pizza, hamburguesas, perros calientes, pasta grande, salsas cremosas, postres ni bebidas azucaradas como parte del plan. Si pide algo pesado, propone una versión más ligera del mismo plato.'
  ]
});
const SEED_PANTRY = { items: [], note: 'Vacía a propósito: Luis la registra de nuevo desde la app.' };
const SEED_PLAN = {
  days: {
    mon: { kind: 'gym', template: 'A', title: 'Gym A · Piernas y glúteos (potencia)', detail: 'Hip thrust, sentadilla/prensa, split squat/zancada, RDL, abducción, saltos. Después de las 16:00.' },
    tue: { kind: 'rest', title: 'Descanso', detail: 'Nada de piernas pesadas: mañana es fútbol.' },
    wed: { kind: 'football', title: 'Fútbol 21:00–22:00', detail: 'Peso + reloj antes y después.' },
    thu: { kind: 'gym', template: 'B', title: 'Gym B · Core, rotación y tren superior', detail: 'Desde las 18:00. Calienta en la elíptica (sin impacto) si las piernas quedaron cargadas del fútbol.' },
    fri: { kind: 'gym', template: 'C', title: 'Gym C · Glúteos + intervalos', detail: 'Después de las 16:00. Preguntar disponibilidad del finde.' },
    sat: { kind: 'flex', title: 'Día flexible: una actividad bajo techo', detail: 'Si hay tiempo libre en la mañana.' },
    sun: { kind: 'flex', title: 'Día flexible: una actividad bajo techo', detail: 'Si hay tiempo libre en la mañana.' }
  },
  note: 'Nunca piernas pesadas el día antes del fútbol.'
};
const SEED_AVAIL = {
  weekly: { mon: 'Home office 8–16; gym después de las 16:00', tue: 'Libre desde ~18:00', wed: 'Libre desde ~18:00; fútbol 21–22', thu: 'Libre desde ~18:00', fri: 'Home office 8–16; gym después de las 16:00', sat: 'Varía; mañanas casi siempre libres', sun: 'Varía; mañanas casi siempre libres' },
  overrides: {}
};
const SEED_HISTORY = { points: [] }; // real history: tools/seed-private.json
const SEED_DAY0 = null; // real day-0 baseline: tools/seed-private.json
const SEED_EQUIPMENT = [
  { id: 'squash-court', name: 'Canchas de squash', kind: 'court', notes: 'En el mismo gym; 30 min/semana.' },
  { id: 'treadmill', name: 'Cintas (×3)', kind: 'cardio', notes: 'Intervalos, caminata, trote/caminata.' },
  { id: 'elliptical', name: 'Elípticas (×3)', kind: 'cardio', notes: 'Cardio sin impacto; intervalos; recuperación el día después del fútbol. MET ~5 moderado / ~7 vigoroso.' },
  { id: 'lat-pulldown', name: 'Combo jalón + remo bajo (gris, de discos)', kind: 'machine', incrementKg: 5, notes: 'Rodilleras, asiento, polea alta con barra larga curva, polea BAJA con apoyo de pies. Discos en lb/kg. Polea baja: remo sentado, pullover, face pull, curl, tríceps.' },
  { id: 'iso-press', name: 'Press iso-lateral sentado (de discos, asiento y respaldo ajustables)', kind: 'machine', incrementKg: 5, notes: 'Respaldo recto + asiento alto = press de hombro; reclinado/asiento bajo = press inclinado de pecho. Cada brazo independiente.' },
  { id: 'leg-press-45', name: 'Prensa 45° (de discos)', kind: 'machine', incrementKg: 10, notes: 'Asiento reclinado, plataforma, discos en los postes laterales.' },
  { id: 'straight-arm-attach', name: 'Accesorio negro para pullover en polea', kind: 'attachment', notes: '"Wea negra". Confirmar con foto si es barra recta o cuerda.', confirm: true },
  { id: 'bench-press-station', name: 'Estación de press de banca (barra larga en rack)', kind: 'bench', incrementKg: 2.5, notes: 'Por confirmar: barra libre o máquina Smith (rieles).', confirm: true },
  { id: 'cable-station', name: 'Multifuerza (cable crossover) con barra de dominadas', kind: 'machine', incrementKg: 2.5, notes: '2 torres de peso, poleas de altura ajustable a cada lado, juntas o de a una; barra de dominadas arriba; manijas D. Otros accesorios por confirmar (cuerda, barra recta, tobillera).' },
  { id: 'd-handles', name: 'Manijas D', kind: 'attachment', notes: 'De la multifuerza.' },
  { id: 'kettlebells', name: 'Kettlebells', kind: 'free', incrementKg: 4, notes: 'Pesos por confirmar.' },
  { id: 'medicine-balls', name: 'Balones medicinales (rack)', kind: 'free', notes: 'Varios pesos, por confirmar.' },
  { id: 'mats', name: 'Colchonetas (×4)', kind: 'other', notes: 'Core, estiramientos, peso corporal.' },
  { id: 'jump-rope', name: 'Cuerda para saltar (×1)', kind: 'cardio', notes: 'Casi nadie la usa: suele estar libre.' },
  { id: 'sauna', name: 'Sauna', kind: 'recovery', notes: 'Recuperación y relajación. Sin crédito de kcal. Opcional después de entrenar, nunca en lugar de entrenar. ~0,5 L de agua cada 15–20 min.' },
  { id: 'dumbbells', name: 'Mancuernas (lb y kg, rango completo)', kind: 'free', incrementKg: 2, notes: 'Reporta el peso de cada día; la app guarda la unidad tal cual.' },
  { id: 'flat-bench', name: 'Banco plano fijo (sin rack)', kind: 'bench', notes: 'Mancuernas, hip thrust/puente con la espalda apoyada, step-ups, búlgaras, remos.' },
  { id: 'adjustable-bench', name: 'Banco ajustable (respaldo reclinable, sin rack)', kind: 'bench', notes: 'Press inclinado con mancuernas, press de hombro sentado, remo apoyado, curl inclinado.' },
  { id: 'leg-curl', name: 'Curl femoral acostado (máquina)', kind: 'machine', incrementKg: 5, notes: 'Isquiotibiales.' },
  { id: 'preacher-bench', name: 'Banco Scott (predicador)', kind: 'bench', notes: 'Solo el apoyo: se usa con barra libre o mancuernas.' },
  { id: 'rowing-machine', name: 'Remo ergómetro (máquina de remo)', kind: 'cardio', available: false, notes: 'NO la tiene: nunca la recomiendes.', substitutes: ['Intervalos en elíptica', 'Remo sentado en polea baja'] },
  { id: 'leg-extension', name: 'Extensión de piernas (máquina)', kind: 'machine', notes: 'Inventario v1 de memoria: confirmar en el recorrido.', confirm: true },
  { id: 'pec-deck', name: 'Máquina contractora / mariposa (pec deck / rear delt fly)', kind: 'machine', available: false, notes: 'NO la tiene. Siempre lo mandan a ella: nunca la recomiendes.', substitutes: ['Pecho: aperturas con mancuernas en banco plano o inclinado, o aperturas en polea de pie', 'Deltoide posterior: face pull en polea, o pájaros con mancuernas en el banco inclinado'] }
];
const SEED_EXERCISES = [
  { id: 'lat-pulldown-bar', anchor: true, name: 'Jalón al pecho con barra larga', equipmentIds: ['lat-pulldown'], pattern: 'pulldown', muscles: ['dorsales', 'bíceps', 'espalda media'], goalTags: ['fuerza', 'espalda'], notes: 'Amplitud de espalda; va primero, pesado.', source: 'hecho' },
  { id: 'straight-arm-pulldown', name: 'Pullover en polea (brazos rectos)', equipmentIds: ['lat-pulldown', 'straight-arm-attach'], pattern: 'pulldown', muscles: ['dorsales'], goalTags: ['espalda'], notes: '3×10–15, controla la bajada.', source: 'hecho' },
  { id: 'flat-bench-press', anchor: true, name: 'Press de banca con barra', equipmentIds: ['bench-press-station'], pattern: 'press', muscles: ['pecho', 'tríceps', 'deltoide anterior'], goalTags: ['fuerza'], source: 'hecho' },
  { id: 'cable-press-fly', name: 'Press/apertura en polea de pie', equipmentIds: ['cable-station'], pattern: 'press', muscles: ['pecho'], goalTags: ['fuerza'], source: 'hecho' },
  { id: 'db-bench-press', name: 'Press con mancuernas en banco (palmas al frente)', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'press', muscles: ['pecho', 'tríceps'], goalTags: ['fuerza'], notes: 'Permite más carga.', source: 'hecho' },
  { id: 'db-bench-press-neutral', name: 'Press con mancuernas agarre neutro', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'press', muscles: ['pecho', 'tríceps'], goalTags: ['fuerza'], notes: 'Le cuesta más; amigable con el hombro.', source: 'hecho' },
  { id: 'home-pushups', name: 'Flexiones (casa)', equipmentIds: [], location: 'casa', pattern: 'press', muscles: ['pecho', 'tríceps'], goalTags: ['fuerza'], notes: '0.4 kcal por flexión.', source: 'casa' },
  { id: 'home-squat', name: 'Sentadilla con peso corporal (casa)', equipmentIds: [], location: 'casa', pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], goalTags: ['gluteos', 'resistencia'], source: 'casa' },
  { id: 'home-glute-bridge', name: 'Puente de glúteos (casa)', equipmentIds: [], location: 'casa', pattern: 'hip_thrust', muscles: ['glúteos', 'isquios'], goalTags: ['gluteos'], source: 'casa' },
  // Options derived from his equipment (not done yet): the planner only picks what fits the day.
  { id: 'leg-press-45', anchor: true, name: 'Prensa 45°', equipmentIds: ['leg-press-45'], pattern: 'leg_press', muscles: ['cuádriceps', 'glúteos'], goalTags: ['gluteos', 'fuerza'], source: 'opcion' },
  { id: 'db-hip-thrust', anchor: true, name: 'Hip thrust con mancuerna (espalda en banco plano)', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'hip_thrust', muscles: ['glúteos', 'isquios'], goalTags: ['gluteos', 'potencia'], source: 'opcion' },
  { id: 'db-bulgarian', name: 'Sentadilla búlgara con mancuernas', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'lunge', muscles: ['glúteos', 'cuádriceps'], goalTags: ['gluteos', 'futbol'], source: 'opcion' },
  { id: 'db-step-up', name: 'Step-up al banco con mancuernas', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'lunge', muscles: ['glúteos', 'cuádriceps'], goalTags: ['gluteos', 'potencia', 'futbol'], source: 'opcion' },
  { id: 'db-rdl', anchor: true, name: 'Peso muerto rumano con mancuernas', equipmentIds: ['dumbbells'], pattern: 'hinge', muscles: ['isquios', 'glúteos', 'espalda baja'], goalTags: ['gluteos', 'fuerza'], source: 'opcion' },
  { id: 'seated-row-low', name: 'Remo sentado en polea baja', equipmentIds: ['lat-pulldown'], pattern: 'row', muscles: ['espalda media', 'dorsales', 'bíceps'], goalTags: ['fuerza', 'espalda'], source: 'opcion' },
  { id: 'face-pull', name: 'Face pull en polea', equipmentIds: ['lat-pulldown'], pattern: 'row', muscles: ['deltoide posterior', 'espalda alta'], goalTags: ['postura'], notes: 'Sustituto de la contractora para deltoide posterior.', source: 'opcion' },
  { id: 'db-reverse-fly', name: 'Pájaros con mancuernas en banco inclinado', equipmentIds: ['dumbbells', 'adjustable-bench'], pattern: 'row', muscles: ['deltoide posterior'], goalTags: ['postura'], notes: 'Sustituto de la contractora.', source: 'opcion' },
  { id: 'db-supported-row', name: 'Remo con mancuerna apoyado en banco inclinado', equipmentIds: ['dumbbells', 'adjustable-bench'], pattern: 'row', muscles: ['espalda media', 'dorsales'], goalTags: ['fuerza'], source: 'opcion' },
  { id: 'db-fly', name: 'Aperturas con mancuernas en banco', equipmentIds: ['dumbbells', 'flat-bench'], pattern: 'press', muscles: ['pecho'], goalTags: ['pecho'], notes: 'Sustituto de la contractora para pecho.', source: 'opcion' },
  { id: 'iso-shoulder-press', name: 'Press de hombro en máquina iso-lateral', equipmentIds: ['iso-press'], pattern: 'press', muscles: ['hombros', 'tríceps'], goalTags: ['fuerza'], notes: 'Respaldo recto, asiento alto.', source: 'opcion' },
  { id: 'iso-incline-press', name: 'Press inclinado en máquina iso-lateral', equipmentIds: ['iso-press'], pattern: 'press', muscles: ['pecho superior', 'tríceps'], goalTags: ['fuerza'], notes: 'Respaldo reclinado, asiento bajo.', source: 'opcion' },
  { id: 'kb-swing', name: 'Swing con kettlebell', equipmentIds: ['kettlebells'], pattern: 'swing', muscles: ['glúteos', 'isquios', 'core'], goalTags: ['gluteos', 'potencia', 'futbol'], vigorous: true, source: 'opcion' },
  { id: 'kb-goblet-squat', name: 'Sentadilla goblet con kettlebell', equipmentIds: ['kettlebells'], pattern: 'squat', muscles: ['cuádriceps', 'glúteos'], goalTags: ['gluteos', 'fuerza'], source: 'opcion' },
  { id: 'mb-slam', name: 'Slams con balón medicinal', equipmentIds: ['medicine-balls'], pattern: 'throw', muscles: ['core', 'hombros', 'dorsales'], goalTags: ['potencia', 'futbol'], vigorous: true, source: 'opcion' },
  { id: 'mb-rot-throw', name: 'Lanzamiento rotacional con balón a la pared', equipmentIds: ['medicine-balls'], pattern: 'rotation', muscles: ['oblicuos', 'core', 'cadera'], goalTags: ['potencia', 'futbol'], notes: 'Rotación como un remate.', source: 'opcion' },
  { id: 'pallof-press', name: 'Pallof press en polea', equipmentIds: ['cable-station', 'd-handles'], pattern: 'rotation', muscles: ['core', 'oblicuos'], goalTags: ['core', 'futbol'], source: 'opcion' },
  { id: 'cable-woodchop', name: 'Leñador en polea (alto a bajo)', equipmentIds: ['cable-station', 'd-handles'], pattern: 'rotation', muscles: ['oblicuos', 'core'], goalTags: ['core', 'potencia'], source: 'opcion' },
  { id: 'plank-mat', name: 'Plancha en colchoneta', equipmentIds: ['mats'], pattern: 'core', muscles: ['core'], goalTags: ['core'], source: 'opcion' },
  { id: 'dead-bug', name: 'Dead bug en colchoneta', equipmentIds: ['mats'], pattern: 'core', muscles: ['core'], goalTags: ['core'], source: 'opcion' },
  { id: 'side-plank', name: 'Plancha lateral en colchoneta', equipmentIds: ['mats'], pattern: 'core', muscles: ['oblicuos', 'glúteo medio'], goalTags: ['core', 'futbol'], source: 'opcion' },
  { id: 'cable-fly', name: 'Aperturas en polea de pie', equipmentIds: ['cable-station', 'd-handles'], pattern: 'press', muscles: ['pecho'], goalTags: ['pecho'], notes: 'Sustituto de la contractora.', source: 'opcion' },
  { id: 'lying-leg-curl', name: 'Curl femoral acostado', equipmentIds: ['leg-curl'], pattern: 'leg_curl', muscles: ['isquios'], goalTags: ['fuerza', 'futbol'], source: 'opcion' },
  { id: 'preacher-curl-db', name: 'Curl en banco Scott con mancuerna', equipmentIds: ['preacher-bench', 'dumbbells'], pattern: 'curl', muscles: ['bíceps'], goalTags: ['fuerza'], source: 'opcion' },
  { id: 'elliptical-easy', name: 'Elíptica (sin impacto)', equipmentIds: ['elliptical'], pattern: 'cardio', muscles: [], goalTags: ['resistencia', 'recuperacion'], source: 'opcion' },
  { id: 'treadmill-walk', name: 'Caminata en cinta', equipmentIds: ['treadmill'], pattern: 'cardio', muscles: [], goalTags: ['resistencia'], source: 'hecho' },
  { id: 'treadmill-intervals', name: 'Intervalos trote/caminata en cinta', equipmentIds: ['treadmill'], pattern: 'cardio', muscles: [], goalTags: ['resistencia', 'futbol'], source: 'hecho' }
];
const R = (id, name, kcal, protein, portion, steps, extra = {}) => ({ id, name, kcal, protein, portion, recipe: { steps }, sharedNote: 'Cocinan juntos: kcal por persona.', timesEaten: 0, proteinEstimated: true, source: 'chats viejos', reference: true, ...extra });
const SEED_FOODS = [
  R('pollo-horno-papa', 'Pollo al horno con papa rústica y verduras', 425, 40, '1 plato por persona', ['Pechuga al horno a 350 °F por 20–25 min.', 'Papa en gajos con piel, aceite, sal, ajo y paprika: 30 min al horno.', 'Verduras California congeladas salteadas con ajo y salsa de soya.', 'Aceite de sésamo al final.']),
  R('pollo-wok', 'Pollo salteado al wok con verduras', 450, 40, '1 plato por persona', ['Pollo en trozos con Adobo Goya, paprika y pimienta.', 'Ajo 30 s, luego el pollo 4 min sin moverlo, voltea y 4 min más. Sácalo.', 'Repollo 4–5 min con un chorrito de agua, luego las verduras California.', 'Salsa de soya, regresa el pollo, aceite de sésamo al final.']),
  R('cerdo-wok', 'Cerdo salteado al wok con verduras', 480, 35, '1 plato por persona', ['Igual que el pollo al wok, pero con cerdo en trozos.', 'Ajo 30 s, cerdo 4 + 4 min sin moverlo. Sácalo.', 'Repollo 4–5 min con chorrito de agua, luego verduras California.', 'Soya, regresa el cerdo, sésamo al final.']),
  R('pollo-espinaca-cherry', 'Pollo con espinacas y tomates cherry', 280, 38, '1 plato por persona', ['Pollo sazonado con Adobo y pimienta, dorado en la sartén.', 'Tomates cherry 30 s.', 'Espinaca de último, 30 s con el calor que queda.']),
  R('cerdo-molida-repollo', 'Cerdo + carne molida con repollo y tomates', 400, 32, '1 plato por persona', ['Sazona con Adobo, pimienta, paprika y albahaca.', 'Al wok 8–10 min.', 'Repollo 4–5 min, tomates cherry 1 min.', 'Salsa de soya y aceite de sésamo al final.']),
  R('pollo-bulgur', 'Pollo con bulgur y tomates', 400, 35, '1 plato por persona', ['Bulgur: media taza de bulgur + 1 taza de agua + sal, tapado 10–12 min. No se escurre.', 'Pollo sazonado a la sartén.', 'Tomates al final.']),
  R('tortilla-pollo', 'Tortilla de huevos con pollo', 380, 35, 'con 2 rebanadas de pan', ['Bate 2 huevos con pollo desmechado, paprika, cebolla y ajo.', 'A la sartén a fuego medio hasta que cuaje.', 'Con 2 rebanadas de pan.']),
  R('arroz-sushi', 'Arroz de sushi (base)', 200, 4, 'media taza de arroz crudo por cada uno', ['Media taza de arroz y una taza llena hasta la mitad y un poco más de agua (una taza completa también sirve).', 'Antes de prender el fuego: ajo entero, sal y Adobo.', 'Tapado a fuego bajo hasta que absorba el agua.', 'Va bien con repollo, brócoli y papa rústica.'], {}),
  { id: 'cafe-french-vanilla-12', name: 'Café French Vanilla 12 oz', kcal: 160, protein: 2, portion: '12 oz de la máquina del trabajo', timesEaten: 0, provisional: true, source: 'regla' },
  { id: 'cafe-french-vanilla-14', name: 'Café French Vanilla 14 oz', kcal: 185, protein: 2, portion: '14 oz de la máquina del trabajo', timesEaten: 0, provisional: true, source: 'regla' },
  { id: 'oikos-fresa', name: 'Yogur griego Oikos fresa', kcal: 95, protein: 11, portion: '1 envase', timesEaten: 0, source: 'chats viejos', reference: true }
];

// Preset milestones live in the same goals system as his own goals.
const SEED_GOALS = [
  { id: 'w80', label: 'Bajar de 80 kg', metric: 'weight_kg', target: 79.9, preset: true },
  { id: 'w79', label: 'Llegar a 79 kg', metric: 'weight_kg', target: 79, preset: true },
  { id: 'w78', label: 'Meta: 78 kg', metric: 'weight_kg', target: 78, preset: true },
  { id: 'f24', label: 'Grasa por debajo de 24 %', metric: 'body_fat_pct', target: 23.9, preset: true },
  { id: 'f23', label: 'Grasa por debajo de 23 %', metric: 'body_fat_pct', target: 22.9, preset: true },
  { id: 'f22', label: 'Grasa por debajo de 22 %', metric: 'body_fat_pct', target: 21.9, preset: true },
  { id: 'weeks4', label: '4 semanas sin faltar', metric: 'full_weeks', target: 4, preset: true },
  { id: 'rope-2026-11', label: '1.000 saltos de cuerda en noviembre', metric: 'rope_month', target: 1000, month: '2026-11', preset: true },
  { id: 'new5', label: 'Probar 5 ejercicios nuevos', metric: 'new_exercises', target: 5, preset: true }
];
