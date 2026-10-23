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
import { CloudConflict } from '../lib/cloud-records.ts';
import { defaultState } from '../lib/storage.ts';

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
