'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { prepareExercisePhoto } from '@/lib/exercise-photo';
import { withExercisePrescription } from '@/lib/exercise-prescription';
import type { Exercise } from '@/lib/workout-data';

export function CustomExerciseDialog({
  existing,
  names,
  onSave,
  onClose,
}: {
  existing?: Exercise;
  names: string[];
  onSave: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [image, setImage] = useState(existing?.image);
  const [mode, setMode] = useState<'reps' | 'time'>(existing?.mode ?? 'reps');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="min-w-0 max-h-[90dvh] overflow-x-hidden overflow-y-auto">
        <DialogTitle>
          {existing ? 'Editar ejercicio propio' : 'Crear ejercicio propio'}
        </DialogTitle>
        <DialogDescription>
          Después podrás ajustar sus series, carga y descanso en la rutina.
        </DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim();
            if (
              !trimmed ||
              names.some(
                (value) =>
                  value !== existing?.name &&
                  value.trim().toLocaleLowerCase('es') ===
                    trimmed.toLocaleLowerCase('es'),
              )
            ) {
              setError(
                'Escribe un nombre distinto de los que ya tiene esta rutina.',
              );
              return;
            }
            const exercise: Exercise = {
              name: trimmed,
              id: existing?.id ?? `custom:${crypto.randomUUID()}`,
              target: '3×8–12',
              sets: 3,
              minReps: 8,
              maxReps: 12,
              increment: 0.5,
              unit: mode === 'time' ? 'reps' : 'kg',
              ...existing,
              mode,
              description,
              ...(image ? { image } : {}),
            };
            exercise.name = trimmed;
            if (!image) delete exercise.image;
            onSave(withExercisePrescription(exercise, {}));
          }}
        >
          <label className="block text-sm font-medium">
            Nombre
            <input
              required
              maxLength={120}
              className="mt-1 h-12 w-full rounded border border-border bg-background px-3 text-base"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Modalidad
            <select
              className="mt-1 h-11 w-full rounded border border-border bg-background px-3"
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
            >
              <option value="reps">Repeticiones</option>
              <option value="time">Tiempo</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Notas de técnica · opcional
            <textarea
              className="mt-1 min-h-24 w-full rounded border border-border bg-background p-3 text-base"
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Foto · opcional
            <input
              className="mt-2 block w-full min-w-0 max-w-full text-sm"
              disabled={busy}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError('');
                try {
                  setImage(await prepareExercisePhoto(file));
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'No se pudo preparar la foto.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            La foto se reduce y se vuelve a generar sin los metadatos del
            archivo original.
          </p>
          {image ? (
            <div className="flex items-center gap-3">
              <img
                alt="Foto del ejercicio"
                className="size-20 rounded object-cover"
                src={image}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setImage(undefined)}
              >
                Quitar foto
              </Button>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="min-h-12 w-full" disabled={busy}>
            {busy
              ? 'Preparando foto…'
              : existing
                ? 'Guardar ejercicio'
                : 'Añadir a la rutina'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
