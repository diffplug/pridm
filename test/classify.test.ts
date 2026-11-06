import { describe, expect, test } from 'bun:test';
import { DEFAULT_CATEGORIES, OTHER, type FileStat } from '../src/types.ts';
import { classifier, sectionOrder } from '../src/shared/classify.ts';
import { categoryStats } from '../src/shared/overview.ts';

describe('classifier', () => {
  const classify = classifier(DEFAULT_CATEGORIES['*']);

  test('default rules', () => {
    expect(classify('specs/plan.md')).toBe('spec');
    expect(classify('README.md')).toBe('spec');
    expect(classify('test/mdmerge.test.ts')).toBe('test');
    expect(classify('src/foo.spec.ts')).toBe('test');
    expect(classify('src/shared/mdmerge.ts')).toBe('prod');
    expect(classify('bun.lock')).toBe(OTHER);
    expect(classify('.github/workflows/ci.yml')).toBe(OTHER);
  });

  test('the first matching category wins', () => {
    expect(classify('test/README.md')).toBe('spec');
    const testFirst = classifier({ test: ['test/**'], spec: ['**/*.md'] });
    expect(testFirst('test/README.md')).toBe('test');
  });

  test('custom categories, and listing other to claim files early', () => {
    const c = classifier({ migrations: ['db/migrations/**'], other: ['**/generated/**'], prod: ['**'] });
    expect(c('db/migrations/001.sql')).toBe('migrations');
    expect(c('src/generated/api.ts')).toBe(OTHER);
    expect(c('src/api.ts')).toBe('prod');
  });

  test('dotfiles match', () => {
    expect(classifier({ ci: ['.github/**'] })('.github/workflows/ci.yml')).toBe('ci');
  });
});

describe('sectionOrder', () => {
  test('categories as written, then other last', () => {
    expect(sectionOrder({ other: ['x'], spec: ['y'], test: ['z'] })).toEqual(['spec', 'test', OTHER]);
  });
});

describe('categoryStats', () => {
  const file = (path: string, category: string, additions: number, deletions: number): FileStat => ({
    path, category, additions, deletions, status: 'modified', isBinary: false, committed: true,
  });

  test('sums per category, in order, leaving out empty ones', () => {
    const stats = categoryStats(
      [file('a.md', 'spec', 3, 1), file('b.md', 'spec', 2, 0), file('a.ts', 'prod', 10, 5)],
      ['spec', 'test', 'prod', OTHER],
    );
    expect(stats).toEqual([
      { category: 'spec', fileCount: 2, additions: 5, deletions: 1 },
      { category: 'prod', fileCount: 1, additions: 10, deletions: 5 },
    ]);
  });
});
