export type RestPreferences = { restEnabled?: boolean; restSeconds?: number };

export function restDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(600, Math.max(15, Math.round(value))) : 90;
}

export function restPreferences(value: RestPreferences) {
  return { enabled: value.restEnabled !== false, seconds: restDuration(value.restSeconds) };
}
