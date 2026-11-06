import { expect, test } from 'bun:test';
import { parseWordDiff } from '../src/server/sources/git.ts';

test('parses git --word-diff=porcelain, ignoring headers and markdown syntax', () => {
  const out = [
    'diff --git a/specs/a.md b/specs/a.md',
    'index 1111111..2222222 100644',
    '--- a/specs/a.md',
    '+++ b/specs/a.md',
    '@@ -1 +1 @@',
    ' The quick',
    '-brown',
    '+red fast',
    ' fox.',
    '~',
    '@@ -5 +5 @@',
    '+## New heading',
    '~',
    'diff --git a/old.md b/old.md',
    'deleted file mode 100644',
    '--- a/old.md',
    '+++ /dev/null',
    '@@ -1 +0,0 @@',
    '-gone now',
    '~',
  ].join('\n');
  const counts = parseWordDiff(out);
  expect(counts.get('specs/a.md')).toEqual({ added: 4, removed: 1 });
  expect(counts.get('old.md')).toEqual({ added: 0, removed: 2 });
});
