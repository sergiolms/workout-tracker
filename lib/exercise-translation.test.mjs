import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeExerciseSearch, spanishExerciseName } from './exercise-translation.ts';

test('traduce los patrones habituales sin alterar el nombre original', () => {
  assert.equal(spanishExerciseName('barbell romanian deadlift'), 'Peso muerto rumano con barra');
  assert.equal(spanishExerciseName('dumbbell incline bench press'), 'Press de banca inclinado con mancuernas');
  assert.equal(spanishExerciseName('cable seated row'), 'Remo sentado en polea');
  assert.equal(spanishExerciseName('assisted pull-up'), 'Dominada asistida');
  assert.equal(spanishExerciseName('lying (side) quads stretch'), 'lying (side) quads stretch');
});

test('la búsqueda puede ignorar tildes y mayúsculas', () => {
  assert.equal(normalizeExerciseSearch('  BíCePs '), 'biceps');
  assert.equal(normalizeExerciseSearch('MANCUERNAS'), 'mancuernas');
});
