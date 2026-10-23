import test from 'node:test';
import assert from 'node:assert/strict';
import { restPreferences, restDuration, exerciseRestSeconds, exerciseRestPreferences } from './rest-preferences.ts';

test('existing accounts keep automatic rest of 90 seconds without modifying the plan', () => {
  const account = { planName: 'Mi plan' };
  assert.deepEqual(restPreferences(account), { enabled: true, seconds: 90 });
  assert.deepEqual(account, { planName: 'Mi plan' });
});

test('each exercise controls its activation and time independently while old preferences stay readable', () => {
  const legacy = { restEnabled: false, restSeconds: 120 };
  const exercise = { restEnabled: true, restSeconds: 60 };
  assert.deepEqual(exerciseRestPreferences(exercise, legacy), { enabled: true, seconds: 60 });
  assert.deepEqual(exerciseRestPreferences({}, legacy), { enabled: false, seconds: 120 });
  assert.deepEqual(exerciseRestPreferences({ restEnabled: false, restSeconds: 75 }, { restEnabled: true }), { enabled: false, seconds: 75 });
  assert.deepEqual(exerciseRestPreferences({}), { enabled: true, seconds: 90 });
  assert.deepEqual(legacy, { restEnabled: false, restSeconds: 120 });
});
test('disabling automatic rest preserves the chosen duration for later', () => {
  assert.deepEqual(restPreferences({ restEnabled: false, restSeconds: 120 }), { enabled: false, seconds: 120 });
});
test('rest duration accepts whole seconds between 15 and 600 and handles invalid stored values', () => {
  assert.equal(restDuration(120), 120);
  assert.equal(restDuration(60.6), 61);
  assert.equal(restDuration(0), 15);
  assert.equal(restDuration(999), 600);
  for (const value of [null, undefined, '120', NaN, Infinity]) assert.equal(restDuration(value), 90);
});
test('an exercise can override the account rest without changing the global duration', () => {
  const account = restPreferences({ restSeconds: 120 });
  assert.equal(exerciseRestSeconds({}, account.seconds), 120);
  assert.equal(exerciseRestSeconds({ restSeconds: 75 }, account.seconds), 75);
  assert.equal(exerciseRestSeconds({ restSeconds: 900 }, account.seconds), 600);
  assert.equal(exerciseRestSeconds({ restSeconds: NaN }, account.seconds), 120);
  assert.equal(account.seconds, 120);
});
