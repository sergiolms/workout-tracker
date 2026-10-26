import {
  defaultState,
  type AppState,
  type ExerciseLog,
  type SetLog,
  type WorkoutLog,
} from './storage.ts';
import { parseBackup } from './backup-import.ts';

const failure = (message: string): never => {
  throw new Error(`CSV de Hevy: ${message}`);
};

export function readCsv(text: string): string[][] {
  if (text.length > 20_000_000) failure('el archivo supera 20 MB.');
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = source
    .slice(
      0,
      source.search(/[\r\n]/) < 0 ? source.length : source.search(/[\r\n]/),
    )
    .includes(';')
    ? ';'
    : ',';
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const push = () => {
    row.push(field);
    field = '';
    closed = false;
  };
  const finish = () => {
    push();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 100001) failure('máximo 100.000 filas.');
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) failure('comillas incorrectas.');
      quoted = true;
    } else if (char === delimiter) push();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      finish();
    } else {
      if (closed && char.trim())
        failure('contenido después de unas comillas de cierre.');
      if (!closed) field += char;
    }
    if (field.length > 10000 || row.length > 100)
      failure('campo demasiado grande.');
  }
  if (quoted) failure('faltan comillas de cierre.');
  finish();
  return rows;
}

const months: Record<string, number> = {
  jan: 1,
  ene: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  dic: 12,
};
export function hevyDate(value: string): string {
  const iso = value
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?)?$/,
    );
  const local = value
    .trim()
    .match(
      /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i,
    );
  let year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second = 0;
  if (iso)
    [, year, month, day, hour, minute, second] = iso.map((part, i) =>
      i === 0 ? 0 : Number(part ?? 0),
    );
  else if (local) {
    year = Number(local[3]);
    month = months[local[2].toLowerCase().slice(0, 3)] ?? 0;
    day = Number(local[1]);
    hour = Number(local[4] ?? 0);
    minute = Number(local[5] ?? 0);
    if (local[6]) {
      if (hour < 1 || hour > 12) failure(`hora no válida: ${value}`);
      hour = (hour % 12) + (local[6].toUpperCase() === 'PM' ? 12 : 0);
    }
  } else
    return failure(
      `fecha no reconocida: ${value}. Exporta en español o inglés.`,
    );
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  )
    failure(`fecha no válida: ${value}`);
  const result = iso?.[7]
    ? new Date(value.trim().replace(' ', 'T'))
    : new Date(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(result.getTime())) failure(`fecha no válida: ${value}`);
  return result.toISOString();
}

