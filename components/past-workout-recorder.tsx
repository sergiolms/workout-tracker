'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { WorkoutHistoryEditor } from '@/components/workout-history-editor';
import { localDateKey } from '@/lib/local-date';
import type { AppState, WorkoutLog } from '@/lib/storage';

export function PastWorkoutRecorder({
  state,
  editable,
  updateState,
}: {
  state: AppState;
  editable: boolean;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [routine, setRoutine] = useState('');
  const [date, setDate] = useState(localDateKey);
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  const session =
    state.sessions.find((item) => item.id === routine) ?? state.sessions[0];
  return (
    <>
      <Button
        variant="outline"
        className="mb-4 min-h-11"
        disabled={!editable || !state.sessions.length}
        onClick={() => setOpen(true)}
      >
        Registrar entrenamiento pasado
      </Button>
      {!state.sessions.length ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Crea una rutina en Plan para registrar sus series en una fecha
          anterior.
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Entrenamiento pasado</DialogTitle>
          <DialogDescription>
            Elige una rutina como punto de partida y revisa lo que hiciste. Solo
            se añadirá al historial al guardar.
          </DialogDescription>
          <label className="text-sm">
            Rutina
            <select
              className="mt-1 h-12 w-full rounded border border-border bg-background px-3"
              value={session?.id ?? ''}
              onChange={(event) => setRoutine(event.target.value)}
            >
              {state.sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Fecha
            <input
              type="date"
              className="mt-1 h-12 w-full rounded border border-border bg-background px-3"
              value={date}
              max={localDateKey()}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <Button
            disabled={
              !editable ||
              !date ||
              date > localDateKey() ||
              !session?.exercises.length ||
              !Number.isFinite(Date.parse(`${date}T12:00:00`))
            }
            onClick={() => {
              if (!session) return;
              setDraft({
                source: 'manual',
                id: crypto.randomUUID(),
                date: new Date(`${date}T12:00:00`).toISOString(),
                week: state.week,
                routine: session.id,
                routineName: session.name,
                exercises: session.exercises.map((exercise) => ({
                  name: exercise.name,
                  status: 'pending',
                })),
                notes: '',
              });
              setOpen(false);
            }}
          >
            Revisar series realizadas
          </Button>
        </DialogContent>
      </Dialog>
      {draft ? (
        <WorkoutHistoryEditor
          key={draft.id}
          editable={editable}
          state={{ ...state, workoutLogs: [...state.workoutLogs, draft] }}
          workout={draft}
          onClose={() => setDraft(null)}
          onSave={(updater) =>
            updateState((current) =>
              updater({
                ...current,
                workoutLogs: current.workoutLogs.some(
                  (item) => item.id === draft.id,
                )
                  ? current.workoutLogs
                  : [...current.workoutLogs, draft],
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
