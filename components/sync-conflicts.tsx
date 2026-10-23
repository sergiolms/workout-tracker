'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FieldConflict } from '@/lib/cloud-records';
import type { AppState } from '@/lib/storage';

const names: Record<string, string> = {
  planName: 'Nombre del plan',
  week: 'Semana actual',
  theme: 'Tema',
  sessions: 'Rutina',
  periods: 'Tramo',
  exerciseLogs: 'Ejercicio registrado',
  workoutLogs: 'Entrenamiento',
  cardioLogs: 'Actividad',
  measurements: 'Medida',
  reps: 'Repeticiones',
  done: 'Serie hecha',
  load: 'Carga',
  note: 'Nota',
  restSeconds: 'Descanso',
  rir: 'RIR',
  pain: 'Molestias',
  minutes: 'Minutos',
  distance: 'Distancia',
  steps: 'Pasos',
  date: 'Fecha',
  name: 'Nombre',
  kind: 'Tipo de serie',
  order: 'Orden',
  notes: 'Notas',
  sets: 'Series',
  exercises: 'Ejercicios',
  exercise: 'Ejercicio',
  routineName: 'Rutina',
  type: 'Actividad',
  skipped: 'No realizado',
  target: 'Objetivo',
  durationWeeks: 'Semanas',
};
const label = (path: string, state?: AppState) => {
  const [record, ...fields] = path
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  const colon = record.indexOf(':');
  const kind = record.slice(0, colon);
  const id = record.slice(colon + 1);
  if (kind === 'setting') return names[id] ?? 'Preferencia';
  const collection = state?.[kind as keyof AppState];
  const entry = Array.isArray(collection)
    ? collection.find(
        (item) =>
          item && typeof item === 'object' && 'id' in item && item.id === id,
      )
    : undefined;
  const title =
    entry && typeof entry === 'object'
      ? 'exercise' in entry
        ? entry.exercise
        : 'name' in entry
          ? entry.name
          : 'routineName' in entry
            ? entry.routineName
            : 'type' in entry
              ? entry.type
              : names[kind]
      : names[kind];
  const readable: string[] = [];
  fields.forEach((field, index) => {
    if (field === 'sets' && /^\d+$/.test(fields[index + 1] ?? ''))
      readable.push(`Serie ${Number(fields[index + 1]) + 1}`);
    else if (/^\d+$/.test(field)) return;
    else if (field !== 'sets')
      readable.push(
        names[field] ?? (fields[index - 1] === 'exercises' ? field : 'Dato'),
      );
  });
  return [typeof title === 'string' ? title : 'Registro', ...readable].join(
    ' · ',
  );
};
function valueText(value: unknown, field = ''): string {
  if (value === undefined) return 'Eliminado';
  if (value === null) return 'Sin valor';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (field === 'theme') return ({ light: 'Claro', dark: 'Oscuro', system: 'Sistema' } as Record<string, string>)[value] ?? value;
    if (field === 'kind') return value === 'warmup' ? 'Aproximación' : 'Trabajo';
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => `${index + 1}. ${valueText(item)}`).join('\n');
  if (typeof value === 'object') return Object.entries(value).filter(([key]) => names[key]).map(([key, item]) => `${names[key]}: ${valueText(item, key)}`).join('\n') || 'Registro guardado';
  return 'Sin valor';
}

export function SyncConflicts({
  conflicts,
  onResolve,
  state,
}: {
  conflicts: FieldConflict[];
  state?: AppState;
  onResolve: (choices: Record<string, 'local' | 'remote'>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, 'local' | 'remote'>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  return (
    <section className="mb-4 border-l-2 border-primary pl-4">
      <p className="font-semibold">
        Hay {conflicts.length}{' '}
        {conflicts.length === 1 ? 'dato que cambió' : 'datos que cambiaron'} en
        ambos dispositivos.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Tus cambios siguen guardados en este navegador. Revisa las dos versiones
        para continuar.
      </p>
      <Button
        variant="outline"
        className="mt-3 min-h-11"
        onClick={() => setOpen(true)}
      >
        Revisar cambios
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>Elegir qué conservar</DialogTitle>
          <DialogDescription>
            Los cambios en datos distintos se combinan automáticamente. Aquí
            solo aparecen los que necesitan tu decisión.
          </DialogDescription>
          <div className="space-y-5">
            {conflicts.map((conflict) => (
              <fieldset key={conflict.path}>
                <legend className="mb-2 break-words text-sm font-semibold">
                  {label(conflict.path, state)}
                </legend>
                <div className="grid gap-2">
                  {(['local', 'remote'] as const).map((source) => (
                    <label
                      key={source}
                      aria-label={
                        source === 'local'
                          ? 'Conservar este dispositivo'
                          : 'Conservar Firebase'
                      }
                      className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-checked:border-primary"
                    >
                      <input
                        type="radio"
                        name={conflict.path}
                        checked={choices[conflict.path] === source}
                        onChange={() =>
                          setChoices((current) => ({
                            ...current,
                            [conflict.path]: source,
                          }))
                        }
                        className="mt-1 accent-primary"
                      />
                      <span className="min-w-0">
                        <strong className="text-sm">
                          {source === 'local'
                            ? 'Este dispositivo'
                            : 'Firebase · otro dispositivo'}
                        </strong>
                        <span className="mt-1 block max-h-36 overflow-y-auto break-words whitespace-pre-wrap text-xs text-muted-foreground">
                          {valueText(conflict[source], conflict.path.split(/[:/]/).at(-1))}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <Button
            className="min-h-12"
            disabled={
              busy || conflicts.some((conflict) => !choices[conflict.path])
            }
            onClick={async () => {
              setBusy(true);
              try {
                await onResolve(choices);
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Guardando…' : 'Guardar selección'}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
