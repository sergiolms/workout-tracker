import type { Exercise } from './workout-data';
import { statusFromLog } from './exercise-sets.ts';

export type SetLog = { reps: number; done: boolean; load?: number; seconds?: number; distanceKm?: number; rpe?: number; sourceType?: string; supersetId?: string; kind?: 'work' | 'warmup' };
export type ExerciseLog = { id: string; date: string; week: number; routine: string; workoutId?: string; exercise: string; exerciseId?: string; unit?: string; mode?: 'reps' | 'time'; loadKind?: 'total' | 'perHand' | 'added' | 'assistance' | 'none'; load: number; sets: SetLog[]; rir: number; pain: number; note: string; skipped?: boolean; effortUnknown?: boolean; suggestion: 'subir' | 'mantener' | 'bajar' };
export type WorkoutExerciseStatus = 'done' | 'partial' | 'skipped' | 'pending';
export type WorkoutLog = { source?: 'hevy'; rotationId?: string; id: string; date: string; week: number; routine: string; routineName: string; exercises: Array<{ name: string; status: WorkoutExerciseStatus; logId?: string }>; notes: string };
export type ActiveWorkout = { id: string; date: string; week: number; routine: string; startedAt: string; finishedAt?: string };
export type CardioLog = { id: string; date: string; type: string; minutes: number; distance?: number; steps?: number; stepsEstimated?: boolean; stepLengthCm?: number; rpe?: number; heartRate?: number };
export type Measurement = { id: string; date: string; weight?: number; waist?: number; restingHr?: number; sleep?: number; energy?: number; pain?: number };

export type Session = { id: string; name: string; exercises: Exercise[] };
export type PlanPeriod = { id: string; name: string; durationWeeks: number; routines: string[]; cardio: string; walks: string; mobility: string; optionalClass: string; deload?: boolean };
export type PlanWeek = { week: number; block: string; sessions: number; routines: string[]; cardio: string; walks: string; mobility: string; optionalClass: string; deload?: boolean; periodId: string; periodWeek: number };
export type ThemePreference = 'system' | 'light' | 'dark';
export type DeletedRecords = { id: string; deletedAt: string; label: string; workoutLogs: WorkoutLog[]; exerciseLogs: ExerciseLog[]; cardioLogs: CardioLog[]; measurements: Measurement[] };

export type AppState = {
  version: 3;
  updatedAt?: string;
  cloudRevision?: number;
  week: number;
  planName: string;
  periods: PlanPeriod[];
  sessions: Session[];
  workoutLogs: WorkoutLog[];
  activeWorkouts?: ActiveWorkout[];
  plan: PlanWeek[];
  exerciseLogs: ExerciseLog[];
  cardioLogs: CardioLog[];
  measurements: Measurement[];
  mobilityDone: string[];
  warmupDone: string[];
  classes: string[];
  theme: ThemePreference;
  haptics?: boolean;
  workoutView?: 'guided' | 'compact';
  rotation?: { id: string; startedAt: string; routines: string[] };
  restEnabled?: boolean;
  restSeconds?: number;
  trash?: DeletedRecords[];
};

export const defaultState: AppState = { version: 3, week: 1, planName: '', periods: [], sessions: [], plan: [], exerciseLogs: [], workoutLogs: [], cardioLogs: [], measurements: [], mobilityDone: [], warmupDone: [], classes: [], theme: 'system' };

export function weeksFromPeriods(periods: PlanPeriod[]): PlanWeek[] {
  let week = 1;
  return periods.flatMap((period) => Array.from({ length: Math.max(1, Math.min(52, Math.floor(period.durationWeeks) || 1)) }, (_, index) => ({
    week: week++, block: period.name, sessions: period.routines.length, routines: [...period.routines],
    cardio: period.cardio, walks: period.walks, mobility: period.mobility, optionalClass: period.optionalClass,
    deload: period.deload, periodId: period.id, periodWeek: index + 1,
  })));
}

function workoutsFromExerciseLogs(logs: ExerciseLog[], sessions: Session[], existing: WorkoutLog[]): WorkoutLog[] {
  const groups = new Map<string, WorkoutLog>();
  const linked = new Map(existing.flatMap(workout => workout.exercises.flatMap(item => item.logId ? [[item.logId, workout.id] as const] : [])));
  for (const log of logs) {
    const day = new Date(log.date).toISOString().slice(0, 10);
    const id = log.workoutId || linked.get(log.id) || `${day}:${log.week}:${log.routine}`;
    const workout = groups.get(id) ?? {
      id, date: log.date, week: log.week, routine: log.routine,
      routineName: sessions.find((session) => session.id === log.routine)?.name ?? log.routine,
      exercises: [], notes: '',
    };
    const status = statusFromLog(log);
    workout.exercises = [...workout.exercises.filter((item) => item.name !== log.exercise), { name: log.exercise, status, logId: log.id }];
    groups.set(id, workout);
  }
  return [...groups.values()];
}

