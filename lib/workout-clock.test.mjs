import test from 'node:test';
import assert from 'node:assert/strict';
import { currentWorkout, workoutSeconds, toggleWorkoutPause, formatWorkoutTime } from './workout-clock.ts';
import { defaultState, migrateState } from './storage.ts';
const start = '2026-11-22T10:00:00Z';
const state = {...defaultState, activeWorkouts:[{id:'a',routine:'r',week:1,date:'2026-11-22',startedAt:start}]};
test('pause survives reload, excludes multiple pauses and preserves the original start', () => {
  const paused = toggleWorkoutPause(state,'a','2026-11-22T10:01:00Z');
  assert.equal(workoutSeconds(currentWorkout(paused),Date.parse('2026-11-22T11:00:00Z')),60);
  const reloaded = migrateState(JSON.parse(JSON.stringify(paused)));
  const resumed = toggleWorkoutPause(reloaded,'a','2026-11-22T10:06:00Z');
  assert.equal(currentWorkout(resumed).startedAt,start);
  assert.equal(currentWorkout(resumed).pausedAt,undefined);
  assert.equal(workoutSeconds(currentWorkout(resumed),Date.parse('2026-11-22T10:07:00Z')),120);
  const again = toggleWorkoutPause(resumed,'a','2026-11-22T10:07:00Z');
  const final = toggleWorkoutPause(again,'a','2026-11-22T10:10:00Z');
  assert.equal(workoutSeconds(currentWorkout(final),Date.parse('2026-11-22T10:11:00Z')),180);
  assert.equal(state.activeWorkouts[0].pausedAt,undefined);
});
test('current session is found across weeks and finished sessions are excluded',()=>{
  assert.equal(currentWorkout({...state,week:4}).id,'a');
  assert.equal(currentWorkout({...state,activeWorkouts:[{...state.activeWorkouts[0],finishedAt:start}]}),undefined);
  assert.equal(formatWorkoutTime(3661),'61:01');
});
