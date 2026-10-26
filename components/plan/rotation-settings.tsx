'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { rotationRoutines, nextRotationRoutine } from '@/lib/rotation';
import { moveItem } from '@/lib/list-order';
import type { AppState } from '@/lib/storage';

export function RotationSettings({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const next = nextRotationRoutine(state);
  return (
    <section className="mb-5 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">
            {state.rotation ? 'Rotación de sesiones' : 'Plan por semanas'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.rotation
              ? `Siguiente: ${state.sessions.find((session) => session.id === next)?.name ?? 'elige rutinas'}`
              : 'También puedes seguir una secuencia sin días fijos.'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIds(
              state.rotation
                ? rotationRoutines(state)
                : state.sessions.map((session) => session.id),
            );
            setOpen(true);
          }}
        >
          Organizar secuencia
        </Button>
      </div>
      {state.rotation ? (
        <Button
          className="mt-2 min-h-11 px-0"
          variant="ghost"
          onClick={() =>
            updateState((current) => {
              const { rotation: _rotation, ...rest } = current;
              return rest;
            })
          }
        >
          Volver al plan por semanas
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>Entrenar por rotación</DialogTitle>
          <DialogDescription>
            Repite esta secuencia a tu ritmo. Al terminar una sesión con trabajo
            realizado se propondrá la siguiente. Guardar inicia una nueva
            vuelta; no modifica tus tramos ni el historial.
          </DialogDescription>
          <fieldset>
            <legend className="text-sm font-medium">Incluir rutinas</legend>
            {state.sessions.map((session) => (
              <label
                className="flex min-h-11 items-center gap-3 text-sm"
                key={session.id}
              >
                <input
                  type="checkbox"
                  className="size-5"
                  checked={ids.includes(session.id)}
                  onChange={(event) =>
                    setIds((current) =>
                      event.target.checked
                        ? [...current, session.id]
                        : current.filter((id) => id !== session.id),
                    )
                  }
                />
                {session.name}
              </label>
            ))}
          </fieldset>
          <ol>
            {ids.map((id, index) => (
              <li
                key={id}
                className="flex items-center gap-2 border-t border-border py-2"
              >
                <span className="min-w-0 flex-1 text-sm">
                  {index + 1}.{' '}
                  {state.sessions.find((session) => session.id === id)?.name}
                </span>
                <Button
                  variant="ghost"
                  disabled={!index}
                  aria-label={`Subir ${state.sessions.find((session) => session.id === id)?.name}`}
                  onClick={() =>
                    setIds((current) => moveItem(current, index, -1))
                  }
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  disabled={index === ids.length - 1}
                  aria-label={`Bajar ${state.sessions.find((session) => session.id === id)?.name}`}
                  onClick={() =>
                    setIds((current) => moveItem(current, index, 1))
                  }
                >
                  ↓
                </Button>
              </li>
            ))}
          </ol>
          <Button
            disabled={!ids.length}
            onClick={() => {
              updateState((current) => ({
                ...current,
                rotation: {
                  id: crypto.randomUUID(),
                  startedAt: new Date().toISOString(),
                  routines: ids.filter((id) =>
                    current.sessions.some((session) => session.id === id),
                  ),
                },
              }));
              setOpen(false);
            }}
          >
            Usar esta rotación
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
