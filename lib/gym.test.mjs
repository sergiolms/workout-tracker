import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { defaultState, saveLocalState } from './storage.ts';
import {
  accrueGym,
  applyGymCommand,
  createGym,
  gymDay,
  gymProgress,
  gymWeek,
  ownedItems,
  placementError,
  validateGymImport,
  mobilityId,
} from './gym/engine.ts';
import { createLocalRepository, hasLocalData } from './local-repository.ts';
import { PagedCloudRepository } from './paged-cloud-repository.ts';
import { database } from '../tests/helpers/record-database.mjs';
import { importBackup, backupPreview } from './backup-import.ts';
import { startWorkout } from './workout-instance.ts';
import { buildWorkoutReview } from './today-session.ts';
const now = new Date().toISOString();
const day = gymDay(now, 'UTC');
const activity = (id = 'walk', minutes = 20) => ({
  id,
  date: now,
  type: 'Caminata',
  minutes,
});
const activated = () => ({
  ...defaultState,
  gym: createGym(defaultState, 'UTC', now),
});
const earn = (state, log = activity()) =>
  accrueGym(
    state,
    {
      ...state,
      cardioLogs: [
        ...state.cardioLogs.filter((item) => item.id !== log.id),
        log,
      ],
    },
    now,
  );

test('activation excludes existing history and grants no welcome money', () => {
  const history = { ...defaultState, cardioLogs: [activity()] };
  const active = applyGymCommand(
    history,
    { type: 'activate', timeZone: 'UTC' },
    now,
  );
  assert.equal(gymProgress(active.gym).balance, 0);
  const edited = accrueGym(
    active,
    { ...active, cardioLogs: [activity('walk', 60)] },
    now,
  );
  assert.equal(gymProgress(edited.gym).balance, 0);
});

test('the first full day earns 60 credits and 100 XP; repeats, corrections and returns cannot mint currency', () => {
  let state = earn(activated());
  assert.equal(gymProgress(state.gym).balance, 60);
  assert.equal(gymProgress(state.gym).xp, 100);
  assert.equal(gymProgress(state.gym).level, 2);
  const receipt = structuredClone(state.gym.receipts);
  for (const minutes of [20, 10, 0, 40, 20])
    state = earn(state, activity('walk', minutes));
  assert.equal(gymProgress(state.gym).balance, 60);
  state = applyGymCommand(
    state,
    { type: 'buy', id: 'first', itemId: 'plant' },
    now,
  );
  assert.equal(gymProgress(state.gym).balance, 40);
  assert.deepEqual(
    applyGymCommand(state, { type: 'buy', id: 'first', itemId: 'plant' }, now),
    state,
  );
  assert.throws(
    () => applyGymCommand(state, { type: 'buy', id: 'first', itemId: 'clock' }),
    /otro objeto/,
  );
  assert.throws(
    () =>
      applyGymCommand(state, { type: 'buy', id: 'expensive', itemId: 'rack' }),
    /suficientes/,
  );
  state = applyGymCommand(state, { type: 'return', id: 'first' }, now);
  state = applyGymCommand(state, { type: 'return', id: 'first' }, now);
  assert.equal(gymProgress(state.gym).balance, 60);
  assert.equal(Object.keys(receipt).length, 1);
});

test('mobility variants deduplicate and modalities share the daily cap', () => {
  let state = activated();
  state = accrueGym(
    state,
    {
      ...state,
      mobilityDone: ['Open book', 'Cat cow', '90 90', 'Tobillo'].flatMap(
        (name) => [`${day}:corta-${name}`, `${day}:larga-${name}`],
      ),
    },
    now,
  );
  assert.equal(gymProgress(state.gym).balance, 60);
  assert.equal(Object.keys(state.gym.receipts).length, 4);
  state = earn(state);
  assert.equal(gymProgress(state.gym).balance, 60);
  assert.equal(gymProgress(state.gym).xp, 100);
  const imported = importBackup(
    activated(),
    {
      ...defaultState,
      cardioLogs: [activity()],
      mobilityDone: [`${day}:corta-Open book`],
    },
    { includePlan: false, replaceConflicts: false },
  );
  const result = accrueGym(activated(), imported, now);
  assert.equal(gymProgress(result.gym).balance, 0);
});

