// Groups a delta's files into categories, for the UI. Pure, so the server and
// Storybook fixtures build the same shapes.

import type { BulkDelta, Category, CategoryDiff, CategoryStat, DeltaOverview, FileChange, FileStat } from '../types.ts';

// In section order. Categories with no files are left out.
export function categoryStats(files: FileStat[], order: Category[]): CategoryStat[] {
  return order
    .map((category) => {
      const inCategory = files.filter((f) => f.category === category);
      const allMarkdown = inCategory.length > 0 && inCategory.every((f) => f.words);
      return {
        category,
        fileCount: inCategory.length,
        additions: sum(inCategory, 'additions'),
        deletions: sum(inCategory, 'deletions'),
        ...(allMarkdown && {
          words: {
            added: inCategory.reduce((n, f) => n + f.words!.added, 0),
            removed: inCategory.reduce((n, f) => n + f.words!.removed, 0),
          },
        }),
      };
    })
    .filter((s) => s.fileCount > 0);
}

export function buildOverview(delta: BulkDelta, files: FileStat[], order: Category[]): DeltaOverview {
  return {
    delta,
    categories: categoryStats(files, order).map((stat) => ({
      ...stat,
      files: files.filter((f) => f.category === stat.category).map(toStat),
    })),
  };
}

export function categoryDiff(deltaId: string, category: Category, files: FileChange[]): CategoryDiff {
  return { deltaId, category, files: files.filter((f) => f.category === category) };
}

// Strip the diff from a FileChange, leaving the FileStat.
export function toStat(f: FileStat): FileStat {
  const { path, oldPath, status, category, additions, deletions, isBinary, committed, words } = f;
  return { path, oldPath, status, category, additions, deletions, isBinary, committed, words };
}

function sum(files: FileStat[], key: 'additions' | 'deletions'): number {
  return files.reduce((n, f) => n + f[key], 0);
}
