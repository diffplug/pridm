// pridm: data model.
//
// The root type is BulkDelta: a set of changes on a branch compared with its base.
// It may exist only locally (a worktree with commits or edits), only as a PR
// (not checked out), or as both. A delta keeps the same id after a PR is
// opened for it, so its focus setting carries over.

// ─── Root ────────────────────────────────────────────────────

interface BulkDelta {
  id: DeltaId;
  repo: RepoKey;
  branch: string | null;     // null = detached HEAD (local only)
  base: { ref: string; sha: string }; // PR base if there's a PR, else merge-base with origin/<default>
  title: string;             // PR title, else the last commit subject, else the branch name

  local: LocalCheckout | null;
  pr: PullRequest | null;
  surfaces: SurfaceRef[];    // live data, rebuilt on every refresh, never saved

  source: 'local' | 'pr';    // where the diff comes from: local if checked out, else the PR head
}

// "<repoKey>:<branch>", e.g. "github.com/diffplug/spotless:feat/x".
// Detached HEAD uses "<repoKey>@<worktree path>".
// Known gap: PRs from two forks with the same branch name collide. Fine for "my PRs".
type DeltaId = string;

// The normalized origin remote: host + path, no scheme, user, or ".git".
//   git@github.com:diffplug/spotless.git      -> "github.com/diffplug/spotless"
//   https://github.com/diffplug/spotless.git  -> "github.com/diffplug/spotless"
// A clone with no origin uses "file:<absolute path of the main clone>".
type RepoKey = string;

// ─── Local ───────────────────────────────────────────────────

interface LocalCheckout {
  path: string;              // the worktree root
  headSha: string;
  uncommitted: { staged: number; unstaged: number; untracked: number };
  upstream: { ref: string; ahead: number; behind: number } | null; // null = never pushed
  updatedAt: string;         // ISO time of the last commit
}

// ─── GitHub ──────────────────────────────────────────────────

interface PullRequest {
  number: number;
  url: string;
  author: string;
  state: 'open' | 'draft' | 'merged' | 'closed';
  headSha: string;
  updatedAt: string;
}

// ─── Dormouse ────────────────────────────────────────────────

// A trimmed-down row from `dor list --json --all`
interface SurfaceRef {
  id: string;                // "surface:713"
  kind: 'terminal' | 'browser' | 'tool';
  title: string;
  command: string | null;    // "claude", "npm run dev", ...
  cwd: string | null;
  url: string | null;
  workspaceId: string;
  activity: string;
  needsAttention: boolean;   // ringing || todo
  matchedBy: 'cwd' | 'url';  // cwd inside local.path (longest match wins), or url starts with pr.url
}

// ─── What the UI loads ───────────────────────────────────────
//
// Three levels, each loaded only when needed:
//   1. DeltaSummary[]  the dashboard: per-category +/- for every delta
//   2. DeltaOverview   one delta: every category collapsed, showing +/- and its file list
//   3. CategoryDiff    loaded when you expand a category. This is the expensive
//                      part: both full versions of every file.
// Line counts come from `git diff --numstat`. Markdown files are also counted
// in words (FileStat.words), which the UI shows instead of lines.

// Category names are defined in categories.json. OTHER is the only built-in one.
type Category = string;
const OTHER: Category = 'other';

type Focus = 'pinned' | 'normal' | 'muted';

// Lists of these are in section order: the origin's order in categories.json,
// with OTHER last. Categories with no changed files are left out.
interface CategoryStat {
  category: Category;
  fileCount: number;
  additions: number;
  deletions: number;
  words?: WordCounts;        // set when every file in the category is markdown
}

// Markdown files are counted in words as well as lines; the UI shows words.
interface WordCounts {
  added: number;
  removed: number;
}

interface DeltaSummary {
  delta: BulkDelta;
  focus: Focus;
  categories: CategoryStat[];
  unavailable?: string;      // why this delta can't be opened, e.g. its repo isn't cloned
}

// GET /api/deltas. Warnings are problems that didn't stop the listing,
// e.g. `gh` isn't logged in, so only local checkouts are shown.
interface DeltaList {
  deltas: DeltaSummary[];
  warnings: string[];
}

interface DeltaOverview {
  delta: BulkDelta;
  categories: (CategoryStat & { files: FileStat[] })[]; // shown in each collapsed header
}

interface CategoryDiff {
  deltaId: DeltaId;
  category: Category;
  files: FileChange[];
}

// ─── File changes ────────────────────────────────────────────

type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

interface FileStat {
  path: string;
  oldPath?: string;          // set when the file was renamed
  status: FileStatus;
  category: Category;
  additions: number;
  deletions: number;
  isBinary: boolean;
  committed: boolean;        // false = only in the working tree (local source only)
  words?: WordCounts;        // markdown files only
}

interface FileChange extends FileStat {
  diff: CodeDiff | MarkdownDiff;
}

// Monaco's DiffEditor computes the diff itself and wants both full versions.
// Shown inline (renderSideBySide: false), with unchanged regions folded.
interface CodeDiff {
  kind: 'code';
  language: string;          // Monaco language id, from the file extension
  original: string;          // '' for an added file
  modified: string;          // '' for a deleted file
}

// Shown in a read-only MDXEditor in rich-text mode. `merged` is one markdown
// document with deletions as ~~strikethrough~~ and insertions as ==highlight==,
// which MDXEditor's core plugin already renders. CSS colors them red and green.
// It is built on the server: blocks are diffed first, then words inside blocks
// that changed. A changed code block or table can't hold inline marks, so it
// appears twice, old then new.
interface MarkdownDiff {
  kind: 'markdown';
  original: string;
  modified: string;
  merged: string;
}

// ─── Classification ──────────────────────────────────────────

// Category globs for one origin, matched against the file's path (the old path
// for deleted files). Keys are any category names you like, checked in the order
// they are written; the first category with a matching glob wins. A file that
// matches nothing is OTHER. OTHER may also be listed, to claim files before a
// later, broader category does.
type CategoryGlobs = Record<Category, string[]>;

// Keyed by origin. An origin's entry replaces "*" entirely; the two are not merged.
// Saved in ~/.pridm/categories.json, which is meant to be edited by hand.
type CategoryConfig = { '*': CategoryGlobs } & Record<RepoKey, CategoryGlobs>;

const DEFAULT_CATEGORIES: CategoryConfig = {
  '*': {
    spec: ['**/spec/**', '**/specs/**', 'docs/**', 'rfcs/**', '**/*.md', '**/*.mdx'],
    test: ['**/test/**', '**/tests/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.{ts,tsx,js,jsx}', '**/*_test.go', '**/test_*.py'],
    prod: ['**/*.{ts,tsx,js,jsx,go,py,java,kt,rs,rb,swift,c,cpp,h}'],
  },
};

// ─── Saved state (~/.pridm/state.json), written by pridm ──

interface PridmState {
  focus: Record<DeltaId, Focus>;
  scanRoots: string[];       // e.g. ['~/projects']
}

export {
  DEFAULT_CATEGORIES,
  OTHER,
  type BulkDelta, type DeltaId, type RepoKey, type LocalCheckout, type PullRequest,
  type SurfaceRef, type Category, type Focus, type CategoryStat, type WordCounts, type DeltaSummary, type DeltaList,
  type DeltaOverview, type CategoryDiff, type FileStatus, type FileStat, type FileChange,
  type CodeDiff, type MarkdownDiff, type CategoryGlobs, type CategoryConfig, type PridmState,
};
