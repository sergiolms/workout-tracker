'use client';
import type { PlanEditor } from '@/hooks/use-plan-editor';
import { Check, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completedPlanSlots } from '@/lib/plan-progress';
import { activeWorkout } from '@/lib/workout-instance';
export function PlanWeek({ editor }: { editor: PlanEditor }) {
  const {
    state,
    onStartSession,
    weekPlan,
    activePeriod,
    view,
    setView,
    setViewWeek,
  } = editor;
  return (
    <>
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
                      const completed = completedPlanSlots(state).has(
                        `${weekPlan.week}:${id}`,
                      );
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
    </>
  );
}