async function identity(parts: string[]): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(parts)),
  );
  return `hevy-${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function parseHevyCsv(
  text: string,
): Promise<{ state: AppState; warnings: string[] }> {
  const [header, ...rows] = readCsv(text);
  if (!header || !rows.length) return failure('no hay registros.');
  const keys = header.map((value) =>
    value.trim().toLowerCase().replace(/\s+/g, '_'),
  );
  if (new Set(keys).size !== keys.length) failure('cabeceras repetidas.');
  const index = new Map(keys.map((key, i) => [key, i]));
  const state: AppState = {
    ...defaultState,
    workoutLogs: [],
    exerciseLogs: [],
    measurements: [],
  };
  const warnings = new Set<string>();
  const workouts = new Map<string, WorkoutLog>();
  const logs = new Map<string, ExerciseLog>();
  const measurements = new Set<string>();
  const isWorkout = [
    'title',
    'start_time',
    'exercise_title',
    'set_index',
  ].every((key) => index.has(key));
  const isMeasurement =
    index.has('date') &&
    ['weight_kg', 'weight_lbs', 'waist_cm', 'waist_in'].some((key) =>
      index.has(key),
    );
  if (!isWorkout && !isMeasurement)
    failure('se esperaba Export Workouts o Export Measurements de Hevy.');
  for (const [offset, row] of rows.entries()) {
    const line = offset + 2;
    if (row.length !== keys.length)
      failure(`fila ${line}: número de columnas incorrecto.`);
    const get = (key: string) => row[index.get(key) ?? -1]?.trim() ?? '';
    const numeric = (key: string, max = 1e7): number | undefined => {
      const raw = get(key);
      if (!raw) return undefined;
      if (!/^\d+(?:[.,]\d+)?$/.test(raw))
        return failure(`fila ${line}: ${key} no es un número válido.`);
      const value = Number(raw.replace(',', '.'));
      if (!Number.isFinite(value) || value > max)
        failure(`fila ${line}: ${key} fuera de rango.`);
      return value;
    };
    const weight =
      numeric('weight_kg') ??
      (numeric('weight_lbs') === undefined
        ? undefined
        : numeric('weight_lbs')! * 0.45359237);
    if (isMeasurement) {
      const waist =
        numeric('waist_cm') ??
        (numeric('waist_in') === undefined
          ? undefined
          : numeric('waist_in')! * 2.54);
      if (weight === undefined && waist === undefined) {
        warnings.add('Hay filas sin peso ni cintura; no se importarán.');
        continue;
      }
      if (weight === 0 || waist === 0)
        failure(`fila ${line}: las medidas deben ser mayores que cero.`);
      const date = hevyDate(get('date'));
      const id = await identity(['measurement', get('date')]);
      if (measurements.has(id))
        failure(`fila ${line}: hay dos medidas con la misma fecha.`);
      measurements.add(id);
      state.measurements.push({
        id,
        date,
        ...(weight !== undefined ? { weight } : {}),
        ...(waist !== undefined ? { waist } : {}),
      });
      continue;
    }
    const title = get('title'),
      exercise = get('exercise_title');
    if (!title || !exercise || !get('start_time'))
      failure(`fila ${line}: falta el nombre o la fecha.`);
    const date = hevyDate(get('start_time'));
    const end = get('end_time') ? hevyDate(get('end_time')) : undefined;
    if (end && end < date)
      failure(`fila ${line}: el final es anterior al inicio.`);
    const workoutId = await identity(['workout', get('start_time'), title]);
    const id = await identity([workoutId, exercise]);
    const reps = numeric('reps') ?? 0;
    if (
      !Number.isInteger(reps) ||
      !Number.isInteger(numeric('set_index') ?? NaN)
    )
      failure(`fila ${line}: serie o repeticiones incorrectas.`);
    const duration = numeric('duration_seconds');
    const distance =
      numeric('distance_km') ??
      (numeric('distance_miles') === undefined
        ? undefined
        : numeric('distance_miles')! * 1.609344);
    const rpe = numeric('rpe', 10);
    const setType = get('set_type').toLowerCase() || 'normal';
    if (setType !== 'normal' && setType !== 'warmup')
      warnings.add(
        'Los tipos especiales de serie se conservan en los detalles de Hevy; se contabilizan como trabajo.',
      );
    const sourceDetails = [
      get('exercise_notes'),
      rpe !== undefined ? `RPE ${rpe}` : '',
      duration !== undefined ? `${duration} s` : '',
      distance !== undefined ? `${distance} km` : '',
      get('superset_id') ? `Superserie ${get('superset_id')}` : '',
      !['normal', 'warmup'].includes(setType) ? `Tipo: ${setType}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const log: ExerciseLog = logs.get(id) ?? {
      id,
      date,
      week: 1,
      routine: workoutId,
      workoutId,
      exercise,
      exerciseId: await identity(['exercise', exercise]),
      unit: 'kg',
      load: weight ?? 0,
      sets: [],
      rir: 0,
      effortUnknown: true,
      painUnknown: true,
      pain: 0,
      note: 'Importado de Hevy. RIR y molestias no registrados.',
      suggestion: 'mantener',
    };
    const set: SetLog = {
      reps,
      done: true,
      load: weight ?? 0,
      kind: setType === 'warmup' ? 'warmup' : 'work',
      sourceType: setType,
      ...(duration !== undefined ? { seconds: duration } : {}),
      ...(distance !== undefined ? { distanceKm: distance } : {}),
      ...(rpe !== undefined ? { rpe } : {}),
      ...(get('superset_id') ? { supersetId: get('superset_id') } : {}),
    };
    if (
      !reps &&
      weight === undefined &&
      duration === undefined &&
      distance === undefined
    )
      failure(`fila ${line}: la serie no contiene valores.`);
    log.sets.push(set);
    if (sourceDetails)
      log.note += `\nSerie ${log.sets.length}: ${sourceDetails}`;
    logs.set(id, log);
    const workout: WorkoutLog = workouts.get(workoutId) ?? {
      source: 'hevy',
      id: workoutId,
      date,
      week: 1,
      routine: workoutId,
      routineName: title,
      exercises: [],
      notes: [
        get('description'),
        end
          ? `Duración en Hevy: ${Math.round(((Date.parse(end) - Date.parse(date)) / 60000) * 10) / 10} min`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };
    if (!workout.exercises.some((item) => item.logId === id))
      workout.exercises.push({ name: exercise, status: 'done', logId: id });
    workouts.set(workoutId, workout);
  }
  state.workoutLogs = [...workouts.values()];
  state.exerciseLogs = [...logs.values()].map((log) => ({
    ...log,
    mode: log.sets.every((set) => set.reps === 0 && set.seconds !== undefined)
      ? 'time'
      : 'reps',
  }));
  if (
    isMeasurement &&
    keys.some(
      (key) =>
        !['date', 'weight_kg', 'weight_lbs', 'waist_cm', 'waist_in'].includes(
          key,
        ),
    )
  )
    warnings.add(
      'Solo se importan peso y cintura. Base no tiene campos para el resto de medidas.',
    );
  if (!state.workoutLogs.length && !state.measurements.length)
    failure('no hay registros compatibles.');
  return { state: parseBackup(JSON.stringify(state)), warnings: [...warnings] };
}
