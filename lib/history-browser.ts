export function localHistoryDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

export function historyPage<T extends { id: string; date: string }>(
  entries: T[],
  options: {
    query: string;
    month: string;
    page: number;
    searchText: (entry: T) => string;
    size?: number;
  },
) {
  const query = normalized(options.query.trim());
  const size = Math.max(1, Math.floor(options.size ?? 10));
  const sorted = [...entries].sort(
    (a, b) =>
      Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id),
  );
  const months = [
    ...new Set(
      sorted
        .map((entry) => localHistoryDay(entry.date).slice(0, 7))
        .filter(Boolean),
    ),
  ];
  const filtered = sorted.filter(
    (entry) =>
      (!options.month ||
        localHistoryDay(entry.date).startsWith(options.month)) &&
      (!query || normalized(options.searchText(entry)).includes(query)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const page = Math.max(0, Math.min(pages - 1, options.page));
  return {
    entries: filtered.slice(page * size, (page + 1) * size),
    total: filtered.length,
    months,
    page,
    pages,
    start: filtered.length ? page * size + 1 : 0,
    end: Math.min((page + 1) * size, filtered.length),
  };
}
