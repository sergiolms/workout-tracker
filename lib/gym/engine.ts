import {
  defaultAvatar,
  avatarOutfits,
  avatarSkins,
  avatarHairstyles,
  type GymAvatar,
} from './appearance.ts';
import type { AppState } from '../storage.ts';
import { gymRotations, placementSize } from './orientation.ts';
import { equal } from '../cloud-records.ts';
import {
  gymCatalog,
  gymItem,
  gymEconomy,
  starterItems,
  type GymItem,
} from './catalog.ts';
import type {
  GymCommand,
  GymPlacement,
  GymReceipt,
  GymState,
} from './types.ts';

const clamp = (value: number) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const gymDay = (date: string, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
export function gymWeek(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
const validDay = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === day
  );
};
export const mobilityId = (key: string) => {
  const match = /^(\d{4}-\d{2}-\d{2}):(corta|larga)-(.+)$/.exec(key);
  return match && validDay(match[1])
    ? {
        id: `mobility:${match[1]}:${match[3]
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()}`,
        day: match[1],
      }
    : null;
};
export function sourceIds(state: AppState) {
  return [
    ...state.workoutLogs.map((log) => `strength:${log.id}`),
    ...state.cardioLogs.map((log) => `activity:${log.id}`),
    ...state.mobilityDone.flatMap((key) => {
      const item = mobilityId(key);
      return item ? [item.id] : [];
    }),
  ];
}
export function recognizeGymHistory(
  state: AppState,
  gym: GymState,
  now = new Date().toISOString(),
): GymState {
  if (gym.achievementHistory?.version === 1) return gym;
  const records: NonNullable<GymState['achievementHistory']>['records'] = {};
  const today = gymDay(now, gym.timeZone);
  const add = (
    id: string,
    date: string,
    kind: GymReceipt['kind'],
    count: number,
    dayOnly = false,
  ) => {
    if (
      !Number.isFinite(Date.parse(date)) ||
      !Number.isFinite(count) ||
      count <= 0
    )
      return;
    const receipt = gym.receipts[id];
    if (receipt && !receipt.blocked && receipt.units > 0) return;
    const day = dayOnly ? date.slice(0, 10) : gymDay(date, gym.timeZone);
    if (day > today) return;
    records[id] = { kind, day, count };
  };
  const linked = new Set(
    state.workoutLogs.flatMap((workout) =>
      workout.exercises.flatMap((exercise) =>
        exercise.logId ? [exercise.logId] : [],
      ),
    ),
  );
  const active = new Set(state.activeWorkouts?.map((workout) => workout.id));
  const workoutKeys = new Set<string>();
  for (const workout of state.workoutLogs) {
    if (!Number.isFinite(Date.parse(workout.date))) continue;
    workoutKeys.add(
      `${gymDay(workout.date, gym.timeZone)}:${workout.routine}:${workout.week}`,
    );
    if (
      workout.exercises.some((exercise) =>
        ['done', 'partial'].includes(exercise.status),
      )
    )
      add(`strength:${workout.id}`, workout.date, 'strength', 1);
  }
  for (const log of state.exerciseLogs) {
    if (
      log.skipped ||
      linked.has(log.id) ||
      (log.workoutId &&
        (active.has(log.workoutId) ||
          state.workoutLogs.some((workout) => workout.id === log.workoutId))) ||
      !log.sets.some((set) => set.done && set.kind !== 'warmup') ||
      !Number.isFinite(Date.parse(log.date))
    )
      continue;
    const key = `${gymDay(log.date, gym.timeZone)}:${log.routine}:${log.week}`;
    if (workoutKeys.has(key)) continue;
    add(
      `strength:${log.workoutId ?? `legacy:${key}`}`,
      log.date,
      'strength',
      1,
    );
  }
  for (const log of state.cardioLogs)
    add(`activity:${log.id}`, log.date, 'activity', log.minutes);
  for (const key of state.mobilityDone) {
    const movement = mobilityId(key);
    if (movement)
      add(movement.id, `${movement.day}T12:00:00Z`, 'mobility', 1, true);
  }
  return {
    ...gym,
    baseline: [...new Set([...gym.baseline, ...Object.keys(records)])],
    achievementHistory: { version: 1, records },
  };
}
export function createGym(
  state: AppState,
  timeZone: string,
  now: string,
): GymState {
  gymDay(now, timeZone);
  return recognizeGymHistory(
    state,
    {
      version: 1,
      startedAt: now,
      timeZone,
      receipts: {},
      purchases: {},
      baseline: sourceIds(state),
      finishes: {},
      placements: {
        'starter-mat': { room: 'main', x: 2, y: 3, rotated: false },
        'starter-weights': { room: 'main', x: 1, y: 1, rotated: false },
      },
    },
    now,
  );
}
export function accrueGym(
  before: AppState,
  after: AppState,
  now = new Date().toISOString(),
): AppState {
  if (before === after) return after;
  const gym = before.gym;
  if (!gym || !after.gym) return after;
  const receipts = { ...gym.receipts };
  let changed = false;
  const baseline = new Set(gym.baseline);
  const startDay = gymDay(gym.startedAt, gym.timeZone);
  const today = gymDay(now, gym.timeZone);
  const add = (
    id: string,
    date: string,
    kind: GymReceipt['kind'],
    units: number,
    count: number,
    existed: boolean,
    imported = false,
  ) => {
    const old = receipts[id];
    if (baseline.has(id) || old?.blocked || !Number.isFinite(Date.parse(date)))
      return;
    const day =
      kind === 'mobility' ? date.slice(0, 10) : gymDay(date, gym.timeZone);
    if (!old && (existed || imported || day < startDay || day > today)) {
      receipts[id] = { kind, day, units: 0, count: 0, blocked: true };
      changed = true;
      return;
    }
    const next = {
      kind,
      day: old?.day ?? day,
      units: Math.max(old?.units ?? 0, Math.max(0, units)),
      count: Math.max(old?.count ?? 0, count),
    };
    if (!equal(old, next)) {
      receipts[id] = next;
      changed = true;
    }
  };
  for (const log of after.workoutLogs) {
    const existing = before.workoutLogs.find((item) => item.id === log.id);
    const linked = new Set(
      log.exercises.flatMap((item) => (item.logId ? [item.logId] : [])),
    );
    const done = after.exerciseLogs
      .filter(
        (item) =>
          !item.skipped && (item.workoutId === log.id || linked.has(item.id)),
      )
      .reduce(
        (sum, item) =>
          sum +
          item.sets.filter((set) => set.kind !== 'warmup' && set.done).length,
        0,
      );
    if (!log.gymTargetSets || log.gymTargetSets < 1) continue;
    add(
      `strength:${log.id}`,
      log.date,
      'strength',
      clamp(done / log.gymTargetSets),
      done > 0 ? 1 : 0,
      Boolean(existing),
      log.source === 'hevy' || log.gymExcluded,
    );
  }
  for (const log of after.cardioLogs) {
    add(
      `activity:${log.id}`,
      log.date,
      'activity',
      Math.max(0, log.minutes) / gymEconomy.activityMinutesForFullDay,
      Math.max(0, log.minutes),
      before.cardioLogs.some((item) => item.id === log.id),
      log.gymExcluded,
    );
  }
  for (const key of after.mobilityDone) {
    const item = mobilityId(key);
    if (!item) continue;
    const existed = before.mobilityDone.some(
      (old) => mobilityId(old)?.id === item.id,
    );
    add(
      item.id,
      `${item.day}T12:00:00Z`,
      'mobility',
      1 / gymEconomy.mobilityMovementsForFullDay,
      1,
      existed,
      after.gymExclusions?.includes(item.id),
    );
  }
  return changed
    ? { ...after, gym: { ...gym, receipts } }
    : after.gym === gym
      ? after
      : { ...after, gym };
}
export function gymProgress(gym: GymState) {
  const days = new Map<
    string,
    { units: number; strength: number; activity: number; mobility: number }
  >();
  let sessions = 0,
    minutes = 0;
  const mobilityDays = new Set<string>();
  const achievementSources = new Map(
    Object.entries(gym.achievementHistory?.records ?? {}),
  );
  for (const [id, receipt] of Object.entries(gym.receipts)) {
    if (receipt.blocked || receipt.units <= 0) continue;
    const day = days.get(receipt.day) ?? {
      units: 0,
      strength: 0,
      activity: 0,
      mobility: 0,
    };
    day.units +=
      receipt.kind === 'activity' ? receipt.units : clamp(receipt.units);
    day[receipt.kind] += receipt.units;
    days.set(receipt.day, day);
    achievementSources.set(id, {
      kind: receipt.kind,
      day: receipt.day,
      count: Math.max(receipt.count, achievementSources.get(id)?.count ?? 0),
    });
  }
  const activeWeeks = new Set<string>();
  for (const source of achievementSources.values()) {
    if (source.count <= 0) continue;
    activeWeeks.add(gymWeek(source.day));
    if (source.kind === 'strength') sessions += source.count;
    if (source.kind === 'activity') minutes += source.count;
    if (source.kind === 'mobility') mobilityDays.add(source.day);
  }
  const weeks = new Map<string, { earned: number; bonus: boolean }>();
  let xp = 0;
  for (const [date, day] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    const week = weeks.get(gymWeek(date)) ?? { earned: 0, bonus: false };
    const bonus =
      !week.bonus && day.units >= gymEconomy.qualifyingDayUnits
        ? gymEconomy.weeklyBonus
        : 0;
    if (bonus) week.bonus = true;
    week.earned = Math.min(
      gymEconomy.weeklyCap,
      week.earned +
        Math.floor(gymEconomy.dailyCredits * clamp(day.units) + 1e-9) +
        bonus,
    );
    weeks.set(gymWeek(date), week);
    xp += Math.round(100 * clamp(day.units));
  }
  const earned = [...weeks.values()].reduce(
    (sum, week) => sum + week.earned,
    0,
  );
  const spent = Object.values(gym.purchases)
    .filter((purchase) => !purchase.returned)
    .reduce((sum, purchase) => sum + purchase.paid, 0);
  let level = 1;
  const threshold = (value: number) => 25 * (value - 1) ** 2 + 75 * (value - 1);
  while (threshold(level + 1) <= xp) level++;
  return {
    earned,
    spent,
    balance: earned - spent,
    xp,
    level,
    levelStart: threshold(level),
    nextLevel: threshold(level + 1),
    sessions,
    minutes,
    mobilityDays: mobilityDays.size,
    activeWeeks: activeWeeks.size,
    weeks,
    days,
  };
}
export function gymAchievements(gym: GymState) {
  const progress = gymProgress(gym);
  return [
    {
      id: 'sessions',
      name: 'Entrenar',
      value: progress.sessions,
      steps: [1, 10, 25, 50, 100],
      unit: 'sesiones',
      reward: {
        name: 'Trofeo Primera sesión',
        condition: '1 sesión',
        threshold: 1,
        earned: progress.sessions >= 1,
      },
    },
    {
      id: 'activity',
      name: 'En movimiento',
      value: Math.floor(progress.minutes),
      steps: [20, 100, 500, 1000],
      unit: 'minutos',
      reward: {
        name: 'Trofeo En movimiento',
        condition: '20 minutos de actividad',
        threshold: 20,
        earned: progress.minutes >= 20,
      },
    },
    {
      id: 'mobility',
      name: 'Moverse mejor',
      value: progress.mobilityDays,
      steps: [1, 5, 20, 50],
      unit: 'días de movilidad',
      reward: {
        name: 'Trofeo Primera movilidad',
        condition: '1 día de movilidad',
        threshold: 1,
        earned: progress.mobilityDays >= 1,
      },
    },
    {
      id: 'weeks',
      name: 'Constancia',
      value: progress.activeWeeks,
      steps: [1, 4, 12, 26, 52],
      unit: 'semanas activas',
      reward: {
        name: 'Trofeo Cuatro semanas',
        condition: '4 semanas activas',
        threshold: 4,
        earned: progress.activeWeeks >= 4,
      },
    },
    {
      id: 'level',
      name: 'Subir de nivel',
      value: progress.level,
      steps: [5, 10, 20, 30, 50],
      unit: 'niveles',
      reward: {
        name: 'Trofeo Nivel cinco',
        condition: 'Nivel 5',
        threshold: 5,
        earned: progress.level >= 5,
      },
    },
  ].map((item) => ({
    ...item,
    completed: item.steps.filter((step) => item.value >= step).length,
    target: item.steps.find((step) => item.value < step) ?? item.steps.at(-1)!,
  }));
}
export function roomSize(gym: GymState, room: string) {
  const owned = new Set(
    Object.values(gym.purchases)
      .filter((purchase) => !purchase.returned)
      .map((purchase) => purchase.itemId),
  );
  if (room === 'annex') return owned.has('second-room') ? 6 : 0;
  return owned.has('expansion-2') ? 10 : owned.has('expansion-1') ? 8 : 6;
}
export function ownedItems(
  gym: GymState,
): Array<{ id: string; item: GymItem; paid: number }> {
  const progress = gymProgress(gym);
  const prizes = [
    {
      id: 'award-strength',
      name: 'Primera sesión',
      unlocked: progress.sessions >= 1,
    },
    {
      id: 'award-activity',
      name: 'En movimiento',
      unlocked: progress.minutes >= 20,
    },
    {
      id: 'award-mobility',
      name: 'Primera movilidad',
      unlocked: progress.mobilityDays >= 1,
    },
    {
      id: 'award-weeks',
      name: 'Cuatro semanas',
      unlocked: progress.activeWeeks >= 4,
    },
    { id: 'award-level', name: 'Nivel cinco', unlocked: progress.level >= 5 },
  ]
    .filter((prize) => prize.unlocked)
    .map((prize) => ({
      id: prize.id,
      item: {
        id: prize.id,
        name: prize.name,
        price: 0,
        kind: 'decoration',
        width: 1,
        depth: 1,
        starter: true,
      },
      paid: 0,
    }));
  return [
    ...prizes,
    ...starterItems.map((item) => ({ id: item.id, item, paid: 0 })),
    ...Object.values(gym.purchases)
      .filter((purchase) => !purchase.returned)
      .flatMap((purchase) => {
        const item = gymItem(purchase.itemId);
        return item ? [{ id: purchase.id, item, paid: purchase.paid }] : [];
      }),
  ];
}
export function avatarError(gym: GymState, avatar: GymAvatar) {
  if (
    !avatar ||
    !['man', 'woman'].includes(avatar.body) ||
    !avatarHairstyles.some((style) => style.id === avatar.hair) ||
    !avatarSkins.includes(avatar.skin) ||
    typeof avatar.wandering !== 'boolean' ||
    !avatarOutfits[avatar.outfit]
  )
    return 'Aspecto de personaje incorrecto.';
  if (
    avatar.outfit !== 'outfit-base' &&
    !ownedItems(gym).some((entry) => entry.item.id === avatar.outfit)
  )
    return 'Compra ese conjunto antes de usarlo.';
  return '';
}
export function displayError(
  gym: GymState,
  id: string,
  shelfId: string,
  slot: number,
) {
  if (
    !id.startsWith('award-') ||
    !ownedItems(gym).some((entry) => entry.id === id)
  )
    return 'Solo puedes exponer tus trofeos desbloqueados.';
  const shelf = ownedItems(gym).find((entry) => entry.id === shelfId);
  if (shelf?.item.id !== 'trophy-cabinet' || !gym.placements[shelfId])
    return 'Coloca la vitrina en una sala primero.';
  if (!Number.isInteger(slot) || slot < 0 || slot > 3)
    return 'Plaza de vitrina incorrecta.';
  if (
    Object.entries(gym.displays ?? {}).some(
      ([other, place]) =>
        other !== id && place.shelfId === shelfId && place.slot === slot,
    )
  )
    return 'Esa plaza ya tiene un trofeo.';
  return '';
}
function clearDisplay(gym: GymState, id: string) {
  if (!gym.displays) return;
  delete gym.displays[id];
  for (const [trophy, place] of Object.entries(gym.displays))
    if (place.shelfId === id) delete gym.displays[trophy];
}
export function placementError(
  gym: GymState,
  id: string,
  placement: GymPlacement,
) {
  if (
    !['main', 'annex'].includes(placement.room) ||
    typeof placement.rotated !== 'boolean' ||
    (placement.rotation !== undefined &&
      (!gymRotations.includes(placement.rotation) ||
        placement.rotated !== (placement.rotation % 180 !== 0)))
  )
    return 'Posición incorrecta.';
  const owned = ownedItems(gym).find((entry) => entry.id === id);
  if (!owned || !['equipment', 'decoration'].includes(owned.item.kind))
    return 'Este objeto no se puede colocar.';
  const size = roomSize(gym, placement.room);
  const { width, depth } = placementSize(owned.item, placement);
  if (
    !Number.isInteger(placement.x) ||
    !Number.isInteger(placement.y) ||
    placement.x < 0 ||
    placement.y < 0 ||
    placement.x + width > size ||
    placement.y + depth > size
  )
    return 'El objeto queda fuera de la habitación.';
  for (const other of ownedItems(gym)) {
    if (other.id === id) continue;
    const location = gym.placements[other.id];
    if (!location || location.room !== placement.room) continue;
    const { width: w, depth: d } = placementSize(other.item, location);
    if (
      placement.x < location.x + w &&
      placement.x + width > location.x &&
      placement.y < location.y + d &&
      placement.y + depth > location.y
    )
      return 'Ese espacio ya está ocupado.';
  }
  return '';
}
export function firstGymPlacement(
  gym: GymState,
  id: string,
  room: 'main' | 'annex',
): GymPlacement | null {
  const size = roomSize(gym, room);
  for (const rotated of [false, true])
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const placement = { room, x, y, rotated };
        if (!placementError(gym, id, placement)) return placement;
      }
  return null;
}
export function applyGymCommand(
  state: AppState,
  command: GymCommand,
  now = new Date().toISOString(),
): AppState {
  if (command.type === 'import') {
    const incoming = validateGymImport(command.gym);
    return equal(state.gym, incoming)
      ? state
      : { ...state, gymArchive: state.gym, gym: incoming };
  }
  if (command.type === 'restore') {
    if (!state.gymArchive)
      throw Error('No hay una copia anterior del gimnasio.');
    return {
      ...state,
      gym: validateGymImport(state.gymArchive),
      gymArchive: state.gym,
    };
  }
  if (command.type === 'backfill-achievements') {
    if (!state.gym) return state;
    const gym = recognizeGymHistory(state, state.gym, now);
    return gym === state.gym ? state : { ...state, gym };
  }
  if (command.type === 'activate')
    return state.gym
      ? state
      : { ...state, gym: createGym(state, command.timeZone, now) };
  if (!state.gym) throw Error('Abre tu gimnasio primero.');
  const gym: GymState = structuredClone(state.gym);
  if (command.type === 'buy') {
    if (!/^[\w-]{1,100}$/.test(command.id))
      throw Error('Identificador de compra incorrecto.');
    const previous = gym.purchases[command.id];
    if (previous) {
      if (previous.itemId !== command.itemId)
        throw Error('La compra ya corresponde a otro objeto.');
      return state;
    }
    const item = gymCatalog.find((entry) => entry.id === command.itemId);
    if (!item) throw Error('El objeto no está disponible.');
    if (gymProgress(gym).balance < item.price)
      throw Error('No tienes suficientes créditos.');
    const owned = ownedItems(gym).map((entry) => entry.item.id);
    if (
      ['expansion', 'finish', 'apparel'].includes(item.kind) &&
      owned.includes(item.id)
    )
      throw Error('Ya tienes esta mejora.');
    if (item.id === 'expansion-2' && !owned.includes('expansion-1'))
      throw Error('Necesitas la primera ampliación.');
    if (item.id === 'second-room' && !owned.includes('expansion-2'))
      throw Error('Necesitas la segunda ampliación.');
    gym.purchases[command.id] = {
      id: command.id,
      itemId: item.id,
      paid: item.price,
      catalogVersion: gymEconomy.version,
      at: now,
    };
  } else if (command.type === 'return') {
    const purchase = gym.purchases[command.id];
    if (!purchase) throw Error('No se encontró esta compra.');
    if (purchase.returned) return state;
    if (gymItem(purchase.itemId)?.kind === 'expansion')
      throw Error('Las ampliaciones no se pueden devolver.');
    purchase.returned = true;
    delete gym.placements[command.id];
    clearDisplay(gym, command.id);
    if (
      gym.avatar?.outfit === purchase.itemId &&
      !ownedItems(gym).some((entry) => entry.item.id === purchase.itemId)
    )
      gym.avatar = { ...gym.avatar, outfit: defaultAvatar.outfit };
    for (const finish of Object.values(gym.finishes)) {
      if (finish.floor === command.id) delete finish.floor;
      if (finish.wall === command.id) delete finish.wall;
    }
  } else if (command.type === 'avatar') {
    const error = avatarError(gym, command.appearance);
    if (error) throw Error(error);
    gym.avatar = { ...command.appearance };
  } else if (command.type === 'display') {
    const error = displayError(gym, command.id, command.shelfId, command.slot);
    if (error) throw Error(error);
    delete gym.placements[command.id];
    gym.displays = {
      ...gym.displays,
      [command.id]: { shelfId: command.shelfId, slot: command.slot },
    };
  } else if (command.type === 'place') {
    if (!ownedItems(gym).some((entry) => entry.id === command.id))
      throw Error('No tienes este objeto.');
    if (command.placement) {
      const error = placementError(gym, command.id, command.placement);
      if (error) throw Error(error);
      gym.placements[command.id] = command.placement;
      if (gym.displays) delete gym.displays[command.id];
    } else {
      delete gym.placements[command.id];
      clearDisplay(gym, command.id);
    }
  } else if (command.type === 'finish' || command.type === 'style') {
    if (
      !['main', 'annex'].includes(command.room) ||
      !roomSize(gym, command.room)
    )
      throw Error('La sala no está disponible.');
    const updates =
      command.type === 'style'
        ? command.finishes
        : { [command.surface]: command.purchaseId };
    for (const [surface, purchaseId] of Object.entries(updates)) {
      if (!['floor', 'wall'].includes(surface))
        throw Error('Acabado incorrecto.');
      if (purchaseId !== null) {
        const entry = ownedItems(gym).find((owned) => owned.id === purchaseId);
        if (!entry || entry.item.surface !== surface)
          throw Error('No tienes ese acabado.');
      }
      gym.finishes[command.room] = {
        ...gym.finishes[command.room],
        [surface]: purchaseId ?? undefined,
      };
    }
  }
  if (gymProgress(gym).balance < 0) throw Error('El saldo no es válido.');
  return { ...state, gym };
}

