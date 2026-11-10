import { useEffect, useState } from 'react';
import type { Category, CategoryDiff, DeltaId, DeltaList, DeltaOverview, Focus, RepoKey } from '../types.ts';
import { api, patchCached, useLoad } from './api.ts';
import { routeHash, useRoute } from './route.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { DeltaView } from './components/DeltaView.tsx';
import { Nav, RefreshButton, repoName } from './components/Nav.tsx';

export function App() {
  const [route, navigate] = useRoute();
  return (
    <main className="pridm-app">
      {route.page === 'dashboard' ? (
        <DashboardPage repo={route.repo} />
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
    api.setFocus(id, focus).then(
      () => {
        // Keep the cached pages in step, so they don't show the old setting on the next visit.
        patchCached<DeltaList>(DELTAS, (list) => ({ ...list, deltas: list.deltas.map((s) => (s.delta.id === id ? { ...s, focus } : s)) }));
        patchCached<DeltaOverview>(id, (o) => ({ ...o, focus }));
      },
      (e: Error) => {
        setOverrides(({ [id]: _, ...rest }) => rest);
        setError(`Couldn't save: ${e.message}`);
      },
    );
  };
  return [overrides, change, error];
}

// The cache key of the dashboard's list. No delta id can equal it: they all contain ':' or '@'.
const DELTAS = 'deltas';

// With `repo`, only that project's deltas.
function DashboardPage({ repo }: { repo?: RepoKey }) {
  // Kept across page reloads: the listing is the slow load, and it's refreshed behind anyway.
  const [summaries, reload, busy] = useLoad(DELTAS, api.deltas, { persist: true });
  const [focus, setFocus, focusError] = useFocus();
  // Refresh when you come back to the tab, so it reflects work done elsewhere.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });
  const crumbs = repo ? [{ label: repoName(repo) }] : [];
  if (summaries.state === 'loading')
    return (
      <>
        <Nav crumbs={crumbs} />
        <p className="pridm-muted">Looking through your checkouts and PRs…</p>
      </>
    );
  if (summaries.state === 'error')
    return (
      <>
        <Nav crumbs={crumbs}>
          <RefreshButton onRefresh={reload} refreshing={busy} />
        </Nav>
        <p className="pridm-attention">Couldn't load deltas: {summaries.error}</p>
      </>
    );
  const shown = summaries.value.deltas.filter((s) => !repo || s.delta.repo === repo);
  const count = shown.length;
  return (
    <>
      <Nav crumbs={crumbs}>
        <span className="pridm-muted">
          {count} {count === 1 ? 'delta' : 'deltas'}
        </span>
        <RefreshButton onRefresh={reload} refreshing={busy} />
      </Nav>
      {[...summaries.value.warnings, ...(focusError ? [focusError] : [])].map((w) => (
        <p key={w} className="pridm-warning">
          {w}
        </p>
      ))}
      {repo && count === 0 ? (
        <p className="pridm-muted">
          No changes in {repoName(repo)}. <a href={routeHash({ page: 'dashboard' })}>See every project</a>
        </p>
      ) : (
        <Dashboard summaries={shown.map((s) => ({ ...s, focus: focus[s.delta.id] ?? s.focus }))} onFocus={setFocus} />
      )}
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

  if (overview.state === 'loading')
    return (
      <>
        <Nav />
        <p className="pridm-muted">Loading…</p>
      </>
    );
  if (overview.state === 'error')
    return (
      <>
        <Nav />
        <p className="pridm-attention">
          Couldn't load {id}: {overview.error} <a href={routeHash({ page: 'dashboard' })}>Back to the dashboard</a>
        </p>
      </>
    );
  const { delta } = overview.value;
  return (
    <>
      <Nav crumbs={[{ label: repoName(delta.repo), href: routeHash({ page: 'dashboard', repo: delta.repo }) }, { label: delta.title }]} />
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
