// Example deltas for stories. `self` is real: pridm's own history from its first
// commit to the commit the fixture was built at (scripts/fixture-self.ts).
// The rest are variations on it.

import type { BulkDelta, Category, CategoryDiff, DeltaOverview, FileChange } from '../../types.ts';
import { buildOverview, categoryDiff } from '../../shared/overview.ts';
import self from './real/self.json';

const files = self.files as FileChange[];
const order = self.order as Category[];

export interface DeltaFixture {
  overview: DeltaOverview;
  diffs: Record<Category, CategoryDiff>;
}

function fixture(delta: BulkDelta, fs: FileChange[], ord: Category[]): DeltaFixture {
  const overview = buildOverview(delta, fs, ord);
  const diffs = Object.fromEntries(overview.categories.map((c) => [c.category, categoryDiff(delta.id, c.category, fs)]));
  return { overview, diffs };
}

const delta = self.delta as BulkDelta;

export const selfDelta = fixture(delta, files, order);

export const customCategories = fixture(
  delta,
  files.map((f) => ({ ...f, category: (self.custom.categories as Record<string, Category>)[f.path] ?? 'other' })),
  self.custom.order as Category[],
);

export const prOnly = fixture(
  {
    ...delta,
    id: 'github.com/diffplug/pridm:feat/inline-diffs',
    branch: 'feat/inline-diffs',
    title: 'Show single-line code changes on one line',
    local: null,
    source: 'pr',
    pr: { number: 7, url: 'https://github.com/diffplug/pridm/pull/7', author: 'nedtwigg', state: 'open', headSha: delta.local!.headSha, updatedAt: '2026-11-05T20:00:00Z' },
  },
  files,
  order,
);

export const localAndPr = fixture(
  {
    ...prOnly.overview.delta,
    local: { ...delta.local!, uncommitted: { staged: 1, unstaged: 2, untracked: 1 }, upstream: { ref: 'origin/feat/inline-diffs', ahead: 3, behind: 0 } },
    source: 'local',
  },
  files.map((f) => (f.path.startsWith('src/ui/') ? { ...f, committed: false } : f)),
  order,
);

export const neverPushed = fixture(
  {
    ...delta,
    id: 'github.com/diffplug/pridm:spike/dashboard',
    branch: 'spike/dashboard',
    title: 'spike/dashboard',
    local: { ...delta.local!, upstream: null },
  },
  files.filter((f) => f.category === 'spec'),
  order,
);

export const empty = fixture({ ...delta, title: 'main' }, [], order);
