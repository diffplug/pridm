// A delta's changed files and their contents, from a local clone.
// See specs/architecture/discovery.md, "Where the diff comes from".
//
// With a `head`, compares two commits. Without one, compares `base` with the
// working tree, including uncommitted edits and files git doesn't track yet.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CategoryGlobs, FileChange, FileStat, FileStatus } from '../../types.ts';
import { classifier } from '../../shared/classify.ts';
import { isMarkdown, languageOf } from '../../shared/language.ts';
import { mergeMarkdown } from '../../shared/mdmerge.ts';
import { wordCounts } from '../../shared/words.ts';
import { git } from '../exec.ts';

export interface Range {
  cwd: string;
  base: string;
  head?: string;  // undefined = the working tree
}

export function fileStats(range: Range, globs: CategoryGlobs): FileStat[] {
  const { cwd, base, head } = range;
  const revs = head ? [base, head] : [base];
  const classify = classifier(globs);

  const counts = parseNumstat(git(cwd, ['diff', '--numstat', '-z', '-M', ...revs]));
  const committed = head ? null : new Set(split(git(cwd, ['diff', '--name-only', '-z', '-M', base, 'HEAD'])));

  const stats: FileStat[] = parseNameStatus(git(cwd, ['diff', '--name-status', '-z', '-M', ...revs])).map((f) => {
    const c = counts.get(f.path);
    return {
      ...f,
      category: classify(f.status === 'deleted' ? (f.oldPath ?? f.path) : f.path),
      additions: c?.additions ?? 0,
      deletions: c?.deletions ?? 0,
      isBinary: c?.isBinary ?? false,
      committed: committed ? committed.has(f.path) : true,
    };
  });

  if (!head) {
    for (const path of split(git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']))) {
      const text = readFileSync(join(cwd, path));
      const isBinary = text.includes(0);
      stats.push({
        path,
        status: 'added',
        category: classify(path),
        additions: isBinary ? 0 : text.toString('utf8').split('\n').length,
        deletions: 0,
        isBinary,
        committed: false,
      });
    }
  }
  // Markdown files are also counted in words. That means reading them, but
  // they're small, and the UI shows words for them instead of lines.
  for (const stat of stats) {
    if (!stat.isBinary && isMarkdown(stat.path)) {
      const { original, modified } = contents(range, stat);
      stat.words = wordCounts(original, modified);
    }
  }
  return stats.sort((a, b) => a.path.localeCompare(b.path));
}

function contents(range: Range, stat: FileStat): { original: string; modified: string } {
  const { cwd, base, head } = range;
  const show = (rev: string, path: string) => git(cwd, ['show', `${rev}:${path}`]);
  const original = stat.isBinary || stat.status === 'added' ? '' : show(base, stat.oldPath ?? stat.path);
  const modified =
    stat.isBinary || stat.status === 'deleted' ? '' : head ? show(head, stat.path) : readFileSync(join(cwd, stat.path), 'utf8');
  return { original, modified };
}

export function fileChange(range: Range, stat: FileStat): FileChange {
  const { original, modified } = contents(range, stat);
  if (isMarkdown(stat.path)) {
    return { ...stat, diff: { kind: 'markdown', original, modified, merged: mergeMarkdown(original, modified) } };
  }
  return { ...stat, diff: { kind: 'code', language: languageOf(stat.path), original, modified } };
}

// ─── Parsing git's -z output ─────────────────────────────────

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
