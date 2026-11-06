import type { CategoryDiff, CategoryStat, FileStat } from '../../types.ts';
import { FileDiffView } from './FileDiffView.tsx';
import { PlusMinus } from './PlusMinus.tsx';

export interface CategorySectionProps {
  section: CategoryStat & { files: FileStat[] };
  open: boolean;
  onToggle: (open: boolean) => void;
  diff?: CategoryDiff;  // undefined while it loads, or before it's ever been opened
}

// One category of a delta. Collapsed, it shows only its totals. Expanded, it
// lists every file, each of which expands to its diff. The diffs load the
// first time the category opens; until then a file shows "Loading…".
export function CategorySection({ section, open, onToggle, diff }: CategorySectionProps) {
  const { category, fileCount, additions, deletions, words, files } = section;
  const loaded = new Map(diff?.files.map((f) => [f.path, f]));
  return (
    <details
      className="pridm-section"
      open={open}
      onToggle={(e) => {
        const now = e.currentTarget.open;
        if (now !== open) onToggle(now);
      }}
    >
      <summary>
        <div className="pridm-section-summary">
          <span className="pridm-section-name">{category}</span>
          <span className="pridm-section-rule" />
          <span className="pridm-muted">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </span>
          <PlusMinus additions={additions} deletions={deletions} words={words} />
        </div>
      </summary>
      {open && (
        <div className="pridm-section-body">
          {files.map((f) => (
            <FileDiffView key={f.path} file={loaded.get(f.path) ?? f} />
          ))}
        </div>
      )}
    </details>
  );
}
