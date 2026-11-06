import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { FileDiffView } from './FileDiffView.tsx';
import { binary, codeAdded, codeDeleted, codeRenamed, codeUncommitted, realCode, realSpec } from '../fixtures/files.ts';

const meta: Meta<typeof FileDiffView> = {
  title: 'Diffs/FileDiffView',
  component: FileDiffView,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof FileDiffView>;

export const Markdown: Story = { args: { file: realSpec } };
export const Code: Story = { args: { file: realCode } };
export const Added: Story = { args: { file: codeAdded } };
export const Deleted: Story = { args: { file: codeDeleted } };
export const Renamed: Story = { args: { file: codeRenamed } };
export const Uncommitted: Story = { args: { file: codeUncommitted } };
export const Binary: Story = { args: { file: binary } };

export const MarkdownDark = dark(Markdown);
export const CodeDark = dark(Code);
export const AddedDark = dark(Added);
export const DeletedDark = dark(Deleted);
export const RenamedDark = dark(Renamed);
export const UncommittedDark = dark(Uncommitted);
export const BinaryDark = dark(Binary);
