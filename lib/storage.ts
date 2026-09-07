import { plan as seedPlan, routines as seedRoutines, type Exercise } from './workout-data';

export type SetLog = { reps: number; done: boolean };
export type ExerciseLog = { id: string; date: string; week: number; routine: string; exercise: string; load: number; sets: SetLog[]; rir: number; pain: number; note: string; suggestion: 'subir' | 'mantener' | 'bajar' };
export type CardioLog = { id: string; date: string; type: string; minutes: number; distance: number; steps: number; rpe: number; heartRate?: number };
export type Measurement = { id: string; date: string; weight?: number; waist?: number; restingHr?: number; sleep?: number; energy?: number; pain?: number };

export type Session = { id: string; name: string; exercises: Exercise[] };
export type PlanWeek = { week: number; block: string; sessions: number; routines: string[]; cardio: string; walks: string; mobility: string; optionalClass: string; deload?: boolean };

export type AppState = {
  version: 2;
  week: number;
  sessions: Session[];
  plan: PlanWeek[];
  exerciseLogs: ExerciseLog[];
  cardioLogs: CardioLog[];
  measurements: Measurement[];
  mobilityDone: string[];
  warmupDone: string[];
  classes: string[];
  theme: 'light' | 'dark';
};

export const defaultState: AppState = { version: 2, week: 1, sessions: [], plan: [], exerciseLogs: [], cardioLogs: [], measurements: [], mobilityDone: [], warmupDone: [], classes: [], theme: 'light' };

// Accepts any persisted shape (v1 without sessions/plan, or v2) and returns a complete v2 state.
export function migrateState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<AppState> & { version?: number };
  return {
    ...defaultState,
    ...value,
    version: 2,
    sessions: Array.isArray(value.sessions) ? value.sessions : [],
    plan: Array.isArray(value.plan) ? value.plan : [],
    exerciseLogs: Array.isArray(value.exerciseLogs) ? value.exerciseLogs : [],
    cardioLogs: Array.isArray(value.cardioLogs) ? value.cardioLogs : [],
    measurements: Array.isArray(value.measurements) ? value.measurements : [],
    mobilityDone: Array.isArray(value.mobilityDone) ? value.mobilityDone : [],
    warmupDone: Array.isArray(value.warmupDone) ? value.warmupDone : [],
    classes: Array.isArray(value.classes) ? value.classes : [],
  };
}

// Fills empty sessions/plan from the built-in program so it becomes part of the
// synced account. Idempotent: keeps whatever the user already has.
export function seedAccount(state: AppState): AppState {
  const needsSessions = state.sessions.length === 0;
  const needsPlan = state.plan.length === 0;
  if (!needsSessions && !needsPlan) return state;
  return {
    ...state,
    sessions: needsSessions
      ? (Object.keys(seedRoutines) as Array<keyof typeof seedRoutines>).map((id) => ({ id, name: id, exercises: seedRoutines[id].map((item) => ({ ...item })) }))
      : state.sessions,
    plan: needsPlan ? seedPlan.map((week) => ({ ...week, routines: [...week.routines] })) : state.plan,
  };
}

export const SEED_SESSION_IDS = new Set(Object.keys(seedRoutines));

const DB_NAME = 'base-workout';
const STORE_NAME = 'state';
const KEY = 'main';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalState(): Promise<AppState | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY);
    request.onsuccess = () => resolve(migrateState(request.result ?? null));
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalState(state: AppState): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

