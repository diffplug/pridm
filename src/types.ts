// Prism: data model.
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

// "owner/repo:branch" when the repo has a GitHub remote, else "/abs/path/to/clone:branch".
// Detached HEAD uses "<repoKey>@<worktree path>".
// Known gap: PRs from two forks with the same branch name collide. Fine for "my PRs".
type DeltaId = string;

// "owner/repo", or the absolute path of the main clone when there is no GitHub remote
type RepoKey = string;

// ─── Local ───────────────────────────────────────────────────

interface LocalCheckout {
  path: string;              // the worktree root
  headSha: string;
  uncommitted: { staged: number; unstaged: number; untracked: number };
  upstream: { ref: string; ahead: number; behind: number } | null; // null = never pushed
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

// ─── Summary (dashboard) and detail (one delta) ──────────────

type Category = 'spec' | 'prod' | 'test' | 'other';
type Focus = 'pinned' | 'normal' | 'muted';

type CategoryStats = Record<Category, { files: number; additions: number; deletions: number }>;

interface DeltaSummary {
  delta: BulkDelta;
  focus: Focus;
  stats: CategoryStats;
}

interface DeltaDetail {
  delta: BulkDelta;
  files: Record<Category, FileChange[]>;
}

// ─── File changes ────────────────────────────────────────────

type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed';

interface FileChange {
  path: string;
  oldPath?: string;          // set when the file was renamed
  status: FileStatus;
  category: Category;
  additions: number;
  deletions: number;
  isBinary: boolean;
  committed: boolean;        // false = only in the working tree (local source only)
  diff: CodeDiff | MarkdownDiff;
}

interface CodeDiff {
  kind: 'code';
  hunks: Hunk[];
}

interface Hunk {
  header: string;            // "@@ -10,7 +10,9 @@ function foo()"
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'add' | 'del';
  oldNo?: number;
  newNo?: number;
  text: string;
  spans?: { start: number; end: number }[]; // word-level highlights
}

// The diff is computed per markdown block, then per word inside blocks that
// changed, so <ins>/<del> tags can't break markdown syntax.
interface MarkdownDiff {
  kind: 'markdown';
  blocks: MdBlock[];
}

type MdBlock =
  | { op: 'equal'; source: string }
  | { op: 'insert'; source: string }
  | { op: 'delete'; source: string }
  | {
      op: 'modify';
      oldSource: string;
      newSource: string;
      tokens: { op: 'equal' | 'insert' | 'delete'; text: string }[];
    };

// ─── Classification ──────────────────────────────────────────

// Checked in order; the first match wins.
interface CategoryRule {
  category: Category;
  globs: string[];
}

const DEFAULT_RULES: CategoryRule[] = [
  { category: 'test', globs: ['**/test/**', '**/tests/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.{ts,tsx,js,jsx}', '**/*_test.go', '**/test_*.py', '**/src/test/**'] },
  { category: 'spec', globs: ['docs/**', 'specs/**', 'rfcs/**', '**/*.md', '**/*.mdx'] },
  { category: 'other', globs: ['**/*.lock', '**/package-lock.json', '.github/**', '**/*.{yml,yaml,toml,json}', '**/.*'] },
  { category: 'prod', globs: ['**/*.{ts,tsx,js,jsx,go,py,java,kt,rs,rb,swift,c,cpp,h}'] },
];
const FALLBACK_CATEGORY: Category = 'other';

// ─── Saved state (~/.prism/state.json) ───────────────────────

interface PrismState {
  focus: Record<DeltaId, Focus>;
  rulesByRepo: Record<RepoKey, CategoryRule[]>;
  categoryOrder: Category[];
  collapsedByDefault: Category[];
  scanRoots: string[];       // e.g. ['~/projects']
}

export {
  DEFAULT_RULES,
  FALLBACK_CATEGORY,
  type BulkDelta, type DeltaId, type RepoKey, type LocalCheckout, type PullRequest,
  type SurfaceRef, type Category, type Focus, type CategoryStats, type DeltaSummary,
  type DeltaDetail, type FileStatus, type FileChange, type CodeDiff, type Hunk,
  type DiffLine, type MarkdownDiff, type MdBlock, type CategoryRule, type PrismState,
};
