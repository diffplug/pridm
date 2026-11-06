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

## Category colors

| Category | Color |
| --- | --- |
| spec | violet |
| prod | blue |
| test | amber |
| other | gray |
| anything else | picked from a palette of teal, pink, orange, indigo, ... by a hash of the name |

None of these are red or green, which mean removed and added. Hashing the name means a category you define has the same color in every repo.

- Each category section has a thin strip of its color on the left.
- Each dashboard row has a bar split by category, like GitHub's language bar on a repo page. You can tell at a glance that one change is mostly spec and another is mostly tests.
