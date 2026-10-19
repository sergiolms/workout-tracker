import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from './storage.ts';
import { activityDate, activityTimestamp, applyActivityEdit, validActivity, deleteActivity } from './activity-history.ts';

const activity = { id: 'walk', date: '2026-10-19T08:23:45Z', type: 'Caminata', minutes: 30, steps: 3000, distance: 2, rpe: 4, heartRate: 110 };
const other = { ...activity, id: 'bike', type: 'Bici' };
const state = { ...defaultState, cardioLogs: [activity, other] };
test('editing updates one existing activity without changing IDs, other records or the original state', () => {
  const result = applyActivityEdit(state, 'walk', { ...activity, id: 'unexpected', type: ' Elíptica ', minutes: 45, distance: 3 });
  assert.equal(result.cardioLogs.length, 2);
  assert.equal(result.cardioLogs[0].id, 'walk');
  assert.equal(result.cardioLogs[0].minutes, 45);
  assert.equal(result.cardioLogs[0].type, 'Elíptica');
  assert.equal(result.cardioLogs[1], other);
  assert.equal(activity.minutes, 30);
  assert.equal(result.sessions, state.sessions);
});
test('optional fields can be removed without losing unrelated metadata', () => {
  const withMetadata = { ...state, cardioLogs: [{ ...activity, source: 'import' }] };
  const result = applyActivityEdit(withMetadata, 'walk', { id: 'walk', date: activity.date, type: 'Pilates', minutes: 40 });
  assert.equal(result.cardioLogs[0].source, 'import');
  for (const key of ['steps', 'distance', 'rpe', 'heartRate']) assert.equal(key in result.cardioLogs[0], false);
});
test('invalid edits and records deleted while the editor is open do not change state', () => {
  for (const patch of [{ minutes: 0 }, { minutes: Infinity }, { date: '' }, { type: ' ' }, { steps: 1.5 }, { distance: -1 }, { rpe: 11 }, { heartRate: NaN }]) {
    assert.equal(validActivity({ ...activity, ...patch }), false);
    assert.equal(applyActivityEdit(state, 'walk', { ...activity, ...patch }), state);
  }
  assert.equal(applyActivityEdit(state, 'missing', activity), state);
});
test('unchanged local dates retain the exact timestamp; changes retain the selected calendar day', () => {
  assert.equal(activityTimestamp(activity.date, activityDate(activity.date)), activity.date);
  const changed = activityTimestamp(activity.date, '2026-10-17');
  assert.equal(activityDate(changed), '2026-10-17');
  for (const day of ['', '2026-02-30', '2026-13-01', '19/10/2026']) assert.equal(activityTimestamp(activity.date, day), null);
});

test('estimated steps remain labelled when saving and can be replaced by real steps', () => {
  const estimated = applyActivityEdit(state, activity.id, { ...activity, steps: 3571, stepsEstimated: true, stepLengthCm: 70 });
  assert.equal(estimated.cardioLogs[0].stepsEstimated, true);
  const actual = applyActivityEdit(estimated, activity.id, { ...activity, steps: 3600 });
  assert.equal(actual.cardioLogs[0].steps, 3600);
  assert.equal(actual.cardioLogs[0].stepsEstimated, undefined);
});

test('deleting an activity updates only the activity collection and tolerates an already deleted record', () => {
  const result = deleteActivity(state, activity.id);
  assert.deepEqual(result.cardioLogs, [other]);
  assert.equal(result.workoutLogs, state.workoutLogs);
  assert.equal(state.cardioLogs.length, 2);
  assert.equal(deleteActivity(result, activity.id), result);
});
