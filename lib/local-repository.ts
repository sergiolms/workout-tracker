import { CloudConflict, mergeStates } from './cloud-records.ts';
import { accrueGym, applyGymCommand, createGym } from './gym/engine.ts';
import type { GymCommand } from './gym/types.ts';
import {
  defaultState,
  loadLocalState,
  updateLocalState,
  type AppState,
} from './storage.ts';

export const LOCAL_ACCOUNT_ID = 'local-device';
export const LOCAL_PENDING_ID = 'guest:local';

export function localImportSnapshot(state: AppState): AppState {
  const active = new Set(
    (state.activeWorkouts ?? []).map((workout) => workout.id),
  );
  const result = {
    ...state,
    activeWorkouts: [],
    exerciseLogs: state.exerciseLogs.filter(
      (log) => !log.workoutId || !active.has(log.workoutId),
    ),
  };
  delete result.history;
  delete result.cloudRevision;
  return result;
}

export function hasLocalData(state: AppState | null): state is AppState {
  return Boolean(
    state &&
    (state.sessions.length ||
      state.periods.length ||
      state.workoutLogs.length ||
      state.exerciseLogs.length ||
      state.cardioLogs.length ||
      state.measurements.length ||
      state.mobilityDone.length ||
      state.warmupDone.length ||
      state.classes.length ||
      state.activeWorkouts?.length ||
      (state.gym &&
        (Object.keys(state.gym.purchases).length ||
          Object.keys(state.gym.achievementHistory?.records ?? {}).length ||
          Object.values(state.gym.receipts).some(
            (receipt) => !receipt.blocked,
          ) ||
          state.gym.avatar ||
          JSON.stringify(state.gym.placements) !==
            JSON.stringify(
              createGym(defaultState, 'UTC', state.gym.startedAt).placements,
            )))),
  );
}

export function createLocalRepository() {
  const channel =
    typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('zero-to-hero-local')
      : null;
  const load = async () => (await loadLocalState()) ?? defaultState;
  return {
    dispose: () => channel?.close(),
    load,
    loadAll: load,
    loadMonth: (_month: string) => load(),
    gymCommand: async (command: GymCommand) => {
      const saved = await updateLocalState((stored) => {
        const current = stored ?? defaultState;
        const next = applyGymCommand(current, command);
        return {
          ...next,
          cloudRevision: (current.cloudRevision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      });
      channel?.postMessage('saved');
      return saved;
    },
    save: async (
      state: AppState,
      _version: string | null,
      base = defaultState,
    ) => {
      const saved = await updateLocalState((stored) => {
        const remote = stored ?? defaultState;
        const merged = mergeStates(
          { ...base, gym: remote.gym, gymArchive: remote.gymArchive },
          { ...state, gym: remote.gym, gymArchive: remote.gymArchive },
          remote,
        );
        if (merged.conflicts.length)
          throw new CloudConflict(merged.conflicts, remote);
        const next = {
          ...accrueGym(remote, merged.state),
          cloudRevision: (remote.cloudRevision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        delete next.history;
        return next;
      });
      channel?.postMessage('saved');
      return saved;
    },
    subscribe: (
      change: (state: AppState) => void,
      error: (reason: unknown) => void,
    ) => {
      let active = true;
      if (channel)
        channel.onmessage = () => {
          void load()
            .then((state) => {
              if (active) change(state);
            })
            .catch(error);
        };
      return () => {
        active = false;
        channel?.close();
      };
    },
  };
}
