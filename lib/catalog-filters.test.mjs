import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentGroup, matchesCatalogFilters } from './catalog-filters.ts';

test('material groups include the catalogue variants used by the filter', () => {
  for (const value of ['barbell', 'ez barbell', 'olympic barbell', 'trap bar']) assert.equal(equipmentGroup(value), 'barbell');
  for (const value of ['leverage machine', 'smith machine', 'sled machine', 'assisted']) assert.equal(equipmentGroup(value), 'machine');
  for (const value of ['band', 'resistance band']) assert.equal(equipmentGroup(value), 'band');
  assert.equal(equipmentGroup('body weight'), 'bodyweight');
  assert.equal(equipmentGroup('medicine ball'), 'other');
});

test('body part and equipment combine without excluding everything by default', () => {
  const exercise = { bodyPart: 'back', equipment: 'cable' };
  assert.equal(matchesCatalogFilters(exercise, {}), true);
  assert.equal(matchesCatalogFilters(exercise, { bodyPart: 'back' }), true);
  assert.equal(matchesCatalogFilters(exercise, { equipment: 'cable' }), true);
  assert.equal(matchesCatalogFilters(exercise, { bodyPart: 'back', equipment: 'cable' }), true);
  assert.equal(matchesCatalogFilters(exercise, { bodyPart: 'chest', equipment: 'cable' }), false);
});
