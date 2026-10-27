'use client';

import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { backupPreview, importBackup, parseBackup } from '@/lib/backup-import';
import type { AppState } from '@/lib/storage';
import { useHistorySource } from '@/components/history-source';

const labels = {
  workoutLogs: 'Entrenamientos',
  exerciseLogs: 'Ejercicios registrados',
  cardioLogs: 'Actividades',
  measurements: 'Medidas',
  trash: 'Registros eliminados',
  mobilityDone: 'Movilidad',
  warmupDone: 'Calentamientos',
  classes: 'Clases',
};
export function BackupImporter({
  state,
  editable,
  onImport,
  format = 'base',
}: {
  state: AppState;
  editable: boolean;
  onImport: (update: (state: AppState) => AppState) => void;
  format?: 'base' | 'hevy';
}) {
  const input = useRef<HTMLInputElement>(null);
  const history = useHistorySource();
  const [incoming, setIncoming] = useState<AppState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  return (
    <div className="mt-3">
      <input
        ref={input}
        aria-label={
          format === 'hevy'
            ? 'Archivo CSV de Hevy'
            : 'Archivo de copia de Zero to Hero'
        }
        type="file"
        accept={format === 'hevy' ? '.csv,text/csv' : 'application/json,.json'}
        className="sr-only"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setError('');
          setImported(false);
          setWarnings([]);
          setLoading(true);
          try {
            await history?.loadAll();
            if (file.size > 20_000_000) throw Error('El archivo supera 20 MB.');
            const text = await file.text();
            if (format === 'hevy') {
              const { parseHevyCsv } = await import('@/lib/hevy-import');
              const result = await parseHevyCsv(text);
              setIncoming(result.state);
              setWarnings(result.warnings);
            } else setIncoming(parseBackup(text));
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'No se ha podido leer la copia.',
            );
          } finally {
            setLoading(false);
          }
        }}
      />
      <Button
        variant="outline"
        className="min-h-12"
        disabled={!editable || loading}
        onClick={() => input.current?.click()}
      >
        <Upload />{' '}
        {loading
          ? 'Leyendo archivo…'
          : format === 'hevy'
            ? 'Importar CSV de Hevy'
            : 'Importar copia de Zero to Hero'}
      </Button>
      {format === 'hevy' ? (
        <p className="mt-2 text-xs text-muted-foreground">
          En Hevy: Perfil → Ajustes → Exportar e importar datos. Elige
          entrenamientos o medidas. Las fechas sin zona horaria se interpretan
          en la zona de este dispositivo. Tu plan se conserva.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {imported ? (
        <output className="mt-2 block text-sm">
          Importación añadida. El indicador de guardado confirma cuándo termina.
        </output>
      ) : null}
      {incoming ? (
        <BackupImportDialog
          state={state}
          incoming={incoming}
          editable={editable}
          warnings={warnings}
          onClose={() => setIncoming(null)}
          onImport={(update) => {
            onImport(update);
            setImported(true);
          }}
        />
      ) : null}
    </div>
  );
}

export function BackupImportDialog({
  state,
  incoming,
  editable,
  onClose,
  onImport,
  warnings = [],
}: {
  state: AppState;
  incoming: AppState;
  editable: boolean;
  onClose: () => void;
  onImport: (update: (state: AppState) => AppState) => void;
  warnings?: string[];
}) {
  const id = useId();
  const [includePlan, setIncludePlan] = useState(false);
  const [includeGym, setIncludeGym] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const history = useHistorySource();
  const [replaceConflicts, setReplaceConflicts] = useState(false);
  const preview = backupPreview(state, incoming);
  const hasChanges =
    includePlan ||
    includeGym ||
    preview.some(
      (row) => row.additions > 0 || (replaceConflicts && row.conflicts > 0),
    );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogTitle>Revisar la importación</DialogTitle>
        <DialogDescription>
          Se añadirán los registros nuevos. Si uno ya existe, lo conservamos
          salvo que elijas sustituirlo. Las sesiones en curso no se importan.
        </DialogDescription>
        {warnings.length ? (
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
        <dl className="divide-y divide-border">
          {preview.map((row) => (
            <div
              key={row.key}
              className="flex justify-between gap-3 py-3 text-sm"
            >
              <dt>{labels[row.key]}</dt>
              <dd className="text-right">
                {row.additions} {row.additions === 1 ? 'nuevo' : 'nuevos'}
                <span className="block text-xs text-muted-foreground">
                  {row.duplicates} iguales · {row.conflicts} distintos
                </span>
              </dd>
            </div>
          ))}
        </dl>
        {incoming.sessions.length || incoming.periods.length ? (
          <label
            htmlFor={`${id}-plan`}
            className="flex min-h-12 cursor-pointer items-start gap-3 py-2"
          >
            <Checkbox
              id={`${id}-plan`}
              checked={includePlan}
              onCheckedChange={(checked) => setIncludePlan(Boolean(checked))}
            />
            <span className="text-sm">
              Sustituir también las rutinas y la estructura del plan
              <span className="mt-1 block text-xs text-muted-foreground">
                {incoming.sessions.length} rutinas · {incoming.plan.length}{' '}
                semanas. El historial actual se conserva.
              </span>
            </span>
          </label>
        ) : null}
        {preview.some((row) => row.conflicts) ? (
          <label
            htmlFor={`${id}-replace`}
            className="flex min-h-12 cursor-pointer items-start gap-3 py-2"
          >
            <Checkbox
              id={`${id}-replace`}
              checked={replaceConflicts}
              onCheckedChange={(checked) =>
                setReplaceConflicts(Boolean(checked))
              }
            />
            <span className="text-sm">
              Sustituir también los registros existentes que sean distintos
            </span>
          </label>
        ) : null}
        {incoming.gym ? (
          <label
            htmlFor={`${id}-gym`}
            className="flex min-h-12 cursor-pointer items-start gap-3 py-2"
          >
            <Checkbox
              id={`${id}-gym`}
              checked={includeGym}
              disabled={!history?.gymCommand || importing}
              onCheckedChange={(checked) => setIncludeGym(Boolean(checked))}
            />
            <span className="text-sm">
              {state.gym
                ? 'Sustituir el gimnasio por el de esta copia'
                : 'Importar también el gimnasio'}
              <span className="mt-1 block text-xs text-muted-foreground">
                Los saldos no se suman. Si ya tienes un gimnasio, se conserva
                una copia que podrás restaurar.
              </span>
            </span>
          </label>
        ) : null}
        {importError ? (
          <p role="alert" className="text-sm text-destructive">
            {importError}
          </p>
        ) : null}
        {!hasChanges ? (
          <p className="text-sm text-muted-foreground">
            No hay registros nuevos para importar con esta selección.
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            className="min-h-12"
            variant="outline"
            onClick={onClose}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button
            className="min-h-12"
            disabled={!editable || !hasChanges || importing}
            onClick={async () => {
              setImporting(true);
              setImportError('');
              try {
                onImport((current) =>
                  importBackup(current, incoming, {
                    includePlan,
                    replaceConflicts,
                  }),
                );
                if (includeGym && incoming.gym) {
                  if (!history?.gymCommand)
                    throw Error(
                      'No se puede importar el gimnasio en este diario.',
                    );
                  await history.gymCommand({
                    type: 'import',
                    gym: incoming.gym,
                  });
                }
                onClose();
              } catch (error) {
                setImportError(
                  error instanceof Error
                    ? error.message
                    : 'No se pudo completar la importación.',
                );
              } finally {
                setImporting(false);
              }
            }}
          >
            {importing ? 'Importando…' : 'Importar selección'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
