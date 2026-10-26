'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { HistoryBrowser } from '@/components/training-history';
import { canRestore, restoreDeleted } from '@/lib/record-trash';
import type { AppState, DeletedRecords } from '@/lib/storage';

export function RecordTrash({
  state,
  updateState,
  editable,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  editable: boolean;
}) {
  const [purging, setPurging] = useState<DeletedRecords | null>(null);
  if (!state.trash?.length) return null;
  return (
    <details className="journal-section mt-6">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">
        Registros eliminados ({state.trash.length})
      </summary>
      <p className="mb-3 text-sm text-muted-foreground">
        Puedes restaurarlos o eliminarlos definitivamente de tu cuenta.
      </p>
      <HistoryBrowser
        title="Buscar registros eliminados"
        entries={state.trash.map((bundle) => ({
          ...bundle,
          date: bundle.deletedAt,
        }))}
        searchText={(bundle) => bundle.label}
        renderEntry={(bundle) => (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3">
            <div className="min-w-0 flex-1">
              <strong className="block break-words text-sm">
                {bundle.label}
              </strong>
              <span className="text-sm text-muted-foreground">
                Eliminado el{' '}
                {new Date(bundle.deletedAt).toLocaleDateString('es-ES')}
              </span>
              {!canRestore(state, bundle) ? (
                <p className="text-sm">
                  Ya existe un registro con ese identificador. No se sustituirá.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!editable || !canRestore(state, bundle)}
                onClick={() =>
                  updateState((current) => restoreDeleted(current, bundle.id))
                }
              >
                Restaurar
              </Button>
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={!editable}
                aria-label={`Eliminar definitivamente ${bundle.label}`}
                onClick={() => setPurging(bundle)}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      />
      <Dialog
        open={purging !== null}
        onOpenChange={(open) => {
          if (!open) setPurging(null);
        }}
      >
        <DialogContent>
          <DialogTitle>¿Eliminar definitivamente?</DialogTitle>
          <DialogDescription>
            {purging?.label}. Se eliminará la copia de recuperación y no podrás
            restaurarla desde la app. Las copias de seguridad que hayas
            descargado se conservan.
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPurging(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-destructive text-white"
              disabled={!editable}
              onClick={() => {
                if (purging)
                  updateState((current) => ({
                    ...current,
                    trash: current.trash?.filter(
                      (bundle) => bundle.id !== purging.id,
                    ),
                  }));
                setPurging(null);
              }}
            >
              Eliminar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </details>
  );
}
