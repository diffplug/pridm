import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { ExpandBar } from './ExpandBar.tsx';

const meta: Meta<typeof ExpandBar> = {
  title: 'Diffs/ExpandBar',
  component: ExpandBar,
  play: waitForDiffs,
  args: { onExpand: () => {} },
};
export default meta;
type Story = StoryObj<typeof ExpandBar>;

export const BetweenChanges: Story = { args: { hidden: 10, unit: 'block', label: '3. Join, 4. Where the diff comes from, …', canDown: true, canUp: true } };
export const AtTheTop: Story = { args: { hidden: 6, unit: 'block', label: 'Discovery, 1. Local worktrees', canDown: false, canUp: true } };
export const AtTheBottom: Story = { args: { hidden: 4, unit: 'block', label: 'in 5. Dormouse surfaces', canDown: true, canUp: false } };
export const NoLabel: Story = { args: { hidden: 1, unit: 'block', canDown: true, canUp: true } };

export const BetweenChangesDark = dark(BetweenChanges);
export const AtTheTopDark = dark(AtTheTop);
export const AtTheBottomDark = dark(AtTheBottom);
export const NoLabelDark = dark(NoLabel);
