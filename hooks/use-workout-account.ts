'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFirebaseRepository,
  signInWithGoogle,
  signOutFirebase,
  subscribeToAuth,
  type FirebaseUser,
} from '@/lib/firebase';
import {
  backupLocalState,
  clearAppLocalData,
  defaultState,
  loadLocalState,
  loadPendingChanges,
  savePendingChanges,
  saveLocalState,
  type AppState,
} from '@/lib/storage';
import { WorkoutPersistence, type PersistenceStatus } from '@/lib/persistence';
import { createWalkLog } from '@/lib/walk-log';

export function useWorkoutAccount() {
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const loadSequence = useRef(0);
  const persistence = useRef<WorkoutPersistence | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>(
    { local: 'saved', cloud: 'pending', canEdit: false, error: '' },
  );
  const updateState = useCallback(
    (updater: (state: AppState) => AppState) =>
      persistence.current?.update(updater),
    [],
  );
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const initialize = async () => {
      unsubscribe = await subscribeToAuth(async (user) => {
        if (cancelled) return;
        const sequence = ++loadSequence.current;
        try {
          setHydrated(false);
          setCloudReady(false);
          setState(defaultState);
          setPersistenceStatus({
            local: 'saved',
            cloud: 'pending',
            canEdit: false,
            error: '',
          });
          persistence.current?.dispose();
          persistence.current = null;
          setFirebaseUser(user);
          if (!user || user.isAnonymous) {
            if (cancelled || sequence !== loadSequence.current) return;
            setState(defaultState);
            setHydrated(true);
            return;
          }
          const repository = createFirebaseRepository(user.uid);
          const store = new WorkoutPersistence({
            loadLocal: () => loadLocalState(user.uid),
            saveLocal: (value) => saveLocalState(value, user.uid),
            backup: (value, source) =>
              backupLocalState(value, user.uid, source),
            loadCloud: repository.load,
            saveCloud: repository.save,
            subscribeCloud: repository.subscribe,
            loadPending: () => loadPendingChanges(user.uid),
            savePending: (pending) => savePendingChanges(user.uid, pending),
            onChange: (value, status) => {
              if (cancelled || sequence !== loadSequence.current) return;
              setState(value);
              setPersistenceStatus(status);
              setCloudReady(status.cloud === 'synced');
              setSyncing(status.local === 'saving');
            },
          });
          persistence.current = store;
          await store.initialize();
          if (cancelled || sequence !== loadSequence.current) {
            store.dispose();
            return;
          }
          setHydrated(true);
          void store.sync();
        } catch (reason) {
          if (cancelled || sequence !== loadSequence.current) return;
          const error =
            reason instanceof Error
              ? reason.message
              : 'No se pudo cargar la cuenta.';
          setAuthError(error);
          setPersistenceStatus({
            local: 'saved',
            cloud: 'error',
            canEdit: false,
            error,
          });
          setHydrated(true);
        }
      });
      if (cancelled) unsubscribe();
    };
    void initialize().catch((error) => {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con Firebase.',
      );
      setHydrated(true);
    });
    const retry = () => {
      void persistence.current?.sync();
    };
    const timer = window.setInterval(retry, 30_000);
    window.addEventListener('online', retry);
    return () => {
      cancelled = true;
      unsubscribe?.();
      persistence.current?.dispose();
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
    };
  }, []);
  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const accountSequence = loadSequence.current;
    void Promise.resolve(
      context.registerTool(
        {
          name: 'log_walk',
          title: 'Registrar caminata',
          description: 'Registra una caminata con minutos y pasos en Base.',
          inputSchema: {
            type: 'object',
            properties: {
              minutes: { type: 'number', minimum: 1, maximum: 1440 },
              steps: { type: 'integer', minimum: 0, maximum: 1e7 },
            },
            required: ['minutes', 'steps'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input: unknown) => {
            if (accountSequence !== loadSequence.current || !persistence.current?.status.canEdit)
              throw new Error(
                'Conecta con Firebase antes de registrar una caminata.',
              );
            const log = createWalkLog(input);
            updateState((current) => ({
              ...current,
              cardioLogs: [...current.cardioLogs, log],
            }));
            return { status: 'pending', id: log.id };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [firebaseUser, updateState]);
  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : '';
      setAuthError(
        code.includes('popup-closed')
          ? 'Se cerró la ventana antes de completar el acceso.'
          : code.includes('unauthorized-domain')
            ? 'Añade este dominio a los dominios autorizados de Firebase.'
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      );
    } finally {
      setAuthBusy(false);
    }
  };
  const handleLogout = async () => {
    setAuthBusy(true);
    setAuthError('');
    const previousCloudReady = cloudReady;
    setHydrated(false);
    setCloudReady(false);
    try {
      await persistence.current?.flushLocal();
      await signOutFirebase();
      try {
        await clearAppLocalData();
      } catch {
        setAuthError(
          'Sesión cerrada, pero no se pudieron borrar los borradores.',
        );
      }
    } catch {
      setAuthError('No se pudo cerrar la sesión.');
      setCloudReady(previousCloudReady);
      setHydrated(true);
    } finally {
      setAuthBusy(false);
    }
  };
  const resolveConflicts = useCallback(
    (choices: Record<string, 'local' | 'remote'>) =>
      persistence.current?.resolveConflicts(choices) ?? Promise.resolve(),
    [],
  );
  return {
    state,
    hydrated,
    cloudReady,
    syncing,
    firebaseUser,
    authBusy,
    authError,
    persistenceStatus,
    updateState,
    handleGoogleLogin,
    handleLogout,
    resolveConflicts,
  };
}