test('partial days accumulate before rounding, and week caps are independent of source count', () => {
  const state = activated();
  const week = gymWeek(day);
  // Receipts represent confirmed sessions within a fixed calendar week.
  for (let index = 0; index < 7; index++) {
    const date = new Date(`${week}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    state.gym.receipts[`activity:${index}`] = {
      kind: 'activity',
      day: date.toISOString().slice(0, 10),
      units: 1,
      count: 20,
    };
  }
  assert.equal(gymProgress(state.gym).balance, 150);
  assert.equal(gymProgress(state.gym).xp, 700);
  const partial = activated();
  partial.gym.receipts.a = { kind: 'mobility', day, units: 0.25, count: 1 };
  assert.equal(gymProgress(partial.gym).balance, 7);
  partial.gym.receipts.b = { kind: 'mobility', day, units: 0.25, count: 1 };
  assert.equal(gymProgress(partial.gym).balance, 45);
});

test('planning freezes at start and approximations do not contribute to force rewards', () => {
  const exercise = {
    name: 'Remo',
    sets: 4,
    target: '',
    increment: 0.5,
    unit: 'kg',
  };
  let state = {
    ...activated(),
    sessions: [{ id: 'routine', name: 'Plan', exercises: [exercise] }],
  };
  state = startWorkout(state, {
    id: 'session',
    date: now,
    week: 1,
    routine: 'routine',
    startedAt: now,
  });
  assert.equal(state.activeWorkouts[0].plannedSets, 4);
  state.sessions[0].exercises[0] = { ...exercise, sets: 1 };
  const sets = [
    { done: true, reps: 10, kind: 'warmup' },
    { done: true, reps: 10 },
    { done: true, reps: 10 },
    { done: false, reps: 10 },
    { done: false, reps: 10 },
  ];
  const review = buildWorkoutReview(
    state,
    { id: 'session', week: 1, routine: 'routine' },
    [exercise],
    { exercise, sets, load: 20, rir: 2, pain: 0, note: '' },
    now,
  );
  assert.equal(review.workout.gymTargetSets, 4);
  const updated = accrueGym(
    state,
    { ...state, workoutLogs: [review.workout], exerciseLogs: review.logs },
    now,
  );
  assert.equal(gymProgress(updated.gym).balance, 45);
  assert.equal(gymProgress(updated.gym).xp, 50);
});

test('placements validate ownership, bounds, rotation and collisions; returns remove placements', () => {
  let state = earn(activated());
  state = applyGymCommand(state, {
    type: 'buy',
    id: 'plant-1',
    itemId: 'plant',
  });
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'place',
        id: 'plant-1',
        placement: { room: 'main', x: 1, y: 1, rotated: false },
      }),
    /ocupado/,
  );
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'place',
        id: 'plant-1',
        placement: { room: 'main', x: 6, y: 0, rotated: false },
      }),
    /fuera/,
  );
  state = applyGymCommand(state, {
    type: 'place',
    id: 'plant-1',
    placement: { room: 'main', x: 0, y: 0, rotated: false },
  });
  assert.equal(
    placementError(state.gym, 'starter-mat', {
      room: 'main',
      x: 5,
      y: 4,
      rotated: true,
    }),
    '',
  );
  state = applyGymCommand(state, { type: 'return', id: 'plant-1' });
  assert.equal(state.gym.placements['plant-1'], undefined);
  assert.equal(
    ownedItems(state.gym).some((item) => item.id.startsWith('award-')),
    true,
  );
});

test('local transactions serialize competing purchases and award credits only when the source is saved', async () => {
  await saveLocalState(defaultState);
  const one = createLocalRepository(),
    two = createLocalRepository();
  const initial = await one.gymCommand({ type: 'activate', timeZone: 'UTC' });
  const gained = await one.save(
    { ...initial, cardioLogs: [activity()] },
    initial.updatedAt,
    initial,
  );
  assert.equal(gymProgress(gained.gym).balance, 60);
  const results = await Promise.allSettled([
    one.gymCommand({ type: 'buy', id: 'a', itemId: 'mirror' }),
    two.gymCommand({ type: 'buy', id: 'b', itemId: 'mirror' }),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(gymProgress((await one.load()).gym).balance, 0);
  await one.gymCommand({
    type: 'return',
    id: results[0].status === 'fulfilled' ? 'a' : 'b',
  });
  assert.equal(gymProgress((await one.load()).gym).balance, 60);
  one.dispose();
  two.dispose();
});

test('the paged repository with an in-memory transactional database preserves source/credit atomicity, reject stale overspending and replay a purchase only once', async () => {
  const fixture = database(defaultState);
  const one = new PagedCloudRepository(fixture.backend),
    two = new PagedCloudRepository(fixture.backend);
  await one.load();
  await two.load();
  const initial = await one.gymCommand({ type: 'activate', timeZone: 'UTC' });
  const gained = await one.save(
    { ...initial, cardioLogs: [activity()] },
    initial.updatedAt,
    initial,
  );
  assert.equal(gymProgress(gained.gym).balance, 60);
  const results = await Promise.allSettled([
    one.gymCommand({ type: 'buy', id: 'one', itemId: 'mirror' }),
    two.gymCommand({ type: 'buy', id: 'two', itemId: 'mirror' }),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  const purchaseId = results[0].status === 'fulfilled' ? 'one' : 'two';
  await two.gymCommand({ type: 'buy', id: purchaseId, itemId: 'mirror' });
  const state = await one.load();
  assert.equal(Object.values(state.gym.purchases).length, 1);
  assert.equal(gymProgress(state.gym).balance, 0);
  assert.equal(state.cardioLogs[0].id, 'walk');
});

test('timezone boundaries and Monday periods are stable', () => {
  assert.equal(gymDay('2026-10-26T23:30:00Z', 'Europe/Madrid'), '2026-10-27');
  assert.equal(gymWeek('2026-10-25'), '2026-10-19');
  assert.equal(gymWeek('2026-10-26'), '2026-10-26');
});

test('gym backups replace rather than add balances and keep the previous room recoverable', () => {
  const previous = earn(activated());
  const incoming = applyGymCommand(
    previous,
    { type: 'buy', id: 'p', itemId: 'plant' },
    now,
  );
  const replaced = applyGymCommand(
    previous,
    { type: 'import', gym: incoming.gym },
    now,
  );
  assert.equal(gymProgress(replaced.gym).balance, 40);
  assert.deepEqual(replaced.gymArchive, previous.gym);
  const restored = applyGymCommand(replaced, { type: 'restore' }, now);
  assert.deepEqual(restored.gym, previous.gym);
  assert.deepEqual(restored.gymArchive, incoming.gym);
  assert.deepEqual(validateGymImport(restored.gym), previous.gym);
  assert.throws(
    () =>
      validateGymImport({
        ...previous.gym,
        placements: { missing: { room: 'main', x: 0, y: 0, rotated: false } },
      }),
    /no es válida/,
  );
  assert.throws(
    () =>
      validateGymImport({
        ...previous.gym,
        receipts: {
          bad: { kind: 'activity', day: '2026-02-31', units: 1, count: 20 },
        },
      }),
    /no es válida/,
  );
  assert.equal(mobilityId('2026-02-31:corta-Remo'), null);
});

test('reimporting history ignores internal reward-exclusion metadata in the preview', () => {
  const incoming = { ...defaultState, cardioLogs: [activity()] };
  const imported = importBackup(activated(), incoming, {
    includePlan: false,
    replaceConflicts: false,
  });
  const preview = backupPreview(imported, incoming).find(
    (row) => row.key === 'cardioLogs',
  );
  assert.equal(preview.conflicts, 0);
  assert.equal(preview.duplicates, 1);
});

test('moving a saved source between months, deleting and restoring it never grants a second reward', () => {
  const checkpoint = '2026-10-27T12:00:00Z';
  let state = {
    ...defaultState,
    gym: createGym(defaultState, 'UTC', '2026-09-01T12:00:00Z'),
  };
  const original = {
    id: 'month-boundary',
    date: '2026-09-30T12:00:00Z',
    type: 'Caminata',
    minutes: 20,
  };
  state = accrueGym(state, { ...state, cardioLogs: [original] }, checkpoint);
  state = accrueGym(
    state,
    { ...state, cardioLogs: [{ ...original, date: '2026-10-05T12:00:00Z' }] },
    checkpoint,
  );
  state = accrueGym(state, { ...state, cardioLogs: [] }, checkpoint);
  state = accrueGym(state, { ...state, cardioLogs: [original] }, checkpoint);
  assert.equal(gymProgress(state.gym).balance, 60);
  assert.equal(gymProgress(state.gym).xp, 100);
  assert.equal(state.gym.receipts['activity:month-boundary'].day, '2026-09-30');
});

test('the paged repository persists a recoverable gym replacement and ignores stale wallet changes in diary saves', async () => {
  const fixture = database(defaultState);
  const repository = new PagedCloudRepository(fixture.backend);
  const initial = await repository.gymCommand({
    type: 'activate',
    timeZone: 'UTC',
  });
  const saved = await repository.save(
    { ...initial, cardioLogs: [activity()] },
    initial.updatedAt,
    initial,
  );
  const bought = await repository.gymCommand({
    type: 'buy',
    id: 'backup-plant',
    itemId: 'plant',
  });
  await repository.gymCommand({ type: 'import', gym: saved.gym });
  const reader = new PagedCloudRepository(fixture.backend);
  const replaced = await reader.load();
  assert.equal(gymProgress(replaced.gym).balance, 60);
  assert.deepEqual(replaced.gymArchive, bought.gym);
  const restored = await reader.gymCommand({ type: 'restore' });
  assert.equal(gymProgress(restored.gym).balance, 40);
  const diary = await repository.save(
    { ...saved, planName: 'Updated plan', gym: saved.gym },
    saved.updatedAt,
    saved,
  );
  assert.equal(gymProgress(diary.gym).balance, 40);
  assert.equal(diary.planName, 'Updated plan');
});

test('isometric drag snaps correctly in both diagonals and clamps rotated objects to room edges', async () => {
  const { draggedPlacement } = await import('./gym/drag.ts');
  const start = { room: 'main', x: 2, y: 2, rotated: false };
  assert.deepEqual(draggedPlacement(start, 36, 18, 6, 2, 1), {
    ...start,
    x: 3,
  });
  assert.deepEqual(draggedPlacement(start, -36, 18, 6, 2, 1), {
    ...start,
    y: 3,
  });
  assert.deepEqual(draggedPlacement(start, 3, 1, 6, 2, 1), start);
  assert.deepEqual(
    draggedPlacement({ ...start, rotated: true }, 0, 10000, 6, 2, 1),
    { ...start, rotated: true, x: 5, y: 4 },
  );
  assert.deepEqual(draggedPlacement(start, 0, -10000, 6, 2, 1), {
    ...start,
    x: 0,
    y: 0,
  });
});

test('room materials apply together, validate ownership and remain refundable', () => {
  const initial = earn(activated());
  initial.gym.receipts.extra = {
    kind: 'activity',
    day: '2026-10-19',
    units: 1,
    count: 20,
  };
  let state = { ...initial, gym: structuredClone(initial.gym) };
  // A second week funds one finish without altering the economy.
  state.gym.receipts.more = {
    kind: 'activity',
    day: '2026-10-12',
    units: 1,
    count: 20,
  };
  state = applyGymCommand(state, {
    type: 'buy',
    id: 'wall',
    itemId: 'brick-wall',
  });
  state = applyGymCommand(state, {
    type: 'style',
    room: 'main',
    finishes: { floor: null, wall: 'wall' },
  });
  assert.equal(state.gym.finishes.main.wall, 'wall');
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'style',
        room: 'main',
        finishes: { floor: 'wall', wall: 'wall' },
      }),
    /acabado/,
  );
  state = applyGymCommand(state, { type: 'return', id: 'wall' });
  assert.equal(state.gym.finishes.main.wall, undefined);
});

test('a cabinet holds four distinct earned trophies, follows room moves and releases prizes when stored or sold', () => {
  let state = earn(activated());
  for (const day of ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'])
    state.gym.receipts[day] = { kind: 'activity', day, units: 1, count: 20 };
  state = applyGymCommand(state, {
    type: 'buy',
    id: 'cabinet',
    itemId: 'trophy-cabinet',
  });
  state = applyGymCommand(state, {
    type: 'place',
    id: 'cabinet',
    placement: { room: 'main', x: 0, y: 0, rotated: false },
  });
  state = applyGymCommand(state, {
    type: 'place',
    id: 'award-activity',
    placement: { room: 'main', x: 0, y: 2, rotated: false },
  });
  state = applyGymCommand(state, {
    type: 'display',
    id: 'award-activity',
    shelfId: 'cabinet',
    slot: 0,
  });
  assert.equal(state.gym.placements['award-activity'], undefined);
  assert.deepEqual(state.gym.displays['award-activity'], {
    shelfId: 'cabinet',
    slot: 0,
  });
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'display',
        id: 'award-weeks',
        shelfId: 'cabinet',
        slot: 0,
      }),
    /ya tiene/,
  );
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'display',
        id: 'starter-weights',
        shelfId: 'cabinet',
        slot: 1,
      }),
    /trofeos/,
  );
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'display',
        id: 'award-weeks',
        shelfId: 'cabinet',
        slot: 4,
      }),
    /incorrecta/,
  );
  state = applyGymCommand(state, {
    type: 'display',
    id: 'award-weeks',
    shelfId: 'cabinet',
    slot: 1,
  });
  state = applyGymCommand(state, {
    type: 'place',
    id: 'cabinet',
    placement: { room: 'main', x: 0, y: 0, rotated: true },
  });
  assert.equal(state.gym.displays['award-weeks'].shelfId, 'cabinet');
  assert.deepEqual(validateGymImport(state.gym), state.gym);
  state = applyGymCommand(state, {
    type: 'place',
    id: 'cabinet',
    placement: null,
  });
  assert.deepEqual(state.gym.displays, {});
  assert.ok(ownedItems(state.gym).some((item) => item.id === 'award-weeks'));
  state = applyGymCommand(state, {
    type: 'place',
    id: 'cabinet',
    placement: { room: 'main', x: 0, y: 0, rotated: false },
  });
  state = applyGymCommand(state, {
    type: 'display',
    id: 'award-weeks',
    shelfId: 'cabinet',
    slot: 2,
  });
  state = applyGymCommand(state, { type: 'return', id: 'cabinet' });
  assert.deepEqual(state.gym.displays, {});
  assert.equal(gymProgress(state.gym).balance, 300);
});

test('avatar appearance and purchased outfits persist without granting XP, and refunds reset worn clothes', async () => {
  const { defaultAvatar } = await import('./gym/appearance.ts');
  let state = earn(activated());
  const before = gymProgress(state.gym);
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'avatar',
        appearance: { ...defaultAvatar, outfit: 'outfit-ocean' },
      }),
    /Compra/,
  );
  state = applyGymCommand(state, {
    type: 'buy',
    id: 'clothes',
    itemId: 'outfit-ocean',
  });
  state = applyGymCommand(state, {
    type: 'avatar',
    appearance: {
      ...defaultAvatar,
      body: 'woman',
      hair: 'ponytail',
      outfit: 'outfit-ocean',
    },
  });
  assert.equal(gymProgress(state.gym).xp, before.xp);
  assert.equal(gymProgress(state.gym).balance, before.balance - 30);
  assert.equal(validateGymImport(state.gym).avatar.body, 'woman');
  assert.throws(
    () =>
      applyGymCommand(state, {
        type: 'avatar',
        appearance: { ...defaultAvatar, skin: 'invalid' },
      }),
    /incorrecto/,
  );
  state = applyGymCommand(state, { type: 'return', id: 'clothes' });
  assert.equal(state.gym.avatar.outfit, 'outfit-base');
  assert.equal(gymProgress(state.gym).balance, before.balance);
});

test('all hairstyles survive import and every outfit can be purchased, worn and returned', async () => {
  const { defaultAvatar, avatarHairstyles, avatarOutfits } =
    await import('./gym/appearance.ts');
  const { gymItem } = await import('./gym/catalog.ts');
  for (const { id: hair } of avatarHairstyles) {
    const state = applyGymCommand(activated(), {
      type: 'avatar',
      appearance: { ...defaultAvatar, hair },
    });
    assert.equal(validateGymImport(state.gym).avatar.hair, hair);
    assert.equal(gymProgress(state.gym).xp, 0);
  }
  for (const itemId of Object.keys(avatarOutfits).filter(
    (id) => id !== 'outfit-base',
  )) {
    let state = earn(activated());
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - i);
      const day = date.toISOString().slice(0, 10);
      state.gym.receipts[`wardrobe:${day}`] = {
        kind: 'activity',
        day,
        units: 1,
        count: 20,
      };
    }
    const before = gymProgress(state.gym);
    assert.equal(gymItem(itemId).kind, 'apparel');
    state = applyGymCommand(state, { type: 'buy', id: 'clothes', itemId });
    state = applyGymCommand(state, {
      type: 'avatar',
      appearance: { ...defaultAvatar, outfit: itemId },
    });
    assert.equal(validateGymImport(state.gym).avatar.outfit, itemId);
    assert.equal(
      gymProgress(state.gym).balance,
      before.balance - gymItem(itemId).price,
    );
    state = applyGymCommand(state, { type: 'return', id: 'clothes' });
    assert.equal(state.gym.avatar.outfit, 'outfit-base');
    assert.equal(gymProgress(state.gym).xp, before.xp);
  }
});

test('character routes visit adjacent walkable cells and cannot pass through furniture or sealed areas', async () => {
  const { walkableGym, gymPath } = await import('./gym/avatar.ts');
  const state = activated(),
    cells = walkableGym(state.gym, 'main');
  assert.equal(
    cells.some((p) => p.x === 1 && p.y === 1),
    false,
  );
  const start = { x: 0, y: 0 },
    end = { x: 5, y: 5 },
    route = gymPath(cells, start, end);
  assert.deepEqual(route.at(-1), end);
  let last = start;
  for (const cell of route) {
    assert.equal(Math.abs(last.x - cell.x) + Math.abs(last.y - cell.y), 1);
    assert.ok(cells.some((p) => p.x === cell.x && p.y === cell.y));
    last = cell;
  }
  assert.deepEqual(
    gymPath(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ),
    [],
  );
});

test('avatar purchases and appearance survive local and cloud repository reloads without stale diary saves replacing them', async () => {
  const { defaultAvatar } = await import('./gym/appearance.ts');
  for (const mode of ['local', 'cloud']) {
    await saveLocalState(defaultState);
    const fixture = database(defaultState);
    const repository =
      mode === 'local'
        ? createLocalRepository()
        : new PagedCloudRepository(fixture.backend);
    const initial = await repository.gymCommand({
      type: 'activate',
      timeZone: 'UTC',
    });
    const rewarded = await repository.save(
      { ...initial, cardioLogs: [activity()] },
      initial.updatedAt,
      initial,
    );
    await repository.gymCommand({
      type: 'buy',
      id: 'persistent-clothes',
      itemId: 'outfit-ocean',
    });
    await repository.gymCommand({
      type: 'avatar',
      appearance: {
        ...defaultAvatar,
        body: 'woman',
        hair: 'curly',
        outfit: 'outfit-ocean',
        wandering: false,
      },
    });
    await repository.save(
      { ...rewarded, planName: 'New plan' },
      rewarded.updatedAt,
      rewarded,
    );
    const reader =
      mode === 'local'
        ? createLocalRepository()
        : new PagedCloudRepository(fixture.backend);
    const saved = await reader.load();
    assert.equal(saved.gym.avatar.body, 'woman');
    assert.equal(saved.gym.avatar.hair, 'curly');
    assert.equal(saved.gym.avatar.wandering, false);
    assert.equal(saved.gym.avatar.outfit, 'outfit-ocean');
    assert.equal(gymProgress(saved.gym).balance, 30);
    assert.equal(Object.keys(saved.gym.purchases).length, 1);
    repository.dispose?.();
    reader.dispose?.();
  }
});

test('mats and platforms are walkable surfaces while benches remain solid, including rotated footprints', async () => {
  const { walkableGym, gymPath } = await import('./gym/avatar.ts');
  const gym = createGym(defaultState, 'UTC', now);
  gym.placements = {
    'starter-mat': { room: 'main', x: 1, y: 1, rotated: false },
    platform: { room: 'main', x: 0, y: 3, rotated: false },
    bench: { room: 'main', x: 4, y: 0, rotated: false },
  };
  gym.purchases = {
    platform: { id: 'platform', itemId: 'platform', paid: 0, at: now },
    bench: { id: 'bench', itemId: 'bench', paid: 0, at: now },
  };
  const free = walkableGym(gym, 'main');
  assert.ok(free.some((p) => p.x === 1 && p.y === 1));
  assert.ok(free.some((p) => p.x === 2 && p.y === 1));
  assert.ok(free.some((p) => p.x === 1 && p.y === 4));
  assert.equal(
    free.some((p) => p.x === 4 && p.y === 0),
    false,
  );
  assert.equal(
    free.some((p) => p.x === 5 && p.y === 0),
    false,
  );
  assert.deepEqual(gymPath(free, { x: 0, y: 1 }, { x: 3, y: 1 }), [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
  ]);
  gym.placements.bench.rotated = true;
  const rotated = walkableGym(gym, 'main');
  assert.equal(
    rotated.some((p) => p.x === 4 && p.y === 1),
    false,
  );
  assert.ok(rotated.some((p) => p.x === 5 && p.y === 0));
});

test('interaction plans enter a mat, reach a machine from free space and adapt contact points to rotation', async () => {
  const { planGymInteraction, walkableGym } = await import('./gym/avatar.ts');
  const cases = [
    ['mat', 'stretch'],
    ['platform', 'squat'],
    ['water', 'drink'],
    ['bike', 'cycle'],
    ['treadmill', 'run'],
    ['bench', 'press'],
    ['cable', 'pull'],
    ['kettlebells', 'train'],
  ];
  for (const [itemId, action] of cases)
    for (const rotated of [false, true]) {
      const gym = createGym(defaultState, 'UTC', now);
      gym.purchases = { target: { id: 'target', itemId, paid: 0, at: now } };
      gym.placements = { target: { room: 'main', x: 2, y: 2, rotated } };
      const snapshot = structuredClone(gym),
        plan = planGymInteraction(gym, 'main', { x: 0, y: 0 }, 0);
      assert.ok(plan, `${itemId} is reachable`);
      assert.equal(plan.action, action);
      const free = walkableGym(gym, 'main');
      for (const p of [...plan.path, plan.access])
        assert.ok(free.some((cell) => cell.x === p.x && cell.y === p.y));
      if (itemId === 'mat')
        assert.ok(
          plan.position.x >= 2 && plan.position.y >= 2,
          'stretching happens on the mat',
        );
      if (['bike', 'treadmill'].includes(itemId))
        assert.ok(
          plan.elevation > 0,
          'equipment use is lifted to its seat or deck',
        );
      const atGoal = planGymInteraction(gym, 'main', plan.access, 0);
      assert.deepEqual(
        atGoal.path,
        [],
        'already at the access point can begin interacting',
      );
      assert.deepEqual(
        gym,
        snapshot,
        'planning is transient and does not write account or reward state',
      );
    }
});

test('a completely inaccessible object is skipped rather than walking through solid furniture', async () => {
  const { planGymInteraction } = await import('./gym/avatar.ts');
  const gym = createGym(defaultState, 'UTC', now);
  gym.purchases = { water: { id: 'water', itemId: 'water', paid: 0, at: now } };
  gym.placements = { water: { room: 'main', x: 4, y: 4, rotated: false } };
  for (const [index, [x, y]] of [
    [3, 4],
    [5, 4],
    [4, 3],
    [4, 5],
  ].entries()) {
    gym.purchases[`wall${index}`] = {
      id: `wall${index}`,
      itemId: 'plant',
      paid: 0,
      at: now,
    };
    gym.placements[`wall${index}`] = { room: 'main', x, y, rotated: false };
  }
  assert.equal(planGymInteraction(gym, 'main', { x: 0, y: 0 }, 0), null);
});

test('achievement backfill recognizes existing history once without retroactive credits or duplicate live rewards', () => {
  const past = new Date(Date.now() - 10 * 86400000).toISOString(),
    pastDay = past.slice(0, 10);
  const live = earn(activated());
  delete live.gym.achievementHistory;
  const state = {
    ...live,
    workoutLogs: [
      {
        id: 'old-session',
        date: past,
        routine: 'a',
        routineName: 'A',
        week: 1,
        notes: '',
        exercises: [{ name: 'Remo', status: 'done', logId: 'old-set' }],
      },
    ],
    exerciseLogs: [
      {
        id: 'old-set',
        date: past,
        routine: 'a',
        week: 1,
        exercise: 'Remo',
        sets: [{ done: true, reps: 10 }],
      },
    ],
    cardioLogs: [...live.cardioLogs, { ...activity('past-walk'), date: past }],
    mobilityDone: [`${pastDay}:corta-Tobillo`, `${pastDay}:larga-Tobillo`],
  };
  const before = gymProgress(state.gym),
    result = applyGymCommand(state, { type: 'backfill-achievements' }, now),
    progress = gymProgress(result.gym);
  assert.equal(progress.sessions, 1);
  assert.equal(
    progress.minutes,
    40,
    'live and historical activity each count once',
  );
  assert.equal(progress.mobilityDays, 1);
  assert.equal(progress.balance, before.balance);
  assert.equal(progress.xp, before.xp);
  assert.ok(
    ownedItems(result.gym).some((item) => item.id === 'award-strength'),
  );
  assert.ok(
    ownedItems(result.gym).some((item) => item.id === 'award-mobility'),
  );
  assert.strictEqual(
    applyGymCommand(result, { type: 'backfill-achievements' }, now),
    result,
    'the completed backfill is idempotent',
  );
  assert.deepEqual(
    result.workoutLogs,
    state.workoutLogs,
    'history is not rewritten',
  );
  assert.deepEqual(validateGymImport(result.gym), result.gym);
});

test('historical legacy exercises form one session and never include unfinished drafts, skipped sets or future activity', () => {
  const past = new Date(Date.now() - 5 * 86400000).toISOString(),
    future = new Date(Date.now() + 86400000).toISOString();
  const log = (id, extra = {}) => ({
    id,
    date: past,
    routine: 'a',
    week: 1,
    exercise: 'Remo',
    sets: [{ done: true, reps: 10 }],
    ...extra,
  });
  const state = {
    ...defaultState,
    activeWorkouts: [
      { id: 'draft', date: past, routine: 'a', week: 1, startedAt: past },
    ],
    exerciseLogs: [
      log('one'),
      log('two'),
      log('draft-set', { workoutId: 'draft', routine: 'b' }),
      log('warmup', {
        routine: 'c',
        sets: [{ done: true, kind: 'warmup', reps: 10 }],
      }),
      log('skipped', { routine: 'd', skipped: true }),
    ],
    cardioLogs: [{ ...activity('future'), date: future }],
  };
  const gym = createGym(state, 'UTC', now),
    progress = gymProgress(gym);
  assert.equal(progress.sessions, 1);
  assert.equal(progress.minutes, 0);
  assert.equal(progress.balance, 0);
});

test('backfill reads older unloaded cloud months and persists trophies while leaving the wallet and purchases intact', async () => {
  const past = new Date(Date.now() - 100 * 86400000).toISOString();
  const initial = earn(activated());
  delete initial.gym.achievementHistory;
  const state = {
    ...initial,
    cardioLogs: [
      ...initial.cardioLogs,
      { ...activity('older-month', 100), date: past },
    ],
  };
  const fixture = database(state),
    repository = new PagedCloudRepository(fixture.backend);
  const partial = await repository.load();
  assert.equal(
    partial.cardioLogs.some((log) => log.id === 'older-month'),
    false,
  );
  const bought = await repository.gymCommand({
    type: 'buy',
    id: 'keep-plant',
    itemId: 'plant',
  });
  const result = await repository.gymCommand({ type: 'backfill-achievements' });
  assert.equal(gymProgress(result.gym).minutes, 120);
  assert.equal(
    gymProgress(result.gym).balance,
    gymProgress(bought.gym).balance,
  );
  const reader = new PagedCloudRepository(fixture.backend),
    reloaded = await reader.load();
  assert.equal(
    gymProgress(reloaded.gym).minutes,
    120,
    'recognition survives partial reloads',
  );
  assert.deepEqual(reloaded.gym.purchases, bought.gym.purchases);
  assert.equal(reloaded.gym.achievementHistory.version, 1);
});

test('a local diary containing only recognized trophies still offers its gym when connecting an account', () => {
  const gym = createGym(defaultState, 'UTC', now);
  gym.achievementHistory = {
    version: 1,
    records: {
      'activity:past': { kind: 'activity', day: '2026-10-01', count: 20 },
    },
  };
  assert.equal(hasLocalData({ ...defaultState, gym }), true);
  assert.equal(
    hasLocalData({ ...defaultState, gym: createGym(defaultState, 'UTC', now) }),
    false,
  );
});
