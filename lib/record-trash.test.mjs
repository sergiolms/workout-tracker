import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from './storage.ts';
import { moveToTrash, restoreDeleted } from './record-trash.ts';
import { stateRecords, recordsState, mergeStates } from './cloud-records.ts';
import { parseBackup, importBackup } from './backup-import.ts';

test('borrar y restaurar una sesión conserva sus series y sobrevive al formato remoto', () => {
  const log = {
    id: 'log',
    date: '2026-10-25',
    week: 1,
    routine: 'r',
    workoutId: 'w',
    exercise: 'Press',
    load: 20,
    sets: [{ load: 20, reps: 10, done: true }],
    rir: 2,
    pain: 0,
    note: '',
    suggestion: 'mantener',
  };
  const workout = {
    id: 'w',
    date: log.date,
    week: 1,
    routine: 'r',
    routineName: 'A',
    exercises: [{ name: 'Press', status: 'done', logId: log.id }],
    notes: '',
  };
  const original = {
    ...defaultState,
    workoutLogs: [workout],
    exerciseLogs: [log],
  };
  const deleted = moveToTrash(original, 'workoutLogs', 'w', '2026-10-26');
  assert.equal(deleted.workoutLogs.length, 0);
  assert.equal(deleted.exerciseLogs.length, 0);
  const remote = recordsState(stateRecords(deleted));
  const restored = restoreDeleted(remote, remote.trash[0].id);
  assert.deepEqual(restored.workoutLogs, original.workoutLogs);
  assert.deepEqual(restored.exerciseLogs, original.exerciseLogs);
  assert.equal(restored.trash.length, 0);
  const backup = parseBackup(JSON.stringify(deleted));
  assert.deepEqual(
    importBackup(defaultState, backup, {
      includePlan: false,
      replaceConflicts: false,
    }).trash,
    deleted.trash,
  );
});

test('restaurar no sustituye una medida existente ni pierde cambios de otro dispositivo', () => {
  const original = {
    ...defaultState,
    measurements: [{ id: 'm', date: '2026-10-25', weight: 72 }],
  };
  const deleted = moveToTrash(original, 'measurements', 'm', '2026-10-26');
  const remote = {
    ...original,
    cardioLogs: [
      { id: 'c', date: '2026-10-26', type: 'Caminata', minutes: 20 },
    ],
  };
  const merged = mergeStates(original, deleted, remote);
  assert.equal(merged.conflicts.length, 0);
  const restored = restoreDeleted(merged.state, deleted.trash[0].id);
  assert.equal(restored.cardioLogs.length, 1);
  assert.deepEqual(restored.measurements, original.measurements);
  const collision = {
    ...deleted,
    measurements: [{ ...original.measurements[0], weight: 80 }],
  };
  assert.equal(restoreDeleted(collision, deleted.trash[0].id), collision);
});
test('el borrado también retira vínculos antiguos sin ID de entrenamiento, evitando que reaparezcan al cargar', () => {
  const log = {
    id: 'legacy-log',
    date: '2026-10-25',
    week: 1,
    routine: 'r',
    exercise: 'Press',
    load: 20,
    sets: [{ reps: 10, done: true }],
    rir: 2,
    pain: 0,
    note: '',
    suggestion: 'mantener',
  };
  const workout = {
    id: 'legacy-workout',
    date: log.date,
    week: 1,
    routine: 'r',
    routineName: 'A',
    exercises: [{ name: 'Press', status: 'done' }],
    notes: '',
  };
  const deleted = moveToTrash(
    { ...defaultState, exerciseLogs: [log], workoutLogs: [workout] },
    'workoutLogs',
    workout.id,
  );
  const loaded = recordsState(stateRecords(deleted));
  assert.equal(loaded.workoutLogs.length, 0);
  assert.equal(loaded.exerciseLogs.length, 0);
});
