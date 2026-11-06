// Fetches from the server's /api routes. See src/server/api.ts.

import { useEffect, useState } from 'react';
import type { Category, CategoryDiff, DeltaId, DeltaList, DeltaOverview, Focus } from '../types.ts';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/${path}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  return body as T;
}

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

// Runs `load` whenever `key` changes. `reload` runs it again.
export function useLoad<T>(key: string, load: () => Promise<T>): [Loaded<T>, () => void] {
  const [result, setResult] = useState<Loaded<T>>({ state: 'loading' });
  const [n, setN] = useState(0);
  useEffect(() => {
    let current = true;
    setResult((r) => (r.state === 'done' ? r : { state: 'loading' }));
    load().then(
      (value) => current && setResult({ state: 'done', value }),
      (e: Error) => current && setResult({ state: 'error', error: e.message }),
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  return [result, () => setN((x) => x + 1)];
}
