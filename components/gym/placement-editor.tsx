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
  salePrice,
  onStore,
  onSell,
}: {
  item: GymItem;
  position: GymPlacement | null | undefined;
  error: string;
  canSave: boolean;
  onRotate: () => void;
  salePrice: number;
  onStore: () => void;
  onSell: () => void;
}) {
  return (
    <div className="gym-placement">
      <div className="flex items-center justify-between gap-2">
        <div>
          <strong>{item.name}</strong>
          <p className="text-xs text-muted-foreground">Arrastra para mover</p>
        </div>
      </div>
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
