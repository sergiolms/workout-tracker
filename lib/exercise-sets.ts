import type { ExerciseLog, SetLog, WorkoutExerciseStatus } from './storage.ts';
import type { Exercise } from './workout-data.ts';

export const workingSets = (sets: SetLog[]) =>
  sets.filter((set) => set.kind !== 'warmup');
export const setLoad = (set: SetLog, log: Pick<ExerciseLog, 'load'>) =>
  set.load ?? log.load;
export function duplicateSet(sets: SetLog[], index: number): SetLog[] {
  const source = sets[index];
  if (!source) return sets;
  const copy: SetLog = {
    reps: source.reps,
    done: false,
    ...(source.load !== undefined ? { load: source.load } : {}),
    ...(source.seconds !== undefined ? { seconds: source.seconds } : {}),
    ...(source.distanceKm !== undefined
      ? { distanceKm: source.distanceKm }
      : {}),
    ...(source.kind ? { kind: source.kind } : {}),
  };
  return [...sets.slice(0, index + 1), copy, ...sets.slice(index + 1)];
}
export function statusFromLog(
  log: Pick<ExerciseLog, 'sets' | 'skipped'>,
): WorkoutExerciseStatus {
  if (log.skipped) return 'skipped';
  const sets = workingSets(log.sets);
  const count = sets.filter((set) => set.done).length;
  return count && count === sets.length
    ? 'done'
    : count
      ? 'partial'
      : 'pending';
}
export function exerciseSets(
  exercise: Exercise,
  saved?: ExerciseLog,
  previous?: ExerciseLog,
): SetLog[] {
  if (saved) return saved.sets;
  const load = previous?.load ?? (exercise.unit === 'reps' ? 0 : 20);
  return [
    ...Array.from({ length: exercise.warmupSets ?? 0 }, () => ({
      reps: exercise.minReps,
      ...(exercise.mode === 'time'
        ? { seconds: exercise.targetSeconds ?? 30, reps: 0 }
        : {}),
      done: false,
      load: 0,
      kind: 'warmup' as const,
    })),
    ...Array.from({ length: exercise.sets }, (_, index) => ({
      reps: exercise.maxReps,
      ...(exercise.mode === 'time'
        ? { seconds: exercise.targetSeconds ?? 30, reps: 0 }
        : {}),
      done: false,
      load: previous
        ? setLoad(
            workingSets(previous.sets)[index] ?? { reps: 0, done: false },
            previous,
          )
        : load,
      kind: 'work' as const,
    })),
  ];
}

export function supersetRange(exercises: Exercise[], index: number) {
  let start = index;
  let end = index;
  while (start > 0 && exercises[start - 1].supersetWithNext) start--;
  while (end < exercises.length - 1 && exercises[end].supersetWithNext) end++;
  return { start, end };
}

export function supersetTransition(
  exercises: Exercise[],
  index: number,
  current: SetLog[],
  logs: ExerciseLog[],
) {
  const group = supersetRange(exercises, index);
  const candidates = [
    ...Array.from(
      { length: group.end - index },
      (_, offset) => index + offset + 1,
    ),
    ...Array.from(
      { length: index - group.start },
      (_, offset) => group.start + offset,
    ),
  ];
  const next =
    candidates.find((position) => {
      const log = logs.find(
        (item) => item.exercise === exercises[position].name,
      );
      return !log || statusFromLog(log) !== 'done';
    }) ?? index;
  const complete = workingSets(current).every((set) => set.done);
  return {
    next,
    rest:
      group.start === group.end ||
      next <= index ||
      (complete && next === index),
  };
}
