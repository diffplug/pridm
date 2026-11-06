# Viewing a delta

A delta opens with every category collapsed. A collapsed category shows only its name, file count, and +/−. You can expand any number of categories at once.

```
feat/inline-md-diffs  ·  github.com/diffplug/pridm#42  ·  2 uncommitted
▸ spec    3 files   +120  −14
▸ prod    5 files    +88  −31
▸ test    2 files    +40   −2
▸ other   1 file      +1   −1
```

Expanding a category lists every one of its files, each collapsed to a single row with its path and +/−. Expanding a file shows its diff, and any number of files can be open at once. See [Diffs](../architecture/diffs.md) for how each kind of file is shown.

## What loads when

The UI loads data in three levels, each only when needed:

1. **`DeltaSummary[]`, for the dashboard:** per-category counts for every delta.
2. **`DeltaOverview`, when you open a delta:** the per-category counts, and each category's file list. Both come from `git diff --numstat`, so this is cheap.
3. **`CategoryDiff`, when you expand a category:** both full versions of every file, plus the merged markdown for markdown files. This is the expensive part, and nobody pays for it in categories that stay collapsed.

Markdown files are counted in **words**, shown as `+105w −686w`, because they're read as rendered text, not lines. Hovering shows the line counts. A category shows words only when every file in it is markdown, so a total never mixes units. The delta's overall total in its header is in lines. Words are whitespace-separated, the same chunks the merged markdown marks; markdown syntax on its own (`##`, `-`, `|`) doesn't count.

## Implementation

- Headers are sticky: while you scroll, the current category's header stays at the top, with the open file's header just under it.
- The sections are plain `<details>`/`<summary>` elements. That gives collapsed by default and expand-several-at-once with no extra code.
- The URL is `#/delta/<id>?open=spec,test`, so a reload or a shared link keeps the same categories open.
- The sections are in the order the origin's categories are written in `categories.json`, with `other` last. Categories with no changed files are left out.

## Dashboard

One row per delta, sorted by: pinned first, then most recently updated, then PRs that can't be opened. Muted deltas go to the bottom, dimmed. (Deltas with a surface that needs attention will come right after pinned ones, once surfaces are built.) Each row shows:

- the title, branch, and PR number if there is one
- each category's +/−, e.g. `spec +120 −14 · prod +88 −31`
- uncommitted and unpushed counts
- the Dormouse surfaces working on it, e.g. "claude (waiting on you) · npm run dev · browser"
- buttons to pin or mute, which show on hover, or always when they're on. The delta's header has the same buttons.

Pin and mute take effect at once and are saved in the background to `~/.pridm/state.json`. If saving fails, the change is undone and a warning says why.
