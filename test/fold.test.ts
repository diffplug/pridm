import { describe, expect, test } from 'bun:test';
import { fold, revealStep } from '../src/shared/fold.ts';
import type { MarkdownPiece } from '../src/types.ts';

const p = (text: string, changed = false): MarkdownPiece => ({ text, changed, listItem: false, sep: '\n\n' });
const doc = (marks: string) => [...marks].map((m, i) => p(m === 'h' ? `## Section ${i}` : `para ${i}`, m === 'x'));
const shape = (pieces: MarkdownPiece[], revealed: number[] = []) =>
  fold(pieces, new Set(revealed)).map((s) => `${s.kind === 'shown' ? 'S' : 'F'}${s.from}-${s.to}`);

describe('fold', () => {
  test('a change in the middle shows one block of context each side', () => {
    expect(shape(doc('.....x.....'))).toEqual(['F0-4', 'S4-7', 'F7-11']);
  });

  test('a single hidden block is just shown', () => {
    // Blocks 0 and 4 are each the only hidden block in their run.
    expect(shape(doc('..x...x'))).toEqual(['S0-7']);
  });

  test('two changes close together share one shown segment', () => {
    expect(shape(doc('...x..x...'))).toEqual(['F0-2', 'S2-8', 'F8-10']);
  });

  test('a document with no changes shows everything', () => {
    expect(shape(doc('.....'))).toEqual(['S0-5']);
  });

  test('revealed blocks show', () => {
    expect(shape(doc('.....x.....'), [7, 8])).toEqual(['F0-4', 'S4-9', 'F9-11']);
  });

  test('a folded run is labeled with the headings inside it, or else its section', () => {
    const pieces = doc('h...h..x');
    const [first] = fold(pieces, new Set());
    expect(first).toMatchObject({ kind: 'folded', label: 'Section 0, Section 4' });
    const after = doc('hx....');
    expect(fold(after, new Set())[1]).toMatchObject({ kind: 'folded', label: 'in Section 0' });
  });
});

describe('revealStep', () => {
  const run = { kind: 'folded' as const, from: 10, to: 30, label: null };
  test('down shows the first blocks, up the last, all everything', () => {
    expect(revealStep(run, 'down')).toEqual([10, 11, 12, 13, 14]);
    expect(revealStep(run, 'up')).toEqual([25, 26, 27, 28, 29]);
    expect(revealStep(run, 'all')).toHaveLength(20);
  });
  test('a short run is shown all at once', () => {
    expect(revealStep({ ...run, to: 13 }, 'down')).toEqual([10, 11, 12]);
  });
});
