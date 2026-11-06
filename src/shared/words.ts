// Words added and removed between two versions of a markdown file. Words are
// whitespace-separated, the same chunks the merged markdown marks, so the
// counts match what's highlighted. Markdown syntax on its own (`##`, `-`, `|`,
// `1.`, code fences) doesn't count as a word.

import { diffArrays } from 'diff';

const SYNTAX = /^(?:[#>*+|=~:-]+|\d+[.)]|`{3,}.*|\[[ xX]?\])$/;

export function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w !== '' && !SYNTAX.test(w));
}

export function wordCounts(original: string, modified: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const c of diffArrays(words(original), words(modified))) {
    if (c.added) added += c.count;
    if (c.removed) removed += c.count;
  }
  return { added, removed };
}
