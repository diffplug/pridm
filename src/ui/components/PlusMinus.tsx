import type { WordCounts } from '../../types.ts';

// "+12 −3" in lines, or "+120w −14w" in words when word counts are given (markdown).
export function PlusMinus({ additions, deletions, words }: { additions: number; deletions: number; words?: WordCounts }) {
  const unit = words ? 'w' : '';
  return (
    <span className="pridm-plusminus" title={words ? `${additions} lines added, ${deletions} removed` : undefined}>
      <span className="pridm-additions">
        +{words ? words.added : additions}
        {unit}
      </span>{' '}
      <span className="pridm-deletions">
        −{words ? words.removed : deletions}
        {unit}
      </span>
    </span>
  );
}
