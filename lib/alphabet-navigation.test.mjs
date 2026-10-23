import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAlphabetIndex, resolveAlphabetIndex } from './alphabet-navigation.ts';
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const available = letters.filter(letter => !['X', 'Y'].includes(letter));

test('wheel skips empty sections in either direction without bouncing between them', () => {
  assert.equal(letters[advanceAlphabetIndex(letters, available, 22, 1)], 'Z');
  assert.equal(letters[advanceAlphabetIndex(letters, available, 25, -1)], 'W');
  assert.equal(letters[advanceAlphabetIndex(letters, ['A', 'F', 'Z'], 0, 2)], 'Z');
});
test('continued wheel input stops at both available ends', () => {
  assert.equal(advanceAlphabetIndex(letters, available, 0, -100), 0);
  assert.equal(advanceAlphabetIndex(letters, available, 25, 100), 25);
  assert.equal(advanceAlphabetIndex(letters, ['F', 'W'], 22, 100), 22);
  assert.equal(advanceAlphabetIndex(letters, ['F', 'W'], 5, -100), 5);
});
test('letter shortcuts skip unavailable targets and tolerate an empty search', () => {
  assert.equal(letters[resolveAlphabetIndex(letters, available, 23, 1)], 'Z');
  assert.equal(letters[resolveAlphabetIndex(letters, available, 24, -1)], 'W');
  assert.equal(resolveAlphabetIndex(letters, [], 3, 1, 7), 7);
  assert.equal(advanceAlphabetIndex(letters, available, 10, 0), 10);
});

test('numeric exercises have their own section before A', () => {
  const alphabet = ['#', ...letters];
  assert.equal(alphabet[advanceAlphabetIndex(alphabet, alphabet, 0, 1)], 'A');
  assert.equal(alphabet[advanceAlphabetIndex(alphabet, alphabet, 1, -1)], '#');
  assert.equal(advanceAlphabetIndex(alphabet, alphabet, 0, -50), 0);
  assert.equal(alphabet[resolveAlphabetIndex(alphabet, letters, 0, 1)], 'A');
});
