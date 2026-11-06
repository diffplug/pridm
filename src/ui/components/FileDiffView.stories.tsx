import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileDiffView } from './FileDiffView.tsx';
import { binary, codeAdded, codeDeleted, codeRenamed, codeUncommitted, realCode, realSpec } from '../fixtures/files.ts';
import { toStat } from '../../shared/overview.ts';

const meta: Meta<typeof FileDiffView> = {
  title: 'Diffs/FileDiffView',
  component: FileDiffView,
  args: { defaultOpen: true },
};
export default meta;
type Story = StoryObj<typeof FileDiffView>;

export const Collapsed: Story = { args: { file: realSpec, defaultOpen: false } };
export const Markdown: Story = { args: { file: realSpec } };
export const Code: Story = { args: { file: realCode } };
export const Added: Story = { args: { file: codeAdded } };
export const Deleted: Story = { args: { file: codeDeleted } };
export const Renamed: Story = { args: { file: codeRenamed } };
export const Uncommitted: Story = { args: { file: codeUncommitted } };
export const Binary: Story = { args: { file: binary } };
export const Loading: Story = { args: { file: toStat(realSpec) } };
