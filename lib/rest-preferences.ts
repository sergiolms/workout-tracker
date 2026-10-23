export type RestPreferences = { restEnabled?: boolean; restSeconds?: number };

export function restDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(600, Math.max(15, Math.round(value))) : 90;
}

export function restPreferences(value: RestPreferences) {
  return { enabled: value.restEnabled !== false, seconds: restDuration(value.restSeconds) };
}

export function exerciseRestSeconds(exercise: { restSeconds?: number }, defaultSeconds: number): number {
  const override = exercise.restSeconds;
  return typeof override === 'number' && Number.isFinite(override) ? restDuration(override) : restDuration(defaultSeconds);
}

export function exerciseRestPreferences(exercise: RestPreferences, legacy: RestPreferences = {}) {
  return { enabled: exercise.restEnabled ?? legacy.restEnabled ?? true, seconds: exerciseRestSeconds(exercise, restDuration(legacy.restSeconds)) };
}
