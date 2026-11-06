# Discovery

pridm builds its list of deltas from two sources and joins them on `id`, then attaches Dormouse surfaces.

## 1. Local checkouts

Built in `src/server/discover.ts`. Every scan root (default `~/projects`), and every folder directly inside one, that holds a `.git` is a checkout: a `.git` directory for a clone, a `.git` file for a worktree. For each one:

1. `git remote get-url origin` gives the origin, which is normalized into the `RepoKey` (`src/server/origin.ts`). With no origin, it's `file:<main clone>`.
2. `git symbolic-ref HEAD` gives the branch; detached HEAD has none.
3. The base is the merge-base of `HEAD` and the default branch: `origin/HEAD` if it's set, else `origin/main`, `origin/master`, `main`, `master`.
4. Checkouts with no changes compared with their base are skipped, so a clean `main` doesn't show up.
5. The title is the last commit's subject if the branch has commits past its base, else the branch name.

Worktrees that live outside the scan roots aren't found. That's simpler than following `git worktree list` from each clone, and it matches how worktrees are laid out in `~/projects`.

Git runs in parallel, at most 16 processes at once (`src/server/exec.ts`). Scanning 69 folders in `~/projects` finds 20 deltas in about 2 seconds.

## 2. Your open PRs

Built in `src/server/prs.ts`. `gh search prs` can't return branch names, and we need those to build ids, so it's one GraphQL query through `gh api graphql`, searching `is:pr is:open author:@me archived:false`. For each PR it returns: number, title, url, author, draft or not, `updatedAt`, `headRefName`, `headRefOid`, `baseRefName`, `baseRefOid`, the repository, and the head repository (the fork, for a PR from a fork).

If `gh` fails (not logged in, offline), the dashboard still lists local checkouts and shows a warning.

## 3. Join

`plan()` in `src/server/discover.ts`, which is pure and tested. Each PR ends up as one of:

- **Joined to a local checkout:** the checkout whose id is `<head repo>:<head branch>`, i.e. a checkout of the repo the branch lives in. For a PR from a fork, that's a checkout of the fork, not of the base repo. The delta uses the PR's title, and its base is the PR's base branch (`<remote for the PR's repo>/<base branch>`), so a stacked PR is compared with the PR under it, not with `main`.
- **PR-only:** its branch isn't checked out, but some checkout has a remote for the PR's repo (one whose origin is that repo is preferred). The PR's commits are fetched into that clone the first time, with `git fetch --no-write-fetch-head <remote> refs/pull/<n>/head refs/heads/<base>`, so no branches or `FETCH_HEAD` are written. Fetches into one clone run one at a time, because parallel fetches fight over its ref locks. The diff is from the merge-base of the PR's head and base to its head.
- **Unavailable:** nothing under the scan folders has a remote for the PR's repo, or the fetch failed. It's listed at the bottom of the dashboard, linking to the PR on GitHub.

Git never prompts for a password (`GIT_TERMINAL_PROMPT=0`, ssh `BatchMode=yes`), so a fetch that needs one fails instead of hanging the server.

Listing everything, including the GitHub query, takes about 4 seconds for 69 folders and 24 PRs.

## 4. Where the diff comes from

Both sources sit behind one interface: list the changed files with their +/− counts, and load both versions of one file.

- **Local git** handles local deltas, and PR-only deltas whose repo is cloned under `scanRoots`. For a PR-only delta it first runs `git fetch origin pull/<n>/head`.
  - Changed files: `git diff --numstat -M <base>` and `git diff --name-status -M <base>`.
  - New files git doesn't track yet: `git ls-files --others --exclude-standard`, because `git diff` leaves them out.
  - Uncommitted files: anything not in `git diff --name-only <base> HEAD`.
  - Markdown word counts: one `git diff --word-diff=porcelain --word-diff-regex=[^[:space:]]+` per checkout, limited to `*.md` and `*.mdx`, instead of reading both versions of every markdown file.
  - Contents: `git show <base>:<old path>` for the old version; the file on disk (local) or `git show <head>:<path>` (PR) for the new one.
- **GitHub API** for PRs with no local clone isn't built yet; those PRs are unavailable. It would use `gh api repos/<o>/<r>/pulls/<n>/files` for the file list, and the contents endpoint with the raw media type for the contents.

## 5. Dormouse surfaces (not built yet)

pridm runs inside Dormouse. `dor list --json --all` lists every surface in the window, each with `id`, `kind`, `title`, `command`, `cwd`, `url`, `activity`, `ringing`, `todo`, and `workspace_id`.

- Terminals and tools match a delta when their `cwd` is its `local.path` or a folder inside it. The longest matching path wins, so worktrees inside the main clone get their own surfaces.
- Browsers will match when their `url` starts with the PR's URL.
- `needsAttention` is `ringing || todo`. The dashboard puts deltas where an agent is waiting on you at the top.

pridm itself runs as a Dormouse surface: `dor ensure -- bun run dev`, then `dor agent-browser open surface:N`.
