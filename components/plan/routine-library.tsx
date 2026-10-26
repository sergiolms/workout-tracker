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
import { Checkbox } from '@/components/ui/checkbox';
export function PlanRoutineLibrary({ editor }: { editor: PlanEditor }) {
  const {
    state,
    activePeriod,
    assigned,
    setAssigned,
    view,
    setEditing,
    setBuilding,
    setDeletingSession,
  } = editor;
  return (
    <>
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
    </>
  );
}
