import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import { sharePlan, parseSharedPlan, addSharedPlan } from './plan-sharing.ts';

test('compartir excluye los datos personales e importar añade IDs nuevos sin sustituir el plan', () => {
  const exercise = {
    id: 'custom:a',
    name: 'Plancha',
    target: '2×30 s',
    mode: 'time',
    targetSeconds: 30,
    sets: 2,
    minReps: 8,
    maxReps: 12,
    increment: 0.5,
  };
  const state = {
    ...defaultState,
    planName: 'Mi plan',
    sessions: [
      { id: 'a', name: 'A', exercises: [exercise] },
      { id: 'b', name: 'B', exercises: [] },
    ],
    measurements: [{ id: 'private', date: '2026-10-25', weight: 70 }],
  };
  const shared = sharePlan(state, ['a']);
  assert.equal(shared.sessions.length, 1);
  assert.equal('measurements' in shared, false);
  assert.equal(JSON.stringify(shared).includes('private'), false);
  const read = parseSharedPlan(JSON.stringify(shared));
  const result = addSharedPlan(state, read, false, () => 'new');
  assert.equal(result.sessions.length, 3);
  assert.equal(result.sessions[2].id, 'new');
  assert.equal(result.sessions[2].exercises[0].id, exercise.id);
  assert.deepEqual(result.measurements, state.measurements);
  assert.equal(result.plan, state.plan);
});
test('rechaza archivos arbitrarios y referencias a rutinas que faltan', () => {
  assert.throws(() => parseSharedPlan(JSON.stringify(defaultState)), /archivo/);
  assert.throws(
    () =>
      parseSharedPlan(
        JSON.stringify({
          format: 'base-plan',
          version: 1,
          sessions: [{ id: 'a', name: 'A', exercises: [] }],
          periods: [
            { id: 'p', name: 'Plan', durationWeeks: 2, routines: ['missing'] },
          ],
        }),
      ),
    /faltan/,
  );
});
