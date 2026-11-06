import { useEffect, useState } from 'react';
import type { Category, CategoryDiff, DeltaId, Focus } from '../types.ts';
import { api, useLoad } from './api.ts';
import { routeHash, useRoute } from './route.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { DeltaView } from './components/DeltaView.tsx';

export function App() {
  const [route, navigate] = useRoute();
  return (
    <main className="pridm-app">
      <nav className="pridm-nav">
        <a href={routeHash({ page: 'dashboard' })} className="pridm-logo">
          priδm
        </a>
      </nav>
      {route.page === 'dashboard' ? (
        <DashboardPage />
      ) : (
        <DeltaPage id={route.id} open={route.open} setOpen={(open) => navigate({ ...route, open }, true)} />
      )}
    </main>
  );
}

// Pin and mute show at once; they're saved in the background, and undone if
// saving fails.
function useFocus(): [Record<DeltaId, Focus>, (id: DeltaId, focus: Focus) => void, string | null] {
  const [overrides, setOverrides] = useState<Record<DeltaId, Focus>>({});
  const [error, setError] = useState<string | null>(null);
  const change = (id: DeltaId, focus: Focus) => {
    setOverrides((o) => ({ ...o, [id]: focus }));
    setError(null);
    api.setFocus(id, focus).catch((e: Error) => {
      setOverrides(({ [id]: _, ...rest }) => rest);
      setError(`Couldn't save: ${e.message}`);
    });
  };
  return [overrides, change, error];
}

function DashboardPage() {
  const [summaries, reload] = useLoad('deltas', api.deltas);
  const [focus, setFocus, focusError] = useFocus();
  // Refresh when you come back to the tab, so it reflects work done elsewhere.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });
  if (summaries.state === 'loading') return <p className="pridm-muted">Looking through your checkouts and PRs…</p>;
  if (summaries.state === 'error') return <p className="pridm-attention">Couldn't load deltas: {summaries.error}</p>;
  return (
    <>
      {[...summaries.value.warnings, ...(focusError ? [focusError] : [])].map((w) => (
        <p key={w} className="pridm-warning">
          {w}
        </p>
      ))}
      <Dashboard
        summaries={summaries.value.deltas.map((s) => ({ ...s, focus: focus[s.delta.id] ?? s.focus }))}
        onFocus={setFocus}
      />
    </>
  );
}

function DeltaPage({ id, open, setOpen }: { id: DeltaId; open: Category[]; setOpen: (open: Category[]) => void }) {
  const [overview] = useLoad(id, () => api.overview(id));
  const [focus, setFocus, focusError] = useFocus();
  const [diffs, setDiffs] = useState<Partial<Record<Category, CategoryDiff>>>({});

  useEffect(() => setDiffs({}), [id]);

  // Load the diffs of every open category that isn't loaded yet, including the
  // ones opened by the URL.
  useEffect(() => {
    for (const category of open) {
      if (diffs[category]) continue;
      api.diff(id, category).then((d) => setDiffs((prev) => ({ ...prev, [category]: d })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, open.join(',')]);

  if (overview.state === 'loading') return <p className="pridm-muted">Loading…</p>;
  if (overview.state === 'error') return <p className="pridm-attention">Couldn't load {id}: {overview.error}</p>;
  return (
    <>
      {focusError && <p className="pridm-warning">{focusError}</p>}
      <DeltaView
        overview={{ ...overview.value, focus: focus[id] ?? overview.value.focus }}
        open={open}
        diffs={diffs}
        onToggle={(category, isOpen) => setOpen(isOpen ? [...open, category] : open.filter((c) => c !== category))}
        onFocus={(f) => setFocus(id, f)}
      />
    </>
  );
}
