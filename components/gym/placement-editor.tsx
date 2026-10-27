'use client';
import { RotateCw, Package, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GymItem } from '@/lib/gym/catalog';
import type { GymPlacement } from '@/lib/gym/types';
import { placementRotation } from '@/lib/gym/orientation';

export function PlacementEditor({
  item,
  position,
  error,
  canSave,
  onRotate,
  onMove,
  salePrice,
  onStore,
  onSell,
}: {
  item: GymItem;
  position: GymPlacement | null | undefined;
  error: string;
  canSave: boolean;
  onRotate: () => void;
  onMove: (position: GymPlacement) => void;
  salePrice: number;
  onStore: () => void;
  onSell: () => void;
}) {
  return (
    <div className="gym-placement">
      <div className="flex items-center justify-between gap-2">
        <div>
          <strong>{item.name}</strong>
          <p className="text-xs text-muted-foreground">
            {position?.wall
              ? 'Usa los controles para colocar en la pared'
              : 'Arrastra para mover'}
          </p>
        </div>
      </div>
      {position?.wall && (
        <div className="flex flex-wrap gap-2 my-3">
          {(['left', 'right'] as const).map((wall) => (
            <Button
              key={wall}
              disabled={!canSave}
              variant="outline"
              onClick={() => onMove({ ...position, wall })}
            >
              {wall === 'left' ? 'Pared izquierda' : 'Pared derecha'}
            </Button>
          ))}
          <Button
            disabled={!canSave}
            onClick={() => onMove({ ...position, x: position.x - 1 })}
          >
            ←
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => onMove({ ...position, x: position.x + 1 })}
          >
            →
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => onMove({ ...position, y: position.y === 0 ? 1 : 0 })}
          >
            Cambiar altura
          </Button>
        </div>
      )}
      <div className="gym-placement-actions">
        <Button
          variant="outline"
          disabled={!canSave || !position}
          className="min-h-11"
          onClick={onRotate}
        >
          <RotateCw /> Girar 90°
        </Button>
        {position ? (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {placementRotation(position)}°
          </span>
        ) : null}
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={!canSave}
          onClick={onStore}
        >
          <Package /> Guardar
        </Button>
        <Button
          variant="ghost"
          className="min-h-11"
          disabled={!canSave || salePrice <= 0}
          title={
            salePrice <= 0
              ? 'El equipo inicial y los premios no se pueden vender'
              : undefined
          }
          onClick={onSell}
        >
          <Coins /> Vender · {salePrice}
        </Button>
      </div>
      {!position ? (
        <p className="text-sm text-muted-foreground">
          No hay espacio libre para este objeto en esta sala.
        </p>
      ) : null}
      {error ? (
        <output className="block text-sm text-destructive">{error}</output>
      ) : null}
    </div>
  );
}
