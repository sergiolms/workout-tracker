import test from 'node:test';
import assert from 'node:assert/strict';
import { restPreferences, restDuration } from './rest-preferences.ts';

test('existing accounts keep automatic rest of 90 seconds without modifying the plan', () => {
  const account = { planName: 'Mi plan' };
  assert.deepEqual(restPreferences(account), { enabled: true, seconds: 90 });
  assert.deepEqual(account, { planName: 'Mi plan' });
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
