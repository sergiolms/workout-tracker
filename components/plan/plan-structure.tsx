'use client';
import type { PlanEditor } from '@/hooks/use-plan-editor';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
export function PlanStructure({ editor }: { editor: PlanEditor }) {
  const {
    state,
    weekPlan,
    openPeriodEditor,
    view,
    setView,
    setPeriodDraft,
    setConfirmDeletePeriod,
    setViewWeek,
  } = editor;
  return (
    <>
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
    </>
  );
}
