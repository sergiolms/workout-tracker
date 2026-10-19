import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from './storage.ts';
import { applyWorkoutEdit, createWorkoutEdits, statusFromLog } from './workout-history.ts';
import { exerciseSuggestion, saveExerciseLog } from './exercise-log.ts';
import { countsTowardPlan } from './plan-progress.ts';

const date = '2026-10-15T12:00:00.000Z';
const exercise = { name: 'Remo', minReps: 8, maxReps: 12, sets: 3, increment: 2.5, unit: 'kg', target: '3×8–12' };
function fixture() {
  const log = { id: 'log', workoutId: 'workout', date, week: 1, routine: 'A', exercise: 'Remo', load: 20, sets: [{ reps: 10, done: true }, { reps: 9, done: false }, { reps: 8, done: false }], rir: 2, pain: 0, note: '', suggestion: 'mantener' };
  const other = { ...log, id: 'other', workoutId: 'other-workout', routine: 'B' };
  const workout = { id: 'workout', date, week: 1, routine: 'A', routineName: 'A', notes: '', exercises: [{ name: 'Remo', status: 'partial', logId: 'log' }, { name: 'Prensa', status: 'skipped' }] };
  return { ...defaultState, week: 2, plan: [{ week: 1, routines: ['A'] }], sessions: [{ id: 'A', name: 'A', exercises: [exercise] }], exerciseLogs: [log, other], workoutLogs: [workout] };
}
const editsFor = (state) => createWorkoutEdits(state, state.workoutLogs[0], () => 'new-log');

test('editar no modifica los registros originales antes de guardar o al cancelar', () => {
  const state = fixture();
  const snapshot = structuredClone(state);
  const edits = editsFor(state);
  edits[0].log.sets[0].done = false;
  edits[0].log.load = 99;
  assert.deepEqual(state, snapshot);
});

test('corrige series, repeticiones y carga conservando los identificadores y otros entrenamientos', () => {
  const state = fixture();
  const edits = editsFor(state);
  edits[0] = { ...edits[0], dirty: true, log: { ...edits[0].log, load: 25, sets: [{ reps: 12, done: true }, { reps: 11, done: true }], note: 'Corregido' } };
  const result = applyWorkoutEdit(state, 'workout', date, ' Nota ', edits);
  assert.equal(result.workoutLogs[0].exercises[0].status, 'done');
  assert.equal(result.workoutLogs[0].exercises[0].logId, 'log');
  assert.equal(result.exerciseLogs.length, 2);
  assert.equal(result.exerciseLogs[0].load, 25);
  assert.equal(result.exerciseLogs[0].sets.length, 2);
  assert.deepEqual(result.exerciseLogs[1], state.exerciseLogs[1]);
  assert.equal(result.workoutLogs[0].notes, 'Nota');
});

test('permite completar un ejercicio sin registro y lo vincula al entrenamiento', () => {
  const state = fixture();
  const edits = editsFor(state);
  edits[1] = { ...edits[1], dirty: true, log: { ...edits[1].log, skipped: false, sets: [{ reps: 10, done: true }] } };
  const result = applyWorkoutEdit(state, 'workout', date, '', edits);
  assert.equal(result.workoutLogs[0].exercises[1].status, 'done');
  assert.equal(result.workoutLogs[0].exercises[1].logId, 'new-log');
  assert.equal(result.exerciseLogs.find((log) => log.id === 'new-log').workoutId, 'workout');
});

test('cambiar solo la fecha conserva los estados y no inventa registros de series', () => {
  const state = fixture();
  const newDate = '2026-10-16T12:00:00.000Z';
  const result = applyWorkoutEdit(state, 'workout', newDate, '', editsFor(state));
  assert.equal(result.exerciseLogs.length, state.exerciseLogs.length);
  assert.deepEqual(result.workoutLogs[0].exercises, state.workoutLogs[0].exercises);
  assert.equal(result.exerciseLogs[0].date, newDate);
  assert.equal(result.exerciseLogs[1].date, date);
});

test('marcar sin trabajo deja de contar la sesión y recupera la semana pendiente', () => {
  const state = fixture();
  const edits = editsFor(state);
  edits[0] = { ...edits[0], dirty: true, log: { ...edits[0].log, skipped: true, sets: edits[0].log.sets.map((set) => ({ ...set, done: false })) } };
  const result = applyWorkoutEdit(state, 'workout', date, '', edits);
  assert.equal(result.week, 1);
  assert.equal(countsTowardPlan(result.workoutLogs[0]), false);
  assert.equal(result.workoutLogs[0].exercises[0].status, 'skipped');
});

test('las series parciales siguen contando y un registro vacío nunca es completado', () => {
  assert.equal(statusFromLog({ sets: [] }), 'pending');
  assert.equal(statusFromLog({ sets: [{ done: true }, { done: false }] }), 'partial');
  const state = fixture();
  const result = applyWorkoutEdit(state, 'workout', date, '', editsFor(state));
  assert.equal(countsTowardPlan(result.workoutLogs[0]), true);
});

test('guardar un ejercicio de una sesión finalizada actualiza también su resumen', () => {
  const state = fixture();
  const log = { ...state.exerciseLogs[0], sets: state.exerciseLogs[0].sets.map((set) => ({ ...set, done: true })) };
  const result = saveExerciseLog(state, log);
  assert.equal(result.exerciseLogs.length, state.exerciseLogs.length);
  assert.equal(result.workoutLogs[0].exercises[0].status, 'done');
  assert.equal(result.workoutLogs[0].exercises[0].logId, 'log');
});

test('marcar todas al guardar recalcula la progresión con las series confirmadas', () => {
  const base = { rir: 2, pain: 0, sets: Array.from({ length: 3 }, () => ({ reps: 12, done: false })) };
  assert.equal(exerciseSuggestion(exercise, base), 'mantener');
  assert.equal(exerciseSuggestion(exercise, { ...base, sets: base.sets.map((set) => ({ ...set, done: true })) }), 'subir');
  assert.equal(exerciseSuggestion(exercise, { ...base, pain: 5 }), 'bajar');
});

test('no resucita un entrenamiento borrado mientras estaba abierto el editor', () => {
  const state = fixture();
  const edits = editsFor(state);
  const deleted = { ...state, workoutLogs: [] };
  assert.equal(applyWorkoutEdit(deleted, 'workout', date, '', edits), deleted);
});
