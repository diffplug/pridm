// Finds deltas: every checkout (clone or worktree) directly under the scan
// roots that has changes compared with its base, joined with your open PRs.
// See specs/architecture/discovery.md.

import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BulkDelta, CategoryConfig, CategoryGlobs, DeltaId, FileStat, LocalCheckout, PullRequest, RepoKey } from '../types.ts';
import { globsFor } from './config.ts';
import { git, tryGit } from './exec.ts';
import { normalizeOrigin } from './origin.ts';
import type { OpenPr } from './prs.ts';
import { fileStats, type Range } from './sources/git.ts';

export interface LocalDelta {
  delta: BulkDelta;
  range: Range;
  globs: CategoryGlobs;
  stats: FileStat[];
}

// What's checked out in one folder, before looking at any changes.
export interface Checkout {
  top: string;
  headSha: string;
  branch: string | null;
  repo: RepoKey;
  id: DeltaId;
  defaultRef: string | null;              // e.g. origin/main
  remotes: Map<RepoKey, string>;          // repo → remote name, e.g. github.com/xtermjs/xterm.js → upstream
}

// ─── Finding checkouts ───────────────────────────────────────

export async function scan(scanRoots: string[]): Promise<Checkout[]> {
  const dirs = [...new Set(checkoutDirs(scanRoots).map((d) => realpathSync(d)))];
  // Not a usable checkout (empty repo, broken worktree, ...): skip it.
  const found = await Promise.all(dirs.map((dir) => inspect(dir).catch(() => null)));
  return found.filter((c): c is Checkout => c !== null);
}

