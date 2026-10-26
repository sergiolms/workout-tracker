'use client';

import {
  CalendarDays,
  Check,
  Dumbbell,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { completedPlanSlots } from '@/lib/plan-progress';
import {
  weeksFromPeriods,
  type AppState,
  type PlanPeriod,
  type Session,
} from '@/lib/storage';
import { activeWorkout } from '@/lib/workout-instance';
import { ViewTabs } from '@/components/view-tabs';
import { Stepper } from '@/components/number-stepper';
import { uid } from '@/lib/local-date';
import { SessionBuilder } from '@/components/plan/session-builder';

export function PlanView({
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
    updateState((current) => {
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
      const week =
        matchingWeek?.week ??
        lastWeekInPeriod?.week ??
        Math.min(current.week, plan.length || 1);
      return { ...current, periods, plan, week };
    });

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
    updateState((current) => {
      const exists = current.sessions.some((item) => item.id === session.id);
      const sessions = exists
        ? current.sessions.map((item) =>
            item.id === session.id ? session : item,
          )
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
          periods === current.periods
            ? current.plan
            : weeksFromPeriods(periods),
      };
    });
    setBuilding(false);
    setEditing(null);
  };

  const setAssigned = (session: Session, include: boolean) => {
    if (!activePeriod) return;
    changePeriods((periods) =>
      periods.map((period) =>
        period.id !== activePeriod.id
          ? period
          : {
              ...period,
              routines: include
                ? [...new Set([...period.routines, session.id])]
                : period.routines.filter((id) => id !== session.id),
            },
      ),
    );
  };

  const removeSession = (id: string) => {
    updateState((current) => {
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
    });
  };

  if (building)
    return (
      <SessionBuilder
        customExercises={[...new Map(state.sessions.flatMap(session => session.exercises).filter(exercise => exercise.id?.startsWith('custom:')).map(exercise => [exercise.id, exercise])).values()]}
        defaultRest={{
          restEnabled: state.restEnabled,
          restSeconds: state.restSeconds,
        }}
        initialSession={editing ?? undefined}
        onCancel={() => {
          setBuilding(false);
          setEditing(null);
        }}
        onSave={saveSession}
      />
    );

  return (
    <div>
      <div className="section-heading">
        <div>
          <h1 className="page-title">Plan</h1>
          <p className="page-subtitle">
            {state.planName || 'Tu estructura de entrenamiento'}
          </p>
        </div>
        <Button
          aria-label="Cambiar nombre del plan"
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          onClick={() => setPlanNameDraft(state.planName)}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <ViewTabs
        label="Secciones del plan"
        value={view}
        onChange={setView}
        items={[
          { id: 'week', label: 'Semana' },
          { id: 'routines', label: 'Rutinas' },
          { id: 'structure', label: 'Tramos' },
        ]}
      />
      <Dialog
        open={planNameDraft !== null}
        onOpenChange={(open) => {
          if (!open) setPlanNameDraft(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Nombre del plan</DialogTitle>
          <DialogDescription>
            Un nombre para tu programa de entrenamiento.
          </DialogDescription>
          <input
            aria-label="Nombre del plan"
            className="h-12 rounded-xl border border-border bg-background px-3 text-base"
            value={planNameDraft ?? ''}
            onChange={(event) => setPlanNameDraft(event.target.value)}
          />
          <Button
            className="min-h-12 rounded-xl"
            onClick={() => {
              updateState((current) => ({
                ...current,
                planName: planNameDraft?.trim() ?? '',
              }));
              setPlanNameDraft(null);
            }}
          >
            Guardar nombre
          </Button>
        </DialogContent>
      </Dialog>

      {periodDraft ? (
        <section className="mb-4 rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">
              {state.periods.some((period) => period.id === periodDraft.id)
                ? 'Editar tramo'
                : 'Nuevo tramo'}
            </h2>
            <Button
              aria-label="Cancelar"
              className="size-10 rounded-xl"
              onClick={() => setPeriodDraft(null)}
              size="icon"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
          <label className="block">
            <span className="control-label">Nombre del tramo</span>
            <input
              aria-label="Nombre del tramo"
              className="mt-1 h-12 w-full rounded-xl border border-border bg-background px-3"
              onChange={(event) =>
                setPeriodDraft((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
              placeholder="Ej. Base general"
              value={periodDraft.name}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 items-center gap-3">
            <fieldset>
              <legend className="control-label">Duración (semanas)</legend>
              <Stepper
                label="Duración en semanas"
                value={periodDraft.durationWeeks}
                min={1}
                onChange={(value) =>
                  setPeriodDraft((current) =>
                    current
                      ? { ...current, durationWeeks: Math.min(52, value) }
                      : current,
                  )
                }
              />
            </fieldset>
            <div className="mt-5 flex min-h-12 items-center gap-2 text-sm font-medium">
              <Checkbox
                id="period-deload"
                checked={Boolean(periodDraft.deload)}
                onCheckedChange={(checked) =>
                  setPeriodDraft((current) =>
                    current
                      ? { ...current, deload: Boolean(checked) }
                      : current,
                  )
                }
              />
              <label htmlFor="period-deload">Descarga</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {state.periods.some((period) => period.id === periodDraft.id) ? (
              <Button
                className="h-12 flex-1 rounded-xl text-red-700 hover:bg-red-500/10 dark:text-red-300"
                onClick={() => setConfirmDeletePeriod(true)}
                variant="outline"
              >
                <Trash2 /> Eliminar
              </Button>
            ) : null}
            <Button
              className="h-12 flex-1 rounded-xl font-bold"
              disabled={
                !periodDraft.name.trim() || periodDraft.durationWeeks < 1
              }
              onClick={savePeriod}
            >
              <Save /> Guardar tramo
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={confirmDeletePeriod} onOpenChange={setConfirmDeletePeriod}>
        <DialogContent>
          <DialogTitle>¿Eliminar este tramo?</DialogTitle>
          <DialogDescription>
            Se quitarán sus semanas de la estructura del plan. El historial de
            entrenamientos y las sesiones guardadas no se borrarán.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              onClick={() => setConfirmDeletePeriod(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={deletePeriod}
            >
              Eliminar tramo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {state.periods.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-primary">
            <CalendarDays />
          </span>
          <h2 className="mt-3 font-bold">Tu plan empieza con un tramo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ponle un nombre, define su duración y asígnale tus sesiones.
          </p>
          <Button
            className="mt-4 h-12 rounded-xl font-bold"
            onClick={() => openPeriodEditor()}
          >
            <Plus /> Crear primer tramo
          </Button>
        </section>
      ) : null}

      {weekPlan && activePeriod ? (
        <>
          {view === 'week' ? (
            <>
              <section className="plan-week-card surface p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <span className="week-number">{weekPlan.week}</span>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow">
                      Semana {weekPlan.periodWeek} de{' '}
                      {activePeriod.durationWeeks}
                    </p>
                    <h2 className="text-2xl font-bold tracking-tight">
                      {activePeriod.name}
                    </h2>
                  </div>
                  {activePeriod.deload ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Descarga
                    </span>
                  ) : null}
                </div>
                <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                  {state.plan
                    .filter((week) => week.periodId === activePeriod.id)
                    .map((week) => (
                      <button
                        key={week.week}
                        aria-label={`Ver semana ${week.week}${week.week === state.week ? ', activa' : ''}`}
                        aria-pressed={week.week === weekPlan.week}
                        className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-bold ${week.week === weekPlan.week ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}
                        onClick={() => setViewWeek(week.week)}
                        type="button"
                      >
                        {week.periodWeek}
                      </button>
                    ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {activePeriod.cardio}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Caminatas: {activePeriod.walks} · Movilidad:{' '}
                  {activePeriod.mobility}
                </p>
              </section>

              <section className="journal-section mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Tus sesiones</h2>
                  <Button
                    variant="ghost"
                    className="min-h-11 rounded-xl text-primary"
                    onClick={() => setView('routines')}
                  >
                    Organizar
                  </Button>
                </div>
                {weekPlan.routines.length ? (
                  <div className="space-y-2">
                    {weekPlan.routines.map((id) => {
                      const session = state.sessions.find(
                        (item) => item.id === id,
                      );
                      if (!session) return null;
                      const completed = completedPlanSlots(
                        state.workoutLogs,
                      ).has(`${weekPlan.week}:${id}`);
                      const inProgress = activeWorkout(
                        state,
                        weekPlan.week,
                        id,
                      );
                      return (
                        <div key={id} className="routine-card">
                          <span
                            className={`routine-symbol ${completed ? 'is-done' : ''}`}
                          >
                            {completed ? (
                              <Check className="size-5" />
                            ) : (
                              <Dumbbell className="size-5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block text-lg font-bold">
                              {session.name}
                            </strong>
                            <small className="text-muted-foreground">
                              {inProgress
                                ? 'En curso'
                                : completed
                                  ? 'Realizada'
                                  : `${session.exercises.length} ejercicios`}
                            </small>
                          </span>
                          <Button
                            className="min-h-11 shrink-0 rounded-xl px-4"
                            onClick={() => onStartSession(weekPlan.week, id)}
                            variant={completed ? 'outline' : 'default'}
                          >
                            {inProgress
                              ? 'Continuar'
                              : completed
                                ? 'Repetir'
                                : 'Empezar'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No hay sesiones asignadas a esta semana.
                  </p>
                )}
              </section>
            </>
          ) : null}
        </>
      ) : null}
      {view === 'routines' ? (
        <section className="journal-section">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Tus rutinas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePeriod
                  ? `Marca las que se repiten en ${activePeriod.name}.`
                  : 'Crea tus sesiones y después asígnalas a un tramo.'}
              </p>
            </div>
            <Button
              aria-label="Crear sesión"
              className="size-11 shrink-0 rounded-full"
              onClick={() => {
                setEditing(null);
                setBuilding(true);
              }}
              size="icon"
            >
              <Plus />
            </Button>
          </div>
          {state.sessions.length ? (
            <div className="space-y-2">
              {state.sessions.map((session) => {
                const selected = assigned.has(session.id);
                return (
                  <div
                    key={session.id}
                    className="routine-library-row"
                    data-selected={selected}
                  >
                    {activePeriod ? (
                      <Checkbox
                        aria-label={`${selected ? 'Quitar' : 'Añadir'} ${session.name} ${selected ? 'del' : 'al'} tramo ${activePeriod.name}`}
                        checked={selected}
                        onCheckedChange={(checked) =>
                          setAssigned(session, Boolean(checked))
                        }
                      />
                    ) : null}
                    <button
                      aria-label={`Editar ${session.name}`}
                      className="min-h-14 min-w-0 flex-1 text-left"
                      onClick={() => {
                        setEditing(session);
                        setBuilding(true);
                      }}
                      type="button"
                    >
                      <strong className="block text-base font-semibold">
                        {session.name}
                      </strong>
                      <small className="text-muted-foreground">
                        {session.exercises.length} ejercicios
                      </small>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Opciones de la rutina ${session.name}`}
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11 rounded-full"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem
                          className="min-h-11"
                          onClick={() => {
                            setEditing(session);
                            setBuilding(true);
                          }}
                        >
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="min-h-11"
                          variant="destructive"
                          onClick={() => setDeletingSession(session)}
                        >
                          <Trash2 /> Eliminar rutina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <p className="text-sm font-semibold">Aún no tienes sesiones</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una rutina con tus ejercicios.
              </p>
              <Button
                className="mt-3 h-11 rounded-xl"
                onClick={() => setBuilding(true)}
              >
                <Plus /> Crear rutina
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {state.periods.length > 0 && view === 'structure' ? (
        <section className="surface p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Estructura del plan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {state.plan.length} semanas en total
              </p>
            </div>
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => openPeriodEditor()}
            >
              <Plus /> Añadir
            </Button>
          </div>
          <div className="space-y-2">
            {state.periods.map((period) => {
              const weeks = state.plan.filter(
                (week) => week.periodId === period.id,
              );
              const selected = weeks.some(
                (week) => week.week === weekPlan?.week,
              );
              const routineNames = period.routines.map(
                (id) =>
                  state.sessions.find((session) => session.id === id)?.name ??
                  id,
              );
              return (
                <div
                  key={period.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}
                >
                  <button
                    className="min-h-14 min-w-0 flex-1 text-left"
                    onClick={() => {
                      if (weeks[0]) {
                        setViewWeek(weeks[0].week);
                        setView('week');
                      }
                    }}
                    type="button"
                  >
                    <small className="block text-xs text-muted-foreground">
                      Semanas {weeks[0]?.week}–{weeks.at(-1)?.week}
                    </small>
                    <strong className="my-1 block text-base">
                      {period.name}
                    </strong>
                    <small className="text-muted-foreground">
                      {routineNames.length
                        ? routineNames.join(' + ')
                        : 'Sin sesiones asignadas'}
                      {period.deload ? ' · Descarga' : ''}
                    </small>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Más opciones de ${period.name}`}
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 rounded-full"
                        />
                      }
                    >
                      <MoreHorizontal className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem
                        className="min-h-11"
                        onClick={() => openPeriodEditor(period)}
                      >
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        variant="destructive"
                        onClick={() => {
                          setPeriodDraft({
                            ...period,
                            routines: [...period.routines],
                          });
                          setConfirmDeletePeriod(true);
                        }}
                      >
                        <Trash2 /> Borrar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      <Dialog
        open={Boolean(deletingSession)}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
      >
        <DialogContent>
          <DialogTitle>¿Eliminar esta sesión?</DialogTitle>
          <DialogDescription>
            Se quitará de todos los tramos. Los entrenamientos registrados
            permanecerán en el historial.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeletingSession(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deletingSession) removeSession(deletingSession.id);
                setDeletingSession(null);
              }}
            >
              Eliminar sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
