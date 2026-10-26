import assert from 'node:assert/strict';
import test from 'node:test';
import { searchHistoryExercises } from './history-exercise-search.ts';

const choices = [
  {
    value: 'shoulder',
    label: 'Press de hombros en máquina',
    originalName: 'machine shoulder press',
  },
  { value: 'leg', label: 'Prensa de piernas', originalName: 'leg press' },
  {
    value: 'chest',
    label: 'Press de pecho con mancuernas',
    originalName: 'dumbbell chest press',
  },
];
test('busca todos los conceptos en cualquier orden, con erratas y en ambos idiomas', () => {
  for (const query of [
    'maquina press hombros',
    'press hombor máquina',
    'shoulder press',
  ])
    assert.deepEqual(
      searchHistoryExercises(choices, query).map((choice) => choice.value),
      ['shoulder'],
    );
  assert.deepEqual(
    searchHistoryExercises(choices, 'pecho mancuernas').map(
      (choice) => choice.value,
    ),
    ['chest'],
  );
  assert.deepEqual(searchHistoryExercises(choices, 'sentadilla'), []);
});
test('no limita las coincidencias al primer bloque de resultados', () => {
  const many = Array.from({ length: 125 }, (_, index) => ({
    value: index,
    label: `Ejercicio ${String(index).padStart(3, '0')}`,
    originalName: '',
  }));
  assert.equal(searchHistoryExercises(many, '').length, 125);
  assert.deepEqual(
    searchHistoryExercises(many, '124').map((choice) => choice.value),
    [124],
  );
  assert.equal(searchHistoryExercises(many, 'ejercicio').length, 125);
});
