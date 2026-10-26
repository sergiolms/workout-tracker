import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

test('Google opens the popup before yielding and without initializing Firestore', async () => {
  const events = [];
  const user = {
    uid: 'test-user',
    displayName: 'Test',
    email: 'test@example.invalid',
    photoURL: null,
    isAnonymous: false,
  };
  const key = '__googlePopupTest';
  globalThis[key] = { events, user };
  const server = await createServer({
    configFile: false,
    envDir: '/tmp/zero-to-hero-test-no-env',
    server: { middlewareMode: true },
    ssr: { noExternal: ['firebase'] },
    appType: 'custom',
    define: {
      'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': JSON.stringify('test-key'),
      'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID':
        JSON.stringify('test-project'),
      'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': JSON.stringify('test-app'),
    },
    plugins: [
      {
        name: 'popup-sdk-fixture',
        enforce: 'pre',
        resolveId(source) {
          if (source.startsWith('firebase/')) return `\0${source}`;
        },
        load(id) {
          if (id === '\0firebase/app')
            return `
          export const getApps = () => [];
          export const initializeApp = () => {
            globalThis.${key}.events.push('initialize');
            return {};
          };
        `;
          if (id === '\0firebase/auth')
            return `
          export const getAuth = () => ({
            authStateReady: async () => globalThis.${key}.events.push('auth-ready'),
          });
          export const browserLocalPersistence = {};
          export const onAuthStateChanged = () => { throw Error('Unexpected subscription'); };
          export const setPersistence = () => { throw Error('Unexpected persistence change'); };
          export const signOut = () => { throw Error('Unexpected sign out'); };
          export class GoogleAuthProvider {
            setCustomParameters(parameters) {
              globalThis.${key}.events.push(parameters);
            }
          }
          export const signInWithPopup = () => {
            globalThis.${key}.events.push('popup');
            return Promise.resolve({ user: globalThis.${key}.user });
          };
        `;
          if (id.startsWith('\0firebase/'))
            throw new Error(`Unexpected SDK initialization: ${id}`);
        },
      },
    ],
  });
  try {
    const { signInWithGoogle, prepareGoogleSignIn } =
      await server.ssrLoadModule('/lib/firebase.ts');
    assert.deepEqual(
      events,
      [],
      'loading the app must not initialize Firebase',
    );
    await prepareGoogleSignIn();
    assert.deepEqual(events, ['initialize', 'auth-ready']);
    events.length = 0;
    const result = signInWithGoogle();
    assert.deepEqual(events, [
      'initialize',
      { prompt: 'select_account' },
      'popup',
    ]);
    assert.deepEqual(await result, user);
  } finally {
    await server.close();
    delete globalThis[key];
  }
});
