# Diffs

For every file, the server sends both full versions: `original` and `modified`. Code goes to Monaco, and markdown goes to MDXEditor as one merged document.

## Code: Monaco `DiffEditor`

- Inline view: `renderSideBySide: false`.
- Unchanged regions folded: `hideUnchangedRegions: { enabled: true }`.
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
5. A block that changed is diffed word by word (jsdiff `diffWords`), and only the changed words are marked.
6. A code block or table can't hold inline marks, so when one changes it appears twice, old then new.

Marking blocks one at a time keeps the marks from breaking markdown syntax, e.g. by ending up in the middle of a table row or across a `**bold**` span.

This lives in `src/shared/mdmerge.ts`. It's a pure function, so it has unit tests, and Storybook can call it on fixtures directly.

### Risks

- A document that already uses `~~` or `==` will look like it has changes. That's rare enough to accept.
- MDXEditor fails on markdown it can't parse, such as raw HTML. In that case, fall back to showing the source with Monaco.
- If the marks look bad once rendered, the fallback is to render the merged document as HTML ourselves, with real `<ins>`/`<del>` tags.
