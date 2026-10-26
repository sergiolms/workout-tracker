import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import { exerciseSets } from './exercise-sets.ts';
import { exerciseHistory } from './exercise-history.ts';
import { exerciseRecommendation } from './exercise-log.ts';
import { withExercisePrescription } from './exercise-prescription.ts';
import { exerciseLogMetadata } from './exercise-identity.ts';
import { parseBackup } from './backup-import.ts';

test('los ejercicios por tiempo guardan segundos sin inventar repeticiones', () => {
  const exercise = { id: 'plank', name: 'Plancha', mode: 'time', unit: 'reps', loadKind: 'none', sets: 2, targetSeconds: 40, minReps: 8, maxReps: 12, target: '2×8–12', increment: .5 };
  const sets = exerciseSets(exercise).map(set => ({ ...set, done: true }));
  assert.equal(sets[0].seconds, 40);
  assert.equal(sets[0].reps, 0);
  assert.equal(withExercisePrescription(exercise, {}).target, '2×40 s');
  const log = { id: 'log', date: '2026-10-25', week: 1, routine: 'r', exercise: 'Plancha', ...exerciseLogMetadata(exercise), load: 0, sets, rir: 0, pain: 0, note: '', suggestion: 'mantener' };
  const state = { ...defaultState, exerciseLogs: [log] };
  assert.equal(exerciseHistory(state, exercise)[0].seconds, 40);
  assert.deepEqual(parseBackup(JSON.stringify(state)).exerciseLogs, [log]);
  assert.equal(exerciseRecommendation(exercise, log).suggestion, 'mantener');
});
test('el historial no mezcla carga total y por mancuerna ni interpreta ayuda como peso levantado', () => {
  const base = { id: '1', date: '2026-10-25', exercise: 'Press', load: 20, unit: 'kg', sets: [{ reps: 10, load: 20, done: true }], loadKind: 'perHand' };
  const state = { ...defaultState, exerciseLogs: [base, { ...base, id: '2', loadKind: 'total' }] };
  const rows = exerciseHistory(state, { name: 'Press', unit: 'kg', loadKind: 'perHand' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].volume, 400);
  const result = exerciseRecommendation({ name: 'Dominada asistida', unit: 'kg', loadKind: 'assistance', target: '1×10', sets: 1, minReps: 10, maxReps: 10 }, { sets: base.sets, rir: 2, pain: 0 });
  assert.equal(result.suggestion, 'mantener');
});
test('la progresión manual no sugiere subir y la doble exige todas las series previstas', () => {
  const exercise = { name: 'Press', unit: 'kg', target: '2×8–12 · RIR 2', sets: 2, minReps: 8, maxReps: 12, minRir: 2 };
  const log = { sets: [{ reps: 12, load: 20, done: true }, { reps: 12, load: 20, done: true }], rir: 2, pain: 0 };
  assert.equal(exerciseRecommendation(exercise, log).suggestion, 'subir');
  assert.equal(exerciseRecommendation({ ...exercise, progression: 'off' }, log).suggestion, 'mantener');
  assert.equal(exerciseRecommendation(exercise, { ...log, sets: log.sets.slice(0, 1) }).suggestion, 'mantener');
  assert.equal(exerciseRecommendation({ ...exercise, unit: 'reps' }, log).suggestion, 'mantener');
});
