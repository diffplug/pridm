# Diffs

For every file, the server sends both full versions: `original` and `modified`. Code goes to Monaco, and markdown goes to MDXEditor as one merged document.

## Code: Monaco `DiffEditor`

- Inline view: `renderSideBySide: false`.
- Unchanged regions folded: `hideUnchangedRegions` with 3 lines of context. Each fold bar is an expando: its ▼ (at the top, in the line-number gutter) shows 20 more lines below the code above it, its ▲ (at the bottom) 20 more above the code below it, and clicking "N hidden lines" shows them all. Monaco draws these handles invisibly; `theme.css` makes them visible.
- An added or deleted file isn't diffed against an empty file, which would mark the empty side's line 1 as changed. It's shown as the file itself, every line green or red.
- Read-only.
- Monaco computes the diff itself, which is why the server sends full versions, not hunks.
- The language comes from the file extension.

## Markdown: a merged document in MDXEditor

MDXEditor's own diff mode (`diffSourcePlugin`, checked in v4.5.0) is a CodeMirror `MergeView` that shows the markdown **source** side by side. It's neither rendered nor inline, so we don't use it.

What MDXEditor does give us: its core plugin parses and renders `~~strikethrough~~` and `==highlight==`. So the server builds one merged markdown document:

- deleted text becomes `~~deleted~~`
- inserted text becomes `==inserted==`

We show that document in a read-only MDXEditor in rich-text mode, and CSS colors deletions red and insertions green.

### Building the merged document

1. Parse both versions into top-level blocks with `mdast-util-from-markdown`: paragraph, heading, list item, block quote, code block, table, thematic break.
2. Diff the two lists of blocks by their source text (jsdiff `diffArrays`).
3. An unchanged block is copied as is.
4. An inserted or deleted block has its text wrapped in `==…==` or `~~…~~`, keeping its markdown prefix (`## `, `- `, `> `).
5. Within a run of changed blocks, blocks of the same type are lined up in order. A pair whose words mostly match is diffed word by word, and only the changed words are marked.
6. Everything else in the run is shown as all the old blocks, then all the new ones, so a rewritten section reads as "before, after" instead of alternating.
7. A code block, table, HTML block, or frontmatter can't hold inline marks. When one changes it's shown under a label ("Old table", "New table"), old then new. HTML and frontmatter are shown as code, because MDXEditor can't render them.

Marking blocks one at a time keeps the marks from breaking markdown syntax, e.g. by ending up in the middle of a table row.

Within a block, words are whitespace-separated chunks, with runs of `*` as chunks of their own, so every mark starts and ends next to whitespace or a `*` run, which keeps it valid markdown (`~~ word~~` would not be). A word changed inside `**bold text**` is marked inside the bold, not by taking all of it. A changed region grows into its neighbors until it's balanced on both sides, so a mark never holds half of `**bold**`, `` `code` ``, or `[link](url)`: making a word bold marks the whole word, and changing a link's URL marks the whole link. If more than half the words changed, the block is shown as deleted + inserted instead.

This lives in `src/shared/mdmerge.ts`. It's a pure function, so it has unit tests, and Storybook can call it on fixtures directly.

### Folding unchanged blocks

`mergePieces` returns the merged document as a list of blocks, each marked changed or not, and `joinPieces` turns any contiguous run of them back into markdown. `src/shared/fold.ts` decides what shows: changed blocks, plus one unchanged block of context on each side. Each run of unchanged blocks between them is folded, unless it's a single block. Each shown part is its own read-only MDXEditor, and each folded run is an `ExpandBar` that works like Monaco's fold bar: ↓ shows 5 more blocks below the part above, ↑ shows 5 more above the part below, and the middle shows all of them. A folded run's bar names the headings inside it, or else the section it's in, e.g. "14 hidden blocks · Owner-managed capture setup, Migration upgrade history, …".

Every markdown file has a **Rendered / Source** toggle. Source shows the plain markdown diff in Monaco.

### Risks

- A document that already uses `~~` or `==` will look like it has changes. That's rare enough to accept.
- If MDXEditor still fails to parse something, the view falls back to the source diff in Monaco.
- A removed or added table or code block is only marked by its label; the block itself isn't tinted.
- Checked in Storybook: the marks render cleanly, so we don't need the fallback of rendering `<ins>`/`<del>` HTML ourselves.
