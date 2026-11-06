// ~/.pridm/categories.json (hand-edited) and ~/.pridm/state.json (written by pridm).
// Both are optional; missing files mean the defaults. PRIDM_HOME moves the
// folder, which the tests use.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_CATEGORIES, type CategoryConfig, type CategoryGlobs, type DeltaId, type Focus, type PridmState, type RepoKey } from '../types.ts';

const dir = () => process.env.PRIDM_HOME ?? join(homedir(), '.pridm');

function readJson<T>(name: string): Partial<T> {
  const path = join(dir(), name);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Partial<T>;
}

// Written to a temporary file, then renamed over the old one, so a crash
// mid-write never leaves half a file.
function writeJson(name: string, value: unknown): void {
  mkdirSync(dir(), { recursive: true });
  const path = join(dir(), name);
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2) + '\n');
  renameSync(`${path}.tmp`, path);
}

export function categoryConfig(): CategoryConfig {
  return { ...DEFAULT_CATEGORIES, ...readJson<CategoryConfig>('categories.json') } as CategoryConfig;
}

export function globsFor(config: CategoryConfig, repo: RepoKey): CategoryGlobs {
  return config[repo] ?? config['*'];
}

// Pins or mutes a delta. "normal" removes it from the file. Everything else in
// state.json, like a hand-written scanRoots, is kept as it was.
export function setFocus(id: DeltaId, focus: Focus): void {
  const s = readJson<PridmState>('state.json');
  const next = { ...s.focus };
  if (focus === 'normal') delete next[id];
  else next[id] = focus;
  writeJson('state.json', { ...s, focus: next });
}

export function state(): PridmState {
  const s = readJson<PridmState>('state.json');
  return {
    focus: s.focus ?? {},
    scanRoots: (s.scanRoots ?? ['~/projects']).map((r) => r.replace(/^~(?=$|\/)/, homedir())),
  };
}
