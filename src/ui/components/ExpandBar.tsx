import { FoldDownIcon, FoldUpIcon, UnfoldIcon } from '@primer/octicons-react';

export interface ExpandBarProps {
  hidden: number;
  unit: string;              // "block", "line"
  label?: string | null;     // e.g. the section the hidden part is in
  canDown: boolean;          // there's shown content above, to extend downward
  canUp: boolean;            // there's shown content below, to extend upward
  onExpand: (direction: 'down' | 'up' | 'all') => void;
}

// The bar where part of a diff is folded away. Like GitHub's: ↓ extends the
// part above it, ↑ the part below it, and the middle shows everything.
export function ExpandBar({ hidden, unit, label, canDown, canUp, onExpand }: ExpandBarProps) {
  return (
    <div className="pridm-expand">
      <span className="pridm-expand-arrows">
        {canDown && (
          <button type="button" title="Show more below the part above" onClick={() => onExpand('down')}>
            <FoldDownIcon size={16} />
          </button>
        )}
        {canUp && (
          <button type="button" title="Show more above the part below" onClick={() => onExpand('up')}>
            <FoldUpIcon size={16} />
          </button>
        )}
      </span>
      <button type="button" className="pridm-expand-all" title="Show all" onClick={() => onExpand('all')}>
        <UnfoldIcon size={14} />
        <span>
          {hidden} hidden {unit}
          {hidden === 1 ? '' : 's'}
          {label && <span className="pridm-muted"> · {label}</span>}
        </span>
      </button>
    </div>
  );
}
