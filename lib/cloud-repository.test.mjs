import assert from 'node:assert/strict';
import test from 'node:test';
import { CloudRepository } from './cloud-repository.ts';
import { CloudConflict, equal, mergeStates, stateRecords, recordsState } from './cloud-records.ts';
import { defaultState } from './storage.ts';
import { WorkoutPersistence } from './persistence.ts';

function database(initial) {
  const data = new Map(initial ? [['appState/main', structuredClone(initial)]] : []);
  const listeners = new Set(); const pages = [];
  let queue = Promise.resolve();
  const backend = {
    get: async path => structuredClone(data.get(path) ?? null),
    page: async (collection, after, since) => {
      pages.push({ collection, after, since });
      return [...data].filter(([path, row]) => path.startsWith(`${collection}/`) && (since === undefined || row.sequence > since))
        .map(([path, record]) => ({ id: path.slice(collection.length + 1), record }))
        .sort((a, b) => (since === undefined ? 0 : a.record.sequence - b.record.sequence) || a.id.localeCompare(b.id))
        .filter(row => !after || (since !== undefined && row.record.sequence > after.sequence) || ((since === undefined || row.record.sequence === after.sequence) && row.id.localeCompare(after.id) > 0))
        .slice(0, 100).map(row => structuredClone(row));
    },
    batch: async entries => { for (const { path, value } of entries) data.set(path, structuredClone(value)); },
    transaction: action => {
      const task = queue.catch(() => undefined).then(async () => {
        const writes = [];
        const result = await action({ get: backend.get, set: (path, value) => writes.push({ path, value }) });
        await backend.batch(writes);
        if (writes.some(row => row.path === 'appState/records-v1')) for (const listener of listeners) queueMicrotask(listener);
        return result;
      });
      queue = task; return task;
    },
    listen: (_path, listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { backend, data, pages };
}
const initial = () => ({ ...defaultState, planName: 'Mi plan', updatedAt: '2026-10-20', sessions: [{ id: 'a', name: 'A', exercises: [{ name: 'Remo', sets: 3 }] }] });
const connect = async repository => { const state = await repository.load(); return state; };

test('records round trip preserves the plan, order and every history entry', () => {
  const state = { ...initial(), cardioLogs: [{ id: '1', date: '2026-10-20', type: 'Caminar', minutes: 30 }] };
  const roundtrip = recordsState(stateRecords(state), state.updatedAt);
  assert.ok(equal([...stateRecords(state)].sort(([a], [b]) => a.localeCompare(b)), [...stateRecords(roundtrip)].sort(([a], [b]) => a.localeCompare(b))));
  assert.deepEqual(roundtrip.sessions, state.sessions);
  assert.deepEqual(roundtrip.cardioLogs, state.cardioLogs);
});

test('migration is verified, paginated and idempotent, preserving the legacy document', async () => {
  const state = { ...initial(), measurements: Array.from({ length: 405 }, (_, i) => ({ id: String(i), date: '2026-10-20', weight: 80 + i / 100 })) };
  const fixture = database(state); const repository = new CloudRepository(fixture.backend);
  const downloaded = await connect(repository);
  assert.equal(downloaded.measurements.length, 405);
  assert.deepEqual(fixture.data.get('appState/main'), state);
  assert.ok(fixture.pages.some(page => page.after));
  const count = fixture.data.size;
  await new CloudRepository(fixture.backend).load();
  assert.equal(fixture.data.size, count);
  assert.equal(fixture.data.get('appState/records-v1').verifiedRecords, stateRecords(state).size);
});

test('interrupted or corrupted copies cannot activate the new schema', async () => {
  const fixture = database(initial());
  const batch = fixture.backend.batch;
  fixture.backend.batch = async entries => batch(entries.slice(1));
  await assert.rejects(new CloudRepository(fixture.backend).load(), /comprobación/);
  assert.equal(fixture.data.has('appState/records-v1'), false);
  assert.equal(fixture.data.get('appState/main').planName, 'Mi plan');
  fixture.backend.batch = batch;
  assert.equal((await new CloudRepository(fixture.backend).load()).planName, 'Mi plan');
});

test('a concurrent legacy change during migration is never silently lost', async () => {
  const fixture = database(initial()); const batch = fixture.backend.batch;
  fixture.backend.batch = async entries => { await batch(entries); fixture.data.set('appState/main', { ...initial(), planName: 'New version' }); };
  await assert.rejects(new CloudRepository(fixture.backend).load(), /cambiaron/);
  assert.equal(fixture.data.has('appState/records-v1'), false);
});

test('concurrent migration copies use isolated staging collections', async () => {
  const fixture = database(initial()); const batch = fixture.backend.batch;
  let resume; const delayed = new Promise(resolve => { resume = resolve; }); let firstCollection;
  let entered; const copying = new Promise(resolve => { entered = resolve; });
  fixture.backend.batch = async entries => {
    const collection = entries[0]?.path.split('/')[0];
    if (!firstCollection) { firstCollection = collection; entered(); await delayed; }
    await batch(entries);
  };
  const slow = new CloudRepository(fixture.backend); const pending = slow.load(); await copying;
  const fast = new CloudRepository(fixture.backend); const state = await fast.load();
  await fast.save({ ...state, planName: 'Edited after activation' }, state.updatedAt, state);
  resume(); const result = await pending;
  assert.equal(result.planName, 'Edited after activation');
  assert.notEqual(fixture.data.get('appState/records-v1').collection, firstCollection);
});

test('two devices merge different records and different fields of the same series', async () => {
  const fixture = database({ ...initial(), exerciseLogs: [{ id: 'e', date: '2026-10-20', workoutId: 'w', exercise: 'Remo', week: 1, routine: 'a', load: 20, sets: [{ reps: 10, done: false }], rir: 2, pain: 0, note: '', suggestion: 'mantener' }] });
  const first = new CloudRepository(fixture.backend); const second = new CloudRepository(fixture.backend);
  const a = await first.load(); const b = await second.load();
  await first.save({ ...a, exerciseLogs: a.exerciseLogs.map(log => ({ ...log, sets: [{ reps: 12, done: false }] })) }, a.updatedAt, a);
  const result = await second.save({ ...b, planName: 'Changed title', exerciseLogs: b.exerciseLogs.map(log => ({ ...log, sets: [{ reps: 10, done: true }] })) }, b.updatedAt, b);
  assert.equal(result.planName, 'Changed title');
  assert.deepEqual(result.exerciseLogs[0].sets, [{ reps: 12, done: true }]);
});

test('independent routine additions merge without turning their order into a global conflict', async () => {
  const fixture = database(initial()); const first = new CloudRepository(fixture.backend); const second = new CloudRepository(fixture.backend);
  const a = await first.load(); const b = await second.load();
  await first.save({ ...a, sessions: [...a.sessions, { id: 'pc', name: 'PC', exercises: [] }] }, a.updatedAt, a);
  const result = await second.save({ ...b, sessions: [...b.sessions, { id: 'mobile', name: 'Mobile', exercises: [] }] }, b.updatedAt, b);
  assert.deepEqual(new Set(result.sessions.map(item => item.id)), new Set(['a', 'pc', 'mobile']));
});

test('same-field edits produce a conflict with both versions, resolved explicitly', async () => {
  const fixture = database(initial()); const a = new CloudRepository(fixture.backend); const b = new CloudRepository(fixture.backend);
  const beforeA = await a.load(); const beforeB = await b.load();
  await a.save({ ...beforeA, planName: 'PC' }, beforeA.updatedAt, beforeA);
  let conflict;
  try { await b.save({ ...beforeB, planName: 'Móvil' }, beforeB.updatedAt, beforeB); } catch (error) { conflict = error; }
  assert.ok(conflict instanceof CloudConflict);
  assert.equal(conflict.remote.planName, 'PC');
  assert.deepEqual(conflict.conflicts, [{ path: 'setting:planName', local: 'Móvil', remote: 'PC' }]);
  const merged = mergeStates(beforeB, { ...beforeB, planName: 'Móvil' }, conflict.remote, { 'setting:planName': 'local' });
  const saved = await b.save(merged.state, conflict.remote.updatedAt, conflict.remote);
  assert.equal(saved.planName, 'Móvil');
});

test('a deleted record stays deleted when a stale device edits unrelated fields', async () => {
  const fixture = database(initial()); const a = new CloudRepository(fixture.backend); const b = new CloudRepository(fixture.backend);
  const before = await a.load(); await b.load();
  await a.save({ ...before, sessions: [] }, before.updatedAt, before);
  const result = await b.save({ ...before, planName: 'Title' }, before.updatedAt, before);
  assert.deepEqual(result.sessions, []);
  assert.equal(result.planName, 'Title');
});

test('live updates refresh another device and disposal detaches the listener', async () => {
  const fixture = database(initial()); const a = new CloudRepository(fixture.backend); const b = new CloudRepository(fixture.backend);
  const state = await a.load(); await b.load();
  let resolve; const delivered = new Promise(done => { resolve = done; });
  const unsubscribe = b.subscribe(resolve, error => { throw error; });
  await a.save({ ...state, planName: 'Live' }, state.updatedAt, state);
  assert.equal((await delivered).planName, 'Live'); unsubscribe();
  assert.ok(fixture.pages.some(page => page.since === 0));
});

test('persistence resolves a real repository conflict without uploading a stale account snapshot', async () => {
  const fixture = database(initial());
  const makeStore = () => { const repo = new CloudRepository(fixture.backend); return new WorkoutPersistence({ loadLocal: async () => null, saveLocal: async () => {}, backup: async () => {}, loadCloud: repo.load, saveCloud: repo.save, onChange: () => {} }); };
  const first = makeStore(); const second = makeStore();
  await first.initialize(); await first.sync(); await second.initialize(); await second.sync();
  first.update(state => ({ ...state, planName: 'PC' })); await first.sync();
  second.update(state => ({ ...state, planName: 'Móvil' })); await second.sync();
  assert.equal(second.status.conflicts[0].path, 'setting:planName');
  await second.resolveConflicts({ 'setting:planName': 'remote' });
  assert.equal(second.state.planName, 'PC'); assert.equal(second.status.canEdit, true);
});

test('explicit pending changes survive a reload, merge with Firebase and clear only after confirmation', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend);
  let pending = null; let offline = false;
  const dependencies = repository => ({ loadLocal: async () => pending?.state ?? null, saveLocal: async () => {}, backup: async () => {}, loadCloud: repository.load, saveCloud: (...args) => { if (offline) throw Error('offline'); return repository.save(...args); }, loadPending: async () => structuredClone(pending), savePending: async value => { pending = structuredClone(value); }, onChange: () => {} });
  const first = new WorkoutPersistence(dependencies(repo)); await first.initialize(); await first.sync();
  offline = true; first.update(state => ({ ...state, theme: 'dark' })); await first.flushLocal(); await first.sync();
  assert.equal(pending.state.theme, 'dark'); first.dispose();
  const pc = new CloudRepository(fixture.backend); const before = await pc.load();
  await pc.save({ ...before, planName: 'PC' }, before.updatedAt, before);
  offline = false;
  const reloaded = new WorkoutPersistence(dependencies(new CloudRepository(fixture.backend)));
  await reloaded.initialize(); await reloaded.sync();
  assert.equal(reloaded.state.theme, 'dark'); assert.equal(reloaded.state.planName, 'PC');
  assert.equal(pending, null); assert.equal(reloaded.status.cloud, 'synced');
});

