import { expect, test } from 'bun:test';
import { parseRoute, routeHash } from '../src/ui/route.ts';

test('dashboard', () => {
  expect(parseRoute('')).toEqual({ page: 'dashboard' });
  expect(parseRoute('#/')).toEqual({ page: 'dashboard' });
  expect(routeHash({ page: 'dashboard' })).toBe('#/');
});

test('a delta id with slashes and colons survives the round trip', () => {
  const route = { page: 'delta' as const, id: 'github.com/diffplug/pridm:feat/live-local-deltas', open: ['spec', 'test'] };
  const hash = routeHash(route);
  expect(hash).toBe('#/delta/github.com%2Fdiffplug%2Fpridm%3Afeat%2Flive-local-deltas?open=spec,test');
  expect(parseRoute(hash)).toEqual(route);
});

test('no open categories', () => {
  expect(parseRoute('#/delta/abc')).toEqual({ page: 'delta', id: 'abc', open: [] });
});
