import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { Window } from 'happy-dom';

const rootPath = new URL('../', import.meta.url).pathname;

test('the actual app opens a separate gym from Profile, persists purchases locally and returns to training', async () => {
  const browser = new Window({ url: 'http://localhost:5173' });
  browser.HTMLElement.prototype.animate = undefined;
  const globals = {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    localStorage: browser.localStorage,
    HTMLElement: browser.HTMLElement,
    Element: browser.Element,
    Node: browser.Node,
    Event: browser.Event,
    requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
    cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
    ResizeObserver: browser.ResizeObserver,
    MutationObserver: browser.MutationObserver,
    getComputedStyle: browser.getComputedStyle.bind(browser),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  const server = await createServer({
    define: {
      __APP_RELEASE__: JSON.stringify({
        version: 'test',
        build: 'test',
        builtAt: '2026-10-27T12:00:00Z',
        date: '2026-10-27',
      }),
      __APP_BUILD_TIME__: JSON.stringify('2026-10-27T12:00:00Z'),
    },
    configFile: false,
    envDir: '/tmp/zero-to-hero-test-no-env',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    resolve: { alias: { '@': rootPath.replace(/\/$/, '') } },
    plugins: [
      {
        name: 'no-cloud-in-local-gym-test',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            source === '@/lib/firebase' ||
            source === `${rootPath}lib/firebase` ||
            source === `${rootPath}lib/firebase.ts` ||
            (source === './firebase.ts' &&
              importer?.endsWith('/lib/account-session.ts'))
          )
            return '\0local-gym-firebase';
        },
        load(id) {
          if (id === '\0local-gym-firebase')
            return `
          export const firebaseConfigured = false;
          export const prepareGoogleSignIn = async () => {};
          export const subscribeToAuth = async () => { throw Error('Unexpected cloud access'); };
          export const signInWithGoogle = async () => { throw Error('Unexpected cloud access'); };
          export const signOutFirebase = async () => {};
          export const createFirebaseRepository = () => { throw Error('Unexpected cloud access'); };
        `;
        },
      },
      react(),
    ],
  });
  let root;
  let repository;
  try {
    const { createElement, act } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { default: App } = await server.ssrLoadModule(
      '/components/workout-app.tsx',
    );
    await act(async () => {
      await Promise.all(
        [
          '/components/views/today-view.tsx',
          '/components/views/profile-view.tsx',
          '/components/gym/gym-app.tsx',
        ].map((path) => server.ssrLoadModule(path)),
      );
    });
    const storage = await server.ssrLoadModule('/lib/storage.ts');
    const { createLocalRepository } = await server.ssrLoadModule(
      '/lib/local-repository.ts',
    );
    const container = document.createElement('div');
    document.body.append(container);
    const text = () => container.textContent;
    const settle = async (predicate, label) => {
      for (let i = 0; i < 250; i++) {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
        });
        if (predicate()) return;
      }
      assert.fail(`${label}: ${text()}`);
    };
    const click = async (name) => {
      const button = [...document.querySelectorAll('button')].find(
        (el) =>
          (el.getAttribute('aria-label') || el.textContent.trim()) === name,
      );
      assert.ok(button, `Missing button ${name}: ${text()}`);
      assert.equal(button.disabled, false, `${name} must be enabled`);
      await act(async () => button.click());
    };
    const mount = async () => {
      root = createRoot(container);
      await act(async () => root.render(createElement(App)));
    };
    await storage.saveLocalState(storage.defaultState);
    await mount();
    await settle(() => text().includes('Usar sin cuenta'), 'access');
    await click('Usar sin cuenta (sólo local)');
    await settle(
      () => document.querySelector('nav[aria-label="Navegación principal"]'),
      'navigation',
    );
    assert.equal(
      text().includes('Mi gimnasio'),
      false,
      'Today stays focused on training',
    );
    await click('Perfil');
    await settle(() => text().includes('Mi gimnasio'), 'profile launcher');
    const launcher = [...document.querySelectorAll('button')].find((el) =>
      el.textContent.includes('Mi gimnasio'),
    );
    await act(async () => launcher.click());
    await settle(
      () => text().includes('Sala principal'),
      'automatic gym initialization',
    );
    assert.equal(
      document.querySelector('nav[aria-label="Navegación principal"]'),
      null,
      'the training nav is absent inside the game',
    );
    assert.match(browser.location.search, /view=gym/);
    await settle(() => text().includes('Sala principal'), 'activated gym');
    assert.equal((await storage.loadLocalState()).gym.version, 1);
    repository = createLocalRepository();
    const initial = await repository.load();
    await act(async () => {
      await repository.save(
        {
          ...initial,
          cardioLogs: [
            {
              id: 'integration-walk',
              date: new Date().toISOString(),
              type: 'Caminata',
              minutes: 20,
            },
          ],
        },
        initial.updatedAt,
        initial,
      );
    });
    await settle(
      () => document.querySelector('[aria-label="60 créditos disponibles"]'),
      'source rewards reach the game',
    );
    assert.equal(
      [...document.querySelectorAll('button')].some(
        (el) => el.textContent.trim() === 'Logros',
      ),
      false,
      'achievements belong to Profile, not the gym',
    );
    await click('Categoría: Equipo');
    await settle(
      () => document.querySelector('[role="menuitemradio"]'),
      'category menu',
    );
    await act(async () =>
      [...document.querySelectorAll('[role="menuitemradio"]')]
        .find((el) => el.textContent.trim() === 'Detalles')
        .click(),
    );
    await click('Planta20');
    await click('Comprar · 20 créditos');
    await settle(
      () => document.querySelector('[aria-label="40 créditos disponibles"]'),
      'purchase persisted',
    );
    assert.equal(
      Object.keys((await storage.loadLocalState()).gym.purchases).length,
      1,
    );
    assert.equal(
      [...document.querySelectorAll('button')].some((el) =>
        ['Listo', 'Cancelar colocación'].includes(
          el.getAttribute('aria-label') || el.textContent.trim(),
        ),
      ),
      false,
    );
    await settle(
      () =>
        [...document.querySelectorAll('.gym-inventory-item')].some((row) =>
          row.textContent.includes('Planta'),
        ),
      'purchase arrives unplaced in inventory',
    );
    await act(async () =>
      [...document.querySelectorAll('.gym-inventory-item')]
        .find((row) => row.textContent.includes('Planta'))
        .querySelector('button')
        .click(),
    );
    await settle(
      () =>
        [...document.querySelectorAll('button')].some(
          (el) => el.textContent.trim() === 'Girar 90°',
        ),
      'inventory object selected',
    );
    await click('Girar 90°');
    await settle(
      () =>
        [...document.querySelectorAll('button')].find(
          (el) => el.textContent.trim() === 'Girar 90°',
        )?.disabled === false,
      'rotation completed',
    );
    const rotated = await storage.loadLocalState();
    const purchaseId = Object.keys(rotated.gym.purchases)[0];
    assert.equal(
      rotated.gym.placements[purchaseId].rotated,
      true,
      'rotation saves without a Done button',
    );
    for (const rotation of [180, 270, 0, 90]) {
      await click('Girar 90°');
      await settle(
        () =>
          document.querySelector(
            `.gym-scene-object[aria-pressed="true"] .gym-furniture[data-rotation="${rotation}"]`,
          ),
        `preview turns to ${rotation} degrees`,
      );
      await settle(
        () =>
          [...document.querySelectorAll('button')].find(
            (el) => el.textContent.trim() === 'Girar 90°',
          )?.disabled === false,
        'turn saved',
      );
      assert.equal(
        (await storage.loadLocalState()).gym.placements[purchaseId].rotation,
        rotation,
      );
    }
    await act(async () =>
      document
        .querySelector('h1')
        .dispatchEvent(
          new browser.PointerEvent('pointerdown', { bubbles: true }),
        ),
    );
    assert.equal(
      [...document.querySelectorAll('button')].some(
        (el) => el.textContent.trim() === 'Girar 90°',
      ),
      false,
      'outside click closes selection',
    );
    assert.equal(
      (await storage.loadLocalState()).gym.placements[purchaseId].rotated,
      true,
      'dismissing preserves saved rotation',
    );
    await click('Volver a la app');
    await settle(
      () => document.querySelector('nav[aria-label="Navegación principal"]'),
      'return to app',
    );
    await click('Logros');
    await settle(
      () => text().includes('Tu trayectoria'),
      'achievements in Profile',
    );
    assert.match(text(), /Nivel 2/);
    assert.match(text(), /Créditos repetibles/);
    assert.match(text(), /Hasta 30 créditos\/día/);
    assert.match(text(), /Hitos y premios/);
    assert.match(text(), /Trofeo En movimiento/);
    assert.equal(
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent.trim() === 'Organizar',
      ),
      false,
    );
    await act(async () => root.unmount());
    await mount();
    await settle(
      () => document.querySelector('nav[aria-label="Navegación principal"]'),
      'reload local account',
    );
    await click('Perfil');
    await settle(() => text().includes('Mi gimnasio'), 'profile after reload');
    await act(async () =>
      [...document.querySelectorAll('button')]
        .find((el) => el.textContent.includes('Mi gimnasio'))
        .click(),
    );
    await settle(
      () => document.querySelector('[aria-label="40 créditos disponibles"]'),
      'wallet survives remount',
    );
    await click('Inventario');
    assert.equal(
      [...document.querySelectorAll('.gym-inventory-item')].some((row) =>
        row.textContent.includes('Planta'),
      ),
      false,
      'placed items leave inventory',
    );
    await act(async () =>
      document
        .querySelector('g[aria-label="Planta"]')
        .dispatchEvent(new browser.MouseEvent('click', { bubbles: true })),
    );
    await settle(
      () =>
        [...document.querySelectorAll('button')].some(
          (el) => el.textContent.trim() === 'Vender · 20',
        ),
      'placed item actions include sale value',
    );
    await click('Vender · 20');
    await settle(
      () => document.querySelector('[role="dialog"]'),
      'refund confirmation',
    );
    const refund = [
      ...document.querySelector('[role="dialog"]').querySelectorAll('button'),
    ].find((el) => el.textContent.trim() === 'Vender');
    await act(async () => refund.click());
    await settle(
      () => document.querySelector('[aria-label="60 créditos disponibles"]'),
      'refund restores original balance',
    );
    await settle(
      () => !document.querySelector('[role="dialog"]'),
      'refund dialog closed',
    );
    await click('Volver a la app');
    await settle(
      () => document.querySelector('nav[aria-label="Navegación principal"]'),
      'leave gym before fresh diary',
    );
    await act(async () => root.unmount());
    await storage.saveLocalState(storage.defaultState);
    await mount();
    await settle(
      () => document.querySelector('nav[aria-label="Navegación principal"]'),
      'fresh local diary',
    );
    await click('Perfil');
    await settle(() => text().includes('Mi gimnasio'), 'fresh profile');
    await click('Logros');
    await settle(
      () => text().includes('Tu trayectoria'),
      'progress starts automatically without entering the game',
    );
    assert.equal(text().includes('Activar progreso'), false);
    assert.match(text(), /Nivel 1/);
    assert.equal(
      Object.keys((await storage.loadLocalState()).gym.receipts).length,
      0,
    );
    repository.dispose();
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    repository?.dispose();
    if (root) {
      const { act } = await import('react');
      await act(async () => root.unmount());
    }
    await server.close();
    await browser.happyDOM.abort();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
