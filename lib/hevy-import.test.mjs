import test from 'node:test';
import assert from 'node:assert/strict';
import { readCsv, hevyDate, parseHevyCsv } from './hevy-import.ts';
import { backupPreview, importBackup } from './backup-import.ts';
import { defaultState } from './storage.ts';
import { planProgress } from './plan-progress.ts';

const header = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe';
const row = 'Demo,"25 Oct 2026, 09:00","25 Oct 2026, 10:00","Nota, con coma",Bench Press,1,,0,warmup,20,12,,,6';
const csv = `${header}\n${row}\n${row.replace('0,warmup,20,12', '1,normal,40,8')}`;

test('CSV quoted values, multiline fields, escaped quotes, BOM and CRLF', () => {
  assert.deepEqual(readCsv('\uFEFFa,b\r\n"x, y","two\n""lines"""'), [['a', 'b'], ['x, y', 'two\n"lines"']]);
  assert.throws(() => readCsv('a,b\n"unclosed,b'), /comillas/);
  assert.throws(() => readCsv('a,b\n"closed"oops,b'), /cierre/);
});
test('Hevy preserves sets, loads, warmups and original effort without inventing RIR', async () => {
  const { state } = await parseHevyCsv(csv);
  assert.equal(state.workoutLogs.length, 1);
  assert.equal(state.workoutLogs[0].source, 'hevy');
  assert.equal(planProgress([{ week: 1, routines: ['routine'] }], state.workoutLogs).done, 0);
  assert.equal(state.exerciseLogs.length, 1);
  assert.equal(state.exerciseLogs[0].sets[0].kind, 'warmup');
  assert.equal(state.exerciseLogs[0].sets[1].load, 40);
  assert.equal(state.exerciseLogs[0].sets[0].rpe, 6);
  assert.equal(state.exerciseLogs[0].sets[0].supersetId, '1');
  assert.equal(state.exerciseLogs[0].effortUnknown, true);
  assert.match(state.exerciseLogs[0].note, /RPE 6/);
  assert.match(state.workoutLogs[0].notes, /Nota, con coma/);
  assert.match(state.workoutLogs[0].notes, /60 min/);
  assert.deepEqual(state.sessions, []);
  assert.equal(backupPreview(state, (await parseHevyCsv(csv)).state)[0].duplicates, 1);
  const current = { ...defaultState, planName: 'Existing plan', sessions: [{ id: 'routine', name: 'Mine', exercises: [] }] };
  const imported = importBackup(current, state, { includePlan: false, replaceConflicts: false });
  assert.deepEqual(imported.sessions, current.sessions);
  assert.equal(importBackup(imported, state, { includePlan: false, replaceConflicts: false }).workoutLogs.length, 1);
});
test('two workouts on one day stay separate and reordering rows keeps IDs stable', async () => {
  const two = await parseHevyCsv(`${header}\n${row}\n${row.replaceAll('09:00', '11:00').replaceAll('10:00', '12:00')}`);
  assert.equal(two.state.workoutLogs.length, 2);
  const reversed = await parseHevyCsv(`${header}\n${csv.split('\n').slice(1).reverse().join('\n')}`);
  assert.equal(reversed.state.workoutLogs[0].id, (await parseHevyCsv(csv)).state.workoutLogs[0].id);
});
test('measurements convert explicit pounds/inches, preview duplicates and warn about other metrics', async () => {
  const result = await parseHevyCsv('date;weight_lbs;waist_in;fat_percent\n2026-10-25;160;32;20');
  assert.equal(result.state.measurements[0].weight, 160 * .45359237);
  assert.equal(result.state.measurements[0].waist, 32 * 2.54);
  assert.equal(result.warnings.length, 1);
});
test('rejects corrupt dates, numbers, incomplete headers and partial rows', async () => {
  assert.throws(() => hevyDate('31 Feb 2026, 09:00'), /no válida/);
  assert.throws(() => hevyDate('2026-02-30'), /no válida/);
  for (const invalid of [csv.replace(',40,8', ',NaN,8'), 'date,weight\n2026-01-01,70', csv.replace('1,normal,40,8', '1,normal,40,8.2'), `${header}\nmissing`]) await assert.rejects(parseHevyCsv(invalid));
});
test('supports explicit timezone, Spanish dates and decimal comma measurements', async () => {
  assert.equal(hevyDate('2026-10-25T09:00:00+02:00'), '2026-10-25T07:00:00.000Z');
  assert.equal(new Date(hevyDate('25 oct 2026')).getDate(), 25);
  const result = await parseHevyCsv('date;weight_kg;waist_cm\n2026-10-25;72,6;');
  assert.equal(result.state.measurements[0].weight, 72.6);
  assert.equal(result.state.measurements[0].waist, undefined);
});
