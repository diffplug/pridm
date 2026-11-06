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

## Specs

- [**Implementation plan**](specs/plan.md): phases, time boxes, and what to cut if we run late
- **Architecture**
  - [Data model](specs/architecture/model.md): `BulkDelta`, ids, local vs. PR
  - [Categories](specs/architecture/categories.md): glob rules keyed by origin
  - [Discovery](specs/architecture/discovery.md): finding worktrees, PRs, and Dormouse surfaces
  - [Diffs](specs/architecture/diffs.md): Monaco for code, a merged document in MDXEditor for markdown
- **UI**
  - [Viewing a delta](specs/ui/viewing.md): collapsed categories and what loads when
  - [Design](specs/ui/design.md): Primer, and one set of diff colors for code and markdown
  - [Storybook](specs/ui/storybook.md): every component in every state
- [Stack](specs/stack.md): libraries, project layout, pitfalls

The types everything is built on are in [`src/types.ts`](src/types.ts).

## Credits

Thanks to [imbue](https://imbue.com/) for hosting the [Punk Software Hack Night](https://luma.com/Punk1 "Punk Software Hack Night")!

This was built by [nedshed.dev](https://nedshed.dev/) using [dormouse.sh](https://dormouse.sh/ "Dormouse.sh") as the terminal / agent manager and [selfie.dev](https://selfie.dev/) for snapshot diffing / feedback.
