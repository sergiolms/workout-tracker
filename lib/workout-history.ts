import type { AppState, ExerciseLog, WorkoutExerciseStatus, WorkoutLog } from './storage';

export type WorkoutExerciseEdit = { log: ExerciseLog; dirty: boolean; originalStatus: WorkoutExerciseStatus; hasLog: boolean };
export const workoutStatusLabel: Record<WorkoutExerciseStatus, string> = { done: 'Completado', partial: 'Parcial', skipped: 'No realizado', pending: 'Pendiente' };

export function statusFromLog(log: Pick<ExerciseLog, 'sets' | 'skipped'>): WorkoutExerciseStatus {
  if (log.skipped) return 'skipped';
  const count = log.sets.filter((set) => set.done).length;
  return count && count === log.sets.length ? 'done' : count ? 'partial' : 'pending';
}

function belongsToWorkout(log: ExerciseLog, workout: WorkoutLog) {
  return log.workoutId === workout.id || (!log.workoutId && log.routine === workout.routine && log.week === workout.week && new Date(log.date).toLocaleDateString('en-CA') === new Date(workout.date).toLocaleDateString('en-CA'));
}

export function createWorkoutEdits(state: AppState, workout: WorkoutLog, makeId: () => string): WorkoutExerciseEdit[] {
  const session = state.sessions.find((item) => item.id === workout.routine);
  return workout.exercises.map((item) => {
    const saved = state.exerciseLogs.find((log) => log.id === item.logId) ?? state.exerciseLogs.find((log) => log.exercise === item.name && belongsToWorkout(log, workout));
    const template = session?.exercises.find((exercise) => exercise.name === item.name);
    const log: ExerciseLog = saved ? { ...saved, sets: saved.sets.map((set) => ({ ...set })) } : {
      id: makeId(), date: workout.date, week: workout.week, routine: workout.routine, workoutId: workout.id,
      exercise: item.name, load: 0,
      sets: Array.from({ length: template?.sets ?? 3 }, () => ({ reps: template?.maxReps ?? 0, done: item.status === 'done' })),
      rir: 2, pain: 0, note: '', skipped: item.status === 'skipped', suggestion: 'mantener',
    };
    return { log, dirty: false, originalStatus: item.status, hasLog: Boolean(saved) };
  });
}

export function applyWorkoutEdit(state: AppState, workoutId: string, date: string, notes: string, edits: WorkoutExerciseEdit[]): AppState {
  const workout = state.workoutLogs.find((item) => item.id === workoutId);
  if (!workout || !Number.isFinite(Date.parse(date))) return state;
  const relatedIds = new Set(workout.exercises.flatMap((exercise) => exercise.logId ? [exercise.logId] : []));
  const exerciseLogs = state.exerciseLogs.map((log) => relatedIds.has(log.id) || belongsToWorkout(log, workout) ? { ...log, date } : log);
  const exercises = workout.exercises.map((item, index) => {
    const edit = edits[index];
    if (!edit || edit.log.exercise !== item.name || !edit.dirty) return item;
    const template = state.sessions.find((session) => session.id === workout.routine)?.exercises.find((exercise) => exercise.name === item.name);
    const lower = edit.log.pain >= 4 || edit.log.rir < 1 || (template && edit.log.sets.some((set) => set.reps < template.minReps));
    const raise = template && !edit.log.skipped && edit.log.sets.length > 0 && edit.log.sets.every((set) => set.done && set.reps >= template.maxReps);
    const log: ExerciseLog = { ...edit.log, date, workoutId: workout.id, routine: workout.routine, week: workout.week, suggestion: lower ? 'bajar' : raise ? 'subir' : 'mantener' };
    const existing = exerciseLogs.findIndex((entry) => entry.id === log.id);
    if (existing < 0) exerciseLogs.push(log); else exerciseLogs[existing] = log;
    return { ...item, status: statusFromLog(log), logId: log.id };
  });
  const hasWork = exercises.some((item) => item.status === 'done' || item.status === 'partial');
  const inPlan = state.plan.some((week) => week.week === workout.week && week.routines.includes(workout.routine));
  return {
    ...state,
    week: !hasWork && inPlan ? Math.min(state.week, workout.week) : state.week,
    exerciseLogs,
    workoutLogs: state.workoutLogs.map((item) => item.id === workout.id ? { ...item, date, notes: notes.trim(), exercises } : item),
  };
}
