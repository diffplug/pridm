# Stack

React + TypeScript, built with Vite and run with Bun. React is required because MDXEditor is a React component.

## Libraries

- **Vite** serves the frontend and the `/api` routes, through a small plugin in the dev server. That's one process on one port, so one `dor ensure -- bun run dev`.
- **The server is long-lived.** One instance serves every project and stays running in its own Dormouse pane. `dor ensure` reuses it instead of starting a second one. We don't declare it as a Dor Tool.
- **`@monaco-editor/react`** for `DiffEditor`. It loads Monaco from a CDN by default, so there's no worker setup.
- **`@mdxeditor/editor`** in read-only rich-text mode for markdown.
- **`picomatch`** for category globs.
- **`diff`** (jsdiff) for the markdown merge.
- **`mdast-util-from-markdown`** to split markdown into blocks. MDXEditor already depends on it.
- **Storybook** (`@storybook/react-vite`). See [Storybook](ui/storybook.md).
- **Primer** (`@primer/primitives`, `@primer/octicons-react`, `@primer/react`). See [Design](ui/design.md).
- **`bun test`** for unit tests.

## Project layout

```
vite.config.ts             includes the /api plugin
.storybook/
src/
  types.ts                 the data model, shared by server and UI
  shared/                  pure code, used by both the server and the UI
    mdmerge.ts             builds the merged markdown (tested)
    classify.ts            puts paths into categories (tested)
    overview.ts            groups files into DeltaOverview / CategoryDiff (tested)
    language.ts            Monaco language ids by file extension
  server/
    api.ts                 Vite plugin with the /api routes
    exec.ts                run git / gh / dor, in parallel with a limit
    origin.ts              normalize remote URLs into RepoKeys (tested)
    config.ts              read ~/.pridm/categories.json and state.json
    prs.ts                 your open PRs, from one GitHub GraphQL query
    discover.ts            checkouts + PRs → BulkDelta[], and the join (tested)
    surfaces.ts            dor list → SurfaceRef[] per delta (not yet)
    sources/
      git.ts               file list and contents from a local clone
      github.ts            file list and contents from the GitHub API
  ui/
    App.tsx                the dashboard and delta pages
    route.ts               hash routing, with open categories in the URL (tested)
    api.ts                 fetch from /api
    theme.ts               Primer setup, Monaco theme, light/dark
    monaco.ts              bundles the local monaco-editor and its workers
    components/            CategoryCounts, CategorySection, CodeDiffView, Dashboard,
                           DeltaRow, DeltaView, FileDiffView, MarkdownDiffView, PlusMinus
    fixtures/              typed example data for stories
      real/self.json       pridm's own history as a delta; `bun run fixture:self`
scripts/
  fixture-self.ts          builds real/self.json with the server's git code
test/
```

## API

| Route | Returns |
| --- | --- |
| `GET /api/deltas` | `DeltaList`: `DeltaSummary[]` plus warnings |
| `GET /api/deltas/:id` | `DeltaOverview` |
| `GET /api/deltas/:id/:category` | `CategoryDiff` |
| `PUT /api/focus/:id` | sets `pinned`, `normal`, or `muted` (not built yet) |

Ids contain `/` and `:`, so they're URL-encoded.

## Pitfalls

- Each Monaco `DiffEditor` is two editors, so an expanded category with many files gets heavy. Mount each one only when it scrolls into view.
- Monaco needs an explicit height. Size each editor to its content.
- MDXEditor needs its stylesheet imported (`@mdxeditor/editor/style.css`) and a plugin for every kind of block it should render: headings, lists, quotes, tables, code blocks, links, thematic breaks, frontmatter.
