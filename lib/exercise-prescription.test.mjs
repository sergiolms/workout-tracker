import test from 'node:test';
import assert from 'node:assert/strict';
import { exercisePrescription, withExercisePrescription } from './exercise-prescription.ts';

const exercise = { name: 'Remo', target: '3×8–12 · RIR 2–3', sets: 3, minReps: 8, maxReps: 12, unit: 'kg', increment: 2.5, catalogId: 'row' };
test('reads existing goals without rewriting old sessions', () => {
  assert.deepEqual(exercisePrescription(exercise), { sets: 3, minReps: 8, maxReps: 12, minRir: 2, maxRir: 3 });
  assert.equal(exercise.minRir, undefined);
  assert.equal(exercisePrescription({ ...exercise, target: '1×5 · Cómodo' }).minRir, null);
  assert.equal(exercisePrescription({ ...exercise, target: '3×10 · RIR 2' }).maxRir, 2);
});
test('generates a consistent summary and preserves the exercise identity and progression increment', () => {
  const changed = withExercisePrescription(exercise, { sets: 4, minReps: 6, maxReps: 8, minRir: 1, maxRir: 2 });
  assert.equal(changed.target, '4×6–8 · RIR 1–2');
  assert.equal(changed.sets, 4);
  assert.equal(changed.minReps, 6);
  assert.equal(changed.maxReps, 8);
  assert.equal(changed.minRir, 1);
  assert.equal(changed.catalogId, 'row');
  assert.equal(changed.increment, 2.5);
  assert.equal(exercise.target, '3×8–12 · RIR 2–3');
});
test('range endpoints remain ordered and equal values use a single number', () => {
  assert.equal(withExercisePrescription(exercise, { minReps: 14 }).target, '3×14 · RIR 2–3');
  assert.equal(withExercisePrescription(exercise, { maxReps: 5 }).target, '3×5 · RIR 2–3');
  assert.equal(withExercisePrescription(exercise, { maxRir: 1 }).target, '3×8–12 · RIR 1');
  assert.equal(withExercisePrescription(exercise, { sets: 0 }).sets, 1);
});
test('supports turning RIR off and preserves distance units and custom notes', () => {
  const noRir = withExercisePrescription({ ...exercise, minRir: 2, maxRir: 3 }, { minRir: null, maxRir: null });
  assert.equal(noRir.target, '3×8–12');
  assert.equal('minRir' in noRir, false);
  assert.equal(exercisePrescription(noRir).minRir, null);
  const carry = { ...exercise, target: '3×20–40 m · RIR 2–3', minReps: 20, maxReps: 40, unit: 'kg/m' };
  assert.equal(withExercisePrescription(carry, { sets: 2 }).target, '2×20–40 m · RIR 2–3');
  assert.equal(withExercisePrescription({ ...exercise, target: '1×5 · Cómodo', sets: 1, minReps: 5, maxReps: 5 }, { sets: 2 }).target, '2×5 · Cómodo');
});
