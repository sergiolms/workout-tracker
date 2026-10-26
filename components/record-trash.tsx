'use client';
import { Button } from '@/components/ui/button';
import { canRestore, restoreDeleted } from '@/lib/record-trash';
import type { AppState } from '@/lib/storage';

export function RecordTrash({ state, updateState, editable }: { state: AppState; updateState: (updater: (state: AppState) => AppState) => void; editable: boolean }) {
  if (!state.trash?.length) return null;
  return <details className="journal-section mt-6"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Registros eliminados ({state.trash.length})</summary><p className="mb-3 text-sm text-muted-foreground">Se conservan en tu cuenta hasta que los restaures.</p><ul>{state.trash.toSorted((a, b) => b.deletedAt.localeCompare(a.deletedAt)).map(bundle => <li key={bundle.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3"><div><strong className="block text-sm">{bundle.label}</strong><span className="text-sm text-muted-foreground">Eliminado el {new Date(bundle.deletedAt).toLocaleDateString('es-ES')}</span>{!canRestore(state, bundle) ? <p className="text-sm">Ya existe un registro con ese identificador. No se sustituirá.</p> : null}</div><Button variant="outline" disabled={!editable || !canRestore(state, bundle)} onClick={() => updateState(current => restoreDeleted(current, bundle.id))}>Restaurar</Button></li>)}</ul></details>;
}
