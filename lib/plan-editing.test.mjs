import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState, weeksFromPeriods } from './storage.ts';
import {
  changePlanPeriods,
  savePlanSession,
  assignPlanSession,
  removePlanSession,
} from './plan-editing.ts';

const fixture = () => {
  const periods = [
    { id: 'one', name: 'Uno', durationWeeks: 3, routines: ['a'] },
    { id: 'two', name: 'Dos', durationWeeks: 3, routines: ['a'] },
  ];
  return {
    ...defaultState,
    periods,
    plan: weeksFromPeriods(periods),
    week: 5,
    sessions: [{ id: 'a', name: 'A', exercises: [] }],
    workoutLogs: [{ id: 'history' }],
  };
};
test('editar tramos conserva la semana relativa del tramo activo', () => {
  const state = fixture();
  const next = changePlanPeriods(state, (periods) =>
    periods.map((item) =>
      item.id === 'one' ? { ...item, durationWeeks: 1 } : item,
    ),
  );
  assert.equal(next.week, 3);
  assert.equal(
    next.plan.find((week) => week.week === next.week).periodId,
    'two',
  );
  assert.equal(state.week, 5);
});
test('crear asigna la sesión al tramo elegido, editar no duplica y borrar conserva el historial', () => {
  const state = fixture();
  const added = savePlanSession(
    state,
    { id: 'b', name: 'B', exercises: [] },
    5,
  );
  assert.deepEqual(added.periods[0].routines, ['a']);
  assert.deepEqual(added.periods[1].routines, ['a', 'b']);
  const edited = savePlanSession(
    added,
    { id: 'b', name: 'Renombrada', exercises: [] },
    1,
  );
  assert.equal(edited.sessions.length, 2);
  assert.deepEqual(
    assignPlanSession(edited, 'one', 'b', true).periods[0].routines,
    ['a', 'b'],
  );
  const removed = removePlanSession(edited, 'a');
  assert.equal(removed.sessions.length, 1);
  assert.ok(removed.periods.every((period) => !period.routines.includes('a')));
  assert.equal(removed.workoutLogs, state.workoutLogs);
});
