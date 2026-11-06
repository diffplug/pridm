import { expect, test } from 'bun:test';
import { normalizeOrigin } from '../src/server/origin.ts';

test.each([
  ['git@github.com:diffplug/pridm.git', 'github.com/diffplug/pridm'],
  ['git@github.com:diffplug/pridm', 'github.com/diffplug/pridm'],
  ['https://github.com/diffplug/pridm.git', 'github.com/diffplug/pridm'],
  ['https://github.com/diffplug/pridm', 'github.com/diffplug/pridm'],
  ['https://user:token@github.com/diffplug/pridm.git', 'github.com/diffplug/pridm'],
  ['ssh://git@github.com:22/diffplug/pridm.git', 'github.com/diffplug/pridm'],
  ['https://GitHub.com/diffplug/pridm/', 'github.com/diffplug/pridm'],
  ['git@gitlab.example.com:group/sub/repo.git', 'gitlab.example.com/group/sub/repo'],
])('%s', (url, key) => {
  expect(normalizeOrigin(url)).toBe(key);
});

test('a local path has no host', () => {
  expect(normalizeOrigin('/Users/me/repo.git')).toBeNull();
  expect(normalizeOrigin('file:///Users/me/repo.git')).toBeNull();
  expect(normalizeOrigin('../other')).toBeNull();
});
