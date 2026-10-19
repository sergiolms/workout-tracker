import assert from 'node:assert/strict';
import test from 'node:test';
import { nextPlanSession, planProgress } from './plan-progress.ts';

const weeks = [
  { week: 1, routines: ['A', 'B'] },
  { week: 2, routines: ['A', 'B'] },
];

const log = (week, routine, status = 'done') => ({
  id: `${week}:${routine}:${status}`, date: '2026-10-16T12:00:00.000Z', week, routine,
  routineName: routine, notes: '', exercises: [{ name: 'Ejercicio', status }],
});

test('una sesión fuera de orden deja pendiente la anterior de la misma semana', () => {
  assert.deepEqual(nextPlanSession(weeks, [log(1, 'B')], 1, 'B'), { week: 1, routine: 'A' });
});

test('avanza a la semana siguiente al terminar la actual', () => {
  assert.deepEqual(nextPlanSession(weeks, [log(1, 'A'), log(1, 'B')], 1, 'B'), { week: 2, routine: 'A' });
});

test('saltos y sesiones sin trabajo no cuentan; parciales sí', () => {
  const logs = [log(1, 'A', 'skipped'), log(1, 'B', 'partial'), log(1, 'B', 'partial')];
  assert.deepEqual(planProgress(weeks, logs), { done: 1, total: 4 });
  assert.deepEqual(nextPlanSession(weeks, logs, 1, 'B'), { week: 1, routine: 'A' });
});

test('no inventa una siguiente sesión cuando el plan está completo', () => {
  const logs = weeks.flatMap((week) => week.routines.map((routine) => log(week.week, routine)));
  assert.equal(nextPlanSession(weeks, logs, 2, 'B'), null);
  assert.deepEqual(planProgress(weeks, logs), { done: 4, total: 4 });
});
