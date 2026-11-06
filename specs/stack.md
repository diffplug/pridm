# Stack

React + TypeScript, built with Vite and run with Bun. React is required because MDXEditor is a React component.

## Libraries

- **Vite** serves the frontend and the `/api` routes, through a small plugin in the dev server. That's one process on one port, so one `dor ensure -- bun run dev`.
- **The server is long-lived.** One instance serves every project and stays running in its own Dormouse pane. `dor ensure` reuses it instead of starting a second one. We don't declare it as a Dor Tool.
- **`@monaco-editor/react`** for `DiffEditor`, with Monaco bundled from `monaco-editor` rather than the CDN it loads by default, so it works offline and in [Selfie](ui/storybook.md#selfie)'s renderer, which has no network. `src/ui/monaco.ts` sets it up: the core editor, every language's syntax colors, JSON's language service, and their workers.
- **`@mdxeditor/editor`** in read-only rich-text mode for markdown.
- **`picomatch`** for category globs.
- **`diff`** (jsdiff) for the markdown merge.
- **`mdast-util-from-markdown`** to split markdown into blocks. MDXEditor already depends on it.
- **Storybook** (`@storybook/react-vite`), with **Selfie** for screenshot review. See [Storybook](ui/storybook.md).
- **Primer** (`@primer/primitives`, `@primer/octicons-react`, `@primer/react`). See [Design](ui/design.md).
- **`bun test`** for unit tests.

## Project layout

```
vite.config.ts             includes the /api plugin
.storybook/
src/
  types.ts                 the data model, shared by server and UI
  shared/
    mdmerge.ts             builds the merged markdown (pure, tested)
  server/
    api.ts                 Vite plugin with the /api routes
    exec.ts                run git / gh / dor and parse output
    origin.ts              normalize remote URLs into RepoKeys
    categories.ts          load categories.json, classify paths
    state.ts               read and write ~/.pridm/state.json
    discover.ts            worktrees + PRs → BulkDelta[]
    surfaces.ts            dor list → SurfaceRef[] per delta
    sources/
      git.ts               file list and contents from a local clone
      github.ts            file list and contents from the GitHub API
  ui/
    App.tsx                hash routing: dashboard, delta
    hooks.ts               fetch from /api
    theme.ts               Primer setup, Monaco theme, light/dark
    monaco.ts              Monaco from the bundle, not a CDN
    stories.ts             dark twins, and waiting for diffs to draw
    components/            CategoryCounts, CategorySection, CodeDiffView,
                           MarkdownDiffView, DeltaRow, DeltaView, SurfaceChips
    fixtures/              typed example data for stories
test/
```

## API

| Route | Returns |
| --- | --- |
| `GET /api/deltas` | `DeltaSummary[]` |
| `GET /api/deltas/:id` | `DeltaOverview` |
| `GET /api/deltas/:id/:category` | `CategoryDiff` |
| `PUT /api/focus/:id` | sets `pinned`, `normal`, or `muted` |

Ids contain `/` and `:`, so they're URL-encoded.

## Pitfalls

- Each Monaco `DiffEditor` is two editors, so an expanded category with many files gets heavy. Mount each one only when it scrolls into view.
- Monaco needs an explicit height. Size each editor to its content.
- Monaco only takes `#rrggbb` colors, and a production build minifies Primer's `#ffffff` to `#fff`. `theme.ts` expands them, or Monaco throws.
- Monaco colors lines lazily, so a diff can paint before its colors. `CodeDiffView` waits for the language's colors before mounting, colors every line at once, and is marked `data-diff-pending` until the diff is drawn.
- MDXEditor needs its stylesheet imported (`@mdxeditor/editor/style.css`) and a plugin for every kind of block it should render: headings, lists, quotes, tables, code blocks, links, thematic breaks, frontmatter.
