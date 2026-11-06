import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { MarkdownDiffView } from './MarkdownDiffView.tsx';
import { longSpec, markdownCases, markdownFile, realSpec } from '../fixtures/files.ts';
import type { MarkdownDiff } from '../../types.ts';

const meta: Meta<typeof MarkdownDiffView> = {
  title: 'Diffs/MarkdownDiffView',
  component: MarkdownDiffView,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof MarkdownDiffView>;

const story = (original: string, modified: string): Story => ({
  args: { diff: markdownFile('example.md', original, modified).diff as MarkdownDiff },
});

// Clicks the first expando button with this title, then waits like every story.
const expand = (title: string): Story['play'] => async (ctx) => {
  ctx.canvasElement.querySelector<HTMLButtonElement>(`.pridm-expand button[title="${title}"]`)?.click();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await waitForDiffs(ctx);
};

export const RealSpec: Story = { args: { diff: realSpec.diff as MarkdownDiff } };
export const LongSpecFolded: Story = { args: { diff: longSpec.diff as MarkdownDiff } };
export const LongSpecExpandedDown: Story = { args: { diff: longSpec.diff as MarkdownDiff }, play: expand('Show more below the part above') };
export const LongSpecExpandedAll: Story = { args: { diff: longSpec.diff as MarkdownDiff }, play: expand('Show all') };
export const WordChanged = story(...markdownCases.wordChanged);
export const HeadingRenamed = story(...markdownCases.headingRenamed);
export const ListItemAdded = story(...markdownCases.listItemAdded);
export const BlockDeleted = story(...markdownCases.blockDeleted);
export const CodeBlockChanged = story(...markdownCases.codeBlockChanged);
export const TableChanged = story(...markdownCases.tableChanged);
export const Formatting = story(...markdownCases.formatting);

export const RealSpecDark = dark(RealSpec);
export const LongSpecFoldedDark = dark(LongSpecFolded);
export const LongSpecExpandedDownDark = dark(LongSpecExpandedDown);
export const LongSpecExpandedAllDark = dark(LongSpecExpandedAll);
export const WordChangedDark = dark(WordChanged);
export const HeadingRenamedDark = dark(HeadingRenamed);
export const ListItemAddedDark = dark(ListItemAdded);
export const BlockDeletedDark = dark(BlockDeleted);
export const CodeBlockChangedDark = dark(CodeBlockChanged);
export const TableChangedDark = dark(TableChanged);
export const FormattingDark = dark(Formatting);
