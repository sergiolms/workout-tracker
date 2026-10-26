import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryObserver, CancelledError } from '@tanstack/react-query';
import { historyQueryOptions, missingHistoryMonths } from './history-query.ts';
import { createAccountQueryClient as configuredClient } from './account-query.ts';
import { defaultState } from './storage.ts';

const createHistoryQueryClient = () => {
  const client = configuredClient();
  client.setQueryDefaults(['account'], { gcTime: Infinity });
  return client;
};

const partial = (loadedMonths = [], complete = false) => ({
  ...defaultState,
  history: { loadedMonths, complete, generation: 1, summaries: [] },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('concurrent history consumers share one request and receive reconciled records', async () => {
  const client = createHistoryQueryClient();
  const response = deferred();
  let calls = 0;
  const source = {
    accountId: 'alice',
    loadMonth: () => {
      calls++;
      return response.promise;
    },
  };
  try {
    const options = historyQueryOptions(source, '2026-09');
    const first = client.query(options);
    const second = client.query(options);
    assert.equal(calls, 1);
    response.resolve(partial(['2026-09']));
    assert.deepEqual(await Promise.all([first, second]), [
      partial(['2026-09']),
      partial(['2026-09']),
    ]);
    assert.deepEqual(
      client.getQueryData(options.queryKey),
      partial(['2026-09']),
    );
    assert.deepEqual(
      missingHistoryMonths(partial(['2026-09']), ['2026-09']),
      [],
    );
  } finally {
    client.clear();
  }
});

test('loaded intervals, complete states, disabled consumers and local stories do not request history', () => {
  assert.deepEqual(
    missingHistoryMonths(partial(['2026-10']), [
      '2026-10',
      '2026-09',
      '2026-09',
    ]),
    ['2026-09'],
  );
  assert.deepEqual(missingHistoryMonths(partial([], true), 'all'), []);
  assert.deepEqual(missingHistoryMonths(partial(), 'all', false), []);
  assert.deepEqual(missingHistoryMonths(defaultState, 'all'), []);
  assert.deepEqual(missingHistoryMonths(undefined, ['2026-09']), []);
  assert.deepEqual(missingHistoryMonths(partial(), 'all'), ['all']);
});

test('failed loads retry once and can be retried explicitly', async () => {
  const client = createHistoryQueryClient();
  let calls = 0;
  const source = {
    accountId: 'alice',
    loadMonth: async () => {
      calls++;
      if (calls <= 2) throw Error('Sin conexión');
      return partial(['2026-09']);
    },
  };
  try {
    const options = {
      ...historyQueryOptions(source, '2026-09'),
      retryDelay: 0,
    };
    await assert.rejects(client.query(options), /Sin conexión/);
    assert.equal(calls, 2);
    assert.deepEqual(await client.query(options), partial(['2026-09']));
    assert.equal(calls, 3);
  } finally {
    client.clear();
  }
});

test('a hydration that did not reconcile the requested interval is an error, not a successful cache entry', async () => {
  const client = createHistoryQueryClient();
  const source = { accountId: 'alice', loadMonth: async () => partial() };
  try {
    const options = { ...historyQueryOptions(source, '2026-09'), retry: false };
    await assert.rejects(client.query(options), /No se pudieron cargar/);
    assert.equal(client.getQueryData(options.queryKey), undefined);
  } finally {
    client.clear();
  }
});

test('a missing interval loads again after a repository reset, even with a previous successful query', async () => {
  const client = createHistoryQueryClient();
  let calls = 0;
  const source = {
    accountId: 'alice',
    loadMonth: async () => {
      calls++;
      return partial(['2026-09']);
    },
  };
  try {
    const options = historyQueryOptions(source, '2026-09');
    await client.query(options);
    await new Promise((resolve) => {
      const observer = new QueryObserver(client, options);
      const stop = observer.subscribe((result) => {
        if (result.isSuccess && !result.isFetching) {
          stop();
          resolve();
        }
      });
    });
    assert.equal(calls, 2);
  } finally {
    client.clear();
  }
});

test('account changes cancel in-flight reads and discard their late results', async () => {
  const oldClient = createHistoryQueryClient();
  const newClient = createHistoryQueryClient();
  const response = deferred();
  const alice = { accountId: 'alice', loadMonth: () => response.promise };
  const bob = { accountId: 'bob', loadMonth: async () => partial(['2026-09']) };
  try {
    const options = historyQueryOptions(alice, '2026-09');
    const pending = oldClient.query(options);
    const cancelled = assert.rejects(
      pending,
      (error) => error instanceof CancelledError,
    );
    oldClient.clear();
    response.resolve(partial(['2026-09']));
    await cancelled;
    await newClient.query(historyQueryOptions(bob, '2026-09'));
    assert.equal(oldClient.getQueryCache().getAll().length, 0);
    assert.equal(newClient.getQueryData(options.queryKey), undefined);
    assert.equal(newClient.getQueryCache().getAll().length, 1);
  } finally {
    oldClient.clear();
    newClient.clear();
  }
});

test('complete history loads require a complete reconciled state', async () => {
  const client = createHistoryQueryClient();
  let complete = false;
  const source = {
    accountId: 'alice',
    loadAll: async () => partial([], complete),
  };
  try {
    const options = { ...historyQueryOptions(source, 'all'), retry: false };
    await assert.rejects(client.query(options), /No se pudieron cargar/);
    complete = true;
    assert.deepEqual(await client.query(options), partial([], true));
  } finally {
    client.clear();
  }
});
