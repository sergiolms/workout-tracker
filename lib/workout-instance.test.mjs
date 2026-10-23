import assert from 'node:assert/strict';
import test from 'node:test';
import { activeWorkout, startWorkout, closeWorkout } from './workout-instance.ts';
import { defaultState, migrateState } from './storage.ts';
import { exerciseSets, workingSets, supersetRange, statusFromLog } from './exercise-sets.ts';
import { exerciseRecommendation } from './exercise-log.ts';
import { virtualWindow } from './virtual-catalog.ts';

const exercise = { name: 'Remo', target: '3×8–12 · RIR 2–3', sets: 3, minReps: 8, maxReps: 12, increment: 0.5 };
test('two instances of the same routine on the same day remain independent', () => {
  const first = { id: 'unique-one', date: '2026-10-23', startedAt: '2026-10-23T10:00:00Z', week: 1, routine: 'a' };
  const second = { ...first, id: 'unique-two', startedAt: '2026-10-23T18:00:00Z' };
  const state = startWorkout(startWorkout(defaultState, first), second);
  assert.equal(state.activeWorkouts.length, 2);
  assert.equal(activeWorkout(state, 1, 'a').id, 'unique-two');
  assert.equal(activeWorkout(closeWorkout(state, second.id, second.startedAt), 1, 'a').id, 'unique-one');
  assert.equal(startWorkout(state, second), state);
});

test('loading active series does not synthesize a finished workout in history', () => {
  const state = { ...defaultState, activeWorkouts: [{ id: 'active', week: 1, routine: 'a', startedAt: '2026-10-23', date: '2026-10-23' }], exerciseLogs: [{ id: 'e', workoutId: 'active', date: '2026-10-23', week: 1, routine: 'a', exercise: 'Remo', load: 20, sets: [{ reps: 12, done: true }] }] };
  assert.equal(migrateState(state).workoutLogs.length, 0);
  assert.equal(migrateState(state).exerciseLogs.length, 1);
});

test('old uniform loads remain readable and warmups do not count as working sets', () => {
  const previous = { load: 25, sets: [{ reps: 12, done: true }, { reps: 11, done: true }, { reps: 10, done: true }] };
  const sets = exerciseSets({ ...exercise, warmupSets: 2 }, undefined, previous);
  assert.equal(sets.length, 5); assert.equal(workingSets(sets).length, 3);
  assert.equal(sets[2].load, 25);
  assert.equal(statusFromLog({ sets: [{ reps: 5, done: true, kind: 'warmup' }, { reps: 10, done: false }] }), 'pending');
});

test('progression explains the configured RIR and excludes warmup and unperformed sets', () => {
  const log = { pain: 0, rir: 2, sets: [{ reps: 3, load: 0, done: true, kind: 'warmup' }, ...Array.from({ length: 3 }, () => ({ reps: 12, load: 20, done: true }))] };
  assert.equal(exerciseRecommendation(exercise, log).suggestion, 'subir');
  const lower = exerciseRecommendation(exercise, { ...log, rir: 1 });
  assert.equal(lower.suggestion, 'bajar'); assert.match(lower.reason, /RIR 2/);
  const mixed = exerciseRecommendation(exercise, { ...log, sets: log.sets.map((set, i) => ({ ...set, load: i === 1 ? 25 : set.load })) });
  assert.equal(mixed.suggestion, 'mantener'); assert.match(mixed.reason, /cargas distintas/);
});

test('superset groups stop at unlinked boundaries and cannot go beyond the routine', () => {
  const exercises = [{ ...exercise, supersetWithNext: true }, exercise, { ...exercise, supersetWithNext: true }];
  assert.deepEqual(supersetRange(exercises, 0), { start: 0, end: 1 });
  assert.deepEqual(supersetRange(exercises, 1), { start: 0, end: 1 });
  assert.deepEqual(supersetRange(exercises, 2), { start: 2, end: 2 });
});

test('virtual windows keep rows bounded at the start, middle and end of 1324 records', () => {
  const heights = Array.from({ length: 1324 }, (_, i) => i % 7 ? 90 : 120);
  for (const top of [0, 45000, 125000]) {
    const view = virtualWindow(heights, top, 500);
    assert.ok(view.end - view.start < 20);
    assert.ok(view.start >= 0 && view.end <= heights.length);
    assert.equal(view.total, heights.reduce((sum, height) => sum + height, 0));
  }
  assert.equal(virtualWindow([], 0, 500).total, 0);
});
