# Storybook

Every component is shown in Storybook (`@storybook/react-vite`) in all of its relevant states.

This works because components only take data as props, and fetching happens in a thin layer of hooks above them. Stories are fed fixtures typed with [`src/types.ts`](../../src/types.ts), so they never need a server, git, or `gh`.

## States to cover

- **Dashboard row:** local only, PR only, draft PR, PR not cloned, both; uncommitted changes; local commits not pushed; pinned and muted; one category empty.
- **Pin and mute buttons:** normal, pinned, muted; also in the delta header.
- **Category counts:** the default categories, a single category, a custom category, many categories, an empty delta.
- **Category section:** collapsed (totals only), expanded with every file collapsed, loading, a custom category.
- **File diff:** collapsed, expanded, loading.
- **Code diff:** added, deleted, modified, renamed, binary, a large file.
- **Markdown diff:** a word changed in a paragraph, a heading renamed, a list item added, a block deleted, a code block changed, a table changed.
- **All of the above in light and dark.** The toolbar switches them by hand, and every story also has a `…Dark` twin, made with `dark()` from `src/ui/stories.ts`, since a screenshot only renders a story's own globals.

The markdown diff stories are also how we check early that the `~~`/`==` approach renders well. They're the first stories to write.

## Running it

Storybook runs as its own Dormouse surface: `dor ensure -- bun run storybook`.

## Selfie

[Selfie](https://github.com/diffplug/selfie-hackathon) screenshots every story in a pinned browser in Docker, with no network, and says what changed since what was approved. It runs from a checkout beside this one, at `../selfie-hackathon`, as `bun run selfie <command>`. `selfie.config.json` says how to build the Storybook.

An agent's loop, after changing a component:

1. `bun run selfie review --build`. It builds, renders, and prints one JSON document, naming a diff image for each story that changed. Its exit code says whether anything blocks.
2. Look at the diff images. A change nobody asked for is a bug to fix, not to approve.
3. Leave approving to a person, in `bun run selfie ui`, unless they've said to approve.

In CI, `.github/workflows/selfie.yml` renders every pushed commit and uploads its batch to [hackathon.selfie.dev](https://hackathon.selfie.dev/diffplug/pridm), which gives the commit a `selfie` status: green if every story matches what's approved, yellow if a change is waiting for approval, and red if a story failed or a change was rejected. Approve there, then `SELFIE_REMOTE=https://hackathon.selfie.dev bun run selfie pull` to bring the approvals here.

A person's loop is the same in `bun run selfie ui`, which renders when asked. Notes written there on an image reach an agent through `bun run selfie agent-await-feedback`.

Every story must render the same image every time. If a review shows a change with no change to the code, or `bun run selfie flakes --build --times 5` lists anything, follow `bun run selfie skill fix-flakes`. Anything Monaco draws is marked `data-diff-pending` until it's done, and each story file's `play: waitForDiffs` waits for that, since Selfie screenshots once a story's play function finishes.
