import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { onlineManager } from '@tanstack/react-query';
import { AccountSync } from './account-sync.ts';
import { CloudConflict } from './cloud-records.ts';
import {
  createLocalRepository,
  LOCAL_PENDING_ID,
  hasLocalData,
  localImportSnapshot,
} from './local-repository.ts';
import {
  defaultState,
  loadLocalState,
  saveLocalState,
  loadPendingChanges,
  savePendingChanges,
} from './storage.ts';
import { backupPreview, importBackup } from './backup-import.ts';

async function localSession() {
  const repo = createLocalRepository();
  const store = new AccountSync({
    localOnly: true,
    loadLocal: () => loadLocalState(),
    saveLocal: async () => {},
    backup: async () => {},
    loadCloud: repo.load,
    saveCloud: repo.save,
    subscribeCloud: repo.subscribe,
    loadPending: () => loadPendingChanges(LOCAL_PENDING_ID),
    savePending: (value) => savePendingChanges(LOCAL_PENDING_ID, value),
  });
  await store.initialize();
  await store.sync();
  return store;
}

test('local mode persists without an account or a network and survives reopening', async () => {
  await saveLocalState(defaultState);
  await saveLocalState(
    { ...defaultState, planName: 'Private cloud cache' },
    'cloud-user',
  );
  onlineManager.setOnline(false);
  const store = await localSession();
  try {
    assert.equal(store.status.canEdit, true);
    assert.equal(store.status.cloud, 'local');
    store.update((state) => ({
      ...state,
      planName: 'My local plan',
      mobilityDone: ['2026-10-26:corta-Open book'],
    }));
    assert.equal(
      store.client.getQueryData(store.stateKey).planName,
      'My local plan',
    );
    await store.sync();
    assert.equal(store.status.localOnly, true);
    assert.equal(store.status.cloud, 'local');
    assert.equal((await loadLocalState()).planName, 'My local plan');
    assert.equal(
      (await loadLocalState('cloud-user')).planName,
      'Private cloud cache',
    );
    assert.equal(await loadPendingChanges(LOCAL_PENDING_ID), null);
    store.dispose();
    const reopened = await localSession();
    try {
      assert.equal(reopened.state.planName, 'My local plan');
      assert.deepEqual(reopened.state.mobilityDone, [
        '2026-10-26:corta-Open book',
      ]);
    } finally {
      reopened.dispose();
      reopened.client.clear();
    }
  } finally {
    onlineManager.setOnline(true);
    store.dispose();
    store.client.clear();
  }
});

test('two local tabs merge independent edits atomically and reject competing edits', async () => {
  await saveLocalState(defaultState);
  const one = createLocalRepository(),
    two = createLocalRepository();
  const base = await one.load();
  await Promise.all([
    one.save({ ...base, planName: 'Local routine' }, null, base),
    two.save({ ...base, theme: 'dark' }, null, base),
  ]);
  const merged = await one.load();
  assert.equal(merged.planName, 'Local routine');
  assert.equal(merged.theme, 'dark');
  await one.save(
    { ...merged, planName: 'First edit' },
    merged.updatedAt,
    merged,
  );
  await assert.rejects(
    two.save({ ...merged, planName: 'Other edit' }, merged.updatedAt, merged),
    CloudConflict,
  );
  assert.equal((await one.load()).planName, 'First edit');
});

test('local changes recover from the durable outbox after an interrupted write', async () => {
  await saveLocalState(defaultState);
  await savePendingChanges(LOCAL_PENDING_ID, {
    base: defaultState,
    state: { ...defaultState, planName: 'Recovered local routine' },
  });
  const store = await localSession();
  try {
    assert.equal(store.state.planName, 'Recovered local routine');
    assert.equal((await loadLocalState()).planName, 'Recovered local routine');
    assert.equal(await loadPendingChanges(LOCAL_PENDING_ID), null);
  } finally {
    store.dispose();
    store.client.clear();
  }
});

test('connecting an account does not promote local records without an explicit import', async () => {
  const local = {
    ...defaultState,
    mobilityDone: ['2026-10-26:corta-Open book'],
    warmupDone: ['2026-10-26:A1'],
    classes: ['2026-10-26'],
  };
  const cloud = {
    ...defaultState,
    planName: 'Cloud plan',
    theme: 'dark',
    mobilityDone: ['2026-10-25:corta-Open book'],
  };
  assert.equal(hasLocalData(defaultState), false);
  assert.equal(hasLocalData(local), true);
  await saveLocalState(local);
  const writes = [];
  const store = new AccountSync({
    loadLocal: async () => null,
    saveLocal: async () => {},
    backup: async () => {},
    loadCloud: async () => cloud,
    saveCloud: async (value) => {
      writes.push(value);
      return value;
    },
  });
  try {
    await store.initialize();
    await store.sync();
    assert.equal(writes.length, 0);
    assert.equal(store.state.planName, 'Cloud plan');
    const options = { includePlan: false, replaceConflicts: false };
    const preview = backupPreview(store.state, local);
    assert.equal(
      preview.find((row) => row.key === 'mobilityDone').additions,
      1,
    );
    store.update((state) => importBackup(state, local, options));
    await store.sync();
    assert.deepEqual(store.state.mobilityDone, [
      ...cloud.mobilityDone,
      ...local.mobilityDone,
    ]);
    assert.deepEqual(store.state.warmupDone, local.warmupDone);
    assert.deepEqual(store.state.classes, local.classes);
    assert.equal(store.state.theme, 'dark');
    assert.equal(store.state.planName, 'Cloud plan');
    assert.deepEqual((await loadLocalState()).mobilityDone, local.mobilityDone);
    assert.deepEqual(importBackup(store.state, local, options), store.state);
  } finally {
    store.dispose();
    store.client.clear();
  }
});

test('local import preserves unfinished work locally and transfers only finished exercise logs', () => {
  const local = {
    ...defaultState,
    cloudRevision: 8,
    history: {
      complete: false,
      loadedMonths: [],
      generation: 1,
      summaries: [],
    },
    activeWorkouts: [{ id: 'active' }],
    exerciseLogs: [
      { id: 'working', workoutId: 'active' },
      { id: 'finished', workoutId: 'done' },
    ],
  };
  const incoming = localImportSnapshot(local);
  assert.deepEqual(incoming.activeWorkouts, []);
  assert.deepEqual(
    incoming.exerciseLogs.map((log) => log.id),
    ['finished'],
  );
  assert.equal(incoming.history, undefined);
  assert.equal(incoming.cloudRevision, undefined);
  assert.equal(local.activeWorkouts.length, 1);
  assert.equal(local.exerciseLogs.length, 2);
});
