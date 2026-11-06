import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownDiffView } from './MarkdownDiffView.tsx';
import { markdownCases, markdownFile, realSpec } from '../fixtures/files.ts';
import type { MarkdownDiff } from '../../types.ts';

const meta: Meta<typeof MarkdownDiffView> = {
  title: 'Diffs/MarkdownDiffView',
  component: MarkdownDiffView,
};
export default meta;
type Story = StoryObj<typeof MarkdownDiffView>;

const story = (original: string, modified: string): Story => ({
  args: { diff: markdownFile('example.md', original, modified).diff as MarkdownDiff },
});

export const RealSpec: Story = { args: { diff: realSpec.diff as MarkdownDiff } };
export const WordChanged = story(...markdownCases.wordChanged);
export const HeadingRenamed = story(...markdownCases.headingRenamed);
export const ListItemAdded = story(...markdownCases.listItemAdded);
export const BlockDeleted = story(...markdownCases.blockDeleted);
export const CodeBlockChanged = story(...markdownCases.codeBlockChanged);
export const TableChanged = story(...markdownCases.tableChanged);
export const Formatting = story(...markdownCases.formatting);
