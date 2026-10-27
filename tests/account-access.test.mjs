import { applyGymCommand, gymProgress } from '../lib/gym/engine.ts';
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { Window } from 'happy-dom';

const rootPath = new URL('../', import.meta.url).pathname;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('the React account flow supports local access, reload, explicit cloud import and account isolation', async () => {
  const browser = new Window({ url: 'http://localhost:5173' });
  const globals = {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    localStorage: browser.localStorage,
    HTMLElement: browser.HTMLElement,
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
      value,
      writable: true,
    });
  const cloud = new Map();
  let authListener;
  let authCalls = 0;
  let signInCalls = 0;
  let loginError;
  let writes = 0;
  let gymWrites = 0;
  const user = {
    uid: 'cloud-user',
    displayName: 'Test',
    email: 'test@example.invalid',
    photoURL: null,
    isAnonymous: false,
  };
  globalThis.__accountTestFirebase = {
    subscribe: (change) => {
      authCalls++;
      authListener = change;
      change(user);
      return () => {
        authListener = null;
      };
    },
    signIn: async () => {
      signInCalls++;
      if (loginError) throw loginError;
      return user;
    },
    signOut: async () => {
      authListener?.(null);
    },
    repository: (uid) => ({
      gymCommand: async (command) => {
        gymWrites++;
        const next = applyGymCommand(cloud.get(uid), command);
        next.cloudRevision = (cloud.get(uid)?.cloudRevision ?? 0) + 1;
        cloud.set(uid, next);
        return structuredClone(next);
      },
      load: async () => structuredClone(cloud.get(uid)),
      loadAll: async () => structuredClone(cloud.get(uid)),
      loadMonth: async () => structuredClone(cloud.get(uid)),
      save: async (state) => {
        writes++;
        const next = {
          ...structuredClone(state),
          cloudRevision: (cloud.get(uid)?.cloudRevision ?? 0) + 1,
        };
        cloud.set(uid, next);
        return next;
      },
      subscribe: () => () => {},
    }),
  };
  const server = await createServer({
    configFile: false,
    envDir: '/tmp/zero-to-hero-test-no-env',
    server: { middlewareMode: true },
    appType: 'custom',
    resolve: { alias: { '@': rootPath.replace(/\/$/, '') } },
    plugins: [
      {
        name: 'isolated-firebase-fixture',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            source === '@/lib/firebase' ||
            source === `${rootPath}lib/firebase` ||
            source === `${rootPath}lib/firebase.ts` ||
            (source === './firebase.ts' &&
              importer?.endsWith('/lib/account-session.ts'))
          )
            return '\0account-test-firebase';
        },
        load(id) {
          if (id === '\0account-test-firebase')
            return `
          export const subscribeToAuth = async (callback) => globalThis.__accountTestFirebase.subscribe(callback);
          export const prepareGoogleSignIn = async () => {};
          export const signInWithGoogle = () => globalThis.__accountTestFirebase.signIn();
          export const signOutFirebase = () => globalThis.__accountTestFirebase.signOut();
          export const createFirebaseRepository = (uid) => globalThis.__accountTestFirebase.repository(uid);
        `;
        },
      },
      react(),
    ],
  });
  let root;
  try {
    const { createElement, act, StrictMode } = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useWorkoutAccount } = await server.ssrLoadModule(
      '/hooks/use-workout-account.ts',
    );
    const { AccessScreen } = await server.ssrLoadModule(
      '/components/access-screen.tsx',
    );
    const { defaultState, loadLocalState } =
      await server.ssrLoadModule('/lib/storage.ts');
    const { importBackup } = await server.ssrLoadModule(
      '/lib/backup-import.ts',
    );
    const cloudActivity = {
      id: 'cloud-walk',
      date: '2026-10-25T12:00:00Z',
      type: 'Caminata',
      minutes: 15,
    };
    const localActivity = {
      id: 'local-walk',
      date: '2026-10-26T12:00:00Z',
      type: 'Caminata',
      minutes: 20,
    };
    cloud.set(user.uid, {
      ...defaultState,
      planName: 'Cloud plan',
      cardioLogs: [cloudActivity],
      cloudRevision: 1,
    });
    let account;
    function Probe() {
      account = useWorkoutAccount();
      if (account.hydrated && account.mode === 'choose')
        return createElement(AccessScreen, {
          busy: account.authBusy,
          error: account.authError,
          cloudAvailable: true,
          onLocal: account.handleUseLocal,
          onSync: account.handleGoogleLogin,
          dark: false,
        });
      return createElement(
        'output',
        null,
        account.hydrated ? account.mode : 'loading',
      );
    }
    const settle = async (predicate, message) => {
      for (let attempt = 0; attempt < 200; attempt++) {
        await act(async () => {
          await wait(5);
        });
        if (predicate()) return;
      }
      assert.fail(
        `${message}: ${JSON.stringify({ mode: account?.mode, hydrated: account?.hydrated, status: account?.persistenceStatus })}`,
      );
    };
    const mount = async () => {
      const container = document.createElement('div');
      document.body.append(container);
      root = createRoot(container);
      await act(async () =>
        root.render(createElement(StrictMode, null, createElement(Probe))),
      );
    };
    await mount();
    await settle(() => account.hydrated, 'access screen should open');
    assert.equal(account.mode, 'choose');
    assert.deepEqual(
      [...document.querySelectorAll('button')].map((button) =>
        button.textContent.trim(),
      ),
      ['Usar sin cuenta (sólo local)', 'Sincronizar con una cuenta'],
    );
    assert.equal(
      authCalls,
      0,
      'local access must not subscribe to cloud authentication',
    );
    await act(async () => document.querySelector('button').click());
    await settle(
      () => account.hydrated && account.persistenceStatus.canEdit,
      'local diary should open',
    );
    assert.equal(account.mode, 'local');
    assert.equal(authCalls, 0);
    await act(async () =>
      account.updateState((state) => ({
        ...state,
        planName: 'Local plan',
        cardioLogs: [localActivity],
      })),
    );
    await settle(
      () => account.state.cardioLogs[0]?.id === localActivity.id,
      'the Query update should reach React',
    );
    await settle(
      () => account.persistenceStatus.cloud === 'local',
      'local mutation should finish',
    );
    assert.equal((await loadLocalState()).planName, 'Local plan');
    await act(async () => root.unmount());
    root = null;
    await mount();
    await settle(
      () => account.hydrated && account.persistenceStatus.canEdit,
      'remembered local diary should reopen',
    );
    assert.equal(account.mode, 'local');
    assert.equal(account.state.planName, 'Local plan');
    assert.equal(authCalls, 0);
    loginError = { code: 'auth/popup-blocked' };
    await act(async () => account.handleGoogleLogin());
    assert.equal(account.mode, 'local');
    assert.equal(account.authBusy, false);
    assert.match(account.authError, /bloqueado/);
    assert.equal(account.state.planName, 'Local plan');
    loginError = undefined;
    const staleLocalUpdate = account.updateState;
    await act(async () => {
      const callsBefore = signInCalls;
      const login = account.handleGoogleLogin();
      assert.equal(
        signInCalls,
        callsBefore + 1,
        'Google login must start synchronously, before waiting for local storage',
      );
      const duplicate = account.handleGoogleLogin();
      assert.equal(signInCalls, callsBefore + 1, 'ignore repeated login taps');
      await Promise.all([login, duplicate]);
    });
    await settle(
      () =>
        account.mode === 'cloud' &&
        account.hydrated &&
        account.persistenceStatus.canEdit,
      'cloud account should open',
    );
    assert.equal(account.state.planName, 'Cloud plan');
    await act(async () =>
      staleLocalUpdate((state) => ({
        ...state,
        planName: 'Stale local callback',
      })),
    );
    assert.equal(account.state.planName, 'Cloud plan');
    assert.deepEqual(account.state.cardioLogs, [cloudActivity]);
    assert.equal(gymWrites, 1, 'cloud progress starts once automatically');
    assert.equal(
      gymProgress(account.state.gym).balance,
      0,
      'existing cloud history is not rewarded again',
    );
    assert.equal(
      writes,
      0,
      'connecting must not write the local diary automatically',
    );
    assert.equal(account.localImport.planName, 'Local plan');
    await act(async () =>
      account.updateState((state) =>
        importBackup(state, account.localImport, {
          includePlan: false,
          replaceConflicts: false,
        }),
      ),
    );
    await settle(
      () => account.cloudReady && cloud.get(user.uid).cardioLogs.length === 2,
      'explicit import should synchronize',
    );
    assert.equal(account.state.planName, 'Cloud plan');
    assert.equal((await loadLocalState()).planName, 'Local plan');
    await act(async () => account.handleLogout());
    await settle(
      () => account.mode === 'choose' && account.hydrated,
      'signing out should return to access choices',
    );
    assert.equal(
      account.state.cardioLogs.length,
      0,
      'signed-out view must not expose the cloud cache',
    );
    await act(async () => account.handleUseLocal());
    await settle(
      () => account.hydrated && account.persistenceStatus.canEdit,
      'local data should remain available',
    );
    assert.equal(account.state.planName, 'Local plan');
    assert.deepEqual(account.state.cardioLogs, [localActivity]);
  } finally {
    if (root) {
      const { act } = await import('react');
      await act(async () => root.unmount());
    }
    await server.close();
    await browser.happyDOM.close();
    delete globalThis.__accountTestFirebase;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
