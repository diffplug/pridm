// Builds one markdown document that shows the changes between two versions:
// deleted text as ~~strikethrough~~ and inserted text as ==highlight==.
// MDXEditor renders both. See specs/architecture/diffs.md.
//
// 1. Split both versions into blocks (paragraph, heading, list item, ...).
// 2. Diff the lists of blocks.
// 3. Copy unchanged blocks, mark whole blocks that were added or deleted,
//    and mark only the changed words inside blocks that were edited.
//
// Code blocks, tables, HTML, and frontmatter can't hold inline marks. When one
// changes, it's shown under a label, old version then new.

import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { diffArrays } from 'diff';
import type { RootContent } from 'mdast';

const DEL = '~~';
const INS = '==';

// Blocks whose text can hold inline marks. Everything else is atomic.
const TEXT_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

const ATOMIC_NAMES: Record<string, string> = {
  code: 'code block',
  table: 'table',
  html: 'HTML',
  frontmatter: 'frontmatter',
  thematicBreak: 'divider',
  definition: 'link definition',
};

interface Block {
  type: string;     // mdast node type, or 'frontmatter'
  source: string;   // the block's markdown, exactly as written
  sep: string;      // the text between the previous block and this one
}

export function mergeMarkdown(original: string, modified: string): string {
  const a = splitBlocks(original);
  const b = splitBlocks(modified);
  const changes = diffArrays(a, b, {
    comparator: (x, y) => x.type === y.type && x.source === y.source,
  });

  const out: Piece[] = [];
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i]!;
    if (!c.added && !c.removed) {
      for (const block of c.value) out.push(piece(block, safe(block)));
      continue;
    }
    // A run of removed blocks next to a run of added ones: pair them up.
    const next = changes[i + 1];
    let removed: Block[] = [];
    let added: Block[] = [];
    if (c.removed && next?.added) { removed = c.value; added = next.value; i++; }
    else if (c.added && next?.removed) { added = c.value; removed = next.value; i++; }
    else if (c.removed) removed = c.value;
    else added = c.value;

    out.push(...pairUp(removed, added));
  }
  return join(out);
}

// Lines up removed and added blocks of the same type, in order. Pairs that
// merge word by word are shown merged. Everything else between two merged
// pairs is shown as all the old blocks, then all the new ones, so a rewritten
// section reads as "before, after" instead of alternating.
function pairUp(removed: Block[], added: Block[]): Piece[] {
  const out: Piece[] = [];
  let dels: Block[] = [];
  let inss: Block[] = [];
  const flush = () => {
    out.push(...dels.map(deletedBlock), ...inss.map(insertedBlock));
    dels = [];
    inss = [];
  };

  let ia = 0;
  let ib = 0;
  for (const c of diffArrays(removed, added, { comparator: (x, y) => x.type === y.type })) {
    if (c.removed) { dels.push(...removed.slice(ia, ia + c.count)); ia += c.count; continue; }
    if (c.added) { inss.push(...added.slice(ib, ib + c.count)); ib += c.count; continue; }
    for (let k = 0; k < c.count; k++) {
      const old = removed[ia++]!;
      const neu = added[ib++]!;
      const merged = modifiedBlock(old, neu);
      if (merged) { flush(); out.push(merged); }
      else { dels.push(old); inss.push(neu); }
    }
  }
  flush();
  return out;
}

// ─── Splitting into blocks ───────────────────────────────────

const FRONTMATTER = /^---\n[\s\S]*?\n---[ \t]*(?:\n|$)/;

export function splitBlocks(markdown: string): Block[] {
  let text = markdown.replace(/\r\n?/g, '\n');
  const blocks: Block[] = [];

  const fm = FRONTMATTER.exec(text);
  if (fm) {
    blocks.push({ type: 'frontmatter', source: fm[0].trimEnd(), sep: '' });
    text = text.slice(fm[0].length);
  }

  const tree = fromMarkdown(text, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()],
  });

  let prevEnd = 0;
  const add = (node: RootContent) => {
    const start = node.position!.start.offset!;
    const end = node.position!.end.offset!;
    blocks.push({ type: node.type, source: text.slice(start, end), sep: text.slice(prevEnd, start) });
    prevEnd = end;
  };
  for (const node of tree.children) {
    if (node.type === 'list') node.children.forEach(add);
    else add(node);
  }
  return blocks;
}

