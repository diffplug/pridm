// A delta's changed files and their contents, from a local clone.
// See specs/architecture/discovery.md, "Where the diff comes from".
//
// With a `head`, compares two commits. Without one, compares `base` with the
// working tree, including uncommitted edits and files git doesn't track yet.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CategoryGlobs, FileChange, FileStat, FileStatus, WordCounts } from '../../types.ts';
import { classifier } from '../../shared/classify.ts';
import { isMarkdown, languageOf } from '../../shared/language.ts';
import { joinPieces, mergePieces } from '../../shared/mdmerge.ts';
import { words } from '../../shared/words.ts';
import { git } from '../exec.ts';

export interface Range {
  cwd: string;
  base: string;
  head?: string;  // undefined = the working tree
}

export async function fileStats(range: Range, globs: CategoryGlobs): Promise<FileStat[]> {
  const { cwd, base, head } = range;
  const revs = head ? [base, head] : [base];
  const classify = classifier(globs);

  const [numstat, nameStatus, committedOut, untrackedOut, wordDiff] = await Promise.all([
    git(cwd, ['diff', '--numstat', '-z', '-M', ...revs]),
    git(cwd, ['diff', '--name-status', '-z', '-M', ...revs]),
    head ? Promise.resolve(null) : git(cwd, ['diff', '--name-only', '-z', '-M', base, 'HEAD']),
    head ? Promise.resolve('') : git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']),
    git(cwd, ['diff', '--word-diff=porcelain', '--word-diff-regex=[^[:space:]]+', '-M', '--unified=0', ...revs, '--', '*.md', '*.mdx']),
  ]);
  const counts = parseNumstat(numstat);
  const committed = committedOut === null ? null : new Set(split(committedOut));
  const wordCounts = parseWordDiff(wordDiff);

  const stats: FileStat[] = parseNameStatus(nameStatus).map((f) => {
    const c = counts.get(f.path);
    const stat: FileStat = {
      ...f,
      category: classify(f.status === 'deleted' ? (f.oldPath ?? f.path) : f.path),
      additions: c?.additions ?? 0,
      deletions: c?.deletions ?? 0,
      isBinary: c?.isBinary ?? false,
      committed: committed ? committed.has(f.path) : true,
    };
    if (isMarkdown(f.path) && !stat.isBinary) stat.words = wordCounts.get(f.path) ?? { added: 0, removed: 0 };
    return stat;
  });

  const untracked = await Promise.all(
    split(untrackedOut).map(async (path): Promise<FileStat> => {
      const bytes = await readFile(join(cwd, path)).catch(() => Buffer.alloc(0));
      const isBinary = bytes.includes(0);
      const text = isBinary ? '' : bytes.toString('utf8');
      return {
        path,
        status: 'added',
        category: classify(path),
        additions: text ? text.split('\n').length : 0,
        deletions: 0,
        isBinary,
        committed: false,
        ...(isMarkdown(path) && !isBinary && { words: { added: words(text).length, removed: 0 } }),
      };
    }),
  );
  return [...stats, ...untracked].sort((a, b) => a.path.localeCompare(b.path));
}

async function contents(range: Range, stat: FileStat): Promise<{ original: string; modified: string }> {
  const { cwd, base, head } = range;
  const show = (rev: string, path: string) => git(cwd, ['show', `${rev}:${path}`]);
  const [original, modified] = await Promise.all([
    stat.isBinary || stat.status === 'added' ? '' : show(base, stat.oldPath ?? stat.path),
    stat.isBinary || stat.status === 'deleted' ? '' : head ? show(head, stat.path) : readFile(join(cwd, stat.path), 'utf8'),
  ]);
  return { original, modified };
}

export async function fileChange(range: Range, stat: FileStat): Promise<FileChange> {
  const { original, modified } = await contents(range, stat);
  if (isMarkdown(stat.path)) {
    const pieces = mergePieces(original, modified);
    return { ...stat, diff: { kind: 'markdown', original, modified, merged: joinPieces(pieces), pieces } };
  }
  return { ...stat, diff: { kind: 'code', language: languageOf(stat.path), original, modified } };
}

// ─── Parsing git's output ────────────────────────────────────

function split(out: string): string[] {
  return out.split('\0').filter((s) => s !== '');
}

const STATUS: Record<string, FileStatus> = { A: 'added', C: 'added', M: 'modified', T: 'modified', D: 'deleted', R: 'renamed' };

// "M\0path\0", or "R100\0old\0new\0" for renames and copies.
function parseNameStatus(out: string): { path: string; oldPath?: string; status: FileStatus }[] {
  const t = split(out);
  const files = [];
  for (let i = 0; i < t.length; ) {
    const code = t[i]![0]!;
    if (code === 'R' || code === 'C') {
      files.push({ oldPath: code === 'R' ? t[i + 1] : undefined, path: t[i + 2]!, status: STATUS[code]! });
      i += 3;
    } else {
      files.push({ path: t[i + 1]!, status: STATUS[code] ?? 'modified' });
      i += 2;
    }
  }
  return files;
}

// "add\tdel\tpath\0", or "add\tdel\t\0old\0new\0" for renames. Binary files are "-\t-".
function parseNumstat(out: string): Map<string, { additions: number; deletions: number; isBinary: boolean }> {
  const t = out.split('\0');
  const counts = new Map();
  for (let i = 0; i < t.length; i++) {
    if (!t[i]) continue;
    const [add, del, path] = t[i]!.split('\t');
    let newPath = path;
    if (path === '') {
      newPath = t[i + 2];
      i += 2;
    }
    counts.set(newPath, { additions: Number(add) || 0, deletions: Number(del) || 0, isBinary: add === '-' });
  }
  return counts;
}

// `git diff --word-diff=porcelain`: per file, a header ("diff --git", "---",
// "+++", ...) then hunks whose lines start with " " (same), "-" (removed),
// "+" (added), or "~" (end of a line). Words are counted the same way the UI
// counts them, so markdown syntax on its own doesn't count.
export function parseWordDiff(out: string): Map<string, WordCounts> {
  const counts = new Map<string, WordCounts>();
  let current: WordCounts | null = null;
  let inHeader = false;
  let oldPath = '';
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git ')) {
      inHeader = true;
      current = null;
      continue;
    }
    if (inHeader) {
      if (line.startsWith('--- ')) oldPath = line.slice(4).replace(/^a\//, '');
      else if (line.startsWith('+++ ')) {
        const path = line.slice(4) === '/dev/null' ? oldPath : line.slice(4).replace(/^b\//, '');
        current = { added: 0, removed: 0 };
        counts.set(path, current);
      } else if (line.startsWith('@@')) inHeader = false;
      continue;
    }
    if (!current) continue;
    if (line[0] === '+') current.added += words(line.slice(1)).length;
    else if (line[0] === '-') current.removed += words(line.slice(1)).length;
  }
  return counts;
}
