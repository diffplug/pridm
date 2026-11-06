# Viewing a delta

A delta opens with every category collapsed. Each header shows its file count and lines added and removed. You can expand any number of categories at once.

```
feat/inline-md-diffs  ·  github.com/diffplug/pridm#42  ·  2 uncommitted
▸ spec    3 files   +120  −14
▸ prod    5 files    +88  −31
▸ test    2 files    +40   −2
▸ other   1 file      +1   −1
```

Expanding a category lists its files and their diffs. See [Diffs](../architecture/diffs.md) for how each kind of file is shown.

## What loads when

The UI loads data in three levels, each only when needed:

1. **`DeltaSummary[]`, for the dashboard:** per-category counts for every delta.
2. **`DeltaOverview`, when you open a delta:** the per-category counts and the file list for each collapsed header. Both come from `git diff --numstat`, so this is cheap.
3. **`CategoryDiff`, when you expand a category:** both full versions of every file, plus the merged markdown for markdown files. This is the expensive part, and nobody pays for it in categories that stay collapsed.

Markdown line counts are source lines, even though the diff is displayed rendered.

## Implementation

- The sections are plain `<details>`/`<summary>` elements. That gives collapsed by default and expand-several-at-once with no extra code.
- The URL is `#/delta/<id>?open=spec,test`, so a reload or a shared link keeps the same categories open.
- The sections are in the order the origin's categories are written in `categories.json`, with `other` last. Categories with no changed files are left out.

## Dashboard

One row per delta, sorted by: pinned first, then deltas with a surface that needs attention, then most recently updated. Muted deltas go to the bottom. Each row shows:

- the title, branch, and PR number if there is one
- a bar split by category (see [Design](design.md))
- uncommitted and unpushed counts
- the Dormouse surfaces working on it, e.g. "claude (waiting on you) · npm run dev · browser"
- buttons to pin or mute
