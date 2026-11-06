# Categories

Every changed file is in exactly one category. Categories are just names you define. The only built-in one is `other`, for files that match nothing. The default rules define `spec`, `prod`, and `test`, but they're ordinary categories you can rename, remove, or add to.

Which category a file belongs to depends only on its path: the new path, or the old path for a deleted file. So it doesn't matter which two commits are being compared.

## Rules, keyed by origin

Each origin has its own globs in `~/.pridm/categories.json`, which you edit by hand:

```json
{
  "*": {
    "spec": ["**/spec/**", "**/specs/**", "**/*.md"],
    "test": ["**/test/**", "**/tests/**", "**/*.test.*"],
    "prod": ["**/*.{ts,js,go,py,java,kt}"]
  },
  "github.com/diffplug/spotless": {
    "spec": ["**/spec/**"],
    "test": ["**/test/**"],
    "migrations": ["**/db/migrations/**"],
    "prod": ["**/src/main/**"]
  }
}
```

- Categories are checked in the order they're written, and the first one with a matching glob wins. In the `*` entry, `test/README.md` is a spec, because `spec` comes first. Put `test` first if you'd rather it were a test, but then tests are also the first section.
- A file that matches nothing is `other`. You can also list `other` yourself, to claim files before a later, broader category does (e.g. `"other": ["**/generated/**"]` before `"prod": ["**"]`).
- The sections of a delta appear in the same order as its origin's categories, with `other` last. Categories with no changed files are left out.
- `*` applies to every origin without its own entry. An origin's entry replaces `*` completely; the two aren't merged, so you can read an origin's rules in one place.
- Keying by origin matters because conventions differ: in a Ruby repo, `spec/` holds RSpec tests, not design docs.

The defaults are `DEFAULT_CATEGORIES` in [`src/types.ts`](../../src/types.ts). Origins are normalized as described in the [data model](model.md#decisions).

## Known gaps

- The default rules treat every `.md` file as a spec, including README and CHANGELOG.