function periodsFromLegacyWeeks(weeks: PlanWeek[]): PlanPeriod[] {
  const sorted = [...weeks].sort((a, b) => a.week - b.week);
  const periods: PlanPeriod[] = [];
  for (const week of sorted) {
    const signature = JSON.stringify([week.block, week.routines, week.cardio, week.walks, week.mobility, week.optionalClass, Boolean(week.deload)]);
    const previous = periods.at(-1);
    const previousWeek = previous ? sorted.find((item) => item.week === week.week - 1) : undefined;
    const previousSignature = previousWeek ? JSON.stringify([previousWeek.block, previousWeek.routines, previousWeek.cardio, previousWeek.walks, previousWeek.mobility, previousWeek.optionalClass, Boolean(previousWeek.deload)]) : '';
    if (previous && previousSignature === signature) {
      previous.durationWeeks += 1;
      continue;
    }
    periods.push({
      id: `period-${week.week}`, name: week.block || `Tramo ${periods.length + 1}`, durationWeeks: 1,
      routines: [...week.routines], cardio: week.cardio, walks: week.walks,
      mobility: week.mobility, optionalClass: week.optionalClass, deload: week.deload,
    });
  }
  return periods;
}

// Converts the old fixed week schedule into editable periods without changing
// sessions, routine IDs, or exercise history.
export function migrateState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<AppState> & { version?: number; periods?: PlanPeriod[]; planName?: string };
  const oldWeeks = Array.isArray(value.plan) ? value.plan : [];
  const periods = Array.isArray(value.periods) && value.periods.length ? value.periods : periodsFromLegacyWeeks(oldWeeks);
  const safePeriods = periods.filter((period) => period && typeof period.id === 'string' && typeof period.name === 'string').map((period) => ({
    ...period,
    durationWeeks: Math.max(1, Math.min(52, Math.floor(Number(period.durationWeeks) || 1))),
    routines: Array.isArray(period.routines) ? [...period.routines] : [],
  }));
  const sessions = Array.isArray(value.sessions) ? value.sessions : [];
  const exerciseLogs = Array.isArray(value.exerciseLogs) ? value.exerciseLogs : [];
  const workoutLogs = Array.isArray(value.workoutLogs) ? value.workoutLogs : [];
  const existingWorkoutIds = new Set(workoutLogs.map((workout) => workout.id));
  const activeIds = new Set((value.activeWorkouts ?? []).filter(item => !item.finishedAt).map(item => item.id));
  const migratedWorkouts = workoutsFromExerciseLogs(exerciseLogs, sessions, workoutLogs).filter((workout) => !existingWorkoutIds.has(workout.id) && !activeIds.has(workout.id));
  return {
    ...defaultState,
    ...value,
    version: 3,
    planName: typeof value.planName === 'string' ? value.planName : safePeriods.length ? 'Mi plan' : '',
    periods: safePeriods,
    plan: weeksFromPeriods(safePeriods),
    theme: value.theme === 'dark' || value.theme === 'light' ? value.theme : 'system',
    sessions,
    exerciseLogs,
    workoutLogs: [...workoutLogs, ...migratedWorkouts],
    ...(Array.isArray(value.activeWorkouts) ? { activeWorkouts: value.activeWorkouts } : {}),
    cardioLogs: Array.isArray(value.cardioLogs) ? value.cardioLogs : [],
    measurements: Array.isArray(value.measurements) ? value.measurements : [],
    mobilityDone: Array.isArray(value.mobilityDone) ? value.mobilityDone : [],
    warmupDone: Array.isArray(value.warmupDone) ? value.warmupDone : [],
    classes: Array.isArray(value.classes) ? value.classes : [],
  };
}

// Keep existing callers compatible; an empty plan is valid for a new account.
export function ensurePlan(state: AppState): AppState {
  return state;
}


const DB_NAME = 'base-workout';
const STORE_NAME = 'state';
const localKey = (uid?: string) => uid ? `user:${uid}` : 'guest';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readState(key: string): Promise<AppState | null> {
  if (typeof indexedDB === 'undefined') throw new Error('La base de datos local no está disponible');
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
    request.onsuccess = () => { db.close(); resolve(migrateState(request.result ?? null)); };
    request.onerror = () => reject(request.error);
  });
}

export function loadLocalState(uid?: string): Promise<AppState | null> {
  return readState(localKey(uid));
}

export async function saveLocalState(state: AppState, uid?: string): Promise<void> {
  if (typeof indexedDB === 'undefined') throw new Error('La base de datos local no está disponible');
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, localKey(uid));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Guardado cancelado'));
  });
}

export async function loadPendingChanges(uid: string): Promise<{ base: AppState; state: AppState } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(`pending:${uid}`);
    request.onsuccess = () => { db.close(); const value = request.result; const base = migrateState(value?.base); const state = migrateState(value?.state); resolve(base && state ? { base, state } : null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function savePendingChanges(uid: string, pending: { base: AppState; state: AppState } | null): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    if (pending) tx.objectStore(STORE_NAME).put(pending, `pending:${uid}`); else tx.objectStore(STORE_NAME).delete(`pending:${uid}`);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? Error('No se ha guardado la cola de cambios')); };
  });
}

// Recovery snapshots preserve both sides before the first cloud reconciliation.
export async function backupLocalState(state: AppState, uid: string, source: 'local' | 'cloud'): Promise<void> {
  if (typeof indexedDB === 'undefined') throw new Error('La base de datos local no está disponible');
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const key = `backup:${uid}:${source}:${state.updatedAt ?? 'unversioned'}`;
    const existing = store.get(key);
    existing.onsuccess = () => { if (existing.result === undefined) store.put(state, key); };
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Guardado cancelado'));
  });
}

// Signing out only removes quick-entry drafts; account databases are retained.
export async function clearAppLocalData(): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('base-draft:')) localStorage.removeItem(key);
    }
  }
}
