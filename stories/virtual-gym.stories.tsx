import { gymRotations } from '../lib/gym/orientation';
import { AvatarFigure } from '../components/gym/avatar-figure';
import { defaultAvatar, avatarHairstyles } from '../lib/gym/appearance';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useRef, useState } from 'react';
import { GymApp } from '../components/gym/gym-app';
import { HistoryProvider } from '../components/history-source';
import { createAccountQueryClient } from '../lib/account-query';
import { applyGymCommand, createGym, gymWeek } from '../lib/gym/engine';
import { defaultState, type AppState } from '../lib/storage';
import type { GymCommand } from '../lib/gym/types';
import { GymItemPreview } from '../components/gym/isometric-scene';
import { gymCatalog } from '../lib/gym/catalog';
import { ownedItems } from '../lib/gym/engine';
import { Button } from '../components/ui/button';

export function gymFixture(expanded = false): AppState {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 300);
  let state: AppState = {
    ...defaultState,
    gym: createGym(defaultState, 'UTC', start.toISOString()),
  };
  const monday = gymWeek(now.toISOString().slice(0, 10));
  for (let week = 0; week < (expanded ? 32 : 8); week++)
    for (let day = 0; day < 4; day++) {
      const date = new Date(`${monday}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (week + 1) * 7 + day);
      state.gym!.receipts[`fixture:${week}:${day}`] = {
        kind: 'activity',
        day: date.toISOString().slice(0, 10),
        units: 1,
        count: 20,
      };
    }
  for (const itemId of [
    'plant',
    'bench',
    'rack',
    'wood-floor',
    'clock',
    'brick-wall',
    'trophy-cabinet',
    ...(expanded
      ? ['expansion-1', 'expansion-2', 'second-room', 'cable', 'bike']
      : []),
  ])
    state = applyGymCommand(state, {
      type: 'buy',
      id: `owned-${itemId}`,
      itemId,
    });
  for (const [id, x, y] of [
    ['plant', 0, 0],
    ['bench', 0, 2],
    ['rack', 2, 0],
    ['clock', 0, 4],
    ['trophy-cabinet', 1, 4],
  ] as const)
    state = applyGymCommand(state, {
      type: 'place',
      id: `owned-${id}`,
      placement: { room: 'main', x, y, rotated: false },
    });
  state = applyGymCommand(state, {
    type: 'finish',
    room: 'main',
    surface: 'floor',
    purchaseId: 'owned-wood-floor',
  });
  state = applyGymCommand(state, {
    type: 'finish',
    room: 'main',
    surface: 'wall',
    purchaseId: 'owned-brick-wall',
  });
  for (const [slot, id] of [
    'award-activity',
    'award-weeks',
    'award-level',
  ].entries())
    state = applyGymCommand(state, {
      type: 'display',
      id,
      shelfId: 'owned-trophy-cabinet',
      slot,
    });
  return state;
}
function GymStory({
  initial,
  editable = true,
}: {
  initial: AppState;
  editable?: boolean;
}) {
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const [closed, setClosed] = useState(false);
  const source = useMemo(
    () => ({
      accountId: 'storybook-gym',
      client: createAccountQueryClient(),
      loadMonth: async () => current.current,
      loadAll: async () => current.current,
      gymCommand: async (command: GymCommand) => {
        const next = applyGymCommand(current.current, command);
        current.current = next;
        setState(next);
        return next;
      },
    }),
    [],
  );
  if (closed)
    return (
      <main className="p-6">
        <h1 className="page-title">Vista de aplicación</h1>
        <Button className="mt-4 min-h-11" onClick={() => setClosed(false)}>
          Abrir gimnasio
        </Button>
      </main>
    );
  return (
    <HistoryProvider value={source}>
      <GymApp
        state={state}
        editable={editable}
        localOnly
        onBack={() => setClosed(true)}
      />
    </HistoryProvider>
  );
}
const meta: Meta<typeof GymStory> = {
  title: 'Juego/Gimnasio virtual',
  component: GymStory,
  decorators: [
    (Story) => (
      <div className="-m-5">
        <Story />
      </div>
    ),
  ],
  excludeStories: ['gymFixture'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Datos ficticios en memoria. Comprar, colocar y devolver no modifica ningún diario ni Firebase.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof GymStory>;
export const Starter: Story = {
  name: 'Primer acceso',
  args: {
    initial: {
      ...defaultState,
      gym: createGym(defaultState, 'UTC', new Date().toISOString()),
    },
  },
};
export const Furnished: Story = {
  name: 'Equipado',
  args: { initial: gymFixture() },
};
export const Expanded: Story = {
  name: 'Ampliado y sala anexa',
  args: { initial: gymFixture(true) },
};
export const ReadOnly: Story = {
  name: 'Sólo lectura',
  args: { initial: gymFixture(), editable: false },
};

export const RotationReview: Story = {
  name: 'Rotaciones y trofeos',
  args: { initial: gymFixture() },
  render: () => (
    <div className="gym-shell grid gap-8 sm:grid-cols-3 lg:grid-cols-4">
      {[
        ...gymCatalog.filter((item) =>
          ['equipment', 'decoration'].includes(item.kind),
        ),
        ...ownedItems(gymFixture().gym!)
          .filter((entry) => entry.id.startsWith('award-'))
          .map((entry) => entry.item),
      ].map((item) => (
        <section
          className="rounded-xl border border-border bg-card p-4"
          key={item.id}
        >
          <h2 className="mb-3 text-sm font-semibold">{item.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            {gymRotations.map((rotation) => (
              <div key={rotation}>
                <GymItemPreview item={item} rotation={rotation} />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {rotation}°
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

export const CharacterReview: Story = {
  name: 'Personaje y peinados',
  args: { initial: gymFixture() },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-4">
      {(['man', 'woman'] as const).flatMap((body) =>
        avatarHairstyles.map(({ id: hair }) => (
          <section
            key={`${body}:${hair}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            <svg
              viewBox="-30 -74 60 82"
              className="mx-auto h-52 w-full"
              aria-label={`${body === 'man' ? 'Hombre' : 'Mujer'}, ${hair}`}
            >
              <AvatarFigure appearance={{ ...defaultAvatar, body, hair }} />
            </svg>
          </section>
        )),
      )}
    </div>
  ),
};

export const CharacterActions: Story = {
  name: 'Interacciones del personaje',
  args: { initial: gymFixture() },
  render: () => (
    <div className="gym-shell grid gap-6 sm:grid-cols-4">
      {[
        { action: 'walk', label: 'Caminar' },
        { action: 'stretch', label: 'Estirar sobre esterilla' },
        { action: 'train', label: 'Mancuernas' },
        { action: 'drink', label: 'Beber agua' },
        { action: 'cycle', label: 'Pedalear' },
        { action: 'run', label: 'Correr en cinta' },
        { action: 'press', label: 'Press sentado' },
        { action: 'pull', label: 'Poleas' },
        { action: 'squat', label: 'Sentadilla en plataforma' },
      ].map(({ action, label }) => (
        <section
          key={action}
          className="rounded-xl border border-border bg-card p-5"
        >
          <svg
            viewBox="-32 -78 64 90"
            className="h-56 w-full"
            aria-label={label}
          >
            <AvatarFigure action={action} />
          </svg>
          <h2 className="text-center text-sm font-semibold">{label}</h2>
        </section>
      ))}
    </div>
  ),
};
