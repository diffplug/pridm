# priδm

One change goes in, separate bands come out.

priδm is a review dashboard for people with many changes in progress across many projects. It splits each change into categories so you can read the parts you care about first. The defaults are:

- **spec**: design docs, RFCs, markdown
- **prod**: production code
- **test**: tests
- **other**: everything else

You can define your own categories per repo. `other` is the only built-in one.

Every category is shown as an inline diff. Markdown is **rendered**, with insertions and deletions marked inside the rendered text, so spec changes read like a marked-up document instead of a raw patch.

priδm runs inside Dormouse and shows which Dormouse panes (agents, dev servers, browsers) are working on each change.

## Docs

- [**Implementation plan**](docs/plan.md): phases, time boxes, and what to cut if we run late
- **Architecture**
  - [Data model](docs/architecture/model.md): `BulkDelta`, ids, local vs. PR
  - [Categories](docs/architecture/categories.md): glob rules keyed by origin
  - [Discovery](docs/architecture/discovery.md): finding worktrees, PRs, and Dormouse surfaces
  - [Diffs](docs/architecture/diffs.md): Monaco for code, a merged document in MDXEditor for markdown
- **UI**
  - [Viewing a delta](docs/ui/viewing.md): collapsed categories and what loads when
  - [Design](docs/ui/design.md): Primer and the category colors
  - [Storybook](docs/ui/storybook.md): every component in every state
- [Stack](docs/stack.md): libraries, project layout, pitfalls

The types everything is built on are in [`src/types.ts`](src/types.ts).
