import { describe, expect, test } from 'bun:test';
import { wordCounts } from '../src/shared/words.ts';
import { categoryStats } from '../src/shared/overview.ts';
import type { FileStat } from '../src/types.ts';

describe('wordCounts', () => {
  test('a word changed', () => {
    expect(wordCounts('The quick brown fox.', 'The quick red fox.')).toEqual({ added: 1, removed: 1 });
  });

  test('markdown syntax is not a word', () => {
    expect(wordCounts('', '## Title\n\n- one\n- two\n\n| a | b |\n| - | - |')).toEqual({ added: 5, removed: 0 });
  });

  test('a new file counts every word', () => {
    expect(wordCounts('', 'four words right here')).toEqual({ added: 4, removed: 0 });
  });
});

describe('categoryStats words', () => {
  const file = (path: string, words?: { added: number; removed: number }): FileStat => ({
    path, category: 'spec', additions: 1, deletions: 1, status: 'modified', isBinary: false, committed: true, words,
  });

  test('summed when every file is markdown', () => {
    const [s] = categoryStats([file('a.md', { added: 3, removed: 1 }), file('b.md', { added: 2, removed: 2 })], ['spec']);
    expect(s!.words).toEqual({ added: 5, removed: 3 });
  });

  test('left out when any file is not markdown, so the units never mix', () => {
    const [s] = categoryStats([file('a.md', { added: 3, removed: 1 }), file('a.ts')], ['spec']);
    expect(s!.words).toBeUndefined();
  });
});
