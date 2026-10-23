import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from './storage.ts';
import { backupPreview, importBackup, parseBackup } from './backup-import.ts';

const activity = (id, minutes = 30) => ({ id, date: '2026-10-23T12:00:00Z', type: 'Caminata', minutes });
test('Base backups round-trip and the preview distinguishes new, identical and conflicting IDs', () => {
  const current = { ...defaultState, cardioLogs: [activity('same'), activity('different')] };
  const incoming = parseBackup(JSON.stringify({ ...defaultState, cardioLogs: [activity('new'), activity('same'), activity('different', 50)] }));
  assert.deepEqual(backupPreview(current, incoming).find(row => row.key === 'cardioLogs'), { key: 'cardioLogs', additions: 1, duplicates: 1, conflicts: 1 });
  const result = importBackup(current, incoming, { includePlan: false, replaceConflicts: false });
  assert.equal(result.cardioLogs.length, 3);
  assert.equal(result.cardioLogs.find(item => item.id === 'different').minutes, 30);
  assert.equal(current.cardioLogs.length, 2);
  const replaced = importBackup(current, incoming, { includePlan: false, replaceConflicts: true });
  assert.equal(replaced.cardioLogs.find(item => item.id === 'different').minutes, 50);
});

test('invalid files, duplicate IDs, wrong dates and prototype payloads are rejected', () => {
  for (const source of ['no json', '{}', JSON.stringify({ ...defaultState, cardioLogs: [activity('a'), activity('a')] }), JSON.stringify({ ...defaultState, measurements: [{ id: 'm', date: 'wrong', weight: 80 }] }), JSON.stringify({ ...defaultState, cardioLogs: [{ ...activity('a'), minutes: -1 }] }), '{"version":3,"sessions":[],"exerciseLogs":[],"__proto__":{"theme":"dark"}}']) assert.throws(() => parseBackup(source), /válida/);
});

test('importing never replaces preferences, active sessions or the plan without choosing it', () => {
  const current = { ...defaultState, planName: 'Keep', theme: 'dark', activeWorkouts: [{ id: 'draft' }] };
  const incoming = { ...defaultState, planName: 'New', theme: 'light', sessions: [{ id: 's' }] };
  const merged = importBackup(current, incoming, { includePlan: false, replaceConflicts: false });
  assert.equal(merged.planName, 'Keep'); assert.equal(merged.theme, 'dark');
  assert.deepEqual(merged.activeWorkouts, current.activeWorkouts);
  const restored = importBackup(current, incoming, { includePlan: true, replaceConflicts: false });
  assert.equal(restored.planName, 'New'); assert.equal(restored.theme, 'dark');
});