// ─── Emitting blocks ─────────────────────────────────────────

interface Piece {
  text: string;
  listItem: boolean;  // list items keep their own separators so lists stay tight
  sep: string;
}

function piece(block: Block, text: string): Piece {
  return { text, listItem: block.type === 'listItem', sep: block.sep };
}

function join(pieces: Piece[]): string {
  let out = '';
  pieces.forEach((p, i) => {
    if (i > 0) {
      const bothListItems = p.listItem && pieces[i - 1]!.listItem;
      out += bothListItems && p.sep.includes('\n') ? p.sep : bothListItems ? '\n' : '\n\n';
    }
    out += p.text;
  });
  return out + '\n';
}

// Atomic blocks MDXEditor can't render on its own are shown as code.
function safe(block: Block): string {
  if (block.type === 'frontmatter') {
    const inner = block.source.replace(/^---\n/, '').replace(/\n---$/, '');
    return '```yaml\n' + inner + '\n```';
  }
  if (block.type === 'html') return '```html\n' + block.source + '\n```';
  return block.source;
}

function isText(block: Block): boolean {
  return TEXT_TYPES.has(block.type);
}

function label(mark: string, word: string, block: Block): string {
  return `${mark}**${word} ${ATOMIC_NAMES[block.type] ?? block.type}**${mark}`;
}

function deletedBlock(block: Block): Piece {
  if (isText(block)) return piece(block, markBlock(block.source, DEL));
  return { text: label(DEL, 'Removed', block) + '\n\n' + safe(block), listItem: false, sep: block.sep };
}

function insertedBlock(block: Block): Piece {
  if (isText(block)) return piece(block, markBlock(block.source, INS));
  return { text: label(INS, 'Added', block) + '\n\n' + safe(block), listItem: false, sep: block.sep };
}

// Two versions of the same type of block, shown as one piece; or null when
// they're better shown as deleted + inserted.
function modifiedBlock(old: Block, neu: Block): Piece | null {
  if (!isText(neu)) {
    const text = [label(DEL, 'Old', neu), safe(old), label(INS, 'New', neu), safe(neu)].join('\n\n');
    return { text, listItem: false, sep: neu.sep };
  }
  const merged = mergeTextBlock(old.source, neu.source, neu.type);
  return merged === null ? null : piece(neu, merged);
}

// ─── Marking text ────────────────────────────────────────────