export function validateGymImport(value: GymState): GymState {
  const fail = (): never => {
    throw Error('La copia del gimnasio no es válida.');
  };
  const record = (entry: unknown): entry is Record<string, unknown> =>
    Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry);
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.timeZone !== 'string' ||
    !Number.isFinite(Date.parse(value.startedAt)) ||
    !record(value.receipts) ||
    !record(value.purchases) ||
    !record(value.placements) ||
    !record(value.finishes) ||
    !Array.isArray(value.baseline) ||
    !value.baseline.every((id) => typeof id === 'string' && id.length < 3000)
  )
    fail();
  gymDay(value.startedAt, value.timeZone);
  if (JSON.stringify(value).length > 850000) fail();
  for (const receipt of Object.values(value.receipts)) {
    if (
      !receipt ||
      !['strength', 'activity', 'mobility'].includes(receipt.kind) ||
      !validDay(receipt.day) ||
      !Number.isFinite(receipt.units) ||
      receipt.units < 0 ||
      receipt.units > 100000 ||
      !Number.isFinite(receipt.count) ||
      receipt.count < 0
    )
      fail();
  }
  for (const [id, purchase] of Object.entries(value.purchases)) {
    if (
      !/^[\w-]{1,100}$/.test(id) ||
      !purchase ||
      purchase.id !== id ||
      !gymCatalog.some((item) => item.id === purchase.itemId) ||
      !Number.isInteger(purchase.paid) ||
      purchase.paid < 0 ||
      purchase.paid > 100000 ||
      !Number.isFinite(Date.parse(purchase.at))
    )
      fail();
  }
  if (gymProgress(value).balance < 0) fail();
  for (const [id, placement] of Object.entries(value.placements))
    if (!placement || placementError(value, id, placement)) fail();
  for (const [room, finish] of Object.entries(value.finishes)) {
    if (!['main', 'annex'].includes(room) || !record(finish)) fail();
    for (const surface of ['floor', 'wall'] as const)
      if (
        finish[surface] &&
        !ownedItems(value).some(
          (entry) =>
            entry.id === finish[surface] && entry.item.surface === surface,
        )
      )
        fail();
  }
  if (value.displays !== undefined) {
    if (!record(value.displays)) fail();
    for (const [id, place] of Object.entries(value.displays)) {
      if (
        !place ||
        displayError(value, id, place.shelfId, place.slot) ||
        value.placements[id]
      )
        fail();
    }
  }
  if (value.achievementHistory !== undefined) {
    if (
      !record(value.achievementHistory) ||
      value.achievementHistory.version !== 1 ||
      !record(value.achievementHistory.records)
    )
      fail();
    for (const source of Object.values(value.achievementHistory.records))
      if (
        !source ||
        !['strength', 'activity', 'mobility'].includes(source.kind) ||
        !validDay(source.day) ||
        !Number.isFinite(source.count) ||
        source.count < 0
      )
        fail();
  }
  if (value.avatar !== undefined && avatarError(value, value.avatar)) fail();
  return structuredClone(value);
}
