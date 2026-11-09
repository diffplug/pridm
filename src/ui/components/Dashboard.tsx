import { SyncIcon } from '@primer/octicons-react';
import type { DeltaId, DeltaSummary, Focus } from '../../types.ts';
import { routeHash } from '../route.ts';
import { DeltaRow } from './DeltaRow.tsx';

// Every delta, in the server's order (newest first, PRs that can't be opened
// last), with pinned ones at the top and muted ones at the bottom.
export interface DashboardProps {
  summaries: DeltaSummary[];
  onFocus?: (id: DeltaId, focus: Focus) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Dashboard({ summaries, onFocus, onRefresh, refreshing = false }: DashboardProps) {
  const rank = (s: DeltaSummary) => (s.focus === 'pinned' ? 0 : s.focus === 'muted' ? 2 : 1);
  const sorted = [...summaries].sort((a, b) => rank(a) - rank(b));
  return (
    <div className="pridm-dashboard">
      <div className="pridm-toolbar">
        <span className="pridm-muted">
          {summaries.length} {summaries.length === 1 ? 'delta' : 'deltas'}
        </span>
        {onRefresh && (
          <button type="button" className="pridm-refresh" onClick={onRefresh} disabled={refreshing} title="Look through your checkouts and PRs again">
            <SyncIcon size={14} className={refreshing ? 'pridm-spin' : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>
      {summaries.length === 0 && <p className="pridm-muted">No changes in any checkout under your scan folders.</p>}
      {sorted.map((s) => (
        <DeltaRow
          key={s.delta.id}
          summary={s}
          href={routeHash({ page: 'delta', id: s.delta.id, open: [] })}
          onFocus={onFocus && ((f) => onFocus(s.delta.id, f))}
        />
      ))}
    </div>
  );
}
