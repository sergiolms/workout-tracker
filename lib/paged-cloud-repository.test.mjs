import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from '../tests/helpers/record-database.mjs';
import { PagedCloudRepository } from './paged-cloud-repository.ts';
import { CloudRepository } from './cloud-repository.ts';
import { defaultState } from './storage.ts';
import { historyMonth, historyTotals } from './history-summary.ts';
import { CloudConflict, stateRecords } from './cloud-records.ts';
import { WorkoutPersistence } from './persistence.ts';
import { moveToTrash } from './record-trash.ts';

const currentMonth = historyMonth(new Date().toISOString());
const seed = () => ({
  ...defaultState,
  planName: 'Cuenta de prueba',
  cardioLogs: Array.from({ length: 240 }, (_, i) => ({
    id: `old-${i}`,
    date: '2020-02-10T12:00:00.000Z',
    type: 'Caminar',
    minutes: 30,
    steps: 1000,
  })),
  measurements: [
    { id: 'recent', date: `${currentMonth}-01T12:00:00.000Z`, weight: 72 },
  ],
  mobilityDone: ['2020-02-10:corta-Open book'],
});

test('prepara una copia verificada y después abre la cuenta sin descargar el historial antiguo', async () => {
  const original = seed(),
    fixture = database(original);
  const repository = new PagedCloudRepository(fixture.backend);
  await repository.load();
  assert.deepEqual(fixture.data.get('appState/main'), original);
  const oldPointer = [...fixture.data.keys()].filter((key) =>
    key.startsWith('records-'),
  );
  assert.ok(oldPointer.length > 240);
  fixture.pages.length = 0;
  const fresh = await new PagedCloudRepository(fixture.backend).load();
  assert.equal(fresh.cardioLogs.length, 0);
  assert.equal(fresh.measurements.length, 1);
  assert.equal(historyTotals(fresh).cardioMinutes, 7200);
  assert.ok(fixture.pages.every((page) => page.prefix || page.start));
  assert.ok(
    fixture.pages
      .filter((page) => page.start)
      .every((page) => page.start.startsWith(currentMonth)),
  );
  const full = await repository.loadAll();
  assert.deepEqual(
    [...stateRecords(full)].sort(([a], [b]) => a.localeCompare(b)),
    [...stateRecords(original)].sort(([a], [b]) => a.localeCompare(b)),
  );
  await assert.rejects(
    new CloudRepository(fixture.backend).load(),
    /versión más reciente/,
  );
});

test('los meses se consultan por fecha y cursor, sin truncarlos a 100 registros', async () => {
  const fixture = database(seed());
  const repository = new PagedCloudRepository(fixture.backend);
  await repository.load();
  fixture.pages.length = 0;
  const loaded = await repository.loadMonth('2020-02');
  assert.equal(loaded.cardioLogs.length, 240);
  assert.deepEqual(loaded.mobilityDone, ['2020-02-10:corta-Open book']);
  assert.ok(
    fixture.pages.some(
      (page) => page.start?.startsWith('2020-02') && page.after,
    ),
  );
  assert.ok(
    fixture.pages.every((page) => !page.collection || page.since !== undefined),
  );
  assert.ok(loaded.history.loadedMonths.includes('2020-02'));
});

test('guardar desde una cuenta parcial no elimina registros no descargados y mantiene los resúmenes al borrar', async () => {
  const fixture = database(seed());
  const repository = new PagedCloudRepository(fixture.backend);
  const before = await repository.load();
  await repository.save(
    { ...before, planName: 'Actualizado' },
    before.updatedAt,
    before,
  );
  let full = await repository.loadAll();
  assert.equal(full.cardioLogs.length, 240);
  assert.equal(full.planName, 'Actualizado');
  const other = new PagedCloudRepository(fixture.backend);
  const old = await other.loadMonth('2020-02');
  const edited = {
    ...old,
    cardioLogs: old.cardioLogs.filter((log) => log.id !== 'old-0'),
  };
  const saved = await other.save(edited, old.updatedAt, old);
  assert.equal(historyTotals(saved).cardioMinutes, 239 * 30);
  full = await other.loadAll();
  assert.equal(full.cardioLogs.length, 239);
});

test('los cambios de fecha actualizan ambos meses y los clientes no sobrescriben el mismo campo', async () => {
  const fixture = database(seed());
  const first = new PagedCloudRepository(fixture.backend),
    second = new PagedCloudRepository(fixture.backend);
  const a = await first.loadMonth('2020-02'),
    b = await second.loadMonth('2020-02');
  const edit = (state, minutes, date) => ({
    ...state,
    cardioLogs: state.cardioLogs.map((log) =>
      log.id === 'old-0' ? { ...log, minutes, date: date ?? log.date } : log,
    ),
  });
  await first.save(edit(a, 60, '2019-03-10T12:00:00.000Z'), a.updatedAt, a);
  await assert.rejects(second.save(edit(b, 90), b.updatedAt, b), CloudConflict);
  const fresh = await new PagedCloudRepository(fixture.backend).load();
  assert.equal(
    fresh.history.summaries.find((item) => item.month === '2020-02')
      .cardioMinutes,
    239 * 30,
  );
  assert.equal(
    fresh.history.summaries.find((item) => item.month === '2019-03')
      .cardioMinutes,
    60,
  );
});

