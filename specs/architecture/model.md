# Data model

The full model is in [`src/types.ts`](../../src/types.ts).

## `BulkDelta`

The root type is a `BulkDelta`: a set of changes on a branch compared with its base. A change doesn't have to be a PR yet:

| Has a local checkout | Has a PR | Example |
| --- | --- | --- |
| yes | no | a worktree you're hacking in, or one an agent is working in |
| no | yes | a PR you opened from another machine, not checked out here |
| yes | yes | the usual case |

```ts
interface BulkDelta {
  id: DeltaId;               // "github.com/owner/repo:branch"
  repo: RepoKey;             // "github.com/owner/repo"
  branch: string | null;     // null = detached HEAD
  base: { ref: string; sha: string };
  title: string;             // PR title, else the last commit subject, else the branch name

  local: LocalCheckout | null;   // path, head commit, uncommitted counts, commits not yet pushed
  pr: PullRequest | null;        // number, url, state, headSha
  surfaces: SurfaceRef[];        // Dormouse panes working on it (live, never saved)

  source: 'local' | 'pr';    // where the diff comes from
}
```

## Decisions

- **The id stays the same when a PR is opened.** It's `<origin>:<branch>`, so a local-only delta and its later PR are the same entry, and focus settings (pinned or muted) carry over.
- **The origin is the normalized `origin` remote URL:** host and path, with no scheme, user, or `.git`. Both `git@github.com:owner/repo.git` and `https://github.com/owner/repo.git` become `github.com/owner/repo`. A clone with no origin uses `file:<path of the main clone>`. Detached HEAD uses `<origin>@<worktree path>` as its id.
- **The local checkout wins when both exist.** The diff comes from the working tree, so it includes uncommitted edits and commits you haven't pushed. `FileStat.committed` marks changes that exist only on disk. `local.upstream.ahead` says the PR is behind your local branch.
- **Choosing the base:** if there's a PR, use its base branch. Otherwise use the merge-base with `origin/<default branch>`.
- **Surfaces are live data.** They're rebuilt from `dor list` on every refresh and never saved.

## Saved state

`~/.pridm/state.json` (`PridmState`) is written by pridm when you pin or mute a delta. It keeps anything else in the file, like a hand-written `scanRoots`, as it was. It holds focus per delta (pinned, normal, muted) and `scanRoots`, the folders to look in for clones.

Category globs are in a separate file, `~/.pridm/categories.json`, because you edit that one by hand. See [Categories](categories.md).

## Known gaps

- PRs from two forks with the same branch name (e.g. `patch-1`) get the same id. That's fine while we only show your own PRs.
