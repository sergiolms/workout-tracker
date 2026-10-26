import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  collection,
  deleteDoc,
  getDocFromServer,
  getDocsFromServer,
  setDoc,
  setLogLevel,
} from 'firebase/firestore';
import { firebaseRecordDatabase } from '../lib/firebase.ts';
import { CloudRepository } from '../lib/cloud-repository.ts';
import { PagedCloudRepository } from '../lib/paged-cloud-repository.ts';
import { historyTotals } from '../lib/history-summary.ts';
import { WorkoutPersistence } from '../lib/persistence.ts';
import { CloudConflict } from '../lib/cloud-records.ts';
import { defaultState } from '../lib/storage.ts';
import { moveToTrash, restoreDeleted } from '../lib/record-trash.ts';

let environment;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw Error(
      'Usa npm run test:rules. Estas pruebas solo se ejecutan contra el emulador.',
    );
  setLogLevel('silent');
  environment = await initializeTestEnvironment({
    projectId: 'demo-workout-tracker',
    firestore: {
      rules: await readFile(
        new URL('../firestore.rules', import.meta.url),
        'utf8',
      ),
    },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
});
after(async () => {
  await environment?.cleanup();
});
const db = (user) => environment.authenticatedContext(user).firestore();
const repository = (user, firestore = db(user)) =>
  new CloudRepository(
    firebaseRecordDatabase(user, async () => ({
      auth: { currentUser: { uid: user, isAnonymous: false } },
      db: firestore,
    })),
  );

test('el adaptador real consulta fechas y cursores, conserva el historial no cargado y actualiza los resúmenes', async () => {
  const firestore = db('paged');
  const source = {
    ...defaultState,
    cardioLogs: Array.from({ length: 105 }, (_, i) => ({
      id: `a-${i}`,
      date: '2020-02-10T12:00:00.000Z',
      type: 'Caminar',
      minutes: 30,
    })),
    mobilityDone: ['2020-02-10:corta-Open book'],
  };
  await setDoc(doc(firestore, 'users/paged/appState/main'), source);
  const create = () =>
    new PagedCloudRepository(
      firebaseRecordDatabase('paged', async () => ({
        auth: { currentUser: { uid: 'paged', isAnonymous: false } },
        db: firestore,
      })),
    );
  const first = create();
  const initial = await first.load();
  assert.equal(initial.cardioLogs.length, 0);
  assert.equal(historyTotals(initial).cardioMinutes, 3150);
  const month = await first.loadMonth('2020-02');
  assert.equal(month.cardioLogs.length, 105);
  assert.equal(month.mobilityDone.length, 1);
  await first.save(
    {
      ...month,
      cardioLogs: month.cardioLogs.filter((log) => log.id !== 'a-0'),
    },
    month.updatedAt,
    month,
  );
  const other = create();
  const loaded = await other.load();
  assert.equal(loaded.cardioLogs.length, 0);
  assert.equal(historyTotals(loaded).cardioMinutes, 3120);
  const full = await other.loadAll();
  assert.equal(full.cardioLogs.length, 104);
  assert.deepEqual(
    (
      await getDocFromServer(doc(firestore, 'users/paged/appState/main'))
    ).data(),
    source,
  );
});

test('dos clientes paginados mantienen la actualización optimista al hidratar otro mes y sincronizar', async () => {
  const create = () => {
    const firestore = db('paged-live');
    const repo = new PagedCloudRepository(
      firebaseRecordDatabase('paged-live', async () => ({
        auth: { currentUser: { uid: 'paged-live', isAnonymous: false } },
        db: firestore,
      })),
    );
    const events = [];
    const store = new WorkoutPersistence({
      loadLocal: async () => null,
      saveLocal: async () => {},
      backup: async () => {},
      loadCloud: repo.load,
      saveCloud: repo.save,
      subscribeCloud: repo.subscribe,
      onChange: (state) => events.push(state.mobilityDone.slice()),
    });
    return { repo, store, events };
  };
  const first = create(),
    second = create();
  const day = new Date().toISOString().slice(0, 10);
  const key = `${day}:corta-Open book`;
  try {
    await first.store.initialize();
    await first.store.sync();
    await second.store.initialize();
    await second.store.sync();
    first.store.update((state) => ({ ...state, mobilityDone: [key] }));
    const afterMark = first.events.length;
    await first.store.sync();
    await second.store.hydrate(() => second.repo.loadMonth('2020-02'));
    second.store.update((state) => ({ ...state, theme: 'dark' }));
    await second.store.sync();
    await first.store.hydrate(first.repo.load);
    assert.equal(first.store.state.theme, 'dark');
    assert.deepEqual(first.store.state.mobilityDone, [key]);
    assert.ok(
      first.events.slice(afterMark).every((keys) => keys.includes(key)),
    );
    const full = await second.store.hydrate(second.repo.loadAll);
    assert.equal(full.history.complete, true);
    assert.deepEqual(full.mobilityDone, [key]);
  } finally {
    first.store.dispose();
    second.store.dispose();
  }
});

