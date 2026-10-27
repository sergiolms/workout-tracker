'use client';
import { Coins } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { gymCatalog, type GymItem } from '@/lib/gym/catalog';
import { GymItemPreview } from './isometric-scene';
import { GymChoiceMenu } from './gym-menus';

export function GymShop({
  category,
  onCategory,
  offer,
  onOffer,
  onClose,
  onBuy,
  busy,
  canSave,
  error,
}: {
  category: string;
  onCategory: (value: string) => void;
  offer: GymItem | null;
  onOffer: (item: GymItem) => void;
  onClose: () => void;
  onBuy: () => void;
  busy: boolean;
  canSave: boolean;
  error: string;
}) {
  return (
    <>
      <div className="gym-panel-toolbar">
        <span className="text-sm text-muted-foreground">Catálogo</span>
        <GymChoiceMenu
          label="Categoría"
          value={category}
          choices={[
            { id: 'equipment', name: 'Equipo' },
            { id: 'decoration', name: 'Detalles' },
            { id: 'finish', name: 'Acabados' },
            { id: 'expansion', name: 'Espacio' },
            { id: 'apparel', name: 'Ropa' },
          ]}
          onChange={(next) => {
            onCategory(next);
            onClose();
          }}
        />
      </div>
      <Dialog
        open={Boolean(offer)}
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent>
          <DialogTitle>{offer?.name}</DialogTitle>
          <DialogDescription>
            {offer?.kind === 'expansion'
              ? 'Amplía tu espacio de forma permanente.'
              : offer?.kind === 'apparel'
                ? 'Se añadirá a tu armario para vestir al personaje.'
                : offer?.surface
                  ? 'Se guardará entre tus materiales para aplicarlo a la sala.'
                  : 'Se guardará en tu inventario para colocarlo donde elijas.'}
          </DialogDescription>
          <Button
            className="mt-2 min-h-12 w-full"
            disabled={!canSave || Boolean(error)}
            onClick={onBuy}
          >
            {busy
              ? 'Confirmando…'
              : error || `Comprar · ${offer?.price} créditos`}
          </Button>
        </DialogContent>
      </Dialog>
      <div className="gym-shop-grid">
        {gymCatalog
          .filter((item) => item.kind === category)
          .map((item) => (
            <button
              key={item.id}
              className="gym-product"
              type="button"
              aria-pressed={offer?.id === item.id}
              onClick={() => onOffer(item)}
            >
              <GymItemPreview item={item} />
              <strong>{item.name}</strong>
              <span>
                <Coins className="size-4" aria-hidden="true" />
                {item.price}
              </span>
            </button>
          ))}
      </div>
    </>
  );
}
