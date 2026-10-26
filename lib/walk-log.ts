import type { CardioLog } from './storage.ts';

export function createWalkLog(input: unknown, id = crypto.randomUUID(), date = new Date().toISOString()): CardioLog {
  if (!input || typeof input !== 'object') throw new Error('Minutos o pasos no válidos');
  const value = input as Record<string, unknown>;
  const { minutes, steps } = value;
  if (Object.keys(value).some(key => key !== 'minutes' && key !== 'steps')
    || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440
    || typeof steps !== 'number' || !Number.isInteger(steps) || steps < 0 || steps > 1e7) throw new Error('Minutos o pasos no válidos');
  return { id, date, type: 'Caminata', minutes, steps };
}
