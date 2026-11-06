// Finds local deltas: every checkout (clone or worktree) directly under the
// scan roots that has changes compared with its base. See specs/architecture/discovery.md.
//
// PRs and Dormouse surfaces aren't joined in yet.

import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BulkDelta, CategoryConfig, CategoryGlobs, FileStat, LocalCheckout } from '../types.ts';
import { globsFor } from './config.ts';
import { git, tryGit } from './exec.ts';
import { normalizeOrigin } from './origin.ts';
import { fileStats, type Range } from './sources/git.ts';

export interface LocalDelta {
  delta: BulkDelta;
  range: Range;
  globs: CategoryGlobs;
  stats: FileStat[];
}

export async function discoverLocal(scanRoots: string[], config: CategoryConfig): Promise<LocalDelta[]> {
  const dirs = [...new Set(checkouts(scanRoots).map((d) => realpathSync(d)))];
  const found = await Promise.all(
    dirs.map((dir) =>
      // Not a usable checkout (empty repo, broken worktree, ...): skip it.
      localDelta(dir, config).catch(() => null),
    ),
  );
  return found.filter((d): d is LocalDelta => d !== null);
}

// A scan root itself, and each folder directly in it, that holds a .git (a
// directory for a clone, a file for a worktree).
function checkouts(scanRoots: string[]): string[] {
  const dirs: string[] = [];
  for (const root of scanRoots) {
    if (!existsSync(root)) continue;
    if (existsSync(join(root, '.git'))) dirs.push(root);
    for (const name of readdirSync(root)) {
      const dir = join(root, name);
      try {
        if (statSync(dir).isDirectory() && existsSync(join(dir, '.git'))) dirs.push(dir);
      } catch {
        // unreadable: skip
      }
    }
  }
  return dirs;
}

export async function localDelta(path: string, config: CategoryConfig): Promise<LocalDelta | null> {
  const top = (await git(path, ['rev-parse', '--show-toplevel'])).trim();
  const [headSha, branch, origin, commonDir, baseRef] = await Promise.all([
    git(top, ['rev-parse', 'HEAD']).then((s) => s.trim()),
    tryGit(top, ['symbolic-ref', '--short', '-q', 'HEAD']),
    tryGit(top, ['remote', 'get-url', 'origin']),
    git(top, ['rev-parse', '--path-format=absolute', '--git-common-dir']).then((s) => s.trim()),
    defaultBranch(top),
  ]);
  const repo = (origin && normalizeOrigin(origin)) ?? `file:${dirname(commonDir)}`;

  const baseSha = baseRef ? ((await tryGit(top, ['merge-base', 'HEAD', baseRef])) ?? headSha) : headSha;
  const range: Range = { cwd: top, base: baseSha };
  const globs = globsFor(config, repo);
  const stats = await fileStats(range, globs);
  if (stats.length === 0) return null;

  const [unc, up, updatedAt, subject] = await Promise.all([
    uncommitted(top),
    upstream(top),
    git(top, ['log', '-1', '--format=%cI']).then((s) => s.trim()),
    baseSha !== headSha ? git(top, ['log', '-1', '--format=%s']).then((s) => s.trim()) : null,
  ]);
  const local: LocalCheckout = { path: top, headSha, uncommitted: unc, upstream: up, updatedAt };
  const delta: BulkDelta = {
    id: branch ? `${repo}:${branch}` : `${repo}@${top}`,
    repo,
    branch,
    base: { ref: baseRef ?? 'HEAD', sha: baseSha },
    title: subject ?? branch ?? top.split('/').pop()!,
    local,
    pr: null,
    surfaces: [],
    source: 'local',
  };
  return { delta, range, globs, stats };
}

// origin/HEAD if it's set, else origin/main or origin/master, else local main or master.
async function defaultBranch(cwd: string): Promise<string | null> {
  const head = await tryGit(cwd, ['symbolic-ref', '-q', 'refs/remotes/origin/HEAD']);
  if (head) return head.replace(/^refs\/remotes\//, '');
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    if (await tryGit(cwd, ['rev-parse', '--verify', '-q', ref])) return ref;
  }
  return null;
}

async function uncommitted(cwd: string): Promise<LocalCheckout['uncommitted']> {
  const counts = { staged: 0, unstaged: 0, untracked: 0 };
  // -z: entries are "XY path\0", with an extra "\0orig" after renames.
  const entries = (await git(cwd, ['status', '--porcelain=v1', '-z'])).split('\0');
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.length < 3) continue;
    const [x, y] = [e[0], e[1]];
    if (x === '?') counts.untracked++;
    else {
      if (x !== ' ') counts.staged++;
      if (y !== ' ') counts.unstaged++;
    }
    if (x === 'R' || x === 'C') i++;
  }
  return counts;
}

async function upstream(cwd: string): Promise<LocalCheckout['upstream']> {
  const ref = await tryGit(cwd, ['rev-parse', '--abbrev-ref', '@{upstream}']);
  if (!ref) return null;
  const counts = (await tryGit(cwd, ['rev-list', '--left-right', '--count', `${ref}...HEAD`])) ?? '0\t0';
  const [behind, ahead] = counts.split('\t').map(Number);
  return { ref, ahead: ahead ?? 0, behind: behind ?? 0 };
}
