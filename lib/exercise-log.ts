import type { Exercise } from './workout-data';
import type { AppState, ExerciseLog } from './storage';
import { statusFromLog, workingSets } from './exercise-sets.ts';
import { exercisePrescription } from './exercise-prescription.ts';

export function exerciseRecommendation(exercise: Pick<Exercise, 'minReps' | 'maxReps'> & Partial<Exercise>, log: Pick<ExerciseLog, 'sets' | 'rir' | 'pain'>) {
  const sets = workingSets(log.sets); const completed = sets.filter(set => set.done);
  const goal = exercisePrescription({ ...exercise, target: exercise.target ?? '', sets: exercise.sets ?? sets.length, name: exercise.name ?? '', increment: exercise.increment ?? 0.5 });
  const minRir = goal.minRir ?? 1;
  if (exercise.loadKind === 'assistance') return { suggestion: 'mantener' as const, reason: log.pain >= 4 ? 'Has registrado molestias. Revisa el movimiento y la ayuda con la que trabajas antes de progresar.' : 'Registra los kg de ayuda. Menos ayuda significa más esfuerzo; revisa el contrapeso manualmente, sin tratarlo como carga levantada.' };
  if (log.pain >= 4) return { suggestion: 'bajar' as const, reason: 'Has registrado molestias de 4/10 o más. Reduce la carga y revisa la técnica.' };
  if (exercise.progression === 'off') return { suggestion: 'mantener' as const, reason: 'Progresión manual: tú decides cuándo cambiar la carga o el objetivo.' };
  if (!completed.length) return { suggestion: 'mantener' as const, reason: 'Marca una serie de trabajo para valorar el resultado.' };
  if (exercise.mode === 'time') return { suggestion: 'mantener' as const, reason: completed.every(set => (set.seconds ?? 0) >= (exercise.targetSeconds ?? 30)) ? 'Has alcanzado el tiempo previsto. Puedes revisar el objetivo de segundos para la próxima sesión.' : 'Completa el tiempo previsto en las series de trabajo antes de aumentarlo.' };
  if (log.rir < minRir) return { suggestion: 'bajar' as const, reason: `Has dejado menos reserva de la prevista${goal.minRir !== null ? ` (RIR ${minRir})` : ''}.` };
  if (completed.some(set => set.reps < exercise.minReps)) return { suggestion: 'bajar' as const, reason: `Alguna serie realizada está por debajo de ${exercise.minReps} repeticiones.` };
  const loads = completed.map(set => set.load).filter(load => load !== undefined);
  if (new Set(loads).size > 1) return { suggestion: 'mantener' as const, reason: 'Has usado cargas distintas. Compara cada serie antes de subir la carga general.' };
  if (sets.length >= (exercise.sets ?? sets.length) && sets.every(set => set.done && set.reps >= exercise.maxReps)) return { suggestion: exercise.unit === 'reps' || exercise.loadKind === 'none' ? 'mantener' as const : 'subir' as const, reason: exercise.unit === 'reps' || exercise.loadKind === 'none' ? 'Has completado el rango. Puedes revisar el objetivo de repeticiones sin inventar una carga.' : `Todas las series de trabajo alcanzan ${exercise.maxReps} repeticiones y respetan la reserva prevista.` };
  return { suggestion: 'mantener' as const, reason: 'Completa el rango de repeticiones en todas las series de trabajo antes de subir.' };
}

export function exerciseSuggestion(exercise: Pick<Exercise, 'minReps' | 'maxReps'> & Partial<Exercise>, log: Pick<ExerciseLog, 'sets' | 'rir' | 'pain'>): ExerciseLog['suggestion'] {
  return exerciseRecommendation(exercise, log).suggestion;
}

export function saveExerciseLog(state: AppState, log: ExerciseLog): AppState {
  return {
    ...state,
    exerciseLogs: [...state.exerciseLogs.filter((item) => item.id !== log.id), log],
    workoutLogs: state.workoutLogs.map((workout) => workout.id === log.workoutId ? {
      ...workout, exercises: workout.exercises.map((item) => item.name === log.exercise ? { ...item, status: statusFromLog(log), logId: log.id } : item),
    } : workout),
  };
}
