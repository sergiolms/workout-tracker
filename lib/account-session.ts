import type { QueryClient } from '@tanstack/react-query';
import { AccountSync } from './account-sync.ts';
import { createFirebaseRepository } from './firebase.ts';
import { createLocalRepository, LOCAL_PENDING_ID } from './local-repository.ts';
import {
  backupLocalState,
  loadLocalState,
  loadPendingChanges,
  saveLocalState,
  savePendingChanges,
} from './storage.ts';

export const createAccountRepository = (localOnly: boolean, uid: string) =>
  localOnly ? createLocalRepository() : createFirebaseRepository(uid);

export function createAccountSession(
  client: QueryClient,
  uid: string,
  localOnly: boolean,
  repository: ReturnType<typeof createAccountRepository>,
) {
  const pendingId = localOnly ? LOCAL_PENDING_ID : uid;
  return new AccountSync({
    client,
    accountId: uid,
    localOnly,
    dispose: 'dispose' in repository ? repository.dispose : undefined,
    loadLocal: () => loadLocalState(localOnly ? undefined : uid),
    saveLocal: (state) =>
      localOnly ? Promise.resolve() : saveLocalState(state, uid),
    backup: (state, source) =>
      localOnly ? Promise.resolve() : backupLocalState(state, uid, source),
    loadCloud: async () => {
      const state = await repository.load();
      if (state && !state.gym && repository.gymCommand) {
        return repository.gymCommand({
          type: 'activate',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
      }
      if (state?.gym && !state.gym.achievementHistory && repository.gymCommand)
        return repository.gymCommand({ type: 'backfill-achievements' });
      return state;
    },
    loadFullCloud: repository.loadAll,
    saveCloud: repository.save,
    subscribeCloud: repository.subscribe,
    loadPending: () => loadPendingChanges(pendingId),
    savePending: (pending) => savePendingChanges(pendingId, pending),
  });
}
