import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setFocus, state } from '../src/server/config.ts';

let home: string;
beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'pridm-'));
  process.env.PRIDM_HOME = home;
});
afterAll(() => {
  delete process.env.PRIDM_HOME;
  rmSync(home, { recursive: true });
});

test('pin, mute, and back to normal', () => {
  setFocus('github.com/o/r:a', 'pinned');
  setFocus('github.com/o/r:b', 'muted');
  expect(state().focus).toEqual({ 'github.com/o/r:a': 'pinned', 'github.com/o/r:b': 'muted' });
  setFocus('github.com/o/r:a', 'normal');
  expect(state().focus).toEqual({ 'github.com/o/r:b': 'muted' });
});

test('keeps the rest of state.json as written', () => {
  writeFileSync(join(home, 'state.json'), JSON.stringify({ scanRoots: ['~/code'], focus: {} }));
  setFocus('x', 'pinned');
  expect(JSON.parse(readFileSync(join(home, 'state.json'), 'utf8'))).toEqual({ scanRoots: ['~/code'], focus: { x: 'pinned' } });
});
