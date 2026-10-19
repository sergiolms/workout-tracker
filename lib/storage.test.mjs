import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { backupLocalState, clearAppLocalData, defaultState, loadLocalState, saveLocalState } from './storage.ts';

const state = (name) => ({ ...defaultState, planName: name, sessions: [{ id: 'A1', name, exercises: [] }] });
async function record(key, value) {
  const db = await new Promise((resolve, reject) => { const r = indexedDB.open('base-workout', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('state', value ? 'readwrite' : 'readonly');
      const r = value ? tx.objectStore('state').put(value, key) : tx.objectStore('state').get(key);
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

test('IndexedDB conserva sesiones al volver a abrir y separa las cuentas', async () => {
  await saveLocalState(state('Plan A'), 'a');
  await saveLocalState(state('Plan B'), 'b');
  assert.equal((await loadLocalState('a')).sessions[0].name, 'Plan A');
  assert.equal((await loadLocalState('b')).planName, 'Plan B');
  assert.equal(await loadLocalState('sin-cuenta'), null);
  assert.equal(await loadLocalState(), null);
});

test('cerrar sesión conserva la base local de todas las cuentas', async () => {
  await saveLocalState(state('Plan protegido'), 'logout');
  await clearAppLocalData();
  assert.equal((await loadLocalState('logout')).planName, 'Plan protegido');
  assert.equal((await loadLocalState('a')).planName, 'Plan A');
});

test('conserva respaldos e ignora el antiguo registro main al cargar cuentas', async () => {
  await record('main', state('Plan original'));
  await backupLocalState(state('Original'), 'backup', 'local');
  await backupLocalState(state('Posterior'), 'backup', 'local');
  assert.equal((await record('backup:backup:local:unversioned')).planName, 'Original');
  assert.equal((await record('main')).planName, 'Plan original');
  assert.equal(await loadLocalState('nueva-cuenta'), null);
  assert.equal(await loadLocalState(), null);
});
