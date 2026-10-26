export function database(initial) {
  const data = new Map(initial ? [['appState/main', structuredClone(initial)]] : []);
  const listeners = new Set(); const pages = [];
  let queue = Promise.resolve();
  const backend = {
    prefixPage: async (collection, prefix, after) => {
      pages.push({ prefix, after });
      const start = encodeURIComponent(prefix);
      return [...data].filter(([path]) => path.startsWith(`${collection}/${start}`))
        .map(([path, record]) => ({ id: path.slice(collection.length + 1), record }))
        .sort((a,b) => a.id.localeCompare(b.id))
        .filter(row => !after || row.id.localeCompare(after) > 0).slice(0, 100).map(row => structuredClone(row));
    },
    historyPage: async (collection, start, end, after) => {
      pages.push({ start, end, after });
      return [...data].filter(([path, row]) => path.startsWith(`${collection}/`) && row.historyDate >= start && row.historyDate < end)
        .map(([path, record]) => ({ id: path.slice(collection.length + 1), record }))
        .sort((a,b) => a.record.historyDate.localeCompare(b.record.historyDate) || a.id.localeCompare(b.id))
        .filter(row => !after || row.record.historyDate > after.date || (row.record.historyDate === after.date && row.id.localeCompare(after.id) > 0))
        .slice(0, 100).map(row => structuredClone(row));
    },
    get: async path => structuredClone(data.get(path) ?? null),
    page: async (collection, after, since) => {
      pages.push({ collection, after, since });
      return [...data].filter(([path, row]) => path.startsWith(`${collection}/`) && (since === undefined || row.sequence > since))
        .map(([path, record]) => ({ id: path.slice(collection.length + 1), record }))
        .sort((a, b) => (since === undefined ? 0 : a.record.sequence - b.record.sequence) || a.id.localeCompare(b.id))
        .filter(row => !after || (since !== undefined && row.record.sequence > after.sequence) || ((since === undefined || row.record.sequence === after.sequence) && row.id.localeCompare(after.id) > 0))
        .slice(0, 100).map(row => structuredClone(row));
    },
    batch: async entries => { for (const { path, value } of entries) data.set(path, structuredClone(value)); },
    transaction: action => {
      const task = queue.catch(() => undefined).then(async () => {
        const writes = [];
        const result = await action({ get: backend.get, set: (path, value) => writes.push({ path, value }) });
        await backend.batch(writes);
        if (writes.some(row => row.path === 'appState/records-v1')) for (const listener of listeners) queueMicrotask(listener);
        return result;
      });
      queue = task; return task;
    },
    listen: (_path, listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { backend, data, pages };
}
