import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { CodeDiffView } from './CodeDiffView.tsx';
import { codeAdded, codeDeleted, codeLarge, realCode } from '../fixtures/files.ts';
import type { CodeDiff, FileChange } from '../../types.ts';

const meta: Meta<typeof CodeDiffView> = {
  title: 'Diffs/CodeDiffView',
  component: CodeDiffView,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof CodeDiffView>;

const story = (file: FileChange): Story => ({ args: { diff: file.diff as CodeDiff } });

export const RealCode = story(realCode);
export const Added = story(codeAdded);
export const Deleted = story(codeDeleted);
export const LargeFile = story(codeLarge);

export const RealCodeDark = dark(RealCode);
export const AddedDark = dark(Added);
export const DeletedDark = dark(Deleted);
export const LargeFileDark = dark(LargeFile);
