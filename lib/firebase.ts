import type { AppState } from './storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export async function syncToFirebase(state: AppState): Promise<boolean> {
  if (!firebaseConfigured) return false;
  try {
    const [{ initializeApp, getApps }, { getAuth, signInAnonymously }, { doc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc }] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
    ]);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = getAuth(app);
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    let db;
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
      const { getFirestore } = await import('firebase/firestore');
      db = getFirestore(app);
    }
    await setDoc(doc(db, 'users', user.uid, 'appState', 'main'), { ...state, updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

