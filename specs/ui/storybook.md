# Storybook

Every component is shown in Storybook (`@storybook/react-vite`) in all of its relevant states.

This works because components only take data as props, and fetching happens in a thin layer of hooks above them. Stories are fed fixtures typed with [`src/types.ts`](../../src/types.ts), so they never need a server, git, or `gh`.

## States to cover

- **Dashboard row:** local only, PR only, both; uncommitted changes; local commits not pushed; pinned and muted; a surface that needs attention; one category empty.
- **Category counts:** the default categories, a single category, a custom category, many categories, an empty delta.
- **Category section:** collapsed (totals only), expanded with every file collapsed, loading, a custom category.
- **File diff:** collapsed, expanded, loading.
- **Code diff:** added, deleted, modified, renamed, binary, a large file.
- **Markdown diff:** a word changed in a paragraph, a heading renamed, a list item added, a block deleted, a code block changed, a table changed.
- **All of the above in light and dark,** switched from the Storybook toolbar.

The markdown diff stories are also how we check early that the `~~`/`==` approach renders well. They're the first stories to write.

## Running it

Storybook runs as its own Dormouse surface: `dor ensure -- bun run storybook`. Stories can be opened with `dor agent-browser` and screenshotted to check each state.
