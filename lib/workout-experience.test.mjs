import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceTrend, previousExerciseLog, undoSkippedExercise, remainingRest } from './workout-experience.ts';

const log = { id: 'log', exercise: 'Remo', workoutId: 'today', date: '2026-10-19T10:00:00Z', load: 20, sets: [{ reps: 10, done: true }], skipped: false };
test('comparison avoids calling mixed load/reps a progression', () => {
  assert.equal(performanceTrend(22, 10, 20, 10), 'up');
  assert.equal(performanceTrend(20, 9, 20, 10), 'down');
  assert.equal(performanceTrend(22, 8, 20, 10), 'mixed');
  assert.equal(performanceTrend(20, 10, 20, 10), 'same');
});
test('ghost data uses the most recent completed previous workout, regardless of array order', () => {
  const previous = { ...log, workoutId: 'previous', date: '2026-10-16T10:00:00Z' };
  assert.equal(previousExerciseLog([previous, log, { ...log, workoutId: 'skip', skipped: true }, { ...previous, date: '2026-10-14T10:00:00Z' }], 'Remo', 'today'), previous);
  assert.equal(previousExerciseLog([log], 'Remo', 'today'), undefined);
});
test('undo skip restores only the affected log and history row; preserves unrelated changes', () => {
  const skipped = { ...log, skipped: true, sets: [{ reps: 10, done: false }] };
  const before = [{ id: 'today', exercises: [{ name: 'Remo', status: 'done', logId: 'log' }] }];
  const state = { exerciseLogs: [skipped, { ...log, id: 'other' }], workoutLogs: [{ ...before[0], notes: 'new note', exercises: [{ name: 'Remo', status: 'skipped', logId: 'log' }, { name: 'Press', status: 'done' }] }], week: 5 };
  const result = undoSkippedExercise(state, skipped, log, before);
  assert.deepEqual(result.exerciseLogs[0], log);
  assert.equal(result.exerciseLogs[1], state.exerciseLogs[1]);
  assert.equal(result.workoutLogs[0].notes, 'new note');
  assert.equal(result.workoutLogs[0].exercises[0].status, 'done');
  assert.equal(result.workoutLogs[0].exercises[1].status, 'done');
  assert.equal(result.week, 5);
  const changed = { ...state, exerciseLogs: [{ ...skipped, load: 30 }] };
  assert.equal(undoSkippedExercise(changed, skipped, log, before), changed);
  assert.equal(undoSkippedExercise(state, skipped, undefined, before).exerciseLogs.length, 1);
});
test('rest uses a deadline and catches up after background suspension', () => {
  assert.equal(remainingRest(100000, 10000), 90);
  assert.equal(remainingRest(100000, 99500), 1);
  assert.equal(remainingRest(100000, 120000), 0);
});
