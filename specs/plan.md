# Implementation plan

Written 2026-11-05, for a 2-hour hackathon.

## The demo

One real worktree opens in pridm. Its changes are split into collapsed categories, each with +/− counts. Expanding **spec** shows a rendered markdown diff with changes marked inline. Expanding **prod** shows an inline Monaco diff. The dashboard shows the Claude session working in that worktree.

Everything below serves that demo. The order puts the riskiest part (markdown diff rendering) first, and keeps a working demo possible at the end of each phase.

## Status

| Phase | Status |
| --- | --- |
| 0. Set up the project | done |
| 1. Diff viewers | done |
| 2. Delta view | done |
| 3. Server | local checkouts done; PRs and Dormouse surfaces not yet |
| 4. Wire it up | done for local checkouts |
| 5. Polish | not started |

## Phases

| # | Phase | Time | Ends with |
| --- | --- | --- | --- |
| 0 | Set up the project | 10 min | Vite app and Storybook both running in Dormouse panes |
| 1 | Diff viewers | 30 min | Markdown and code diff stories that look right in light and dark |
| 2 | Delta view | 15 min | A delta with collapsed categories, in Storybook |
| 3 | Server | 30 min | `/api` returns real deltas from `~/projects` |
| 4 | Wire it up | 15 min | The demo works end to end |
| 5 | Polish | 10 min | Dashboard sorting, Dormouse surfaces, screenshots |

Phases 1–2 (UI, on fixtures) and phase 3 (server) only share `src/types.ts`, so they can be built at the same time, e.g. by a second agent in its own git worktree.

### 0. Set up the project (10 min)

- Vite + React + TypeScript, with Bun as the package manager.
- Install Monaco, MDXEditor, Primer, `picomatch`, `diff`, `mdast-util-from-markdown`.
- Set up Storybook for React + Vite, with a light/dark toggle in the toolbar.
- Move `src/types.ts` into the layout from [Stack](stack.md#project-layout).
- Start both in their own Dormouse panes with `dor ensure -- bun run dev` and `dor ensure -- bun run storybook`.

### 1. Diff viewers (30 min)

The riskiest part goes first. See [Diffs](architecture/diffs.md).

1. `src/shared/mdmerge.ts` with unit tests: block diff, then word diff, then `~~`/`==` marks. Test cases: a word changed, a heading renamed, a list item added, a block deleted, a code block changed, a table changed.
2. `MarkdownDiffView`: read-only MDXEditor plus CSS for the marks. Stories for every test case above.
3. `CodeDiffView`: Monaco `DiffEditor` inline, unchanged regions folded, sized to its content, mounted when it scrolls into view. Stories: added, deleted, modified, renamed, binary, a large file.
4. `theme.ts`: Primer variables, a Monaco theme from Primer's diff colors, light and dark.

**Check:** open the markdown stories with `dor agent-browser` and take screenshots in light and dark. If the marks look bad, switch to the fallback in [Diffs](architecture/diffs.md#risks) now, not later.

### 2. Delta view (15 min)

- `CategoryCounts`: each category's +/− as one line of text, for the dashboard.
- `CategorySection`: `<details>` with the category name, file count, and +/−. When expanded, it shows a list of `CodeDiffView`/`MarkdownDiffView`.
- `DeltaView`: a header (title, branch, PR, uncommitted and unpushed counts) and one section per category.
- Fixtures and stories for each state in [Storybook](ui/storybook.md).

### 3. Server (30 min)

See [Discovery](architecture/discovery.md).

1. `exec.ts`, `origin.ts`, `categories.ts`, `state.ts`. Unit tests for origin normalization and classification.
2. `sources/git.ts`: file list and contents for a local worktree, including uncommitted and untracked files.
3. `discover.ts`: worktrees under `scanRoots`, PRs from one GraphQL query, joined on id.
4. `surfaces.ts`: `dor list --json --all` matched to deltas.
5. `api.ts`: the four routes from [Stack](stack.md#api).

**Check:** `curl` each route against your real `~/projects`.

### 4. Wire it up (15 min)

- `hooks.ts`: fetch summaries, an overview, and a category's diffs when it's expanded.
- `App.tsx`: hash routing between the dashboard and a delta, with expanded categories in the URL.
- `DeltaRow` and the dashboard list.
- Open it with `dor agent-browser` and go through the demo.

### 5. Polish (10 min)

- Dashboard sorting: pinned, needs attention, most recent; muted at the bottom.
- `SurfaceChips` on each row.
- Pin and mute buttons.
- Screenshots for the presentation.

## If we run late, cut in this order

1. `sources/github.ts` (PRs with no local clone): show them in the dashboard, but don't allow opening them.
2. Pin and mute, and `state.json`.
3. Dark mode.
4. Dormouse surfaces on the dashboard. This one's a shame to lose, because it's what makes pridm specific to Dormouse.
5. The dashboard itself: open a single delta from a hard-coded path.

The demo only needs phases 0–2, plus local git in phase 3, plus phase 4.
