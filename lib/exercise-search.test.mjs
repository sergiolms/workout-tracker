import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { searchWords, exerciseSearchScore } from './exercise-search.ts';
import { spanishExerciseName } from './exercise-translation.ts';
import { optionalMeasurement, validMeasurements } from './measurement-input.ts';

const catalog = JSON.parse(fs.readFileSync(new URL('./exercise-catalog.json', import.meta.url), 'utf8'));
const search = query => catalog.map(item => ({ item, score: exerciseSearchScore(searchWords(query), searchWords(`${spanishExerciseName(item.name)} ${item.name}`), searchWords(`${item.target} ${item.bodyPart} ${item.equipment} ${item.muscle}`)) })).filter(entry => entry.score).sort((a, b) => b.score - a.score);
test('the reported shoulder query excludes leg presses even if the description mentions shoulders', () => {
  const results = search('press hombros máquina');
  assert.ok(results.length > 0);
  assert.ok(results.every(({ item }) => !/leg press/i.test(item.name)));
});
test('search tolerates spelling mistakes, accents, plurals and incomplete words', () => {
  assert.ok(search('pres hombros maquina').length);
  assert.ok(search('press hombor maquina').length);
  assert.deepEqual(searchWords('MÁQUINAS con los hombros'), ['maquina', 'hombro']);
  assert.equal(exerciseSearchScore(searchWords('foo impossible'), ['press', 'hombro'], ['machine']), 0);
  assert.ok(exerciseSearchScore(['press'], ['press'], []) > exerciseSearchScore(['press'], ['pres'], []));
});
test('optional measurements remain optional after visiting/clearing the other field', () => {
  assert.equal(optionalMeasurement(''), undefined);
  assert.equal(optionalMeasurement('  '), undefined);
  assert.equal(optionalMeasurement('72,6'), 72.6);
  assert.equal(validMeasurements('72.6', ''), true);
  assert.equal(validMeasurements('72,6', '  '), true);
  assert.equal(validMeasurements('', '90'), true);
  assert.equal(validMeasurements('', ''), false);
  for (const invalid of ['0', '-1', '1e3', 'foo', '1.2.3']) assert.equal(validMeasurements('72.6', invalid), false);
});
