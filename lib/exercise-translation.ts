// Keep catalogue IDs and stored exercise names stable; translate only the UI.
const exact: Record<string, string> = {
  'air bike': 'Bicicleta de aire',
  'ankle circles': 'Círculos de tobillo',
  'balance board': 'Tabla de equilibrio',
  'back lever': 'Palanca dorsal',
};

const phrases: [string, string][] = [
  ['romanian deadlift', 'peso muerto rumano'],
  ['stiff leg deadlift', 'peso muerto con piernas semirrígidas'],
  ['straight leg deadlift', 'peso muerto con piernas estiradas'],
  ['deadlift', 'peso muerto'],
  ['bench press', 'press de banca'],
  ['side bend', 'inclinación lateral'],
  ['biceps curl', 'curl de bíceps'],
  ['triceps extension', 'extensión de tríceps'],
  ['glute bridge', 'puente de glúteos'],
  ['front squat', 'sentadilla frontal'],
  ['back squat', 'sentadilla trasera'],
  ['hack squat', 'sentadilla hack'],
  ['jump squat', 'sentadilla con salto'],
  ['sumo squat', 'sentadilla sumo'],
  ['bent over row', 'remo inclinado'],
  ['seated row', 'remo sentado'],
  ['upright row', 'remo vertical'],
  ['close grip', 'agarre cerrado'],
  ['wide grip', 'agarre ancho'],
  ['chest press', 'press de pecho'],
  ['shoulder press', 'press de hombros'],
  ['military press', 'press militar'],
  ['overhead press', 'press por encima de la cabeza'],
  ['leg press', 'prensa de piernas'],
  ['leg extension', 'extensión de piernas'],
  ['leg curl', 'curl femoral'],
  ['leg raise', 'elevación de piernas'],
  ['calf raise', 'elevación de gemelos'],
  ['front raise', 'elevación frontal'],
  ['lateral raise', 'elevación lateral'],
  ['rear delt', 'deltoides posterior'],
  ['lat pulldown', 'jalón al pecho'],
  ['pulldown', 'jalón'],
  ['pull-up', 'dominada'],
  ['chin-up', 'dominada supina'],
  ['push-up', 'flexión'],
  ['pushdown', 'extensión en polea'],
  ['sit-up', 'abdominal'],
  ['step-up', 'subida al banco'],
  ['split squat', 'sentadilla dividida'],
  ['goblet squat', 'sentadilla copa'],
  ['hip thrust', 'empuje de cadera'],
  ['hip extension', 'extensión de cadera'],
  ['hip abduction', 'abducción de cadera'],
  ['hip adduction', 'aducción de cadera'],
  ['hip internal rotation', 'rotación interna de cadera'],
  ['hip external rotation', 'rotación externa de cadera'],
  ['one arm', 'a un brazo'],
  ['single leg', 'a una pierna'],
  ['underhand grip', 'agarre supino'],
  ['overhand grip', 'agarre prono'],
  ['bent over', 'inclinado'],
  ['face pull', 'tirón a la cara'],
  ['russian twist', 'giro ruso'],
  ['farmer walk', 'paseo del granjero'],
  ['farmer carry', 'paseo del granjero'],
  ['good morning', 'buenos días'],
];

