import test from 'node:test';
import assert from 'node:assert/strict';
import { moveItem } from './list-order.ts';

test('moving an exercise preserves its settings and identity without mutating the routine', () => {
  const first = { name: 'Remo', restSeconds: 90, restEnabled: false };
  const second = { name: 'Press', restSeconds: 60 };
  const routine = [first, second];
  assert.deepEqual(moveItem(routine, 0, 1), [second, first]);
  assert.deepEqual(routine, [first, second]);
  assert.equal(moveItem(routine, 0, -1), routine);
  assert.equal(moveItem(routine, 1, 1), routine);
  assert.equal(moveItem(routine, -1, 1), routine);
});
