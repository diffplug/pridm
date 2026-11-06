# Design

GitHub's Primer design system, because your eyes are already trained on GitHub's diffs.

- **`@primer/primitives`** for colors, spacing, and type as CSS variables, including GitHub's diff colors. Light and dark follow the system setting.
- **`@primer/octicons-react`** for icons: file, git-branch, PR, terminal.
- **`@primer/react`** only for a few pieces (`Label`, `CounterLabel`, `Button`, `PageLayout`). Most of the UI is `<details>` sections and editors.

## One set of diff colors

By default Monaco and MDXEditor each have their own idea of what "added" and "removed" look like. Instead:

- Monaco gets a custom theme built from Primer's diff colors (`diffEditor.insertedTextBackground` and so on).
- The CSS for MDXEditor's `==insert==` and `~~delete~~` marks reads the same Primer variables.

So a deletion looks the same in code and in a spec. Monaco (`vs`/`vs-dark`) and MDXEditor (its `dark-theme` class) switch to dark together with Primer.

## Categories

Categories have no colors. Red and green are kept for removed and added, and categories are told apart by their names.

- A category section's header is its name, file count, and +/−.
- A dashboard row lists each category's +/− as text: `spec +120 −14 · prod +88 −31 · test +40 −2`.
