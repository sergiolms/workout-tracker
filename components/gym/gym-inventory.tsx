'use client';
import { Button } from '@/components/ui/button';
import { ownedItems } from '@/lib/gym/engine';
import type { GymState } from '@/lib/gym/types';
import { GymItemPreview } from './isometric-scene';
export function GymInventory({
  gym,
  editable,
  canSave,
  busy,
  onSelect,
  onDisplay,
  onReturn,
}: {
  gym: GymState;
  editable: boolean;
  canSave: boolean;
  busy: boolean;
  onSelect: (id: string) => void;
  onDisplay: (id: string) => void;
  onReturn: (id: string) => void;
}) {
  const stored = ownedItems(gym).filter(
    (entry) =>
      ['equipment', 'decoration'].includes(entry.item.kind) &&
      !gym.placements[entry.id] &&
      !gym.displays?.[entry.id],
  );
  return (
    <>
      <p className="my-4 text-sm text-muted-foreground">
        {stored.length
          ? 'Elige un objeto para colocarlo en tu sala.'
          : 'No hay objetos guardados.'}
      </p>
      <div className="gym-inventory">
        {stored.map((entry) => (
          <div key={entry.id} className="gym-inventory-item">
            <div className="w-20 shrink-0">
              <GymItemPreview item={entry.item} />
            </div>
            <div className="min-w-0 flex-1">
              <strong>{entry.item.name}</strong>
              {entry.id.startsWith('award-') ? (
                <small className="block text-muted-foreground">
                  Premio de logro
                </small>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  className="min-h-11"
                  variant="outline"
                  disabled={!editable || busy}
                  onClick={() => onSelect(entry.id)}
                >
                  Colocar
                </Button>
                {entry.id.startsWith('award-') ? (
                  <Button
                    className="min-h-11"
                    variant="ghost"
                    disabled={!canSave}
                    onClick={() => onDisplay(entry.id)}
                  >
                    Exponer
                  </Button>
                ) : null}
                {entry.paid > 0 ? (
                  <Button
                    className="min-h-11"
                    variant="ghost"
                    disabled={!canSave}
                    onClick={() => onReturn(entry.id)}
                  >
                    Vender · {entry.paid}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
