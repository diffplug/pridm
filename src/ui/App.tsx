import { useEffect, useState } from 'react';
import type { Category, CategoryDiff, DeltaId } from '../types.ts';
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

function DashboardPage() {
  const [summaries, reload] = useLoad('deltas', api.deltas);
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
      {summaries.value.warnings.map((w) => (
        <p key={w} className="pridm-warning">
          {w}
        </p>
      ))}
      <Dashboard summaries={summaries.value.deltas} />
    </>
  );
}

function DeltaPage({ id, open, setOpen }: { id: DeltaId; open: Category[]; setOpen: (open: Category[]) => void }) {
  const [overview] = useLoad(id, () => api.overview(id));
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
    <DeltaView
      overview={overview.value}
      open={open}
      diffs={diffs}
      onToggle={(category, isOpen) => setOpen(isOpen ? [...open, category] : open.filter((c) => c !== category))}
    />
  );
}