// A scan root itself, and each folder directly in it, that holds a .git (a
// directory for a clone, a file for a worktree).
function checkoutDirs(scanRoots: string[]): string[] {
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

export async function inspect(path: string): Promise<Checkout> {
  const top = (await git(path, ['rev-parse', '--show-toplevel'])).trim();
  const [headSha, branch, remoteList, commonDir, defaultRef] = await Promise.all([
    git(top, ['rev-parse', 'HEAD']).then((s) => s.trim()),
    tryGit(top, ['symbolic-ref', '--short', '-q', 'HEAD']),
    tryGit(top, ['remote', '-v']),
    git(top, ['rev-parse', '--path-format=absolute', '--git-common-dir']).then((s) => s.trim()),
    defaultBranch(top),
  ]);
  const remotes = parseRemotes(remoteList ?? '');
  const origin = [...remotes].find(([, name]) => name === 'origin')?.[0];
  const repo = origin ?? `file:${dirname(commonDir)}`;
  return { top, headSha, branch, repo, id: branch ? `${repo}:${branch}` : `${repo}@${top}`, defaultRef, remotes };
}

// `git remote -v`: "name\turl (fetch)" and "name\turl (push)".
function parseRemotes(out: string): Map<RepoKey, string> {
  const remotes = new Map<RepoKey, string>();
  for (const line of out.split('\n')) {
    const m = /^(\S+)\t(\S+) \(fetch\)$/.exec(line);
    const key = m && normalizeOrigin(m[2]!);
    if (key && !remotes.has(key)) remotes.set(key, m[1]!);
  }
  return remotes;
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

// ─── Joining checkouts and PRs ───────────────────────────────

export type Plan =
  | { kind: 'local'; checkout: Checkout; pr?: OpenPr }
  | { kind: 'pr'; pr: OpenPr; clone: Checkout }
  | { kind: 'unavailable'; pr: OpenPr; reason: string };

// A PR belongs to the checkout of its branch, in the repo the branch lives in
// (the fork, for a PR from a fork). A PR whose branch isn't checked out is
// read from any clone with a remote for the PR's repo. Pure, so it's tested.
export function plan(checkouts: Checkout[], prs: OpenPr[]): Plan[] {
  const byId = new Map(checkouts.map((c) => [c.id, c]));
  const prFor = new Map<Checkout, OpenPr>();
  const plans: Plan[] = [];
  for (const pr of prs) {
    const checkout = pr.headRepo ? byId.get(`${pr.headRepo}:${pr.headRef}`) : undefined;
    if (checkout && !prFor.has(checkout)) {
      prFor.set(checkout, pr);
      continue;
    }
    // Prefer a clone whose origin is the PR's repo, then any with a remote for it.
    const clone = checkouts.find((c) => c.repo === pr.repo) ?? checkouts.find((c) => c.remotes.has(pr.repo));
    plans.push(clone ? { kind: 'pr', pr, clone } : { kind: 'unavailable', pr, reason: `${pr.repo} isn't cloned in your scan folders` });
  }
  for (const checkout of checkouts) plans.push({ kind: 'local', checkout, pr: prFor.get(checkout) });
  return plans;
}

export function toPullRequest(pr: OpenPr): PullRequest {
  return {
    number: pr.number,
    url: pr.url,
    author: pr.author,
    state: pr.isDraft ? 'draft' : 'open',
    headSha: pr.headSha,
    updatedAt: pr.updatedAt,
  };
}

// ─── Building deltas ─────────────────────────────────────────

// A checkout's changes compared with its base: the PR's base branch if there's
// a PR, else the default branch. Null if there are no changes.
export async function localDelta(co: Checkout, config: CategoryConfig, pr?: OpenPr): Promise<LocalDelta | null> {
  let baseRef = co.defaultRef;
  if (pr) {
    const remote = co.remotes.get(pr.repo);
    const prBase = remote ? `${remote}/${pr.baseRef}` : null;
    if (prBase && (await tryGit(co.top, ['rev-parse', '--verify', '-q', prBase]))) baseRef = prBase;
  }
  const baseSha = baseRef ? ((await tryGit(co.top, ['merge-base', 'HEAD', baseRef])) ?? co.headSha) : co.headSha;
  const range: Range = { cwd: co.top, base: baseSha };
  const globs = globsFor(config, co.repo);
  const stats = await fileStats(range, globs);
  if (stats.length === 0) return null;

  const [unc, up, updatedAt, subject] = await Promise.all([
    uncommitted(co.top),
    upstream(co.top),
    git(co.top, ['log', '-1', '--format=%cI']).then((s) => s.trim()),
    baseSha !== co.headSha ? git(co.top, ['log', '-1', '--format=%s']).then((s) => s.trim()) : null,
  ]);
  const local: LocalCheckout = { path: co.top, headSha: co.headSha, uncommitted: unc, upstream: up, updatedAt };
  const delta: BulkDelta = {
    id: co.id,
    repo: co.repo,
    branch: co.branch,
    base: { ref: baseRef ?? 'HEAD', sha: baseSha },
    title: pr?.title ?? subject ?? co.branch ?? co.top.split('/').pop()!,
    local,
    pr: pr ? toPullRequest(pr) : null,
    surfaces: [],
    source: 'local',
  };
  return { delta, range, globs, stats };
}

// A PR whose branch isn't checked out, read from a clone of its repo. Fetches
// the PR's commits the first time, without writing any refs or FETCH_HEAD.
export async function prOnlyDelta(pr: OpenPr, clone: Checkout, config: CategoryConfig): Promise<LocalDelta | string> {
  const remote = clone.remotes.get(pr.repo);
  if (!remote) return `${clone.top} has no remote for ${pr.repo}`;
  const has = async (sha: string) => (await tryGit(clone.top, ['cat-file', '-e', `${sha}^{commit}`])) !== null;
  if (!(await has(pr.headSha)) || !(await has(pr.baseSha))) {
    // One fetch at a time per clone: parallel fetches into one repo fight over its ref locks.
    const fetched = await oneAtATime(clone.top, () =>
      tryGit(clone.top, ['fetch', '--no-write-fetch-head', '--quiet', remote, `refs/pull/${pr.number}/head`, `refs/heads/${pr.baseRef}`]),
    );
    if (fetched === null || !(await has(pr.headSha))) return `Couldn't fetch #${pr.number} from ${remote}`;
  }
  const base = await tryGit(clone.top, ['merge-base', pr.headSha, pr.baseSha]);
  if (!base) return `No common history between #${pr.number} and ${pr.baseRef}`;

  const range: Range = { cwd: clone.top, base, head: pr.headSha };
  const globs = globsFor(config, pr.repo);
  const stats = await fileStats(range, globs);
  const delta: BulkDelta = {
    id: `${pr.headRepo ?? pr.repo}:${pr.headRef}`,
    repo: pr.repo,
    branch: pr.headRef,
    base: { ref: pr.baseRef, sha: base },
    title: pr.title,
    local: null,
    pr: toPullRequest(pr),
    surfaces: [],
    source: 'pr',
  };
  return { delta, range, globs, stats };
}

const queues = new Map<string, Promise<unknown>>();

function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(key, next.catch(() => {}));
  return next;
}

// A PR that can't be opened: shown on the dashboard, with no changes listed.
export function unavailableDelta(pr: OpenPr): BulkDelta {
  return {
    id: `${pr.headRepo ?? pr.repo}:${pr.headRef}`,
    repo: pr.repo,
    branch: pr.headRef,
    base: { ref: pr.baseRef, sha: pr.baseSha },
    title: pr.title,
    local: null,
    pr: toPullRequest(pr),
    surfaces: [],
    source: 'pr',
  };
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
