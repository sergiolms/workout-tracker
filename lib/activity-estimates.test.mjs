import test from 'node:test';
import assert from 'node:assert/strict';
import { activityEstimates, formatPace } from './activity-estimates.ts';

test('pace and speed use distance and duration, while steps depend on the chosen step length', () => {
  const result = activityEstimates(30, 2.5, 70);
  assert.equal(result.paceSeconds, 720);
  assert.equal(formatPace(result.paceSeconds), '12:00');
  assert.equal(result.speed, 5);
  assert.equal(result.steps, 3571);
  assert.equal(activityEstimates(30, 2.5, 50).steps, 5000);
  assert.equal(formatPace(599), '9:59');
});
test('missing or invalid data never produces invented counts, Infinity or NaN', () => {
  for (const distance of [0, -1, NaN, Infinity]) assert.deepEqual(activityEstimates(30, distance), { paceSeconds: null, speed: null, steps: null });
  assert.equal(activityEstimates(0, 2.5).paceSeconds, null);
  assert.equal(activityEstimates(30, 2.5, 0).steps, null);
  assert.equal(activityEstimates(30, 2.5, 151).steps, null);
  assert.equal(formatPace(null), '—');
});