test('recovered edits to the same field stay pending until a choice is made', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend); const base = await repo.load();
  await repo.save({ ...base, planName: 'PC' }, base.updatedAt, base);
  const store = new WorkoutPersistence({ loadLocal: async () => null, saveLocal: async () => {}, backup: async () => {}, loadCloud: repo.load, saveCloud: repo.save, loadPending: async () => ({ base, state: { ...base, planName: 'Mobile' } }), onChange: () => {} });
  await store.initialize(); await store.sync();
  assert.equal(store.status.canEdit, false); assert.equal(store.status.conflicts[0].local, 'Mobile');
  await store.resolveConflicts({ 'setting:planName': 'local' });
  assert.equal(store.state.planName, 'Mobile'); assert.equal((await repo.load()).planName, 'Mobile');
});

test('a delayed old live snapshot cannot roll back confirmed data', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend);
  let notify;
  const store = new WorkoutPersistence({ loadLocal: async () => null, saveLocal: async () => {}, backup: async () => {}, loadCloud: repo.load, saveCloud: repo.save, subscribeCloud: callback => { notify = callback; return () => {}; }, onChange: () => {} });
  await store.initialize(); await store.sync(); const old = store.state;
  store.update(state => ({ ...state, planName: 'New' })); await store.sync();
  notify(old); await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.state.planName, 'New'); assert.equal(store.status.canEdit, true);
});

