'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { skipToken, useIsMutating, useQuery } from '@tanstack/react-query';
import { createAccountQueryClient } from '@/lib/account-query';
import {
  signInWithGoogle,
  signOutFirebase,
  subscribeToAuth,
  type FirebaseUser,
} from '@/lib/firebase';
import {
  clearAppLocalData,
  defaultState,
  loadLocalState,
  type AppState,
} from '@/lib/storage';
import { AccountSync, type PersistenceStatus } from '@/lib/account-sync';
import {
  hasLocalData,
  localImportSnapshot,
  LOCAL_ACCOUNT_ID,
} from '@/lib/local-repository';
import {
  createAccountSession,
  createAccountRepository,
} from '@/lib/account-session';
import { useWalkTool } from '@/hooks/use-walk-tool';
import type { HistorySource } from '@/lib/history-source';

type AccessMode = 'choose' | 'local' | 'cloud';
const ACCESS_KEY = 'zero-to-hero-access';
const initialStatus: PersistenceStatus = {
  local: 'saved',
  cloud: 'pending',
  canEdit: false,
  error: '',
};

export function useWorkoutAccount() {
  const [client] = useState(createAccountQueryClient);
  const [mode, setMode] = useState<AccessMode>('choose');
  const [modeReady, setModeReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<AccountSync | null>(null);
  const sessionRef = useRef<AccountSync | null>(null);
  const [historySource, setHistorySource] = useState<HistorySource | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [localImport, setLocalImport] = useState<AppState | null>(null);
  const loginInProgress = useRef(false);
  const firebaseUser = mode === 'cloud' ? authUser : null;
  const activeAccountId =
    mode === 'local'
      ? LOCAL_ACCOUNT_ID
      : mode === 'cloud' && authReady
        ? (authUser?.uid ?? null)
        : null;
  const stateQuery = useQuery(
    session
      ? session.queryOptions()
      : {
          queryKey: ['account', 'none', 'state'],
          queryFn: skipToken,
          enabled: false,
        },
    client,
  );
  const statusQuery = useQuery(
    {
      queryKey: session?.statusKey ?? ['account', 'none', 'status'],
      queryFn: skipToken,
      enabled: false,
    },
    client,
  );
  const state = (stateQuery.data as AppState | undefined) ?? defaultState;
  const persistenceStatus =
    (statusQuery.data as PersistenceStatus | undefined) ?? initialStatus;
  const cloudReady = persistenceStatus.cloud === 'synced';
  const savingMutations = useIsMutating(
    { mutationKey: ['account', session?.accountId ?? 'none', 'save'] },
    client,
  );
  const syncing = persistenceStatus.local === 'saving' || savingMutations > 0;
  const updateState = useCallback(
    (updater: (state: AppState) => AppState) => session?.update(updater),
    [session],
  );
  const rememberMode = useCallback((value: AccessMode) => {
    try {
      localStorage.setItem(ACCESS_KEY, value);
    } catch {
      /* Session-only access remains available when browser storage is restricted. */
    }
    setMode(value);
  }, []);

  useEffect(() => {
    client.mount();
    let active = true;
    const readMode = async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        const stored = localStorage.getItem(ACCESS_KEY);
        if (stored === 'local' || stored === 'cloud') setMode(stored);
      } catch {
        /* Access can still be chosen for the current session. */
      }
      setModeReady(true);
    };
    void readMode();
    return () => {
      active = false;
      client.unmount();
      client.clear();
    };
  }, [client]);

  useEffect(() => {
    if (!modeReady || mode !== 'cloud') return;
    let active = true;
    let stop: (() => void) | undefined;
    void subscribeToAuth((user) => {
      if (!active) return;
      setAuthUser(user?.isAnonymous ? null : user);
      setAuthReady(true);
      if (user && !user.isAnonymous && !loginInProgress.current) {
        let stayOnAccessScreen = false;
        try {
          stayOnAccessScreen = localStorage.getItem(ACCESS_KEY) === 'choose';
        } catch {
          /* The current session can still connect explicitly. */
        }
        if (!stayOnAccessScreen)
          setMode((current) => (current === 'local' ? current : 'cloud'));
      }
    })
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else unsubscribe();
      })
      .catch((error) => {
        if (!active) return;
        setAuthReady(true);
        setAuthError(
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con la cuenta.',
        );
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [mode, modeReady]);

  useEffect(() => {
    if (!modeReady) return;

    let active = true;
    let store: AccountSync | null = null;
    let retry: (() => void) | undefined;
    const open = async () => {
      const previous = sessionRef.current;
      await previous?.flushLocal();
      if (!active) return;
      previous?.dispose();
      sessionRef.current = null;
      setSession(null);
      setHistorySource(null);
      setHydrated(false);
      client.clear();
      if (!activeAccountId) {
        setHydrated(true);
        return;
      }
      const localOnly = mode === 'local';
      const uid = activeAccountId;
      const repository = createAccountRepository(localOnly, uid);
      store = createAccountSession(client, uid, localOnly, repository);
      const opened = store;
      sessionRef.current = opened;
      setSession(store);
      setHistorySource({
        accountId: uid,
        client,
        loadMonth: (month) => opened.hydrate(() => repository.loadMonth(month)),
        loadAll: async () => {
          const full = await opened.hydrate(repository.loadAll);
          if (full.history && !full.history.complete)
            throw Error(
              'Resuelve la sincronización antes de descargar todos los registros.',
            );
          return full;
        },
      });
      setHydrated(true);
      retry = () => {
        void store?.sync();
      };
      window.addEventListener('online', retry);
    };
    void open().catch((error) => {
      if (!active) return;
      setAuthError(
        error instanceof Error ? error.message : 'No se pudo abrir el diario.',
      );
      setHydrated(true);
    });
    return () => {
      active = false;
      store?.dispose();
      if (retry) window.removeEventListener('online', retry);
    };
  }, [mode, modeReady, activeAccountId, client]);

  useWalkTool(session, hydrated, updateState);
  const handleUseLocal = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await sessionRef.current?.flushLocal();
      rememberMode('local');
    } catch {
      setAuthError('No se han terminado de guardar los cambios.');
    } finally {
      setAuthBusy(false);
    }
  };
  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthError('');
    loginInProgress.current = true;
    try {
      await sessionRef.current?.flushLocal();
      const user = await signInWithGoogle();
      const local =
        mode === 'local' && sessionRef.current?.accountId === LOCAL_ACCOUNT_ID
          ? sessionRef.current.state
          : await loadLocalState();
      setAuthUser(user);
      setAuthReady(true);
      setLocalImport(hasLocalData(local) ? localImportSnapshot(local) : null);
      rememberMode('cloud');
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : '';
      setAuthError(
        code.includes('popup-closed')
          ? 'Se cerró la ventana antes de completar el acceso.'
          : 'No se pudo conectar la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      loginInProgress.current = false;
      setAuthBusy(false);
    }
  };
  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await sessionRef.current?.flushLocal();
      if (mode === 'cloud') await signOutFirebase();
      setLocalImport(null);
      setAuthUser(null);
      rememberMode('choose');
      await clearAppLocalData();
    } catch {
      setAuthError(
        'No se pudo salir. Tus datos se conservan en este dispositivo.',
      );
    } finally {
      setAuthBusy(false);
    }
  };
  const resolveConflicts = useCallback(
    (choices: Record<string, 'local' | 'remote'>) =>
      session?.resolveConflicts(choices) ?? Promise.resolve(),
    [session],
  );
  return {
    historySource,
    state,
    hydrated:
      modeReady &&
      (mode !== 'cloud' || authReady) &&
      hydrated &&
      (!activeAccountId ||
        (session?.accountId === activeAccountId &&
          (stateQuery.isFetchedAfterMount || !stateQuery.isFetching))),
    mode,
    accountId: session?.accountId ?? '',
    cloudReady,
    syncing,
    firebaseUser,
    authBusy,
    authError,
    persistenceStatus,
    updateState,
    handleUseLocal,
    handleGoogleLogin,
    handleLogout,
    resolveConflicts,
    retrySync: () => session?.sync(),
    localImport,
    dismissLocalImport: () => setLocalImport(null),
  };
}
