# Stack

React + TypeScript, built with Vite and run with Bun. React is required because MDXEditor is a React component.

## Libraries

- **Vite** serves the frontend and the `/api` routes, through a small plugin in the dev server. That's one process on one port, so one `dor ensure -- bun run dev`.
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
dormouse.yml               Dormouse Tools: the app and Storybook
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
    components/            CategoryBar, CategorySection, CodeDiffView,
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
- MDXEditor needs its stylesheet imported (`@mdxeditor/editor/style.css`) and a plugin for every kind of block it should render: headings, lists, quotes, tables, code blocks, links, thematic breaks, frontmatter.