const words: Record<string, string> = {
  assisted: 'asistido', alternate: 'alterno', alternating: 'alterno', arm: 'brazo',
  arms: 'brazos', back: 'espalda', backward: 'hacia atrás', bench: 'banco',
  bent: 'flexionado', bicep: 'bíceps', biceps: 'bíceps', bridge: 'puente',
  calves: 'gemelos', calf: 'gemelo', chest: 'pecho', clean: 'cargada',
  concentration: 'concentrado', crunch: 'encogimiento abdominal', curl: 'curl',
  decline: 'declinado', dip: 'fondo', dips: 'fondos', elbow: 'codo',
  exercise: 'ejercicio', extension: 'extensión', fly: 'apertura', floor: 'suelo',
  front: 'frontal', glute: 'glúteo', glutes: 'glúteos', grip: 'agarre',
  hammer: 'martillo', hamstring: 'isquiotibial', hanging: 'colgado',
  head: 'cabeza', heel: 'talón', high: 'alto', hip: 'cadera',
  incline: 'inclinado', jump: 'salto', knee: 'rodilla', knees: 'rodillas',
  kneeling: 'de rodillas', lateral: 'lateral', leg: 'pierna', legs: 'piernas',
  lift: 'elevación', low: 'bajo', lunge: 'zancada', lying: 'tumbado',
  machine: 'máquina', male: '', narrow: 'estrecho', on: 'en',
  overhead: 'sobre la cabeza', parallel: 'paralelo', plank: 'plancha',
  preacher: 'predicador', press: 'press', prone: 'boca abajo', pull: 'tirón',
  pullover: 'pulóver', push: 'empuje', raise: 'elevación', rear: 'posterior',
  reverse: 'inverso', rotation: 'rotación', row: 'remo', run: 'carrera',
  seated: 'sentado', shoulder: 'hombro', shoulders: 'hombros', side: 'lateral',
  single: 'único', squat: 'sentadilla', standing: 'de pie', straight: 'estirado',
  stretch: 'estiramiento', toe: 'punta del pie', touch: 'toque', tricep: 'tríceps',
  triceps: 'tríceps', twist: 'giro', twisting: 'con giro', upright: 'vertical',
  weighted: 'con peso', wide: 'ancho', wrist: 'muñeca', with: 'con',
  and: 'y', the: '', to: 'a', full: 'completo', circular: 'circular',
  resistance: 'resistencia', ball: 'pelota', stability: 'estabilidad',
  two: 'dos', of: 'de', skull: 'cráneo', crusher: 'rompecráneos',
  drag: 'arrastre', stance: 'postura', lifting: 'elevación', bar: 'barra',
  pov: 'vista', blaster: 'apoyo', guillotine: 'guillotina', bend: 'inclinación',
};

const equipment: [RegExp, string][] = [
  [/^dumbbell\s+/i, 'con mancuernas'],
  [/^barbell\s+/i, 'con barra'],
  [/^cable\s+/i, 'en polea'],
  [/^band\s+/i, 'con banda elástica'],
  [/^lever\s+/i, 'en máquina'],
  [/^smith\s+/i, 'en multipower'],
  [/^kettlebell\s+/i, 'con pesa rusa'],
  [/^sled\s+/i, 'con trineo'],
  [/^bodyweight\s+/i, 'con peso corporal'],
  [/^medicine ball\s+/i, 'con balón medicinal'],
];

const knownVocabulary = new Set([
  ...Object.keys(words),
  ...phrases.flatMap(([english]) => english.match(/[a-z]+/g) ?? []),
  'dumbbell', 'barbell', 'cable', 'band', 'lever', 'smith', 'kettlebell',
  'sled', 'bodyweight', 'medicine', 'ball',
]);

export function spanishExerciseName(englishName: string): string {
  const source = englishName.trim().toLowerCase();
  if (exact[source]) return exact[source];
  const sourceWords = source.replace(/\((male|female)\)/g, '').match(/[a-z]+/g) ?? [];
  if (sourceWords.some((word) => !knownVocabulary.has(word))) return englishName.trim();
  let name = source.replace(/\s*\((male|female)\)/g, '').replace(/-/g, ' ');
  let suffix = '';
  for (const [prefix, value] of equipment) {
    if (prefix.test(name)) {
      name = name.replace(prefix, '');
      suffix = value;
      break;
    }
  }
  for (const [english, spanish] of phrases) {
    name = name.replace(new RegExp(`\\b${english.replace(/-/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), spanish);
  }
  name = name.replace(/\b[a-z]+\b/g, (word) => words[word] ?? word)
    .replace(/\s+/g, ' ').trim();
  name = name.replace(/^(inclinado|declinado|sentado|de pie|tumbado|asistido|completo|lateral|frontal) (.+)$/, '$2 $1')
    .replace(/^agarre (cerrado|ancho) (.+)$/, '$2 con agarre $1')
    .replace(/^(a un brazo|a una pierna) (.+)$/, '$2 $1')
    .replace(/\bdominada asistido\b/g, 'dominada asistida')
    .replace(/\bsentadilla asistido\b/g, 'sentadilla asistida');
  const result = suffix ? `${name} ${suffix}` : name;
  return result.charAt(0).toLocaleUpperCase('es-ES') + result.slice(1);
}

export function normalizeExerciseSearch(value: string): string {
  return value.toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