test('an unreadable outbox cannot be cleared or announced as saved', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend);
  let readable = false; let cleared = false;
  const store = new WorkoutPersistence({ loadLocal: async () => null, saveLocal: async () => {}, backup: async () => {}, loadCloud: repo.load, saveCloud: repo.save, loadPending: async () => { if (!readable) throw Error('IndexedDB unavailable'); return { base: initial(), state: { ...initial(), theme: 'dark' } }; }, savePending: async value => { if (!value) cleared = true; }, onChange: () => {} });
  await store.initialize(); await store.sync();
  assert.equal(store.status.canEdit, false); assert.equal(cleared, false);
  readable = true; await store.sync();
  assert.equal(store.state.theme, 'dark'); assert.equal(store.status.cloud, 'synced'); assert.equal(cleared, true);
});

test('large imports respect the server request limit instead of grouping only by record count', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend); const base = await repo.load();
  const transaction = fixture.backend.transaction; let writes = 0;
  fixture.backend.transaction = action => transaction(async tx => {
    let bytes = 0;
    const result = await action({ get: tx.get, set: (path, value) => { bytes += new TextEncoder().encode(JSON.stringify(value)).length; tx.set(path, value); } });
    if (bytes > 10_000_000) throw Error('server request too large');
    writes++; return result;
  });
  const measurements = Array.from({ length: 25 }, (_, index) => ({ id: String(index), date: '2026-10-23T12:00:00Z', weight: 80, extra: 'x'.repeat(450000) }));
  const saved = await repo.save({ ...base, measurements }, base.updatedAt, base);
  assert.equal(saved.measurements.length, 25);
  assert.ok(writes > 1);
});

test('retrying a failed listener must contact the server before announcing synced', async () => {
  const fixture = database(initial()); const repo = new CloudRepository(fixture.backend);
  let offline = false; let fail;
  const store = new WorkoutPersistence({ loadLocal: async () => null, saveLocal: async () => {}, backup: async () => {}, loadCloud: () => { if (offline) throw Error('offline'); return repo.load(); }, saveCloud: repo.save, subscribeCloud: (_change, error) => { fail = error; return () => {}; }, onChange: () => {} });
  await store.initialize(); await store.sync();
  offline = true; fail(Error('offline')); await store.sync();
  assert.equal(store.status.cloud, 'error'); assert.equal(store.status.canEdit, false);
  offline = false; await store.sync();
  assert.equal(store.status.cloud, 'synced'); assert.equal(store.status.canEdit, true);
});
