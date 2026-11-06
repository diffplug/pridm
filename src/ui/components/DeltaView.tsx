import type { Category, CategoryDiff, DeltaOverview } from '../../types.ts';
import { CategorySection } from './CategorySection.tsx';

export interface DeltaViewProps {
  overview: DeltaOverview;
  open: Category[];
  onToggle: (category: Category, open: boolean) => void;
  diffs: Partial<Record<Category, CategoryDiff>>;
}

// One delta: a header, then one collapsible section per category.
// Which sections are open, and loading their diffs, is up to the caller.
export function DeltaView({ overview, open, onToggle, diffs }: DeltaViewProps) {
  const { delta, categories } = overview;
  return (
    <div className="pridm-delta">
      <DeltaHeader overview={overview} />
      {categories.length === 0 && <p className="pridm-muted">No changes compared with {delta.base.ref}.</p>}
      {categories.map((section) => (
        <CategorySection
          key={section.category}
          section={section}
          open={open.includes(section.category)}
          onToggle={(o) => onToggle(section.category, o)}
          diff={diffs[section.category]}
        />
      ))}
    </div>
  );
}

function DeltaHeader({ overview }: { overview: DeltaOverview }) {
  const { delta, categories } = overview;
  const { local, pr } = delta;
  const uncommitted = local ? local.uncommitted.staged + local.uncommitted.unstaged + local.uncommitted.untracked : 0;
  const additions = categories.reduce((n, c) => n + c.additions, 0);
  const deletions = categories.reduce((n, c) => n + c.deletions, 0);

  const facts: React.ReactNode[] = [];
  if (delta.branch) facts.push(<code key="branch">{delta.branch}</code>);
  facts.push(<span key="repo">{delta.repo}</span>);
  if (pr)
    facts.push(
      <a key="pr" href={pr.url} target="_blank" rel="noreferrer">
        #{pr.number}
        {pr.state !== 'open' && ` (${pr.state})`}
      </a>,
    );
  else facts.push(<span key="nopr">no PR yet</span>);
  if (!local) facts.push(<span key="local">not checked out</span>);
  if (uncommitted > 0) facts.push(<span key="unc" className="pridm-attention">{uncommitted} uncommitted</span>);
  if (local && !local.upstream) facts.push(<span key="never" className="pridm-attention">never pushed</span>);
  if (local?.upstream && local.upstream.ahead > 0)
    facts.push(
      <span key="ahead" className="pridm-attention">
        {local.upstream.ahead} {local.upstream.ahead === 1 ? 'commit' : 'commits'} not pushed
      </span>,
    );
  facts.push(<span key="base">compared with {delta.base.ref}</span>);

  return (
    <header className="pridm-delta-header">
      <h2>
        {delta.title}{' '}
        <span className="pridm-delta-total">
          <span className="pridm-additions">+{additions}</span> <span className="pridm-deletions">−{deletions}</span>
        </span>
      </h2>
      <div className="pridm-facts">
        {facts.map((f, i) => (
          <span key={i}>
            {i > 0 && <span className="pridm-muted"> · </span>}
            {f}
          </span>
        ))}
      </div>
    </header>
  );
}
