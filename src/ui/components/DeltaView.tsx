import type { Category, CategoryDiff, DeltaOverview, Focus } from '../../types.ts';
import { CategorySection } from './CategorySection.tsx';
import { FocusButtons } from './FocusButtons.tsx';

export interface DeltaViewProps {
  overview: DeltaOverview;
  open: Category[];
  onToggle: (category: Category, open: boolean) => void;
  diffs: Partial<Record<Category, CategoryDiff>>;
  onFocus?: (focus: Focus) => void;
}

// One delta: a header, then one collapsible section per category.
// Which sections are open, and loading their diffs, is up to the caller.
export function DeltaView({ overview, open, onToggle, diffs, onFocus }: DeltaViewProps) {
  const { delta, categories } = overview;
  return (
    <div className="pridm-delta">
      <DeltaHeader overview={overview} onFocus={onFocus} />
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

function DeltaHeader({ overview, onFocus }: { overview: DeltaOverview; onFocus?: (focus: Focus) => void }) {
  const { delta } = overview;
  const { local, pr } = delta;
  const uncommitted = local ? local.uncommitted.staged + local.uncommitted.unstaged + local.uncommitted.untracked : 0;

  const facts: React.ReactNode[] = [];
  if (delta.branch && delta.branch !== delta.title) facts.push(<code key="branch">{delta.branch}</code>);
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
      <div className="pridm-delta-title">
        <h2>{delta.title}</h2>
        {onFocus && <FocusButtons focus={overview.focus ?? 'normal'} onChange={onFocus} />}
      </div>
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
