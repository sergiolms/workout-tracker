export type SetLog = { reps: number; done: boolean };
export type ExerciseLog = { id: string; date: string; week: number; routine: string; exercise: string; load: number; sets: SetLog[]; rir: number; pain: number; note: string; suggestion: 'subir' | 'mantener' | 'bajar' };
export type CardioLog = { id: string; date: string; type: string; minutes: number; distance: number; steps: number; rpe: number; heartRate?: number };
export type Measurement = { id: string; date: string; weight?: number; waist?: number; restingHr?: number; sleep?: number; energy?: number; pain?: number };

export type AppState = {
  version: 1;
  week: number;
  exerciseLogs: ExerciseLog[];
  cardioLogs: CardioLog[];
  measurements: Measurement[];
  mobilityDone: string[];
  warmupDone: string[];
  classes: string[];
  theme: 'light' | 'dark';
};

export const defaultState: AppState = { version: 1, week: 1, exerciseLogs: [], cardioLogs: [], measurements: [], mobilityDone: [], warmupDone: [], classes: [], theme: 'light' };

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
    request.onsuccess = () => resolve(request.result ?? null);
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

