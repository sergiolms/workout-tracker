import test from 'node:test';
import assert from 'node:assert/strict';
import { historyPage, localHistoryDay } from './history-browser.ts';

test('large histories render bounded pages without mutating or losing entries', () => {
  const entries = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), date: new Date(2024, 0, index + 1, 12).toISOString(), name: index % 2 ? 'Caminata' : 'Sesión de fuerza' }));
  const original = [...entries];
  const options = { query: '', month: '', page: 0, searchText: entry => entry.name };
  const first = historyPage(entries, options);
  assert.equal(first.entries.length, 10);
  assert.equal(first.total, 1000);
  assert.equal(first.pages, 100);
  assert.equal(first.entries[0].id, '999');
  const ids = Array.from({ length: 100 }, (_, page) => historyPage(entries, { ...options, page }).entries).flat().map(entry => entry.id);
  assert.equal(new Set(ids).size, 1000);
  assert.deepEqual(entries, original);
});

test('search ignores accents, combines with local calendar month and clamps after deletions', () => {
  const entries = [{ id: 'a', date: new Date(2026, 9, 23, 12).toISOString(), name: 'Sesión de piernas' }, { id: 'b', date: new Date(2026, 8, 30, 12).toISOString(), name: 'Sesión de brazos' }];
  const options = { query: 'sesion', month: '2026-10', page: 50, searchText: entry => entry.name };
  assert.equal(historyPage(entries, options).entries[0].id, 'a');
  assert.equal(historyPage(entries, options).page, 0);
  const empty = historyPage([], options);
  assert.equal(empty.total, 0);
  assert.equal(empty.start, 0);
  assert.equal(empty.pages, 1);
  assert.equal(localHistoryDay('invalid'), '');
});
