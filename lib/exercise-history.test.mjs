import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import { exerciseHistory } from './exercise-history.ts';
import { sameExercise } from './exercise-identity.ts';

test('la identidad estable permite renombrar sin unir ejercicios diferentes por parecido', () => {
  const exercise = { id: 'custom:a', name: 'Nuevo nombre', unit: 'kg' };
  assert.equal(sameExercise({ exerciseId: 'custom:a', exercise: 'Antiguo nombre' }, exercise), true);
  assert.equal(sameExercise({ exerciseId: 'custom:b', exercise: 'Nuevo nombre' }, exercise), false);
  assert.equal(sameExercise({ exercise: 'Press' }, { name: 'Press de pierna' }), false);
});
test('el historial excluye aproximaciones, pendientes, activos, saltados y unidades diferentes', () => {
  const base = { id: '1', exercise: 'Press', exerciseId: 'catalog:1', unit: 'kg', date: '2026-10-01', load: 20, sets: [{ reps: 5, load: 100, done: true, kind: 'warmup' }, { reps: 10, load: 25, done: true }, { reps: 12, done: false }], skipped: false };
  const state = { ...defaultState, activeWorkouts: [{ id: 'active' }], exerciseLogs: [base, { ...base, id: '2', skipped: true }, { ...base, id: '3', workoutId: 'active' }, { ...base, id: '4', unit: 'reps' }] };
  const history = exerciseHistory(state, { catalogId: '1', name: 'Press', unit: 'kg' });
  assert.equal(history.length, 1);
  assert.equal(history[0].load, 25);
  assert.equal(history[0].volume, 250);
  assert.equal(history[0].totalReps, 10);
});
