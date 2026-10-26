import type { AppState, PlanWeek, WorkoutLog } from './storage';
import { effectiveHistorySummaries } from './history-summary.ts';

export type PlanSlot = { week: number; routine: string };

export function countsTowardPlan(workout: WorkoutLog): boolean {
  return workout.exercises.some(
    (exercise) => exercise.status === 'done' || exercise.status === 'partial',
  );
}

export function completedPlanSlots(
  input: WorkoutLog[] | AppState,
): Set<string> {
  if (!Array.isArray(input) && input.history && !input.history.complete)
    return new Set(
      effectiveHistorySummaries(input).flatMap((month) => month.planSlots),
    );
  const logs = Array.isArray(input) ? input : input.workoutLogs;
  return new Set(
    logs
      .filter(
        (log) =>
          !log.rotationId && log.source !== 'manual' && countsTowardPlan(log),
      )
      .map((log) => `${log.week}:${log.routine}`),
  );
}

export function planProgress(plan: PlanWeek[], logs: WorkoutLog[] | AppState) {
  const completed = completedPlanSlots(logs);
  const slots = plan.flatMap((week) =>
    week.routines.map((routine) => `${week.week}:${routine}`),
  );
  return {
    done: slots.filter((slot) => completed.has(slot)).length,
    total: slots.length,
  };
}

export function nextPlanSession(
  plan: PlanWeek[],
  logs: WorkoutLog[] | AppState,
  currentWeek: number,
  currentRoutine: string,
): PlanSlot | null {
  const completed = completedPlanSlots(logs);
  const ordered = [...plan]
    .sort((a, b) => a.week - b.week)
    .flatMap((week) =>
      week.routines.map((routine) => ({ week: week.week, routine })),
    );
  const currentIndex = ordered.findIndex(
    (slot) => slot.week === currentWeek && slot.routine === currentRoutine,
  );
  const sameWeek = ordered.filter((slot) => slot.week === currentWeek);
  const remainingInWeek =
    currentIndex < 0
      ? sameWeek
      : [
          ...sameWeek.filter((slot) => ordered.indexOf(slot) > currentIndex),
          ...sameWeek.filter((slot) => ordered.indexOf(slot) <= currentIndex),
        ];
  const rotated = [
    ...remainingInWeek,
    ...ordered.filter((slot) => slot.week > currentWeek),
    ...ordered.filter((slot) => slot.week < currentWeek),
  ];
  return (
    rotated.find((slot) => !completed.has(`${slot.week}:${slot.routine}`)) ??
    null
  );
}
