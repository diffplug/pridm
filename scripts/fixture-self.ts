// Builds the "pridm reviewing its own build" fixture for Storybook: every file
// changed between pridm's first commit and HEAD, with its contents.
//
//   bun scripts/fixture-self.ts

import { writeFileSync } from 'node:fs';
import { DEFAULT_CATEGORIES, type BulkDelta, type CategoryGlobs } from '../src/types.ts';
import { classifier, sectionOrder } from '../src/shared/classify.ts';
import { fileChange, fileStats, type Range } from '../src/server/sources/git.ts';
import { git } from '../src/server/exec.ts';

const cwd = new URL('..', import.meta.url).pathname;
const base = 'a76a1ce';  // "Sketch Prism's data model and README"
const head = git(cwd, ['rev-parse', 'HEAD']).trim();
const range: Range = { cwd, base, head };

const globs = DEFAULT_CATEGORIES['*'];
// A second set of rules, to show custom categories.
const customGlobs: CategoryGlobs = {
  spec: ['specs/**', 'README.md'],
  ui: ['src/ui/**'],
  test: ['test/**'],
  server: ['src/server/**', 'scripts/**'],
  shared: ['src/shared/**', 'src/types.ts'],
  other: ['bun.lock'],
};

const files = fileStats(range, globs)
  // Leave out the fixtures themselves: a fixture that contains itself never settles.
  .filter((f) => !f.path.startsWith('src/ui/fixtures/real/'))
  .map((stat) => fileChange(range, stat));

const custom = classifier(customGlobs);
const delta: BulkDelta = {
  id: 'github.com/diffplug/pridm:main',
  repo: 'github.com/diffplug/pridm',
  branch: 'main',
  base: { ref: base, sha: git(cwd, ['rev-parse', base]).trim() },
  title: 'pridm reviewing its own build',
  local: {
    path: '/Users/ntwigg/projects/pridm',
    headSha: head,
    uncommitted: { staged: 0, unstaged: 0, untracked: 0 },
    upstream: { ref: 'origin/main', ahead: 0, behind: 0 },
  },
  pr: null,
  surfaces: [],
  source: 'local',
};

const out = {
  delta,
  files,
  order: sectionOrder(globs),
  custom: {
    order: sectionOrder(customGlobs),
    categories: Object.fromEntries(files.map((f) => [f.path, custom(f.path)])),
  },
};
const path = new URL('../src/ui/fixtures/real/self.json', import.meta.url).pathname;
writeFileSync(path, JSON.stringify(out));
console.log(`${files.length} files, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB → ${path}`);
for (const f of files) console.log(`  ${f.category.padEnd(6)} ${f.status.padEnd(8)} +${f.additions} −${f.deletions}  ${f.path}`);
