'use client';

import { ChevronRight, Footprints, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MobilitySession } from '@/lib/mobility-history';

export function MobilityHistoryEntry({
  session,
  onEdit,
}: {
  session: MobilitySession;
  onEdit?: () => void;
}) {
  return (
    <details className="history-entry rounded-xl border border-border bg-background">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 p-3">
        <Footprints
          className="size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <strong className="block text-sm">
            Movilidad · rutina {session.mode}
          </strong>
          <small className="text-muted-foreground">
            {new Date(`${session.date}T12:00:00`).toLocaleDateString('es-ES', {
              dateStyle: 'medium',
            })}
          </small>
        </span>
        <span className="text-sm tabular-nums">
          {session.exercises.length} ejercicios
        </span>
        <ChevronRight
          className="history-chevron size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-3 border-t border-border p-3">
        <ul className="space-y-2 text-sm">
          {session.exercises.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        {onEdit ? (
          <Button variant="outline" className="min-h-11" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
        ) : null}
      </div>
    </details>
  );
}
