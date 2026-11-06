// ~/.pridm/categories.json (hand-edited) and ~/.pridm/state.json (written by pridm).
// Both are optional; missing files mean the defaults.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_CATEGORIES, type CategoryConfig, type CategoryGlobs, type PridmState, type RepoKey } from '../types.ts';

const DIR = join(homedir(), '.pridm');

function readJson<T>(name: string): Partial<T> {
  const path = join(DIR, name);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')) as Partial<T>;
}

export function categoryConfig(): CategoryConfig {
  return { ...DEFAULT_CATEGORIES, ...readJson<CategoryConfig>('categories.json') } as CategoryConfig;
}

export function globsFor(config: CategoryConfig, repo: RepoKey): CategoryGlobs {
  return config[repo] ?? config['*'];
}

export function state(): PridmState {
  const s = readJson<PridmState>('state.json');
  return {
    focus: s.focus ?? {},
    scanRoots: (s.scanRoots ?? ['~/projects']).map((r) => r.replace(/^~(?=$|\/)/, homedir())),
  };
}
