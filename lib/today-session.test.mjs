import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from './storage.ts';
import { buildWorkoutReview, exerciseLogDraft } from './today-session.ts';

const exercise = {
  id: 'custom:a',
  name: 'Nombre nuevo',
  sets: 2,
  minReps: 8,
  maxReps: 12,
  unit: 'kg',
};
const identity = { id: 'workout', week: 1, routine: 'a' };
const current = {
  exercise,
  load: 40,
  sets: [{ reps: 10, done: true }],
  rir: 2,
  pain: 0,
  note: 'Nota',
};
test('la revisión reutiliza la identidad del registro aunque cambie el nombre y no altera el estado', () => {
  const old = {
    ...exerciseLogDraft(current, identity, '2020-01-10', 'stable-id'),
    exercise: 'Nombre antiguo',
  };
  const state = {
    ...defaultState,
    exerciseLogs: [old],
    sessions: [{ id: 'a', name: 'Rutina A', exercises: [exercise] }],
    rotation: { id: 'rotation', routines: ['a'], startedAt: '2020-01-01' },
  };
  const review = buildWorkoutReview(
    state,
    identity,
    [exercise],
    current,
    '2026-10-26',
  );
  assert.equal(review.logs.length, 1);
  assert.equal(review.currentExerciseLog.id, 'stable-id');
  assert.equal(review.workout.rotationId, 'rotation');
  assert.equal(review.workout.exercises[0].status, 'done');
  assert.equal(state.exerciseLogs[0].exercise, 'Nombre antiguo');
});
test('las series pendientes no se inventan como completadas y omitir conserva sus valores', () => {
  const pending = { ...current, sets: [{ reps: 10, done: false }] };
  const review = buildWorkoutReview(
    defaultState,
    identity,
    [exercise],
    pending,
    '2026-10-26',
  );
  assert.equal(review.currentExerciseLog, undefined);
  assert.equal(review.workout.exercises[0].status, 'pending');
  const skipped = exerciseLogDraft(
    pending,
    identity,
    '2026-10-26',
    undefined,
    true,
  );
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.sets[0].reps, 10);
});
