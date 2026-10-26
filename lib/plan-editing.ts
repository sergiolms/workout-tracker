import {
  weeksFromPeriods,
  type AppState,
  type PlanPeriod,
  type Session,
} from './storage.ts';

export function changePlanPeriods(
  current: AppState,
  transform: (periods: PlanPeriod[]) => PlanPeriod[],
): AppState {
  const selected = current.plan.find((week) => week.week === current.week);
  const periods = transform(current.periods);
  const plan = weeksFromPeriods(periods);
  const matchingWeek = selected
    ? plan.find(
        (week) =>
          week.periodId === selected.periodId &&
          week.periodWeek === selected.periodWeek,
      )
    : undefined;
  const lastWeekInPeriod = selected
    ? plan.filter((week) => week.periodId === selected.periodId).at(-1)
    : undefined;
  return {
    ...current,
    periods,
    plan,
    week:
      matchingWeek?.week ??
      lastWeekInPeriod?.week ??
      Math.min(current.week, plan.length || 1),
  };
}

export function savePlanSession(
  current: AppState,
  session: Session,
  viewWeek: number,
): AppState {
  const exists = current.sessions.some((item) => item.id === session.id);
  const sessions = exists
    ? current.sessions.map((item) => (item.id === session.id ? session : item))
    : [...current.sessions, session];
  const selectedWeek = current.plan.find((week) => week.week === viewWeek);
  const periods =
    !exists && selectedWeek
      ? current.periods.map((period) =>
          period.id === selectedWeek.periodId
            ? {
                ...period,
                routines: [...new Set([...period.routines, session.id])],
              }
            : period,
        )
      : current.periods;
  return {
    ...current,
    sessions,
    periods,
    plan:
      periods === current.periods ? current.plan : weeksFromPeriods(periods),
  };
}

export function assignPlanSession(
  current: AppState,
  periodId: string,
  sessionId: string,
  include: boolean,
) {
  return changePlanPeriods(current, (periods) =>
    periods.map((period) =>
      period.id !== periodId
        ? period
        : {
            ...period,
            routines: include
              ? [...new Set([...period.routines, sessionId])]
              : period.routines.filter((id) => id !== sessionId),
          },
    ),
  );
}

export function removePlanSession(current: AppState, id: string): AppState {
  const periods = current.periods.map((period) => ({
    ...period,
    routines: period.routines.filter((routine) => routine !== id),
  }));
  return {
    ...current,
    sessions: current.sessions.filter((session) => session.id !== id),
    periods,
    plan: weeksFromPeriods(periods),
  };
}
