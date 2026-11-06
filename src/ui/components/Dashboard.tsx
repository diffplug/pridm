import type { DeltaSummary } from '../../types.ts';
import { routeHash } from '../route.ts';
import { DeltaRow } from './DeltaRow.tsx';

// Every delta, newest first, with muted ones at the bottom.
export function Dashboard({ summaries }: { summaries: DeltaSummary[] }) {
  if (summaries.length === 0) {
    return <p className="pridm-muted">No changes in any checkout under your scan folders.</p>;
  }
  const rank = (s: DeltaSummary) => (s.focus === 'pinned' ? 0 : s.focus === 'muted' ? 2 : 1);
  const sorted = [...summaries].sort((a, b) => rank(a) - rank(b));
  return (
    <div className="pridm-dashboard">
      {sorted.map((s) => (
        <DeltaRow key={s.delta.id} summary={s} href={routeHash({ page: 'delta', id: s.delta.id, open: [] })} />
      ))}
    </div>
  );
}
