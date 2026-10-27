'use client';
import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ownedItems } from '@/lib/gym/engine';
import type { GymState, GymCommand } from '@/lib/gym/types';
import { IsometricScene, GymItemPreview } from './isometric-scene';

export function RoomStyles({
  gym,
  room,
  canSave,
  onClose,
  onSave,
  onShop,
}: {
  gym: GymState;
  room: 'main' | 'annex';
  canSave: boolean;
  onClose: () => void;
  onSave: (command: GymCommand) => Promise<boolean>;
  onShop: () => void;
}) {
  const [floor, setFloor] = useState(gym.finishes[room]?.floor ?? null);
  const [wall, setWall] = useState(gym.finishes[room]?.wall ?? null);
  const [error, setError] = useState('');
  const preview = {
    ...gym,
    finishes: {
      ...gym.finishes,
      [room]: { floor: floor ?? undefined, wall: wall ?? undefined },
    },
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Materiales de la sala</DialogTitle>
        <DialogDescription>
          Combina suelo y paredes. La vista previa no cambia tu sala hasta que
          guardes.
        </DialogDescription>
        <div className="gym-shell">
          <div className="mx-auto max-w-xs">
            <IsometricScene gym={preview} room={room} />
          </div>
          {(['floor', 'wall'] as const).map((surface) => (
            <fieldset key={surface} className="mb-5">
              <legend className="mb-2 font-semibold">
                {surface === 'floor' ? 'Suelo' : 'Paredes'}
              </legend>
              <div className="gym-material-list">
                <button
                  type="button"
                  aria-pressed={(surface === 'floor' ? floor : wall) === null}
                  onClick={() =>
                    surface === 'floor' ? setFloor(null) : setWall(null)
                  }
                  className="gym-material"
                >
                  <span
                    className={`gym-material-default ${surface}`}
                    aria-hidden="true"
                  />
                  <span>Original</span>
                  {(surface === 'floor' ? floor : wall) === null ? (
                    <Check className="size-4" />
                  ) : null}
                </button>
                {ownedItems(gym)
                  .filter((entry) => entry.item.surface === surface)
                  .map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      className="gym-material"
                      aria-pressed={
                        (surface === 'floor' ? floor : wall) === entry.id
                      }
                      onClick={() =>
                        surface === 'floor'
                          ? setFloor(entry.id)
                          : setWall(entry.id)
                      }
                    >
                      <GymItemPreview item={entry.item} />
                      <span>{entry.item.name}</span>
                      {(surface === 'floor' ? floor : wall) === entry.id ? (
                        <Check className="size-4" />
                      ) : null}
                    </button>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="ghost" className="min-h-11" onClick={onShop}>
            Ver acabados <ArrowUpRight />
          </Button>
          <Button
            className="min-h-11"
            disabled={!canSave}
            onClick={async () => {
              setError('');
              if (
                await onSave({ type: 'style', room, finishes: { floor, wall } })
              )
                onClose();
              else
                setError(
                  'No se han guardado los materiales. Inténtalo de nuevo.',
                );
            }}
          >
            Guardar materiales
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
