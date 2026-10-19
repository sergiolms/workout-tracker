import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('el service worker no intercepta recursos externos de Google', () => {
  const handlers = new Map();
  const self = {
    location: { pathname: '/workout-tracker/sw.js', origin: 'https://sergiolms.github.io' },
    addEventListener: (type, handler) => handlers.set(type, handler),
  };
  vm.runInNewContext(readFileSync(new URL('./sw.js', import.meta.url), 'utf8'), { self, caches: {}, fetch: () => {}, Response, URL });
  let intercepted = false;
  handlers.get('fetch')({
    request: { method: 'GET', url: 'https://apis.google.com/js/api.js', mode: 'no-cors' },
    respondWith: () => { intercepted = true; },
  });
  assert.equal(intercepted, false);
});

test('un script sin conexión no recibe el HTML de la aplicación', async () => {
  const handlers = new Map();
  const self = {
    location: { pathname: '/workout-tracker/sw.js', origin: 'https://sergiolms.github.io' },
    addEventListener: (type, handler) => handlers.set(type, handler),
  };
  vm.runInNewContext(readFileSync(new URL('./sw.js', import.meta.url), 'utf8'), {
    self,
    caches: { match: async () => undefined },
    fetch: async () => { throw new Error('offline'); },
    Response,
    URL,
  });
  let result = Promise.resolve(Response.error());
  handlers.get('fetch')({
    request: { method: 'GET', url: 'https://sergiolms.github.io/workout-tracker/app.js', mode: 'no-cors' },
    respondWith: (promise) => { result = promise; },
  });
  assert.equal((await result).type, 'error');
});
