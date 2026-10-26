import type { AppState, ExerciseLog } from './storage.ts';
import { countsTowardPlan } from './plan-progress.ts';
import {
  historyExerciseKey,
  type HistoryExercise,
} from './exercise-history.ts';
import { workingSets } from './exercise-sets.ts';
import { mobilityHistory } from './mobility-history.ts';

export type ExerciseReference = HistoryExercise & {
  logId: string;
  date: string;
  workoutId?: string;
};
export type HistoryMonthSummary = {
  month: string;
  workouts: number;
  cardioMinutes: number;
  steps: number;
  painKnown: number;
  painFree: number;
  mobility: number;
  trash: number;
  planSlots: string[];
  rotations: Record<string, { id: string; date: string; routine: string }>;
  exercises: Record<string, ExerciseReference>;
};
export type HistoryCoverage = {
  complete: boolean;
  generation: number;
  loadedMonths: string[];
  summaries: HistoryMonthSummary[];
};
export const historyMonth = (date: string) => {
  const value = new Date(date);
  return Number.isFinite(value.getTime())
    ? value.toISOString().slice(0, 7)
    : 'undated';
};
export const historyExerciseReference = (
  log: ExerciseLog,
): ExerciseReference => ({
  name: log.exercise,
  ...(log.exerciseId ? { id: log.exerciseId } : {}),
  ...(log.exerciseId?.startsWith('catalog:')
    ? { catalogId: log.exerciseId.slice(8) }
    : {}),
  ...(log.unit ? { unit: log.unit } : {}),
  ...(log.mode ? { mode: log.mode } : {}),
  ...(log.loadKind ? { loadKind: log.loadKind } : {}),
  logId: log.id,
  date: log.date,
  ...(log.workoutId ? { workoutId: log.workoutId } : {}),
});

export function summarizeHistoryMonth(
  state: AppState,
  month: string,
): HistoryMonthSummary {
  const workouts = state.workoutLogs.filter(
    (log) => historyMonth(log.date) === month,
  );
  const logs = state.exerciseLogs.filter(
    (log) => historyMonth(log.date) === month,
  );
  const activities = state.cardioLogs.filter(
    (log) => historyMonth(log.date) === month,
  );
  const performed = logs.filter(
    (log) => !log.skipped && workingSets(log.sets).some((set) => set.done),
  );
  const painKnown = performed.filter((log) => !log.painUnknown);
  const rotations: HistoryMonthSummary['rotations'] = {};
  for (const log of workouts) {
    if (!log.rotationId || !countsTowardPlan(log)) continue;
    const previous = rotations[log.rotationId];
    if (
      !previous ||
      log.date > previous.date ||
      (log.date === previous.date && log.id > previous.id)
    )
      rotations[log.rotationId] = {
        id: log.id,
        date: log.date,
        routine: log.routine,
      };
  }
  const active = new Set(
    (state.activeWorkouts ?? [])
      .filter((log) => !log.finishedAt)
      .map((log) => log.id),
  );
  const exercises: HistoryMonthSummary['exercises'] = {};
  for (const log of performed) {
    if (log.workoutId && active.has(log.workoutId)) continue;
    const reference = historyExerciseReference(log);
    const key = historyExerciseKey(reference);
    if (!exercises[key] || log.date > exercises[key].date)
      exercises[key] = reference;
  }
  const legacy = new Set(
    performed
      .filter((log) => !log.workoutId)
      .map((log) => `${log.date.slice(0, 10)}:${log.week}:${log.routine}`),
  );
  return {
    month,
    workouts: workouts.filter(countsTowardPlan).length + legacy.size,
    cardioMinutes: activities.reduce((sum, log) => sum + log.minutes, 0),
    steps: activities.reduce((sum, log) => sum + (log.steps ?? 0), 0),
    painKnown: painKnown.length,
    painFree: painKnown.filter((log) => log.pain < 2).length,
    mobility: mobilityHistory(state.mobilityDone).filter(
      (log) => historyMonth(log.date) === month,
    ).length,
    trash: (state.trash ?? []).filter(
      (item) => historyMonth(item.deletedAt) === month,
    ).length,
    planSlots: [
      ...new Set(
        workouts
          .filter(
            (log) =>
              !log.rotationId &&
              log.source !== 'manual' &&
              countsTowardPlan(log),
          )
          .map((log) => `${log.week}:${log.routine}`),
      ),
    ],
    rotations,
    exercises,
  };
}

export function historyMonths(state: AppState): string[] {
  return [
    ...new Set([
      ...state.workoutLogs.map((log) => historyMonth(log.date)),
      ...state.exerciseLogs.map((log) => historyMonth(log.date)),
      ...state.cardioLogs.map((log) => historyMonth(log.date)),
      ...state.measurements.map((log) => historyMonth(log.date)),
      ...(state.trash ?? []).map((log) => historyMonth(log.deletedAt)),
      ...state.mobilityDone.map((key) => key.slice(0, 7)),
      ...(state.history?.summaries.map((summary) => summary.month) ?? []),
    ]),
  ]
    .sort()
    .reverse();
}

export function effectiveHistorySummaries(state: AppState) {
  const loaded = new Set(state.history?.loadedMonths ?? []);
  return historyMonths(state).map((month) => {
    const summary = state.history?.summaries.find(
      (item) => item.month === month,
    );
    return !state.history ||
      state.history.complete ||
      loaded.has(month) ||
      !summary
      ? summarizeHistoryMonth(state, month)
      : summary;
  });
}

export function historyTotals(state: AppState) {
  return effectiveHistorySummaries(state).reduce(
    (total, month) => ({
      workouts: total.workouts + month.workouts,
      cardioMinutes: total.cardioMinutes + month.cardioMinutes,
      steps: total.steps + month.steps,
      painKnown: total.painKnown + month.painKnown,
      painFree: total.painFree + month.painFree,
    }),
    { workouts: 0, cardioMinutes: 0, steps: 0, painKnown: 0, painFree: 0 },
  );
}
