'use client';
import './gym.css';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowUpLeft,
  Coins,
  Undo2,
  CircleHelp,
  Paintbrush,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHistorySource } from '@/components/history-source';
import { GymChoiceMenu, GymNavigation, type GymPanel } from './gym-menus';
import { type GymItem } from '@/lib/gym/catalog';
import {
  gymProgress,
  ownedItems,
  firstGymPlacement,
  placementError,
  roomSize,
} from '@/lib/gym/engine';
import type { GymCommand, GymPlacement } from '@/lib/gym/types';
import type { AppState } from '@/lib/storage';
import { IsometricScene } from './isometric-scene';
import { GymShop } from './gym-shop';
import { GymInventory } from './gym-inventory';
import { AvatarEditor } from './avatar-editor';
import { GymEarningRules } from '@/components/gym-earning-rules';
import { TrophyDisplay } from './trophy-display';
import { RoomStyles } from './room-styles';
import { PlacementEditor } from './placement-editor';

const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};
const onlineSnapshot = () => navigator.onLine;
const serverOnline = () => true;

export function GymApp({
  state,
  editable,
  localOnly,
  onBack,
}: {
  state: AppState;
  editable: boolean;
  localOnly: boolean;
  onBack: () => void;
}) {
  const source = useHistorySource();
  const online = useSyncExternalStore(
    subscribeOnline,
    onlineSnapshot,
    serverOnline,
  );
  const [panel, setPanel] = useState<GymPanel>('shop');
  const [shopCategory, setShopCategory] = useState('equipment');
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [displaying, setDisplaying] = useState<string | null>(null);
  const [styles, setStyles] = useState(false);
  const [room, setRoom] = useState<'main' | 'annex'>('main');
  const [selected, setSelected] = useState<string>();
  const selectionPanel = useRef<HTMLDivElement>(null);
  const [placementMessage, setPlacementMessage] = useState('');
  const [position, setPosition] = useState<GymPlacement | null>();
  const [offer, setOffer] = useState<GymItem | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [lastMove, setLastMove] = useState<{
    id: string;
    placement: GymPlacement | null;
  } | null>(null);
  const purchaseRequest = useRef<{ itemId: string; id: string } | null>(null);
  const mutation = useMutation(
    {
      mutationKey: ['account', source?.accountId, 'gym'],
      scope: { id: `gym:${source?.accountId}` },
      retry: false,
      networkMode: 'always',
      mutationFn: (command: GymCommand) => {
        if (!source?.gymCommand)
          throw Error('El gimnasio no está conectado a este diario.');
        if (!localOnly && !online)
          throw Error(
            'Conecta para confirmar la compra o distribución. Puedes seguir viendo tu gimnasio.',
          );
        return source.gymCommand(command);
      },
    },
    source?.client,
  );
  const gym = state.gym;
  const busy = mutation.isPending;
  const canSave =
    editable && !busy && (localOnly || online) && Boolean(source?.gymCommand);
  const run = async (command: GymCommand) => {
    try {
      return await mutation.mutateAsync(command);
    } catch {
      return null;
    }
  };
  const progress = gym ? gymProgress(gym) : null;
  const owned = gym ? ownedItems(gym) : [];
  const selectedEntry = owned.find((entry) => entry.id === selected);
  const selectObject = (id: string) => {
    setPlacementMessage('');
    mutation.reset();
    setOffer(null);
    setSelected(id);
    const placed = gym?.placements[id];
    setPosition(
      placed?.room === room
        ? { ...placed }
        : gym
          ? firstGymPlacement(gym, id, room)
          : null,
    );
  };
  useEffect(() => {
    if (!selected) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        selectionPanel.current?.contains(target) ||
        target.closest('.gym-scene-object, [role="dialog"]')
      )
        return;
      setSelected(undefined);
      setPosition(undefined);
      setPlacementMessage('');
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [selected]);
  const chooseOffer = (item: GymItem) => {
    mutation.reset();
    setSelected(undefined);
    setPosition(undefined);
    setOffer(item);
    purchaseRequest.current = { itemId: item.id, id: crypto.randomUUID() };
  };
  const buy = async () => {
    if (!offer || !purchaseRequest.current) return;
    const request = purchaseRequest.current;
    const result = await run({ type: 'buy', id: request.id, itemId: offer.id });
    if (result) {
      setOffer(null);
      purchaseRequest.current = null;
      if (offer.kind === 'apparel') setAvatarOpen(true);
      else if (offer.surface) setStyles(true);
      else setPanel('inventory');
    }
  };
  const savePosition = async (placement: GymPlacement | null) => {
    if (!gym || !selected) return;
    const previous = gym.placements[selected] ?? null;
    const result = await run({ type: 'place', id: selected, placement });
    if (result) {
      setLastMove({ id: selected, placement: previous });
      setSelected(undefined);
      setPosition(undefined);
    }
  };
  const dropObject = async (id: string, placement: GymPlacement) => {
    if (!gym || !canSave) return;
    const previous = gym.placements[id] ?? null;
    setPlacementMessage('');
    setSelected(id);
    setPosition(placement);
    setOffer(null);
    const result = await run({ type: 'place', id, placement });
    if (result) {
      setLastMove({ id, placement: previous });
      setSelected(undefined);
      setPosition(undefined);
    }
  };
  const rotateObject = async () => {
    if (!gym || !selected || !position || !canSave) return;
    const previous = gym.placements[selected] ?? null;
    const rotated = { ...position, rotated: !position.rotated };
    const error = placementError(gym, selected, rotated);
    setPlacementMessage(error);
    if (error) return;
    setPosition(rotated);
    if (await run({ type: 'place', id: selected, placement: rotated })) {
      setLastMove({ id: selected, placement: previous });
    } else {
      setPosition((current) => (current ? position : current));
    }
  };
  const locationError =
    gym && selected && position ? placementError(gym, selected, position) : '';
  const purchasedOffer =
    offer && gym
      ? Object.values(gym.purchases).some(
          (purchase) => !purchase.returned && purchase.itemId === offer.id,
        )
      : false;
  const prerequisiteMissing =
    offer?.id === 'expansion-2'
      ? !owned.some((entry) => entry.item.id === 'expansion-1')
      : offer?.id === 'second-room'
        ? !owned.some((entry) => entry.item.id === 'expansion-2')
        : false;
  const offerAlreadyOwned =
    purchasedOffer &&
    ['finish', 'expansion', 'apparel'].includes(offer?.kind ?? '');
  const offerError = offerAlreadyOwned
    ? 'Ya tienes esta mejora'
    : prerequisiteMissing
      ? 'Necesitas la ampliación anterior'
      : offer && progress && progress.balance < offer.price
        ? `Te faltan ${offer.price - progress.balance} créditos`
        : '';
  const returnEntry = owned.find((entry) => entry.id === returning);
  return (
    <div className="gym-shell min-h-dvh bg-background text-foreground">
      <header className="gym-header">
        <Button variant="ghost" className="min-h-11 gap-2" onClick={onBack}>
          <ArrowUpLeft />
          Volver a la app
        </Button>
        <button
          type="button"
          onClick={() => setHelp(true)}
          title="Cómo ganar créditos"
          className="gym-wallet min-h-11 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`${progress?.balance ?? 0} créditos disponibles`}
        >
          <Coins aria-hidden="true" />
          {progress?.balance ?? 0}
          <span className="hidden sm:inline">créditos</span>
        </button>
      </header>
      <main className="gym-main">
        <div className="gym-heading">
          <div>
            <p className="eyebrow">Zero to Hero</p>
            <h1 className="page-title">Mi gimnasio</h1>
          </div>
          <Button
            variant="ghost"
            className="min-h-11 gap-2"
            aria-label="Cómo funciona"
            onClick={() => setHelp(true)}
          >
            <CircleHelp aria-hidden="true" />
            <span className="hidden sm:inline">Cómo funciona</span>
          </Button>
        </div>
        {!gym ? (
          <output className="block py-8 text-sm text-muted-foreground">
            Preparando tu gimnasio…
          </output>
        ) : (
          <>
            <div className="gym-level">
              <strong>Nivel {progress!.level}</strong>
              <progress
                max={progress!.nextLevel - progress!.levelStart}
                value={progress!.xp - progress!.levelStart}
                aria-label="Experiencia hasta el siguiente nivel"
              />
              <span>
                {progress!.xp - progress!.levelStart} /{' '}
                {progress!.nextLevel - progress!.levelStart} XP
              </span>
            </div>
            <div className="gym-layout">
              <section className="gym-room-section" aria-label="Tu espacio">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {roomSize(gym, 'annex') ? (
                      <GymChoiceMenu
                        label="Sala"
                        value={room}
                        onChange={(value) => {
                          setRoom(value);
                          setSelected(undefined);
                          setPosition(undefined);
                          setOffer(null);
                        }}
                        choices={[
                          { id: 'main', name: 'Sala principal' },
                          ...(roomSize(gym, 'annex')
                            ? [{ id: 'annex' as const, name: 'Sala anexa' }]
                            : []),
                        ]}
                      />
                    ) : (
                      <strong className="text-sm">Sala principal</strong>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-11"
                    aria-label="Personalizar personaje"
                    onClick={() => setAvatarOpen(true)}
                  >
                    <UserRound />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-11"
                    aria-label="Personalizar sala"
                    onClick={() => setStyles(true)}
                  >
                    <Paintbrush />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {roomSize(gym, room)} × {roomSize(gym, room)}
                  </span>
                </div>
                <IsometricScene
                  gym={gym}
                  living
                  room={room}
                  selected={selected}
                  preview={position}
                  onSelect={editable && !busy ? selectObject : undefined}
                  onDrop={
                    canSave
                      ? (id, placement) => void dropObject(id, placement)
                      : undefined
                  }
                  onKeyboardMove={
                    editable && !busy
                      ? (id, placement) => {
                          setPlacementMessage('');
                          setSelected(id);
                          setPosition(placement);
                          setOffer(null);
                        }
                      : undefined
                  }
                />
                {selectedEntry ? (
                  <div ref={selectionPanel}>
                    <PlacementEditor
                      item={selectedEntry.item}
                      position={position}
                      error={placementMessage || locationError}
                      canSave={canSave}
                      salePrice={selectedEntry.paid}
                      onRotate={() => void rotateObject()}
                      onStore={() => void savePosition(null)}
                      onSell={() => setReturning(selectedEntry.id)}
                    />
                    {selectedEntry.item.id === 'trophy-cabinet' ? (
                      <div
                        className="mt-3 grid grid-cols-2 gap-2"
                        aria-label="Trofeos de la vitrina"
                      >
                        {Object.entries(gym.displays ?? {})
                          .filter(
                            ([, display]) =>
                              display.shelfId === selectedEntry.id,
                          )
                          .map(([id]) => (
                            <Button
                              key={id}
                              variant="outline"
                              className="min-h-11 h-auto whitespace-normal text-left"
                              disabled={!canSave}
                              onClick={() =>
                                void run({ type: 'place', id, placement: null })
                              }
                            >
                              Retirar{' '}
                              {
                                owned.find((entry) => entry.id === id)?.item
                                  .name
                              }
                            </Button>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lastMove ? (
                      <Button
                        variant="ghost"
                        className="min-h-11"
                        disabled={!canSave}
                        onClick={async () => {
                          if (await run({ type: 'place', ...lastMove }))
                            setLastMove(null);
                        }}
                      >
                        <Undo2 />
                        Deshacer movimiento
                      </Button>
                    ) : null}
                  </div>
                )}
              </section>
              <section className="gym-panel">
                <GymNavigation
                  value={panel}
                  onChange={(value) => {
                    setPanel(value);
                    setOffer(null);
                  }}
                />
                {panel === 'shop' ? (
                  <GymShop
                    category={shopCategory}
                    onCategory={setShopCategory}
                    offer={offer}
                    onOffer={chooseOffer}
                    onClose={() => setOffer(null)}
                    onBuy={() => void buy()}
                    busy={busy}
                    canSave={canSave}
                    error={offerError}
                  />
                ) : panel === 'inventory' ? (
                  <GymInventory
                    gym={gym}
                    editable={editable}
                    canSave={canSave}
                    busy={busy}
                    onSelect={selectObject}
                    onDisplay={setDisplaying}
                    onReturn={setReturning}
                  />
                ) : null}
              </section>
            </div>
          </>
        )}
        {mutation.error ? (
          <div role="alert" className="gym-error">
            {mutation.error.message}
          </div>
        ) : null}
        {!localOnly && !online ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sin conexión: puedes ver tu gimnasio. Conecta para confirmar
            cambios.
          </p>
        ) : null}
      </main>
      {avatarOpen && gym ? (
        <AvatarEditor
          gym={gym}
          canSave={canSave}
          onClose={() => setAvatarOpen(false)}
          onSave={async (command) => Boolean(await run(command))}
          onShop={() => {
            setAvatarOpen(false);
            setPanel('shop');
            setShopCategory('apparel');
          }}
        />
      ) : null}
      {displaying && gym ? (
        <TrophyDisplay
          gym={gym}
          trophyId={displaying}
          canSave={canSave}
          onClose={() => setDisplaying(null)}
          onSave={async (command) => Boolean(await run(command))}
        />
      ) : null}
      {styles && gym ? (
        <RoomStyles
          gym={gym}
          room={room}
          canSave={canSave}
          onClose={() => setStyles(false)}
          onSave={async (command) => Boolean(await run(command))}
          onShop={() => {
            setStyles(false);
            setShopCategory('finish');
            setPanel('shop');
            setOffer(null);
          }}
        />
      ) : null}
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Tu gimnasio, con tus entrenamientos</DialogTitle>
          <DialogDescription>
            La XP sube tu nivel. Los créditos sirven para equipar y decorar este
            espacio.
          </DialogDescription>
          {gym ? <GymEarningRules gym={gym} /> : null}
          <p className="text-sm text-muted-foreground">
            La XP sube tu nivel y no se gasta. El historial anterior cuenta para
            los hitos, pero no genera créditos retroactivos. Mover objetos es
            gratis; venderlos recupera su precio. Las ampliaciones son
            permanentes.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(returning)}
        onOpenChange={(open) => {
          if (!open) setReturning(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Vender {returnEntry?.item.name}</DialogTitle>
          <DialogDescription>
            Se retirará este ejemplar y recuperarás los {returnEntry?.paid ?? 0}{' '}
            créditos que pagaste.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setReturning(null)}
            >
              Cancelar
            </Button>
            <Button
              className="min-h-11"
              disabled={!canSave}
              onClick={async () => {
                if (
                  returning &&
                  (await run({ type: 'return', id: returning }))
                ) {
                  if (selected === returning) {
                    setSelected(undefined);
                    setPosition(undefined);
                  }
                  setLastMove(null);
                  setReturning(null);
                }
              }}
            >
              Vender
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
