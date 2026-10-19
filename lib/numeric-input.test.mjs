import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNumericInput } from './numeric-input.ts';

test('el peso acepta coma o punto y las repeticiones solo enteros', () => {
  assert.equal(parseNumericInput('12,5'), 12.5);
  assert.equal(parseNumericInput('12.5'), 12.5);
  assert.equal(parseNumericInput('0'), 0);
  assert.equal(parseNumericInput('12.', false), 12);
  assert.equal(parseNumericInput('12', true), 12);
  for (const text of ['', '-', '-1', 'Infinity', '1e3', '12kg', '1,2,3']) assert.equal(parseNumericInput(text), null);
  assert.equal(parseNumericInput('12.5', true), null);
});
