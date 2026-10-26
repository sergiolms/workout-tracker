import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountSync, assertCloudVersion } from './account-sync.ts';
import { defaultState, migrateState } from './storage.ts';
import { firebasePayload } from './firebase.ts';

const plan = (name, updatedAt = name) => ({
  ...defaultState,
  planName: name,
  updatedAt,
  sessions: [{ id: 'A1', name, exercises: [] }],
  periods: [{ id: 'p', name, durationWeeks: 4, routines: ['A1'] }],
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup(local = null, remote = null, overrides = {}) {
  const saved = [],
    uploaded = [],
    backups = [],
    events = [];
  const database = { value: remote };
  const dependencies = {
    loadLocal: async () => local,
    saveLocal: async (state) => {
      saved.push(structuredClone(state));
    },
    backup: async (state, source) => {
      backups.push({ state, source });
    },
    loadCloud: async () => structuredClone(database.value),
    saveCloud: async (state, expected) => {
      assertCloudVersion(database.value?.updatedAt ?? null, expected);
      database.value = structuredClone(state);
      uploaded.push(structuredClone(state));
    },
    onChange: (state, status) => events.push({ state, status }),
    ...overrides,
  };
  return {
    store: new AccountSync(dependencies),
    saved,
    uploaded,
    backups,
    events,
    database,
    dependencies,
  };
}
async function connect(fixture) {
  await fixture.store.initialize();
  await fixture.store.sync();
  return fixture;
}

test('Firebase manda incluso si la caché tiene un reloj posterior', async () => {
  const fixture = await connect(
    setup(plan('Caché', '2099-01-01'), plan('Firebase', '2026-10-19')),
  );
  assert.equal(fixture.store.state.planName, 'Firebase');
  assert.equal(fixture.saved.at(-1).planName, 'Firebase');
  assert.equal(fixture.uploaded.length, 0);
  assert.equal(fixture.store.status.canEdit, true);
});

test('un dispositivo nuevo descarga el plan completo y no realiza escrituras', async () => {
  const fixture = await connect(setup(null, plan('Plan guardado')));
  assert.equal(fixture.store.state.planName, 'Plan guardado');
  assert.equal(fixture.store.state.sessions.length, 1);
  assert.equal(fixture.store.state.periods.length, 1);
  assert.equal(fixture.uploaded.length, 0);
});

test('sin documento remoto no restaura ni sube un plan local antiguo', async () => {
  const fixture = await connect(setup(plan('Antiguo'), null));
  assert.deepEqual(fixture.store.state, defaultState);
  assert.equal(fixture.uploaded.length, 0);
  assert.ok(
    fixture.backups.some(
      ({ state, source }) => state.planName === 'Antiguo' && source === 'local',
    ),
  );
});

test('un plan vacío de Firebase prevalece sobre rutinas antiguas locales', async () => {
  const fixture = await connect(
    setup(plan('Viejo'), { ...defaultState, updatedAt: 'v2' }),
  );
  assert.deepEqual(fixture.store.state.sessions, []);
  assert.equal(fixture.uploaded.length, 0);
});

test('un fallo de lectura remoto deja la caché en modo lectura y no escribe', async () => {
  const fixture = setup(plan('Caché'), null, {
    loadCloud: async () => {
      throw Error('offline');
    },
  });
  await connect(fixture);
  fixture.store.update((state) => ({ ...state, planName: 'No autorizado' }));
  assert.equal(fixture.store.state.planName, 'Caché');
  assert.equal(fixture.store.status.canEdit, false);
  assert.equal(fixture.uploaded.length, 0);
  assert.equal(fixture.saved.length, 0);
});

test('el usuario no edita antes de terminar la lectura de Firebase', async () => {
  const read = deferred();
  const fixture = setup(plan('Caché'), null, { loadCloud: () => read.promise });
  await fixture.store.initialize();
  const sync = fixture.store.sync();
  fixture.store.update((state) => ({ ...state, planName: 'Prematuro' }));
  read.resolve(plan('Servidor'));
  await sync;
  assert.equal(fixture.store.state.planName, 'Servidor');
  assert.equal(fixture.uploaded.length, 0);
});

test('guardar una sesión y recargar conserva los datos confirmados en Firebase', async () => {
  const fixture = await connect(setup(null, plan('Original')));
  fixture.store.update((state) => ({
    ...state,
    sessions: [{ id: 'A1', name: 'Editada', exercises: [{ name: 'Remo' }] }],
  }));
  await fixture.store.flushLocal();
  await fixture.store.sync();
  const next = await connect(
    setup(plan('Caché vieja'), fixture.database.value),
  );
  assert.equal(next.store.state.sessions[0].name, 'Editada');
  assert.equal(next.store.state.sessions[0].exercises[0].name, 'Remo');
  assert.equal(next.uploaded.length, 0);
});

test('dos dispositivos no pueden sobrescribir cambios partiendo de la misma versión', async () => {
  const first = await connect(setup(null, plan('Base', 'v1')));
  const second = await connect(
    setup(null, null, {
      loadCloud: first.dependencies.loadCloud,
      saveCloud: first.dependencies.saveCloud,
    }),
  );
  first.store.update((state) => ({ ...state, planName: 'Cambio del primero' }));
  await first.store.flushLocal();
  await first.store.sync();
  second.store.update((state) => ({ ...state, planName: 'Cambio obsoleto' }));
  await second.store.flushLocal();
  await second.store.sync();
  assert.equal(first.database.value.planName, 'Cambio del primero');
  assert.equal(second.store.status.cloud, 'error');
  assert.equal(second.store.status.canEdit, false);
  assert.match(second.store.status.error, /otro dispositivo/);
  assert.equal(second.saved.at(-1).planName, 'Cambio obsoleto');
  await second.store.sync();
  assert.equal(first.database.value.planName, 'Cambio del primero');
});

test('una escritura pendiente no devuelve datos antiguos ni pierde las siguientes ediciones', async () => {
  const write = deferred();
  const fixture = await connect(setup(null, plan('Base', 'v1')));
  let calls = 0;
  const save = fixture.dependencies.saveCloud;
  fixture.dependencies.saveCloud = async (...args) => {
    if (++calls === 1) await write.promise;
    await save(...args);
  };
  fixture.store.update((state) => ({ ...state, planName: 'Primero' }));
  await fixture.store.flushLocal();
  const syncing = fixture.store.sync();
  await tick();
  fixture.store.update((state) => ({ ...state, planName: 'Último' }));
  await fixture.store.flushLocal();
  write.resolve();
  await syncing;
  assert.equal(fixture.database.value.planName, 'Último');
  assert.equal(fixture.store.status.cloud, 'synced');
});

test('reconectar tras un fallo inicial descarga Firebase sin subir la caché', async () => {
  let offline = true;
  const fixture = setup(plan('Caché'), null, {
    loadCloud: async () => {
      if (offline) throw Error('offline');
      return plan('Nube');
    },
  });
  await connect(fixture);
  offline = false;
  await fixture.store.sync();
  assert.equal(fixture.store.state.planName, 'Nube');
  assert.equal(fixture.uploaded.length, 0);
});

test('un fallo de escritura conserva los cambios locales sin anunciar guardado remoto', async () => {
  let fail = true;
  const fixture = await connect(setup(null, plan('Base')));
  const save = fixture.dependencies.saveCloud;
  fixture.dependencies.saveCloud = async (...args) => {
    if (fail) throw Error('offline');
    return save(...args);
  };
  fixture.store.update((state) => ({ ...state, planName: 'Pendiente' }));
  await fixture.store.flushLocal();
  await fixture.store.sync();
  assert.equal(fixture.store.status.cloud, 'error');
  assert.equal(fixture.store.status.canEdit, false);
  assert.equal(fixture.database.value.planName, 'Base');
  assert.equal(fixture.saved.at(-1).planName, 'Pendiente');
  fail = false;
  await fixture.store.sync();
  assert.equal(fixture.database.value.planName, 'Pendiente');
});

test('una lectura local fallida puede recuperarse desde Firebase sin subir valores vacíos', async () => {
  const fixture = await connect(
    setup(null, plan('Seguro'), {
      loadLocal: async () => {
        throw Error('IDB');
      },
    }),
  );
  assert.equal(fixture.store.state.planName, 'Seguro');
  assert.equal(fixture.uploaded.length, 0);
});

test('un fallo guardando la caché se muestra y no dispara una escritura remota', async () => {
  const fixture = await connect(
    setup(null, plan('Seguro'), {
      saveLocal: async () => {
        throw Error('QuotaExceededError');
      },
    }),
  );
  assert.equal(fixture.store.status.local, 'error');
  assert.equal(fixture.store.status.canEdit, false);
  assert.equal(fixture.uploaded.length, 0);
});

test('cerrar o cambiar cuenta desactiva respuestas y escrituras tardías', async () => {
  const read = deferred();
  const fixture = setup(plan('Cuenta A'), null, {
    loadCloud: () => read.promise,
  });
  await fixture.store.initialize();
  const sync = fixture.store.sync();
  fixture.store.dispose();
  const count = fixture.events.length;
  read.resolve(plan('Otra cuenta'));
  await sync;
  assert.equal(fixture.events.length, count);
  assert.equal(fixture.uploaded.length, 0);
});

test('el control de versión también protege la creación y la eliminación remotas', () => {
  assert.doesNotThrow(() => assertCloudVersion(null, null));
  assert.throws(() => assertCloudVersion('creado', null), /otro dispositivo/);
  assert.throws(
    () => assertCloudVersion(null, 'eliminado'),
    /otro dispositivo/,
  );
});

test('Firestore recibe JSON sin undefined al leer formatos de semanas antiguos', () => {
  const migrated = migrateState({
    ...plan('Anterior'),
    periods: [],
    plan: [{ week: 1, block: 'Inicio', routines: ['A1'] }],
    theme: 'light',
  });
  assert.equal(migrated.theme, 'light');
  assert.equal(
    Object.hasOwn(firebasePayload(migrated).plan[0], 'deload'),
    false,
  );
});

test('rest preferences are saved to Firebase and recovered on another device without changing sessions', async () => {
  const fixture = await connect(setup(null, plan('Plan original')));
  fixture.store.update((current) => ({
    ...current,
    restEnabled: false,
    restSeconds: 150,
  }));
  await fixture.store.sync();
  const uploaded = fixture.database.value;
  assert.equal(uploaded.restEnabled, false);
  assert.equal(uploaded.restSeconds, 150);
  assert.deepEqual(uploaded.sessions, plan('Plan original').sessions);
  const other = await connect(setup(null, uploaded));
  assert.equal(other.store.state.restEnabled, false);
  assert.equal(other.store.state.restSeconds, 150);
  assert.equal(other.uploaded.length, 0);
});

test('exercise rest settings survive a cloud reload without enabling or changing another exercise', async () => {
  const initial = plan('Descansos');
  initial.sessions[0].exercises = [
    { name: 'Remo', restEnabled: true, restSeconds: 60 },
    { name: 'Press', restEnabled: false, restSeconds: 120 },
  ];
  initial.restEnabled = false;
  const fixture = await connect(setup(null, initial));
  fixture.store.update((current) => ({
    ...current,
    sessions: current.sessions.map((session) => ({
      ...session,
      exercises: session.exercises.map((exercise) =>
        exercise.name === 'Remo' ? { ...exercise, restSeconds: 75 } : exercise,
      ),
    })),
  }));
  await fixture.store.sync();
  const other = await connect(setup(null, fixture.database.value));
  assert.deepEqual(other.store.state.sessions[0].exercises, [
    { name: 'Remo', restEnabled: true, restSeconds: 75 },
    { name: 'Press', restEnabled: false, restSeconds: 120 },
  ]);
  assert.equal(other.store.state.restEnabled, false);
  assert.equal(other.uploaded.length, 0);
});

test('la caché de Query refleja el cambio antes de escribir en disco o Firebase', async () => {
  const disk = deferred();
  const fixture = await connect(setup(null, plan('Base')));
  fixture.dependencies.saveLocal = () => disk.promise;
  const { client, stateKey } = fixture.store;
  const initial = client.getQueryData(stateKey);
  const notifications = [];
  const stop = client.getQueryCache().subscribe((event) => {
    if (event.query.queryKey.join('/') === stateKey.join('/'))
      notifications.push(client.getQueryData(stateKey));
  });
  fixture.store.update((state) => ({
    ...state,
    mobilityDone: ['2026-10-26:corta-Test'],
  }));
  const optimistic = client.getQueryData(stateKey);
  assert.deepEqual(optimistic.mobilityDone, ['2026-10-26:corta-Test']);
  assert.equal(fixture.store.status.cloud, 'pending');
  assert.equal(fixture.store.state, optimistic);
  assert.equal(notifications[0], optimistic);
  assert.deepEqual(initial.mobilityDone, []);
  disk.resolve();
  await fixture.store.flushLocal();
  await fixture.store.sync();
  stop();
  assert.ok(notifications.every((state) => state.mobilityDone.length === 1));
  assert.equal(fixture.store.status.cloud, 'synced');
});

test('una desconexión conserva las marcas y permite seguir editando sin un bucle de reintentos', async () => {
  const fixture = await connect(setup(null, plan('Base')));
  let offline = true;
  let writes = 0;
  const save = fixture.dependencies.saveCloud;
  fixture.dependencies.saveCloud = async (...args) => {
    writes++;
    if (offline)
      throw Object.assign(Error('Sin conexión'), { code: 'unavailable' });
    return save(...args);
  };
  fixture.store.update((state) => ({ ...state, mobilityDone: ['primero'] }));
  await fixture.store.sync();
  assert.equal(fixture.store.status.cloud, 'error');
  assert.equal(fixture.store.status.canEdit, true);
  const failedWrites = writes;
  await tick();
  await tick();
  assert.equal(writes, failedWrites);
  fixture.store.update((state) => ({
    ...state,
    mobilityDone: [...state.mobilityDone, 'segundo'],
  }));
  assert.deepEqual(fixture.store.state.mobilityDone, ['primero', 'segundo']);
  await fixture.store.sync();
  offline = false;
  await fixture.store.sync();
  assert.deepEqual(fixture.database.value.mobilityDone, ['primero', 'segundo']);
  assert.equal(fixture.store.status.cloud, 'synced');
});

test('el listener permite trabajar sin red pero bloquea un error de permisos', async () => {
  let fail;
  const fixture = await connect(
    setup(null, plan('Base'), {
      subscribeCloud: (_notify, error) => {
        fail = error;
        return () => {};
      },
    }),
  );
  fail(Object.assign(Error('Red no disponible'), { code: 'unavailable' }));
  assert.equal(fixture.store.status.canEdit, true);
  fail(Object.assign(Error('Acceso denegado'), { code: 'permission-denied' }));
  assert.equal(fixture.store.status.canEdit, false);
  fixture.store.update((state) => ({
    ...state,
    mobilityDone: ['no-autorizado'],
  }));
  assert.deepEqual(fixture.store.state.mobilityDone, []);
});

test('la última edición sigue visible mientras llegan confirmaciones anteriores', async () => {
  const gate = deferred();
  const fixture = await connect(setup(null, plan('Base', 'v1')));
  const save = fixture.dependencies.saveCloud;
  let writes = 0;
  fixture.dependencies.saveCloud = async (...args) => {
    if (++writes === 1) await gate.promise;
    await save(...args);
    return structuredClone(fixture.database.value);
  };
  fixture.store.update((state) => ({ ...state, mobilityDone: ['primero'] }));
  await fixture.store.flushLocal();
  const syncing = fixture.store.sync();
  await tick();
  fixture.store.update((state) => ({ ...state, mobilityDone: [] }));
  fixture.store.update((state) => ({ ...state, mobilityDone: ['último'] }));
  const start = fixture.events.length;
  gate.resolve();
  await syncing;
  assert.ok(
    fixture.events
      .slice(start)
      .every(({ state }) => state.mobilityDone[0] === 'último'),
  );
  assert.deepEqual(fixture.database.value.mobilityDone, ['último']);
});

test('una notificación antigua no sustituye a una más reciente que ya está en cola', async () => {
  const gate = deferred();
  let notify;
  const base = { ...plan('Base', 'v1'), cloudRevision: 1 };
  const fixture = await connect(
    setup(null, base, {
      subscribeCloud: (callback) => {
        notify = callback;
        return () => {};
      },
    }),
  );
  fixture.dependencies.saveCloud = async (state) => {
    await gate.promise;
    return { ...state, cloudRevision: 2 };
  };
  fixture.store.update((state) => ({ ...state, planName: 'Editado' }));
  const syncing = fixture.store.sync();
  await tick();
  notify({
    ...base,
    planName: 'Editado',
    theme: 'dark',
    cloudRevision: 3,
    updatedAt: 'v3',
  });
  notify({ ...base, planName: 'Editado', cloudRevision: 2, updatedAt: 'v2' });
  gate.resolve();
  await syncing;
  assert.equal(fixture.store.state.planName, 'Editado');
  assert.equal(fixture.store.state.theme, 'dark');
  assert.equal(fixture.store.state.cloudRevision, 3);
});

test('confirmar un guardado no borra el borrador de una edición realizada durante la limpieza', async () => {
  const clearing = deferred();
  const clearGate = deferred();
  const secondWrite = deferred();
  const secondStarted = deferred();
  let blockClear = false;
  let pending = null;
  const fixture = await connect(
    setup(null, plan('Base', 'v1'), {
      savePending: async (value) => {
        if (value === null && blockClear) {
          blockClear = false;
          clearing.resolve();
          await clearGate.promise;
        }
        pending = structuredClone(value);
      },
    }),
  );
  const save = fixture.dependencies.saveCloud;
  let writes = 0;
  fixture.dependencies.saveCloud = async (...args) => {
    if (++writes === 2) {
      secondStarted.resolve();
      await secondWrite.promise;
    }
    await save(...args);
    return structuredClone(fixture.database.value);
  };
  blockClear = true;
  fixture.store.update((state) => ({ ...state, planName: 'Primero' }));
  const syncing = fixture.store.sync();
  await clearing.promise;
  fixture.store.update((state) => ({ ...state, planName: 'Último' }));
  clearGate.resolve();
  await secondStarted.promise;
  assert.equal(pending.state.planName, 'Último');
  assert.equal(fixture.store.state.planName, 'Último');
  assert.equal(fixture.store.status.cloud, 'pending');
  secondWrite.resolve();
  await syncing;
  await fixture.store.flushLocal();
  await fixture.store.sync();
  assert.equal(pending, null);
  assert.equal(fixture.database.value.planName, 'Último');
});