test('owners can query their records; other users and unauthenticated clients cannot read or write them', async () => {
  const alice = db('alice');
  const bob = db('bob');
  const guest = environment.unauthenticatedContext().firestore();
  const path = 'users/alice/records-test/setting%3Atheme';
  await assertSucceeds(
    setDoc(doc(alice, path), {
      key: 'setting:theme',
      value: 'dark',
      sequence: 1,
      deleted: false,
    }),
  );
  await assertSucceeds(
    getDocsFromServer(collection(alice, 'users/alice/records-test')),
  );
  await assertFails(getDocFromServer(doc(bob, path)));
  await assertFails(setDoc(doc(bob, path), { value: 'light' }));
  await assertFails(getDocFromServer(doc(guest, path)));
  await assertFails(
    getDocsFromServer(collection(bob, 'users/alice/records-test')),
  );
});

test('activation locks writes and deletes on the legacy document, preserving it as a recovery copy', async () => {
  const alice = db('alice');
  const legacy = doc(alice, 'users/alice/appState/main');
  await assertSucceeds(
    setDoc(legacy, { ...defaultState, planName: 'Original' }),
  );
  await assertSucceeds(
    setDoc(doc(alice, 'users/alice/appState/records-v1'), {
      schema: 1,
      collection: 'records-test',
      sequence: 0,
    }),
  );
  await assertFails(
    setDoc(legacy, { ...defaultState, planName: 'Old client overwrite' }),
  );
  await assertFails(deleteDoc(legacy));
  assert.equal((await getDocFromServer(legacy)).data().planName, 'Original');
  await assertSucceeds(
    setDoc(doc(alice, 'users/alice/records-test/setting%3AplanName'), {
      key: 'setting:planName',
      value: 'New',
      sequence: 1,
      deleted: false,
    }),
  );
});

test('the production Firestore adapter migrates, paginates, updates deltas and detects concurrent field edits', async () => {
  const alice = db('alice');
  const source = {
    ...defaultState,
    updatedAt: '2026-10-23',
    planName: 'Original',
    measurements: Array.from({ length: 205 }, (_, index) => ({
      id: String(index),
      date: '2026-10-23T12:00:00Z',
      weight: 80 + index / 100,
    })),
  };
  await setDoc(doc(alice, 'users/alice/appState/main'), source);
  const pc = repository('alice', alice);
  const mobile = repository('alice');
  const a = await pc.load();
  const b = await mobile.load();
  assert.equal(a.measurements.length, 205);
  assert.equal(b.planName, 'Original');
  await pc.save({ ...a, theme: 'dark' }, a.updatedAt, a);
  const independent = await mobile.save(
    { ...b, planName: 'Mobile' },
    b.updatedAt,
    b,
  );
  assert.equal(independent.theme, 'dark');
  assert.equal(independent.planName, 'Mobile');
  await assert.rejects(
    pc.save({ ...a, planName: 'PC' }, a.updatedAt, a),
    (error) =>
      error instanceof CloudConflict && error.remote.planName === 'Mobile',
  );
  assert.equal(
    (await getDocFromServer(doc(alice, 'users/alice/appState/main'))).data()
      .planName,
    'Original',
  );
});

test('timed sets, rotation and deleted records survive two real Firestore clients', async () => {
  const pc = repository('alice');
  const mobile = repository('alice');
  const base = await pc.load();
  const exercise = {
    id: 'custom:plank',
    name: 'Plancha',
    mode: 'time',
    loadKind: 'none',
    unit: 'reps',
    targetSeconds: 30,
    target: '2×30 s',
    sets: 2,
    minReps: 8,
    maxReps: 12,
    increment: 0.5,
  };
  const log = {
    id: 'log',
    exercise: 'Plancha',
    exerciseId: exercise.id,
    mode: 'time',
    loadKind: 'none',
    unit: 'reps',
    workoutId: 'workout',
    routine: 'r',
    week: 1,
    date: '2026-10-26T12:00:00Z',
    load: 0,
    rir: 0,
    pain: 0,
    note: '',
    suggestion: 'mantener',
    sets: [{ reps: 0, seconds: 45, done: true }],
  };
  const workout = {
    id: 'workout',
    date: log.date,
    routine: 'r',
    routineName: 'Rutina',
    week: 1,
    notes: '',
    exercises: [{ name: log.exercise, status: 'done', logId: log.id }],
  };
  await pc.save(
    {
      ...base,
      workoutView: 'compact',
      sessions: [{ id: 'r', name: 'Rutina', exercises: [exercise] }],
      exerciseLogs: [log],
      workoutLogs: [workout],
      rotation: { id: 'cycle', startedAt: log.date, routines: ['r'] },
    },
    base.updatedAt,
    base,
  );
  const loaded = await mobile.load();
  assert.equal(loaded.exerciseLogs[0].sets[0].seconds, 45);
  assert.equal(loaded.workoutView, 'compact');
  assert.deepEqual(loaded.rotation.routines, ['r']);
  const deleted = await mobile.save(
    moveToTrash(loaded, 'workoutLogs', 'workout'),
    loaded.updatedAt,
    loaded,
  );
  assert.equal(deleted.exerciseLogs.length, 0);
  const seen = await pc.load();
  assert.equal(seen.trash.length, 1);
  const restored = await pc.save(
    restoreDeleted(seen, seen.trash[0].id),
    seen.updatedAt,
    seen,
  );
  assert.equal(restored.workoutLogs.length, 1);
  assert.equal(restored.exerciseLogs[0].sets[0].seconds, 45);
  assert.equal(restored.trash.length, 0);
});
