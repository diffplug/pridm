// Fetches from the server's /api routes. See src/server/api.ts.

import { useEffect, useState } from 'react';
import type { Category, CategoryDiff, DeltaId, DeltaList, DeltaOverview, Focus } from '../types.ts';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/${path}`);
  const body = await res.json();
  if (!res.ok) throw new ApiError(body.error ?? `${res.status} ${res.statusText}`);
  return body as T;
}

// The server answered, and said no. Unlike a request that never got through.
class ApiError extends Error {}

const id = (deltaId: DeltaId) => encodeURIComponent(deltaId);

export const api = {
  deltas: () => get<DeltaList>('deltas'),
  overview: (deltaId: DeltaId) => get<DeltaOverview>(`deltas/${id(deltaId)}`),
  diff: (deltaId: DeltaId, category: Category) => get<CategoryDiff>(`deltas/${id(deltaId)}/${encodeURIComponent(category)}`),
  setFocus: async (deltaId: DeltaId, focus: Focus) => {
    const res = await fetch(`/api/focus/${id(deltaId)}`, { method: 'PUT', body: JSON.stringify({ focus }) });
    if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
  },
};

export type Loaded<T> = { state: 'loading' } | { state: 'error'; error: string } | { state: 'done'; value: T };

// The last result of every load, by key, so coming back to a page shows what
// it showed last time at once, while it loads again behind. Keys loaded with
// `persist` are also kept in localStorage, so they survive a page reload.
const cache = new Map<string, unknown>();
const persisted = new Set<string>();
const STORE = 'pridm-cache:v1:';

function cached<T>(key: string, persist: boolean): T | undefined {
  if (persist) persisted.add(key);
  if (!cache.has(key) && persist) {
    try {
      const raw = localStorage.getItem(STORE + key);
      if (raw) cache.set(key, JSON.parse(raw));
    } catch {
      // no storage, or not JSON: load as if for the first time
    }
  }
  return cache.get(key) as T | undefined;
}

function remember(key: string, value: unknown): void {
  cache.set(key, value);
  if (!persisted.has(key)) return;
  try {
    localStorage.setItem(STORE + key, JSON.stringify(value));
  } catch {
    // storage is full or off: the in-memory copy still works
  }
}

function forget(key: string): void {
  cache.delete(key);
  try {
    localStorage.removeItem(STORE + key);
  } catch {
    // nothing was stored
  }
}

// Changes a cached result in place, e.g. after a pin, so the next visit
// doesn't briefly show the old value.
export function patchCached<T>(key: string, patch: (value: T) => T): void {
  if (cache.has(key)) remember(key, patch(cache.get(key) as T));
}

// Runs `load` whenever `key` changes, showing the cached result meanwhile if
// there is one. `reload` runs it again, keeping the last result on screen;
// `busy` is true while any load is running.
export function useLoad<T>(key: string, load: () => Promise<T>, { persist = false } = {}): [Loaded<T>, () => void, boolean] {
  const start = (): Loaded<T> => {
    const value = cached<T>(key, persist);
    return value === undefined ? { state: 'loading' } : { state: 'done', value };
  };
  const [result, setResult] = useState<Loaded<T>>(start);
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let current = true;
    setResult((r) => {
      const s = start();
      return s.state === 'loading' && r.state === 'done' ? r : s;
    });
    setBusy(true);
    load()
      .then(
        (value) => {
          remember(key, value);
          if (current) setResult({ state: 'done', value });
        },
        (e: Error) => {
          // What the server refused is gone, so don't show it again. A request that never got
          // through (the server is down, or the page is unloading) says nothing about the cache.
          if (e instanceof ApiError) forget(key);
          if (current) setResult({ state: 'error', error: e.message });
        },
      )
      .finally(() => current && setBusy(false));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  return [result, () => setN((x) => x + 1), busy];
}
