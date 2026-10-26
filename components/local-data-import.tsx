'use client';

import { BackupImportDialog } from '@/components/backup-importer';
import { HistoryLoading, useHistoryMonths } from '@/components/history-source';
import type { AppState } from '@/lib/storage';

export function LocalDataImport({
  state,
  incoming,
  editable,
  onImport,
  onClose,
}: {
  state: AppState;
  incoming: AppState;
  editable: boolean;
  onImport: (update: (state: AppState) => AppState) => void;
  onClose: () => void;
}) {
  const status = useHistoryMonths(state, 'all', editable);
  if (!editable) return null;
  return (
    <HistoryLoading status={status}>
      <BackupImportDialog
        state={state}
        incoming={incoming}
        editable={editable}
        onImport={onImport}
        onClose={onClose}
        warnings={[
          'Estos son los datos de tu diario local. Puedes incorporarlos o cerrar esta ventana para mantenerlos separados. La copia local se conserva.',
        ]}
      />
    </HistoryLoading>
  );
}
