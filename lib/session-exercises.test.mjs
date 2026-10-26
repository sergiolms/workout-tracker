import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendCatalogExercises,
  toggleCatalogSelection,
} from './session-exercises.ts';

test('seleccionar y deseleccionar antes de confirmar no altera los ejercicios existentes', () => {
  const item = { id: 'press', name: 'Press' };
  const pending = toggleCatalogSelection([], item);
  assert.deepEqual(pending, [item]);
  assert.deepEqual(toggleCatalogSelection(pending, item), []);
  assert.deepEqual(pending, [item]);
});
test('confirmar añade solo ejercicios nuevos y conserva los ajustes y el orden anteriores', () => {
  const current = [
    { name: 'Mi press', catalogId: 'press', sets: 5, restSeconds: 120 },
  ];
  const press = { id: 'press', name: 'Bench press' };
  const squat = { id: 'squat', name: 'Squat' };
  const result = appendCatalogExercises(current, [press, squat, squat]);
  assert.equal(result.length, 2);
  assert.equal(result[0], current[0]);
  assert.equal(result[1].catalogId, 'squat');
  assert.equal(result[1].sets, 3);
  assert.equal(current.length, 1);
  assert.deepEqual(appendCatalogExercises(current, []), current);
});
