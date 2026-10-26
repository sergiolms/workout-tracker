import {
  defaultState,
  type AppState,
  type Session,
  type PlanPeriod,
  weeksFromPeriods,
} from './storage.ts';
import { parseBackup } from './backup-import.ts';

export type SharedPlan = {
  format: 'base-plan';
  version: 1;
  name: string;
  sessions: Session[];
  periods: PlanPeriod[];
};
export function sharePlan(state: AppState, ids: string[]): SharedPlan {
  const selected = new Set(ids);
  return {
    format: 'base-plan',
    version: 1,
    name: state.planName,
    sessions: state.sessions.filter((session) => selected.has(session.id)),
    periods: state.periods
      .map((period) => ({
        ...period,
        routines: period.routines.filter((id) => selected.has(id)),
      }))
      .filter((period) => period.routines.length > 0),
  };
}
export function parseSharedPlan(text: string): SharedPlan {
  if (text.length > 5_000_000) throw Error('El plan supera 5 MB.');
  const raw: unknown = JSON.parse(text);
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('format' in raw) ||
    raw.format !== 'base-plan' ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('sessions' in raw) ||
    !('periods' in raw)
  )
    throw Error(
      'Selecciona un archivo de rutinas exportado desde Zero to Hero.',
    );
  const value = raw as SharedPlan;
  const validated = parseBackup(
    JSON.stringify({
      ...defaultState,
      sessions: value.sessions,
      periods: value.periods,
    }),
  );
  if (!validated.sessions.length)
    throw Error('El archivo no contiene rutinas.');
  const ids = new Set(validated.sessions.map((session) => session.id));
  if (
    validated.periods.some((period) =>
      period.routines.some((id) => !ids.has(id)),
    )
  )
    throw Error('El plan hace referencia a rutinas que faltan.');
  return {
    format: 'base-plan',
    version: 1,
    name:
      typeof value.name === 'string'
        ? value.name.slice(0, 120)
        : 'Plan compartido',
    sessions: validated.sessions,
    periods: validated.periods,
  };
}
export function addSharedPlan(
  state: AppState,
  plan: SharedPlan,
  includePeriods: boolean,
  makeId: () => string,
): AppState {
  const ids = new Map(plan.sessions.map((session) => [session.id, makeId()]));
  const sessions = plan.sessions.map((session) => ({
    ...session,
    id: ids.get(session.id)!,
    name: state.sessions.some((existing) => existing.name === session.name)
      ? `${session.name} (importada)`
      : session.name,
  }));
  const periods = includePeriods
    ? [
        ...state.periods,
        ...plan.periods.map((period) => ({
          ...period,
          id: makeId(),
          routines: period.routines.map((id) => ids.get(id)!),
        })),
      ]
    : state.periods;
  return {
    ...state,
    sessions: [...state.sessions, ...sessions],
    periods,
    plan: includePeriods ? weeksFromPeriods(periods) : state.plan,
  };
}
