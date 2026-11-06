import type { CategoryStat } from '../../types.ts';
import { PlusMinus } from './PlusMinus.tsx';

// Each category's +/− on one line, for a dashboard row:
// spec +1200w −140w · prod +88 −31 · test +40 −2
export function CategoryCounts({ categories }: { categories: CategoryStat[] }) {
  if (categories.length === 0) return <span className="pridm-counts pridm-muted">No changes</span>;
  return (
    <span className="pridm-counts">
      {categories.map((c, i) => (
        <span key={c.category}>
          {i > 0 && <span className="pridm-muted"> · </span>}
          <span className="pridm-category-name">{c.category}</span>{' '}
          <PlusMinus additions={c.additions} deletions={c.deletions} words={c.words} />
        </span>
      ))}
    </span>
  );
}
