// Which blocks of a markdown diff to show, and which to fold away behind an
// expando. Changed blocks show, with CONTEXT unchanged blocks on each side.
// Runs of unchanged blocks between them fold, unless they're too short to be
// worth it. Blocks the reader has expanded show too.

import type { MarkdownPiece } from '../types.ts';

export const CONTEXT = 1;
export const STEP = 5;      // blocks shown per click of an expando
const MIN_FOLDED = 2;       // a single hidden block isn't worth an expando

export type Segment =
  | { kind: 'shown'; from: number; to: number }  // pieces[from, to)
  | { kind: 'folded'; from: number; to: number; label: string | null };

export function fold(pieces: MarkdownPiece[], revealed: ReadonlySet<number>): Segment[] {
  const changed = pieces.map((p) => p.changed);
  const anyChange = changed.some(Boolean);
  const shown = pieces.map((_, i) => {
    if (!anyChange || revealed.has(i)) return true;
    for (let d = -CONTEXT; d <= CONTEXT; d++) if (changed[i + d]) return true;
    return false;
  });

  const segments: Segment[] = [];
  for (let i = 0; i < pieces.length; ) {
    let j = i;
    while (j < pieces.length && shown[j] === shown[i]) j++;
    if (shown[i] || j - i < MIN_FOLDED) push(segments, { kind: 'shown', from: i, to: j });
    else segments.push({ kind: 'folded', from: i, to: j, label: label(pieces, i, j) });
    i = j;
  }
  return segments;
}

// Merges a shown segment into a shown one right before it.
function push(segments: Segment[], s: Segment) {
  const last = segments[segments.length - 1];
  if (last?.kind === 'shown' && s.kind === 'shown') last.to = s.to;
  else segments.push(s);
}

// Names where a folded run is: the headings inside it, or else the section it's in.
function label(pieces: MarkdownPiece[], from: number, to: number): string | null {
  const inside = pieces.slice(from, to).map(heading).filter((h): h is string => h !== null);
  if (inside.length > 2) return `${inside.slice(0, 2).join(', ')}, …`;
  if (inside.length > 0) return inside.join(', ');
  for (let i = from - 1; i >= 0; i--) {
    const h = heading(pieces[i]!);
    if (h) return `in ${h}`;
  }
  return null;
}

function heading(p: MarkdownPiece): string | null {
  const m = /^#{1,6}[ \t]+(.+)$/m.exec(p.text.split('\n')[0]!);
  return m ? m[1]!.replace(/~~|==|\*\*|`/g, '').trim() : null;
}

// The blocks to add to `revealed` for one click on a folded run's expando.
export function revealStep(segment: Segment, direction: 'down' | 'up' | 'all'): number[] {
  const { from, to } = segment;
  const all = Array.from({ length: to - from }, (_, k) => from + k);
  if (direction === 'all' || to - from <= STEP) return all;
  return direction === 'down' ? all.slice(0, STEP) : all.slice(-STEP);
}
