import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultState } from './storage.ts';
import { mobilityHistory } from './mobility-history.ts';
import { historyTotals, summarizeHistoryMonth } from './history-summary.ts';
import { completedPlanSlots, planProgress } from './plan-progress.ts';
import { nextRotationRoutine } from './rotation.ts';

test('movilidad agrupa por día y rutina, conserva nombres y descarta claves inválidas', () => {
  const keys = [
    '2020-02-10:corta-Open book',
    '2020-02-10:corta-Open book',
    '2020-02-10:corta-Rodilla a pared / dorsiflexión',
    '2020-02-10:larga-Un nombre-con-guiones',
    '2020-02-30:corta-Imposible',
    'basura',
  ];
  const sessions = mobilityHistory(keys);
  assert.equal(sessions.length, 2);
  assert.equal(
    sessions.find((item) => item.mode === 'corta').exercises.length,
    2,
  );
  assert.equal(
    sessions.find((item) => item.mode === 'larga').exercises[0],
    'Un nombre-con-guiones',
  );
  assert.equal(sessions[0].date, '2020-02-10');
});

test('resúmenes remotos y meses descargados dan totales completos sin duplicar ni perder ediciones optimistas', () => {
  const full = {
    ...defaultState,
    cardioLogs: [
      {
        id: 'old',
        date: '2020-01-10',
        minutes: 30,
        steps: 1000,
        type: 'Caminar',
      },
      {
        id: 'new',
        date: '2026-10-10',
        minutes: 60,
        steps: 2000,
        type: 'Caminar',
      },
    ],
  };
  const summaries = ['2020-01', '2026-10'].map((month) =>
    summarizeHistoryMonth(full, month),
  );
  const partial = {
    ...full,
    cardioLogs: full.cardioLogs.slice(1),
    history: {
      complete: false,
      generation: 1,
      loadedMonths: ['2026-10'],
      summaries,
    },
  };
  assert.deepEqual(historyTotals(partial), historyTotals(full));
  assert.equal(historyTotals({ ...partial, cardioLogs: [] }).cardioMinutes, 30);
});

test('las semanas completadas y la rotación no dependen de descargar todos los entrenamientos', () => {
  const workout = {
    id: 'old',
    date: '2020-01-10',
    week: 1,
    routine: 'a',
    routineName: 'A',
    notes: '',
    exercises: [{ name: 'Press', status: 'done' }],
  };
  const full = {
    ...defaultState,
    sessions: [
      { id: 'a', exercises: [] },
      { id: 'b', exercises: [] },
    ],
    rotation: { id: 'r', startedAt: '2019-01-01', routines: ['a', 'b'] },
    workoutLogs: [workout, { ...workout, id: 'rotation', rotationId: 'r' }],
  };
  const partial = {
    ...full,
    workoutLogs: [],
    history: {
      complete: false,
      generation: 1,
      loadedMonths: ['2026-10'],
      summaries: [summarizeHistoryMonth(full, '2020-01')],
    },
  };
  assert.deepEqual(completedPlanSlots(partial), completedPlanSlots(full));
  assert.deepEqual(planProgress([{ week: 1, routines: ['a', 'b'] }], partial), {
    done: 1,
    total: 2,
  });
  assert.equal(nextRotationRoutine(partial), nextRotationRoutine(full));
});
