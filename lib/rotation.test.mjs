import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import { nextRotationRoutine } from './rotation.ts';
import { completedPlanSlots } from './plan-progress.ts';
test('la rotación sigue el trabajo real, vuelve al inicio y no completa el plan semanal', () => {
  const state = {
    ...defaultState,
    sessions: [{ id: 'a' }, { id: 'b' }],
    rotation: {
      id: 'cycle',
      startedAt: '2026-10-01',
      routines: ['a', 'b', 'deleted'],
    },
  };
  const workout = {
    id: 'w',
    week: 1,
    routine: 'a',
    rotationId: 'cycle',
    date: '2026-10-20',
    exercises: [{ status: 'done' }],
  };
  assert.equal(nextRotationRoutine(state), 'a');
  assert.equal(nextRotationRoutine(state, [workout]), 'b');
  assert.equal(nextRotationRoutine(state, [{ ...workout, routine: 'b' }]), 'a');
  assert.equal(
    nextRotationRoutine(state, [{ ...workout, rotationId: 'old' }]),
    'a',
  );
  assert.equal(
    nextRotationRoutine(state, [
      { ...workout, exercises: [{ status: 'skipped' }] },
    ]),
    'a',
  );
  assert.equal(completedPlanSlots([workout]).size, 0);
  assert.equal(
    completedPlanSlots([
      { ...workout, rotationId: undefined, source: 'manual' },
    ]).size,
    0,
  );
});
