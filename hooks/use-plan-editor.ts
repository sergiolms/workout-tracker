'use client';
import { useState } from 'react';
import type { AppState, PlanPeriod, Session } from '@/lib/storage';
import { uid } from '@/lib/local-date';
import {
  changePlanPeriods,
  savePlanSession,
  assignPlanSession,
  removePlanSession,
} from '@/lib/plan-editing';
export function usePlanEditor({
  state,
  updateState,
  onStartSession,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  onStartSession: (week: number, routine: string) => void;
}) {
  const [view, setView] = useState<'week' | 'routines' | 'structure'>('week');
  const [planNameDraft, setPlanNameDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);
  const [building, setBuilding] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<PlanPeriod | null>(null);
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(false);
  const [viewWeek, setViewWeek] = useState(state.week);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const weekPlan =
    state.plan.find((week) => week.week === viewWeek) ?? state.plan[0];
  const activePeriod =
    state.periods.find((period) => period.id === weekPlan?.periodId) ??
    (() => {
      if (!weekPlan) return undefined;
      let start = 1;
      return state.periods.find((period) => {
        const matches =
          weekPlan.week >= start &&
          weekPlan.week < start + period.durationWeeks;
        start += period.durationWeeks;
        return matches;
      });
    })();
  const assigned = new Set(weekPlan?.routines ?? []);

  const changePeriods = (transform: (periods: PlanPeriod[]) => PlanPeriod[]) =>
    updateState((current) => changePlanPeriods(current, transform));

  const openPeriodEditor = (period?: PlanPeriod) =>
    setPeriodDraft(
      period
        ? { ...period, routines: [...period.routines] }
        : {
            id: uid(),
            name: '',
            durationWeeks: 4,
            routines: [],
            cardio: 'Por definir',
            walks: 'Por definir',
            mobility: 'Por definir',
            optionalClass: '',
            deload: false,
          },
    );

  const savePeriod = () => {
    if (!periodDraft?.name.trim()) return;
    const period = {
      ...periodDraft,
      name: periodDraft.name.trim(),
      durationWeeks: Math.max(
        1,
        Math.min(52, Math.floor(periodDraft.durationWeeks) || 1),
      ),
    };
    changePeriods((current) =>
      current.some((item) => item.id === period.id)
        ? current.map((item) => (item.id === period.id ? period : item))
        : [...current, period],
    );
    if (!state.planName.trim())
      updateState((current) => ({ ...current, planName: 'Mi plan' }));
    setPeriodDraft(null);
  };

  const deletePeriod = () => {
    if (!periodDraft) return;
    changePeriods((periods) =>
      periods.filter((period) => period.id !== periodDraft.id),
    );
    setConfirmDeletePeriod(false);
    setPeriodDraft(null);
  };

  const saveSession = (session: Session) => {
    updateState((current) => savePlanSession(current, session, viewWeek));
    setBuilding(false);
    setEditing(null);
  };
  const setAssigned = (session: Session, include: boolean) => {
    if (activePeriod)
      updateState((current) =>
        assignPlanSession(current, activePeriod.id, session.id, include),
      );
  };
  const removeSession = (id: string) =>
    updateState((current) => removePlanSession(current, id));

  return {
    state,
    updateState,
    onStartSession,
    weekPlan,
    activePeriod,
    assigned,
    changePeriods,
    openPeriodEditor,
    savePeriod,
    deletePeriod,
    saveSession,
    setAssigned,
    removeSession,
    view,
    setView,
    planNameDraft,
    setPlanNameDraft,
    editing,
    setEditing,
    building,
    setBuilding,
    periodDraft,
    setPeriodDraft,
    confirmDeletePeriod,
    setConfirmDeletePeriod,
    viewWeek,
    setViewWeek,
    deletingSession,
    setDeletingSession,
  };
}
export type PlanEditor = ReturnType<typeof usePlanEditor>;
