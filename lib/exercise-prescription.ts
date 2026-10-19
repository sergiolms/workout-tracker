import type { Exercise } from './workout-data.ts';

export type Prescription = { sets: number; minReps: number; maxReps: number; minRir: number | null; maxRir: number | null };
const whole = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

export function exercisePrescription(exercise: Exercise): Prescription {
  const match = exercise.target.match(/RIR\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  const minRir = exercise.minRir ?? (match ? Number(match[1]) : null);
  return { sets: exercise.sets, minReps: exercise.minReps, maxReps: exercise.maxReps, minRir, maxRir: minRir === null ? null : exercise.maxRir ?? (match ? Number(match[2] ?? match[1]) : minRir) };
}

export function withExercisePrescription(exercise: Exercise, changes: Partial<Prescription>): Exercise {
  const next = { ...exercisePrescription(exercise), ...changes };
  next.sets = whole(next.sets, 1, 20);
  next.minReps = whole(next.minReps, 1, 999);
  next.maxReps = whole(next.maxReps, 1, 999);
  if (next.minReps > next.maxReps) { if (changes.maxReps !== undefined && changes.minReps === undefined) next.minReps = next.maxReps; else next.maxReps = next.minReps; }
  if (next.minRir !== null) {
    next.minRir = whole(next.minRir, 0, 4);
    next.maxRir = whole(next.maxRir ?? next.minRir, 0, 4);
    if (next.minRir > next.maxRir) { if (changes.maxRir !== undefined && changes.minRir === undefined) next.minRir = next.maxRir; else next.maxRir = next.minRir; }
  }
  const range = (min: number, max: number) => min === max ? String(min) : `${min}–${max}`;
  const unit = exercise.target.split('·')[0].match(/\d\s*(m|s|seg|min)\s*$/i)?.[1];
  const note = exercise.target.split('·').slice(1).map(text => text.trim()).filter(text => text && !/^RIR\b/i.test(text)).join(' · ');
  const target = `${next.sets}×${range(next.minReps, next.maxReps)}${unit ? ` ${unit}` : ''}${next.minRir !== null ? ` · RIR ${range(next.minRir, next.maxRir ?? next.minRir)}` : note ? ` · ${note}` : ''}`;
  const { minRir: _oldMin, maxRir: _oldMax, ...base } = exercise;
  return { ...base, sets: next.sets, minReps: next.minReps, maxReps: next.maxReps, target, ...(next.minRir !== null ? { minRir: next.minRir, maxRir: next.maxRir ?? next.minRir } : {}) };
}
