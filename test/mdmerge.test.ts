import { describe, expect, test } from 'bun:test';
import { mergeMarkdown } from '../src/shared/mdmerge.ts';

const merge = (a: string, b: string) => mergeMarkdown(a, b).trimEnd();

describe('mergeMarkdown', () => {
  test('identical documents are unchanged', () => {
    const doc = '# Title\n\nSome text.\n\n- a\n- b';
    expect(merge(doc, doc)).toBe(doc);
  });

  test('a word changed in a paragraph', () => {
    expect(merge('The quick brown fox.', 'The quick red fox.')).toBe('The quick ~~brown~~ ==red== fox.');
  });

  test('a heading renamed keeps its hashes outside the marks', () => {
    expect(merge('## Old title', '## New title')).toBe('## ~~Old~~ ==New== title');
  });

  test('a heading whose level changed is shown as deleted + inserted', () => {
    expect(merge('## Title', '### Title')).toBe('## ~~Title~~\n\n### ==Title==');
  });

  test('a list item added keeps the list tight', () => {
    expect(merge('- a\n- b', '- a\n- b\n- c')).toBe('- a\n- b\n- ==c==');
  });

  test('a list item edited', () => {
    expect(merge('- buy milk\n- buy eggs', '- buy milk\n- buy bread')).toBe('- buy milk\n- buy ~~eggs~~ ==bread==');
  });

  test('a task list item keeps its checkbox outside the marks', () => {
    expect(merge('- [ ] a', '- [ ] a\n- [x] done')).toBe('- [ ] a\n- [x] ==done==');
  });

  test('a block deleted', () => {
    expect(merge('Para one.\n\nPara two.', 'Para one.')).toBe('Para one.\n\n~~Para two.~~');
  });

  test('a block inserted between others', () => {
    expect(merge('One.\n\nThree.', 'One.\n\nTwo.\n\nThree.')).toBe('One.\n\n==Two.==\n\nThree.');
  });

  test('a code block changed is shown old then new', () => {
    const a = '```ts\nconst x = 1;\n```';
    const b = '```ts\nconst x = 2;\n```';
    expect(merge(a, b)).toBe(`~~**Old code block**~~\n\n${a}\n\n==**New code block**==\n\n${b}`);
  });

  test('a table changed is shown old then new', () => {
    const a = '| a | b |\n| - | - |\n| 1 | 2 |';
    const b = '| a | b |\n| - | - |\n| 1 | 3 |';
    expect(merge(a, b)).toBe(`~~**Old table**~~\n\n${a}\n\n==**New table**==\n\n${b}`);
  });

  test('a code block added gets a label', () => {
    expect(merge('Text.', 'Text.\n\n```\nnew\n```')).toBe('Text.\n\n==**Added code block**==\n\n```\nnew\n```');
  });

  test('a mark never splits bold text', () => {
    expect(merge('This is **very important** stuff.', 'This is **really important** stuff.')).toBe(
      'This is ~~**very important**~~ ==**really important**== stuff.',
    );
  });

  test('a mark never splits a link', () => {
    expect(merge('See [the docs](a.md) now.', 'See [the docs](b.md) now.')).toBe(
      'See ~~[the docs](a.md)~~ ==[the docs](b.md)== now.',
    );
  });

  test('a mark never splits inline code', () => {
    expect(merge('Run `npm run dev` first.', 'Run `bun run dev` first.')).toBe(
      'Run ~~`npm run dev`~~ ==`bun run dev`== first.',
    );
  });

  test('punctuation changes take the whole word, so the marks stay valid', () => {
    expect(merge('It is done.', 'It is done!')).toBe('It is ~~done.~~ ==done!==');
  });

  test('a mostly rewritten paragraph is shown as deleted + inserted', () => {
    expect(merge('The old way of doing things.', 'A completely different sentence here.')).toBe(
      '~~The old way of doing things.~~\n\n==A completely different sentence here.==',
    );
  });

  test('a change in a multi-line paragraph marks each line separately', () => {
    expect(merge('one two\nthree four', 'one 2\n3 four')).toBe('one ~~two~~\n~~three~~ ==2==\n==3== four');
  });

  test('a rewritten section shows all the old blocks, then all the new ones', () => {
    const a = 'Intro.\n\nThe old explanation of colors.\n\n- strip on the left\n- bar on each row';
    const b = 'Intro.\n\nNo colors at all, names only.\n\n- header shows counts';
    expect(merge(a, b)).toBe(
      'Intro.\n\n~~The old explanation of colors.~~\n\n- ~~strip on the left~~\n- ~~bar on each row~~\n\n' +
        '==No colors at all, names only.==\n\n- ==header shows counts==',
    );
  });

  test('frontmatter is shown as a yaml code block', () => {
    expect(merge('---\ntitle: a\n---\n\nText.', '---\ntitle: a\n---\n\nText.')).toBe('```yaml\ntitle: a\n```\n\nText.');
  });

  test('raw HTML is shown as an html code block', () => {
    expect(merge('<div>hi</div>', '<div>hi</div>')).toBe('```html\n<div>hi</div>\n```');
  });
});
