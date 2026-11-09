# Discovery

pridm builds its list of deltas from two sources and joins them on `id`, then attaches Dormouse surfaces.

## 1. Local worktrees

For each clone found under `scanRoots` (e.g. `~/projects`):

1. `git remote get-url origin` gives the origin, which is normalized into the `RepoKey`.
2. `git worktree list --porcelain` gives each worktree's path, head commit, and branch.
3. The base is the merge-base of `HEAD` and `origin/<default branch>`. The default branch comes from `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `main`, then `master`.
4. Worktrees with no changes compared with their base are skipped, so a clean `main` checkout doesn't show up.

## 2. Your open PRs

`gh search prs` can't return branch names, and we need those to build ids. So use one GraphQL query through `gh api graphql`, searching `is:pr is:open author:@me`. For each PR it returns: number, title, url, author, draft or not, updatedAt, `headRefName`, `headRefOid`, `baseRefName`, `baseRefOid`, and the repository.

## 3. Join

A PR and a worktree with the same `id` (`<origin>:<branch>`) become one `BulkDelta`. If the PR's base differs from the merge-base, the PR's base wins.

## 4. Where the diff comes from

Both sources sit behind one interface: list the changed files with their +/− counts, and load both versions of one file.

- **Local git** handles local deltas, and PR-only deltas whose repo is cloned under `scanRoots`. For a PR-only delta it first runs `git fetch origin pull/<n>/head`.
  - Changed files: `git diff --numstat -M <base>` and `git diff --name-status -M <base>`.
  - New files git doesn't track yet: `git ls-files --others --exclude-standard`, because `git diff` leaves them out.
  - Uncommitted files: anything not in `git diff --name-only <base> HEAD`.
  - Contents: `git show <base>:<old path>` for the old version; the file on disk (local) or `git show <head>:<path>` (PR) for the new one.
- **GitHub API** handles PRs with no local clone: `gh api repos/<o>/<r>/pulls/<n>/files` for the file list, and the contents endpoint with the raw media type for the contents. This is the first thing to cut if we're short on time.

## 5. Dormouse surfaces

pridm runs inside Dormouse. `dor list --json --all` lists every surface in the window, each with `id`, `kind`, `title`, `command`, `cwd`, `url`, `activity`, `ringing`, `todo`, and `workspace_id`.

- Terminals and tools match a delta when their `cwd` is its `local.path` or a folder inside it. The longest matching path wins, so worktrees inside the main clone get their own surfaces.
- Browsers match when their `url` starts with the PR's URL.
- `needsAttention` is `ringing || todo`. The dashboard puts deltas where an agent is waiting on you at the top.

pridm itself runs as a Dormouse surface: `dor ensure -- bun run dev`, then `dor agent-browser open surface:N`.
