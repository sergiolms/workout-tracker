import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkLog } from './walk-log.ts';

test('walk tool records supplied minutes and steps without inventing distance or effort', () => {
  const log = createWalkLog({ minutes: 30, steps: 2500 });
  assert.equal(log.minutes, 30);
  assert.equal(log.steps, 2500);
  assert.equal(log.rpe, undefined);
  assert.equal(log.distance, undefined);
});
test('walk tool rejects malformed and out-of-range payloads', () => {
  for (const value of [null, { minutes: '30', steps: 20 }, { minutes: 1, steps: 2.5 }, { minutes: 1500, steps: 0 }, { minutes: 20, steps: 100, rpe: 4 }, { minutes: NaN, steps: 2 }]) assert.throws(() => createWalkLog(value));
});
