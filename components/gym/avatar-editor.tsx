'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PreferenceSwitch } from '@/components/preference-switch';
import {
  defaultAvatar,
  avatarOutfits,
  avatarSkins,
  avatarHairstyles,
  type GymAvatar,
} from '@/lib/gym/appearance';
import { ownedItems } from '@/lib/gym/engine';
import type { GymCommand, GymState } from '@/lib/gym/types';
import { AvatarFigure } from './gym-character';
export function AvatarEditor({
  gym,
  canSave,
  onClose,
  onSave,
  onShop,
}: {
  gym: GymState;
  canSave: boolean;
  onClose: () => void;
  onSave: (command: GymCommand) => Promise<boolean>;
  onShop: () => void;
}) {
  const [appearance, setAppearance] = useState<GymAvatar>(
      gym.avatar ?? defaultAvatar,
    ),
    [error, setError] = useState('');
  const owned = ownedItems(gym);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Tu personaje</DialogTitle>
        <DialogDescription>
          Un compañero para tu gimnasio. Su actividad es decorativa.
        </DialogDescription>
        <svg
          viewBox="-30 -74 60 82"
          className="mx-auto h-36 w-36"
          aria-label="Vista previa del personaje"
        >
          <AvatarFigure appearance={appearance} />
        </svg>
        <fieldset>
          <legend className="mb-2 font-semibold">Aspecto</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['man', 'woman'] as const).map((body) => (
              <Button
                key={body}
                variant={appearance.body === body ? 'secondary' : 'outline'}
                className="min-h-11"
                aria-pressed={appearance.body === body}
                onClick={() => setAppearance({ ...appearance, body })}
              >
                {body === 'man' ? 'Hombre' : 'Mujer'}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">Peinado</legend>
          <div className="grid grid-cols-4 gap-2">
            {avatarHairstyles.map((hair) => (
              <button
                type="button"
                className="gym-avatar-choice"
                aria-pressed={appearance.hair === hair.id}
                key={hair.id}
                onClick={() => setAppearance({ ...appearance, hair: hair.id })}
              >
                <svg
                  viewBox="-23 -74 46 40"
                  className="h-12 w-full"
                  aria-hidden="true"
                >
                  <AvatarFigure appearance={{ ...appearance, hair: hair.id }} />
                </svg>
                <span>{hair.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">Piel</legend>
          <div className="flex gap-2">
            {avatarSkins.map((skin, index) => (
              <button
                type="button"
                key={skin}
                aria-label={`Tono de piel ${index + 1}`}
                aria-pressed={appearance.skin === skin}
                onClick={() => setAppearance({ ...appearance, skin })}
                className="size-11 rounded-full border-2 border-border aria-pressed:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                style={{ backgroundColor: skin }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-semibold">Ropa</legend>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(avatarOutfits)
              .filter(
                ([id]) =>
                  id === 'outfit-base' ||
                  owned.some((entry) => entry.item.id === id),
              )
              .map(([id, outfit]) => (
                <button
                  key={id}
                  type="button"
                  className="gym-avatar-choice"
                  aria-pressed={appearance.outfit === id}
                  onClick={() => setAppearance({ ...appearance, outfit: id })}
                >
                  <svg
                    viewBox="-28 -74 56 82"
                    className="h-20 w-full"
                    aria-hidden="true"
                  >
                    <AvatarFigure appearance={{ ...appearance, outfit: id }} />
                  </svg>
                  {outfit.name}
                </button>
              ))}
          </div>
          <Button className="mt-2 min-h-11" variant="ghost" onClick={onShop}>
            Ver ropa en la tienda
          </Button>
        </fieldset>
        <PreferenceSwitch
          checked={appearance.wandering}
          onCheckedChange={(wandering) =>
            setAppearance({ ...appearance, wandering })
          }
          label="Movimiento del personaje"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          className="min-h-11"
          disabled={!canSave}
          onClick={async () => {
            if (await onSave({ type: 'avatar', appearance })) onClose();
            else
              setError('No se ha guardado el personaje. Inténtalo de nuevo.');
          }}
        >
          Guardar personaje
        </Button>
      </DialogContent>
    </Dialog>
  );
}
