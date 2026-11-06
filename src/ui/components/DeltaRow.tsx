import type { DeltaSummary } from '../../types.ts';
import { CategoryCounts } from './CategoryCounts.tsx';

// One delta on the dashboard. The whole row links to the delta, or, for a PR
// that can't be opened here, to the PR on GitHub.
export function DeltaRow({ summary, href }: { summary: DeltaSummary; href: string }) {
  const { delta, categories, unavailable } = summary;
  const { local, pr } = delta;
  const uncommitted = local ? local.uncommitted.staged + local.uncommitted.unstaged + local.uncommitted.untracked : 0;

  const facts: React.ReactNode[] = [];
  facts.push(<span key="repo">{delta.repo.replace(/^github\.com\//, '')}</span>);
  if (delta.branch && delta.branch !== delta.title) facts.push(<code key="branch">{delta.branch}</code>);
  if (pr) facts.push(<span key="pr">#{pr.number}{pr.state !== 'open' && ` ${pr.state}`}</span>);
  if (!local && !unavailable) facts.push(<span key="nolocal">not checked out</span>);
  if (uncommitted > 0) facts.push(<span key="unc" className="pridm-attention">{uncommitted} uncommitted</span>);
  if (local && !local.upstream) facts.push(<span key="never" className="pridm-attention">never pushed</span>);
  if (local?.upstream && local.upstream.ahead > 0)
    facts.push(<span key="ahead" className="pridm-attention">{local.upstream.ahead} not pushed</span>);
  const updated = local?.updatedAt ?? pr?.updatedAt;
  if (updated) facts.push(<span key="time">{relativeTime(updated)}</span>);

  if (unavailable) {
    return (
      <a className="pridm-row" href={pr?.url} target="_blank" rel="noreferrer" data-unavailable>
        <div className="pridm-row-title">{delta.title}</div>
        <div className="pridm-row-facts">
          {facts.map((f, i) => (
            <span key={i}>
              {i > 0 && <span className="pridm-muted"> · </span>}
              {f}
            </span>
          ))}
        </div>
        <div className="pridm-row-counts pridm-muted">{unavailable}. Opens on GitHub.</div>
      </a>
    );
  }

  return (
    <a className="pridm-row" href={href} data-focus={summary.focus}>
      <div className="pridm-row-title">{delta.title}</div>
      <div className="pridm-row-facts">
        {facts.map((f, i) => (
          <span key={i}>
            {i > 0 && <span className="pridm-muted"> · </span>}
            {f}
          </span>
        ))}
      </div>
      <div className="pridm-row-counts">
        <CategoryCounts categories={categories} />
      </div>
    </a>
  );
}

function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units: [number, string][] = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2592000, 'month'], [31536000, 'year']];
  let [size, name] = units[0]!;
  for (const u of units) if (s >= u[0]) [size, name] = u;
  const n = Math.floor(s / size);
  return `${n} ${name}${n === 1 ? '' : 's'} ago`;
}
