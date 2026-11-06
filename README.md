# Prism

One change goes in, separate bands come out.

Prism is a review dashboard for people with many changes in progress across many projects. It splits each change into four categories so you can read the parts you care about first:

- **spec**: design docs, RFCs, markdown
- **prod**: production code
- **test**: tests
- **other**: config, CI, lockfiles, everything else

Every category is shown as an inline diff. Markdown is **rendered**, with insertions and deletions marked inside the rendered text, so spec changes read like a marked-up document instead of a raw patch.

## Core idea: `BulkDelta`

The root type is a `BulkDelta`: a set of changes on a branch compared with its base. A change doesn't have to be a PR yet:

| Has a local checkout | Has a PR | Example |
| --- | --- | --- |
| yes | no | a worktree you're hacking in, or one an agent is working in |
| no | yes | a PR you opened from another machine, not checked out here |
| yes | yes | the usual case |

```ts
interface BulkDelta {
  id: DeltaId;               // "owner/repo:branch"
  repo: RepoKey;
  branch: string | null;     // null = detached HEAD
  base: { ref: string; sha: string };
  title: string;             // PR title, else the last commit subject, else the branch name

  local: LocalCheckout | null;   // path, head commit, uncommitted counts, commits not yet pushed
  pr: PullRequest | null;        // number, url, state, headSha
  surfaces: SurfaceRef[];        // Dormouse panes working on it (live, never saved)

  source: 'local' | 'pr';    // where the diff comes from
}
```

The full model is in [`src/types.ts`](src/types.ts).

### Decisions

- **The id stays the same when a PR is opened.** It's `owner/repo:branch`, so a local-only delta and its later PR are the same entry, and focus settings (pinned or muted) carry over. Repos with no GitHub remote use the clone's path instead of `owner/repo`.
- **The local checkout wins when both exist.** The diff comes from the working tree, so it includes uncommitted edits and commits you haven't pushed. `FileChange.committed` marks changes that exist only on disk.
- **Choosing the base:** if there's a PR, use its base branch. Otherwise use the merge-base with `origin/<default branch>`.
- **Summary and detail are separate.** `DeltaSummary` has only per-category counts, so the dashboard loads quickly. `DeltaDetail` has the hunks and markdown contents, and is fetched when you open a delta.
- **Markdown is diffed block by block.** Each paragraph, heading, list item, code fence, or table is a block. Blocks that changed are then diffed word by word. Because each block is rendered as its own unit, `<ins>`/`<del>` tags can't break markdown syntax. Rendering needs both full versions of the file, not just the patch.
- **Categories come from glob rules.** Rules are checked in order and the first match wins: `foo.spec.ts` is a test, while `specs/foo.md` is a spec. Rules can be overridden per repo in `PrismState.rulesByRepo`.

## Discovery

Prism builds its list of deltas from two sources and joins them on `id`:

1. **Local:** for each clone under `scanRoots` (e.g. `~/projects`), `git remote get-url origin` gives the `owner/repo` and `git worktree list --porcelain` gives each worktree's branch. Worktrees that have changes compared with their base become deltas. Clean checkouts are skipped.
2. **GitHub:** `gh search prs --author=@me --state=open`.

### Dormouse integration

Prism runs inside Dormouse, and each delta shows which Dormouse surfaces are working on it, taken from `dor list --json --all`:

- Terminals and tools match when their `cwd` is the delta's `local.path` or a folder inside it. The longest matching path wins, so worktrees inside the main clone get their own surfaces.
- Browsers match when their `url` starts with the PR's URL.
- `needsAttention` (the surface is ringing or marked todo) lets the dashboard put deltas where an agent is waiting on you at the top.

Prism itself should run as a Dormouse surface: `dor ensure -- bun run dev`, then `dor agent-browser open surface:N`.

## Saved state

`~/.prism/state.json` (`PrismState`) holds focus per delta, per-repo category rules, category order, which categories start collapsed, and `scanRoots`. Surfaces and GitHub data are never saved; they're rebuilt on every refresh.

## Known gaps

- PRs from two forks with the same branch name (e.g. `patch-1`) get the same id. That's fine while we only show your own PRs.
- `git diff <base>` leaves out files git doesn't track yet. They have to be found separately with `git ls-files --others --exclude-standard`.
- The default rules treat every `.md` file as a spec, including README and CHANGELOG.

## Stack (planned)

TypeScript on Bun, served as a local web page.

- `picomatch` for globs
- `diff` (jsdiff) for line and word diffs
- `marked` or `remark` to split and render markdown blocks
- `parse-diff` for unified patches

## Next steps

1. `discover.ts`: find local worktrees and PRs, join them into `BulkDelta[]`, and attach surfaces.
2. `classify.ts`: apply the category rules to each `FileChange`.
3. `diff.ts`: code hunks and block-by-block markdown diffs.
4. A dashboard page listing deltas, and a detail page per delta with collapsible category sections.
