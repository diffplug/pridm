# Implementation plan

Started 2026-11-05 as a 2-hour hackathon. Updated 2026-11-05 after phase 4.

## The demo

pridm's dashboard lists every change in progress across `~/projects`. One opens, split into collapsed categories, each with +/− counts. Expanding **spec** shows a rendered markdown diff with changes marked inline. Expanding **prod** shows an inline Monaco diff. The dashboard shows the Claude session working in that worktree, and puts it at the top when it's waiting on you.

Everything up to the Claude session works today. The Dormouse surfaces are the last branch below.

## How we work

- **One branch and one PR per item below.** Never push to `main`.
- **Every new component state gets a Storybook story**, fed by typed fixtures. See [Storybook](ui/storybook.md).
- **Check in the real app:** screenshot it through `dor agent-browser` before opening the PR.
- **Before every PR:** `bun test` and `tsc --noEmit` pass, and the specs are updated to match.

## Done

| Phase | What it delivered | Where |
| --- | --- | --- |
| 0. Set up | Vite + React + TypeScript on Bun, Storybook 10, Primer, Monaco and MDXEditor | `main` |
| 1. Diff viewers | Merged markdown with `~~`/`==` marks (`mdmerge.ts`); Monaco inline diffs, one-line changes on one line; Primer colors in light and dark | `main` |
| 2. Delta view | Collapsed categories with totals; each file expands on its own; heading-with-rule headers; sticky headers; markdown counted in words (`+105w −686w`) | `main` |
| 3–4. Live local deltas | Discovery of every checkout under `~/projects` (20 deltas from 69 folders in ~2 s); the `/api` routes; the dashboard; open categories in the URL | `main`, [PR #1](https://github.com/diffplug/pridm/pull/1) |
| Next 1. Your open PRs | One GraphQL query; PRs joined to checkouts (forks too), compared with their real base (stacked PRs too); PR-only deltas fetched into a clone; unavailable PRs link to GitHub | `feat/open-prs` |

## Next

In order. Each is one branch and one PR, and leaves the app working.

### 1. Your open PRs (`feat/open-prs`, ~30 min)

See [Discovery](architecture/discovery.md#2-your-open-prs-not-built-yet).

- One `gh api graphql` query for `is:pr is:open author:@me`, returning number, title, url, author, draft, `updatedAt`, head and base refs and SHAs, and the repository.
- Join PRs to local deltas on id (`<origin>:<branch>`). A PR's base wins over the merge-base.
- A PR with no local checkout, whose repo is cloned under `~/projects`, becomes a PR-only delta. Its diff comes from `git fetch origin pull/<n>/head`, then the same git code as local deltas.
- A PR whose repo isn't cloned anywhere shows on the dashboard but can't be opened yet. See [Later](#later).
- The PR number and state show on rows and in the delta header.
- Tests: the join, PR-only ranges. Stories: the PR states (open, draft, merged).

### 2. Pin and mute (`feat/focus`, ~15 min)

- `PUT /api/focus/:id` writes `~/.pridm/state.json`.
- Pin and mute buttons on each dashboard row and in the delta header.
- Dashboard order: pinned, then most recent. Muted rows at the bottom, dimmed. (Surfaces that need attention slot in after pinned, in item 4.)

### 3. Polish (`fix/polish`, ~15 min)

- **Added files:** Monaco marks the empty original's line "1" in red. Show an added file as just its new contents, all green.
- **The delta header's total** mixes markdown and code, so it's in lines while the spec section is in words. Label it "lines", or drop it.
- **Refresh button** on the dashboard, next to the auto-refresh when the tab gets focus.
- Screenshots for the presentation.

### 4. Dormouse surfaces (`feat/dormouse-surfaces`, ~20 min)

See [Discovery](architecture/discovery.md#5-dormouse-surfaces-not-built-yet).

- `src/server/surfaces.ts`: run `dor list --json --all`, and match each surface to a delta. Terminals and tools match by `cwd` (longest `local.path` wins), browsers by `url` starting with the PR's URL.
- Fill `BulkDelta.surfaces` in `/api/deltas` and `/api/deltas/:id`.
- `SurfaceChips`: one chip per surface ("claude", "bun run dev", "browser"). A surface that needs attention (ringing or todo) is highlighted: "claude · waiting on you".
- Show the chips on dashboard rows and in the delta header.
- Browsers showing a PR match its delta, using the PR URLs from item 1.
- Dashboard order: pinned, then deltas with a surface that needs attention, then most recent.
- Tests: surface matching (nested worktrees, the longest path wins, browsers by URL). Stories: no surfaces, several, one needing attention.

## Later

Not needed for the demo. Each is its own branch when we get to it.

- **PRs with no local clone:** load files and contents from the GitHub API (`gh api repos/<o>/<r>/pulls/<n>/files`, the contents endpoint with the raw media type).
- **Faster scans:** the server is long-lived, so it can cache each checkout's results until its `HEAD` or working tree changes.
- **Worktrees outside the scan roots:** follow `git worktree list` from each clone.
- **Load one file at a time** instead of a whole category when it's opened.
- **Keep open files in the URL**, like open categories.
- **Sort by last edit,** not last commit, for checkouts whose changes are uncommitted.

## If we run short on time, cut in this order

1. Dormouse surfaces.
2. Polish, apart from the added-file fix.
3. Pin and mute.
4. PR-only deltas: keep the join, so PRs show on local deltas, but skip PRs that aren't checked out.
