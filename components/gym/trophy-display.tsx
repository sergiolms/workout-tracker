'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { displayError, ownedItems } from '@/lib/gym/engine';
import type { GymState, GymCommand } from '@/lib/gym/types';
import { GymItemPreview } from './isometric-scene';

export function TrophyDisplay({
  gym,
  trophyId,
  canSave,
  onClose,
  onSave,
}: {
  gym: GymState;
  trophyId: string;
  canSave: boolean;
  onClose: () => void;
  onSave: (command: GymCommand) => Promise<boolean>;
}) {
  const [error, setError] = useState('');
  const owned = ownedItems(gym);
  const trophy = owned.find((entry) => entry.id === trophyId);
  const shelves = owned.filter(
    (entry) => entry.item.id === 'trophy-cabinet' && gym.placements[entry.id],
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Exponer {trophy?.item.name}</DialogTitle>
        <DialogDescription>
          Elige una plaza. El trofeo se moverá con la vitrina.
        </DialogDescription>
        {!shelves.length ? (
          <p className="py-4 text-sm text-muted-foreground">
            Compra una vitrina en Detalles y colócala en tu sala.
          </p>
        ) : (
          shelves.map((shelf, index) => (
            <section key={shelf.id} className="border-t border-border pt-4">
              <h3 className="font-semibold">
                Vitrina {index + 1} ·{' '}
                {gym.placements[shelf.id].room === 'main'
                  ? 'Sala principal'
                  : 'Sala anexa'}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  'Arriba izquierda',
                  'Arriba derecha',
                  'Abajo izquierda',
                  'Abajo derecha',
                ].map((label, slot) => {
                  const occupant = Object.entries(gym.displays ?? {}).find(
                    ([, place]) =>
                      place.shelfId === shelf.id && place.slot === slot,
                  )?.[0];
                  const entry = owned.find((item) => item.id === occupant);
                  return (
                    <Button
                      key={slot}
                      variant="outline"
                      className="h-auto min-h-24 flex-col gap-1 whitespace-normal p-3"
                      disabled={
                        !canSave ||
                        Boolean(displayError(gym, trophyId, shelf.id, slot))
                      }
                      onClick={async () => {
                        if (
                          await onSave({
                            type: 'display',
                            id: trophyId,
                            shelfId: shelf.id,
                            slot,
                          })
                        )
                          onClose();
                        else
                          setError(
                            'No se ha podido guardar el trofeo. Inténtalo de nuevo.',
                          );
                      }}
                    >
                      {entry ? (
                        <>
                          <span>{entry.item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {label}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">
                            Libre
                          </span>
                        </>
                      )}
                    </Button>
                  );
                })}
              </div>
            </section>
          ))
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {trophy ? (
          <div className="gym-shell mx-auto w-24">
            <GymItemPreview item={trophy.item} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