test('hidratar un mes con la misma revisión conserva las ediciones optimistas y no sintetiza entrenamientos', async () => {
  const fixture = database(seed()),
    repository = new PagedCloudRepository(fixture.backend);
  const store = new WorkoutPersistence({
    loadLocal: async () => null,
    saveLocal: async () => {},
    backup: async () => {},
    loadCloud: repository.load,
    saveCloud: repository.save,
  });
  await store.initialize();
  await store.sync();
  store.update((state) => ({ ...state, planName: 'Pendiente' }));
  await store.hydrate(() => repository.loadMonth('2020-02'));
  await store.sync();
  assert.equal(store.state.cardioLogs.length, 240);
  assert.equal(store.state.planName, 'Pendiente');
  assert.equal(store.state.workoutLogs.length, 0);
  const full = await store.hydrate(repository.loadAll);
  assert.equal(full.history.complete, true);
  assert.equal(full.planName, 'Pendiente');
  store.dispose();
});

test('la preparación no se activa si la copia pierde las fechas de consulta', async () => {
  const original = seed(),
    fixture = database(original),
    batch = fixture.backend.batch;
  fixture.backend.batch = (entries) =>
    batch(
      entries.map((entry) => {
        if (!entry.path.startsWith('history-')) return entry;
        const value = { ...entry.value };
        delete value.historyDate;
        return { ...entry, value };
      }),
    );
  await assert.rejects(
    new PagedCloudRepository(fixture.backend).load(),
    /comprobación de fechas/,
  );
  assert.equal(fixture.data.get('appState/records-v1').schema, 1);
  assert.deepEqual(fixture.data.get('appState/main'), original);
});

test('recuperar un borrador de otro mes consulta la cuenta completa antes de reconciliarlo', async () => {
  const fixture = database(seed()),
    repository = new PagedCloudRepository(fixture.backend);
  const before = await repository.loadMonth('2020-02');
  const pending = {
    base: before,
    state: {
      ...before,
      cardioLogs: before.cardioLogs.map((log) =>
        log.id === 'old-0' ? { ...log, minutes: 45 } : log,
      ),
    },
  };
  const next = new PagedCloudRepository(fixture.backend);
  const store = new WorkoutPersistence({
    loadLocal: async () => pending.state,
    saveLocal: async () => {},
    backup: async () => {},
    loadCloud: next.load,
    loadFullCloud: next.loadAll,
    saveCloud: next.save,
    loadPending: async () => pending,
    savePending: async () => {},
  });
  await store.initialize();
  await store.sync();
  assert.equal(store.status.cloud, 'synced');
  assert.equal(store.status.conflicts, undefined);
  assert.equal(
    (await next.loadAll()).cardioLogs.find((log) => log.id === 'old-0').minutes,
    45,
  );
});

test('un cambio concurrente obliga a recalcular el resumen antes de confirmar la transacción', async () => {
  const fixture = database(seed());
  const first = new PagedCloudRepository(fixture.backend),
    second = new PagedCloudRepository(fixture.backend);
  const a = await first.loadMonth('2020-02'),
    b = await second.loadMonth('2020-02');
  const transaction = fixture.backend.transaction;
  let interrupt = true;
  fixture.backend.transaction = async (action) => {
    if (interrupt) {
      interrupt = false;
      await second.save(
        {
          ...b,
          cardioLogs: b.cardioLogs.map((log) =>
            log.id === 'old-1' ? { ...log, minutes: 45 } : log,
          ),
        },
        b.updatedAt,
        b,
      );
    }
    return transaction(action);
  };
  const saved = await first.save(
    {
      ...a,
      cardioLogs: a.cardioLogs.map((log) =>
        log.id === 'old-0' ? { ...log, minutes: 60 } : log,
      ),
    },
    a.updatedAt,
    a,
  );
  assert.equal(historyTotals(saved).cardioMinutes, 7245);
  assert.equal(
    (await first.loadAll()).cardioLogs.find((log) => log.id === 'old-1')
      .minutes,
    45,
  );
});

test('editar o borrar un entrenamiento carga sus series vinculadas aunque sean de otro mes', async () => {
  const exercise = {
    id: 'old-log',
    workoutId: 'workout',
    date: '2020-02-10T12:00:00Z',
    week: 1,
    routine: 'a',
    exercise: 'Press',
    load: 40,
    sets: [{ reps: 10, done: true }],
    rir: 2,
    pain: 0,
    note: '',
    suggestion: 'mantener',
  };
  const fixture = database({
    ...seed(),
    exerciseLogs: [exercise],
    workoutLogs: [
      {
        id: 'workout',
        date: `${currentMonth}-01T12:00:00Z`,
        week: 1,
        routine: 'a',
        routineName: 'A',
        notes: '',
        exercises: [{ name: 'Press', logId: 'old-log', status: 'done' }],
      },
    ],
  });
  const repository = new PagedCloudRepository(fixture.backend);
  const initial = await repository.load();
  assert.equal(
    initial.exerciseLogs.find((log) => log.id === 'old-log').load,
    40,
  );
  assert.ok(!initial.history.loadedMonths.includes('2020-02'));
  await repository.save(
    moveToTrash(initial, 'workoutLogs', 'workout'),
    initial.updatedAt,
    initial,
  );
  const full = await repository.loadAll();
  assert.equal(full.exerciseLogs.length, 0);
  assert.equal(full.trash[0].exerciseLogs.length, 1);
  assert.equal(full.cardioLogs.length, 240);
});
