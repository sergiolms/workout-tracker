import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import {
  weeklyVolume,
  weekInterval,
  estimatedOneRepMax,
} from './training-volume.ts';
test('el volumen semanal usa límites locales, excluye aproximaciones y no cuenta sesiones en curso', () => {
  const date = new Date(2026, 9, 26, 12);
  const { start, end } = weekInterval(date);
  assert.equal(start.getDay(), 1);
  assert.equal(end.getDay(), 1);
  const log = {
    id: 'l',
    date: date.toISOString(),
    exercise: 'Press',
    sets: [
      { reps: 10, done: true },
      { reps: 8, done: true, kind: 'warmup' },
      { reps: 8, done: false },
    ],
  };
  const state = {
    ...defaultState,
    activeWorkouts: [{ id: 'active' }],
    exerciseLogs: [
      log,
      { ...log, id: 'a', workoutId: 'active' },
      { ...log, id: 'b', date: end.toISOString() },
    ],
  };
  const result = weeklyVolume(
    state,
    start.getTime(),
    end.getTime(),
    () => 'Pecho',
  );
  assert.equal(result.total, 1);
  assert.deepEqual(result.groups, [['Pecho', 1]]);
});
test('el 1RM estimado no mezcla tiempos, ayuda de máquina ni peso por mancuerna', () => {
  const log = { load: 30, loadKind: 'total', sets: [{ reps: 10, done: true }] };
  assert.equal(estimatedOneRepMax(log), 40);
  assert.equal(estimatedOneRepMax({ ...log, loadKind: 'assistance' }), null);
  assert.equal(estimatedOneRepMax({ ...log, loadKind: 'perHand' }), null);
  assert.equal(estimatedOneRepMax({ ...log, mode: 'time' }), null);
  assert.equal(estimatedOneRepMax({ ...log, loadKind: undefined }), null);
});
