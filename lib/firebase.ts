import type { AppState } from './storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export type FirebaseUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let servicesPromise: Promise<{
  auth: import('firebase/auth').Auth;
  db: import('firebase/firestore').Firestore;
}> | null = null;

async function getServices() {
  if (!firebaseConfigured) throw new Error('Firebase no está configurado');
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const [{ initializeApp, getApps }, authSdk, firestoreSdk] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);

    let db;
    try {
      db = firestoreSdk.initializeFirestore(app, {
        localCache: firestoreSdk.persistentLocalCache({
          tabManager: firestoreSdk.persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = firestoreSdk.getFirestore(app);
    }

    if (config.measurementId) {
      void import('firebase/analytics').then(async ({ getAnalytics, isSupported }) => {
        if (await isSupported()) getAnalytics(app);
      }).catch(() => undefined);
    }

    return { auth, db };
  })();

  return servicesPromise;
}

export async function subscribeToAuth(onChange: (user: FirebaseUser | null) => void) {
  if (!firebaseConfigured) {
    onChange(null);
    return () => undefined;
  }
  const [{ auth }, { onAuthStateChanged }] = await Promise.all([getServices(), import('firebase/auth')]);
  return onAuthStateChanged(auth, (user) => onChange(user ? {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  } : null));
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([getServices(), import('firebase/auth')]);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await signInWithPopup(auth, provider);
  return { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
}

export async function signOutFirebase() {
  const [{ auth }, { signOut }] = await Promise.all([getServices(), import('firebase/auth')]);
  await signOut(auth);
}

export async function loadFromFirebase(): Promise<AppState | null> {
  if (!firebaseConfigured) return null;
  const [{ auth, db }, { doc, getDoc }] = await Promise.all([getServices(), import('firebase/firestore')]);
  if (!auth.currentUser) return null;
  const snapshot = await getDoc(doc(db, 'users', auth.currentUser.uid, 'appState', 'main'));
  if (!snapshot.exists()) return null;
  const { updatedAt: _updatedAt, ...state } = snapshot.data() as AppState & { updatedAt?: string };
  return state.version === 1 ? state : null;
}

export async function syncToFirebase(state: AppState): Promise<boolean> {
  if (!firebaseConfigured) return false;
  try {
    const [{ auth, db }, { doc, setDoc }] = await Promise.all([getServices(), import('firebase/firestore')]);
    if (!auth.currentUser) return false;
    await setDoc(doc(db, 'users', auth.currentUser.uid, 'appState', 'main'), {
      ...state,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
