export type MobilitySession = {
  id: string;
  date: string;
  mode: 'corta' | 'larga';
  exercises: string[];
};

export function mobilityHistory(keys: string[]): MobilitySession[] {
  const sessions = new Map<string, MobilitySession>();
  for (const key of new Set(keys)) {
    const match = /^(\d{4}-\d{2}-\d{2}):(corta|larga)-(.+)$/.exec(key);
    if (
      !match ||
      !Number.isFinite(Date.parse(`${match[1]}T12:00:00Z`)) ||
      new Date(`${match[1]}T12:00:00Z`).toISOString().slice(0, 10) !== match[1]
    )
      continue;
    const [, date, mode, name] = match;
    const id = `${date}:${mode}`;
    const session = sessions.get(id) ?? {
      id,
      date,
      mode: mode as MobilitySession['mode'],
      exercises: [],
    };
    session.exercises.push(name);
    sessions.set(id, session);
  }
  return [...sessions.values()].sort((a, b) => b.id.localeCompare(a.id));
}
