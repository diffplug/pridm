// Example FileChanges for stories. The "real" ones are actual diffs from
// pridm's own git history.

import { diffLines } from 'diff';
import type { FileChange, FileStatus } from '../../types.ts';
import { mergeMarkdown } from '../../shared/mdmerge.ts';
import designBefore from './real/design.before.md?raw';
import designAfter from './real/design.after.md?raw';
import typesBefore from './real/types.before.ts.txt?raw';
import typesAfter from './real/types.after.ts.txt?raw';

interface Options {
  status?: FileStatus;
  oldPath?: string;
  committed?: boolean;
  isBinary?: boolean;
}

function counts(original: string, modified: string) {
  let additions = 0;
  let deletions = 0;
  for (const c of diffLines(original, modified)) {
    if (c.added) additions += c.count;
    if (c.removed) deletions += c.count;
  }
  return { additions, deletions };
}

function base(path: string, original: string, modified: string, o: Options) {
  return {
    path,
    oldPath: o.oldPath,
    status: o.status ?? (original === '' ? 'added' : modified === '' ? 'deleted' : 'modified'),
    category: 'spec',
    isBinary: o.isBinary ?? false,
    committed: o.committed ?? true,
    ...counts(original, modified),
  } satisfies Omit<FileChange, 'diff'>;
}

export function markdownFile(path: string, original: string, modified: string, o: Options = {}): FileChange {
  return {
    ...base(path, original, modified, o),
    diff: { kind: 'markdown', original, modified, merged: mergeMarkdown(original, modified) },
  };
}

export function codeFile(path: string, language: string, original: string, modified: string, o: Options = {}): FileChange {
  return {
    ...base(path, original, modified, o),
    category: 'prod',
    diff: { kind: 'code', language, original, modified },
  };
}

// ─── Markdown ────────────────────────────────────────────────

export const markdownCases = {
  wordChanged: ['The quick brown fox jumps over the lazy dog.', 'The quick red fox jumps over the lazy dog.'],
  headingRenamed: ['## Old section title\n\nBody text.', '## New section title\n\nBody text.'],
  listItemAdded: [
    'Steps:\n\n- Install dependencies\n- Run the tests',
    'Steps:\n\n- Install dependencies\n- Build the project\n- Run the tests',
  ],
  blockDeleted: [
    'First paragraph stays.\n\nThis paragraph is going away entirely.\n\nLast paragraph stays.',
    'First paragraph stays.\n\nLast paragraph stays.',
  ],
  codeBlockChanged: [
    'Run this:\n\n```sh\nnpm install\nnpm run dev\n```',
    'Run this:\n\n```sh\nbun install\nbun run dev\n```',
  ],
  tableChanged: [
    '| Route | Returns |\n| --- | --- |\n| `/api/deltas` | `DeltaSummary[]` |',
    '| Route | Returns |\n| --- | --- |\n| `/api/deltas` | `DeltaSummary[]` |\n| `/api/deltas/:id` | `DeltaOverview` |',
  ],
  formatting: [
    'This is **very important** and links to [the old docs](old.md).',
    'This is **really important** and links to [the new docs](new.md).',
  ],
} satisfies Record<string, [string, string]>;

export const realSpec = markdownFile('specs/ui/design.md', designBefore, designAfter);

// ─── Code ────────────────────────────────────────────────────

export const realCode = codeFile('src/types.ts', 'typescript', typesBefore, typesAfter);

const greet = `export function greet(name: string): string {
  return 'Hello, ' + name;
}
`;

export const codeAdded = codeFile('src/greet.ts', 'typescript', '', greet);
export const codeDeleted = codeFile('src/greet.ts', 'typescript', greet, '');
export const codeRenamed = codeFile(
  'src/ui/greeting.ts',
  'typescript',
  greet,
  greet.replace("'Hello, '", "'Hi, '"),
  { status: 'renamed', oldPath: 'src/greet.ts' },
);
export const codeUncommitted = codeFile('src/greet.ts', 'typescript', greet, greet.replace('name: string', 'name = "world"'), {
  committed: false,
});
export const binary = codeFile('assets/logo.png', 'plaintext', '', '', { isBinary: true, status: 'modified' });

function bigFile(changed: boolean): string {
  const lines: string[] = [];
  for (let i = 0; i < 400; i++) {
    const value = changed && (i === 40 || i === 41 || i === 300) ? `${i} * 2` : `${i}`;
    lines.push(`export const value${i} = ${value};`);
  }
  return lines.join('\n') + '\n';
}
export const codeLarge = codeFile('src/generated/values.ts', 'typescript', bigFile(false), bigFile(true));
