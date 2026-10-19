import type { AppState, CardioLog } from './storage.ts';

export function activityDate(date: string): string {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function activityTimestamp(original: string, day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const changed = new Date(`${day}T12:00:00`);
  if (!Number.isFinite(changed.getTime()) || activityDate(changed.toISOString()) !== day) return null;
  return activityDate(original) === day ? original : changed.toISOString();
}

export function validActivity(log: CardioLog): boolean {
  return Boolean(log.type.trim()) && Number.isFinite(Date.parse(log.date)) && Number.isFinite(log.minutes) && log.minutes >= 1 &&
    [log.distance, log.steps, log.rpe, log.heartRate].every(value => value === undefined || (Number.isFinite(value) && value >= 0)) &&
    (log.steps === undefined || Number.isInteger(log.steps)) && (log.rpe === undefined || (Number.isInteger(log.rpe) && log.rpe <= 10)) &&
    (log.heartRate === undefined || Number.isInteger(log.heartRate));
}

export function applyActivityEdit(state: AppState, id: string, edited: CardioLog): AppState {
  if (!state.cardioLogs.some(log => log.id === id) || !validActivity(edited)) return state;
  return { ...state, cardioLogs: state.cardioLogs.map(log => {
    if (log.id !== id) return log;
    // Optional values omitted by the editor are cleared, while unrelated metadata survives.
    const { distance: _distance, steps: _steps, rpe: _rpe, heartRate: _heartRate, stepsEstimated: _estimated, stepLengthCm: _stepLength, ...base } = log;
    return { ...base, ...edited, id, type: edited.type.trim() };
  }) };
}

export function deleteActivity(state: AppState, id: string): AppState {
  return state.cardioLogs.some(log => log.id === id) ? { ...state, cardioLogs: state.cardioLogs.filter(log => log.id !== id) } : state;
}