// Markdown that starts a line and must stay outside any mark:
// indentation, quote markers, list markers, task boxes, heading hashes.
const LINE_PREFIX = /^([ \t]*(?:>[ \t]?)*[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(?:\[[ xX]\][ \t]+)?(?:#{1,6}[ \t]+)?)/;
const UNDERLINE = /^[ \t]*(?:=+|-+)[ \t]*$/;  // setext heading underline

// Marks every line of a block, keeping each line's markdown prefix outside the mark.
export function markBlock(source: string, mark: string): string {
  return source
    .split('\n')
    .map((line) => {
      if (UNDERLINE.test(line)) return line;
      const prefix = LINE_PREFIX.exec(line)![1]!;
      return prefix + markInline(line.slice(prefix.length), mark);
    })
    .join('\n');
}

// Marks text with no line prefixes, one line at a time. Whitespace stays
// outside the mark, because `~~ text~~` isn't valid strikethrough.
function markInline(text: string, mark: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = /^(\s*)(.*?)(\s*)$/.exec(line)!;
      return m[2] ? m[1] + mark + m[2] + mark + m[3] : line;
    })
    .join('\n');
}

// Above this share of changed words, an edited block reads better as
// "old block, new block" than as a patchwork of marks.
const MAX_CHANGED = 0.5;

// Diffs two versions of a text block word by word. Returns null when the block
// is better shown as deleted + inserted.
function mergeTextBlock(old: string, neu: string, type: string): string | null {
  const multiLine = old.includes('\n') || neu.includes('\n');
  if (multiLine) return type === 'paragraph' ? mergeWords(old, neu) : null;
  const po = LINE_PREFIX.exec(old)![1]!;
  const pn = LINE_PREFIX.exec(neu)![1]!;
  if (po !== pn) return null;
  const merged = mergeWords(old.slice(po.length), neu.slice(pn.length));
  return merged === null ? null : pn + merged;
}

interface Token {
  op: 'eq' | 'del' | 'ins';
  text: string;
}

const isSpace = (s: string) => /^\s+$/.test(s);

// Word-level merge. Tokens are whitespace-separated chunks, so every mark
// starts and ends next to whitespace, which keeps it valid markdown. A changed
// region grows into its neighbors until its markdown is balanced on both sides,
// so a mark never splits `**bold**`, `` `code` ``, or `[link](url)`.
export function mergeWords(old: string, neu: string): string | null {
  const tokenize = (s: string) => s.split(/(\s+)/).filter((t) => t !== '');
  const tokens: Token[] = [];
  for (const c of diffArrays(tokenize(old), tokenize(neu))) {
    const op = c.added ? 'ins' : c.removed ? 'del' : 'eq';
    for (const text of c.value) tokens.push({ op, text });
  }

  const words = tokens.filter((t) => !isSpace(t.text));
  const changed = words.filter((t) => t.op !== 'eq').length;
  const total = Math.max(1, words.filter((t) => t.op !== 'ins').length, words.filter((t) => t.op !== 'del').length);
  if (changed === 0) return neu;
  if (changed / 2 / total > MAX_CHANGED) return null;

  const side = (from: number, to: number, op: 'del' | 'ins') =>
    tokens.slice(from, to).filter((t) => t.op === 'eq' || t.op === op).map((t) => t.text).join('');

  const out: string[] = [];
  let floor = 0;  // the start of the region can't move back past here
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i]!.op === 'eq') { out.push(tokens[i]!.text); i++; continue; }

    let start = i;
    let end = i;
    const grow = () => {
      while (end < tokens.length) {
        const t = tokens[end]!;
        const bridgesChanges = t.op === 'eq' && isSpace(t.text) && tokens[end + 1] && tokens[end + 1]!.op !== 'eq';
        if (t.op !== 'eq' || bridgesChanges) end++;
        else break;
      }
    };
    grow();

    for (;;) {
      const d = side(start, end, 'del');
      const n = side(start, end, 'ins');
      if (balanced(d) && balanced(n)) break;
      const canLeft = start > floor;
      const canRight = end < tokens.length;
      const goRight = direction(d, n, side(0, start, 'ins')) > 0 ? canRight : !canLeft;
      if (goRight && canRight) { end++; grow(); }
      else if (canLeft) { start--; out.pop(); }
      else return null;
    }

    const del = markInline(side(start, end, 'del'), DEL);
    const ins = markInline(side(start, end, 'ins'), INS);
    const gap = del.trim() && ins.trim() && !/\s$/.test(del) && !/^\s/.test(ins) ? ' ' : '';
    out.push(del + gap + ins);
    i = end;
    floor = end;
  }
  return out.join('');
}

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

// > 0: something is opened but not closed, so grow right.
// < 0: something is closed but not opened, so grow left.
function imbalance(s: string): number {
  const brackets = count(s, /\[/g) - count(s, /\]/g);
  const parens = count(s, /\(/g) - count(s, /\)/g);
  return brackets || parens;
}

// Which way an unbalanced region should grow: > 0 right, < 0 left.
// For brackets that's clear from which side is missing. For ` and *, which
// open and close with the same character, it depends on what's before the
// region: an odd number before it means the region closes a span.
function direction(del: string, ins: string, before: string): number {
  const brackets = imbalance(del) || imbalance(ins);
  if (brackets) return brackets;
  for (const re of [/`+/g, /\*+/g]) {
    if (count(del, re) % 2 || count(ins, re) % 2) return count(before, re) % 2 ? -1 : 1;
  }
  return 1;
}

function balanced(s: string): boolean {
  return (
    imbalance(s) === 0 &&
    count(s, /\*+/g) % 2 === 0 &&  // runs of *, so `**bold**` counts as two
    count(s, /`+/g) % 2 === 0
  );
}
