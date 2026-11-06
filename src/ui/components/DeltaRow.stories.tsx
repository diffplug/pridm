import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeltaRow } from './DeltaRow.tsx';
import { customCategories, empty, localAndPr, neverPushed, prOnly, selfDelta } from '../fixtures/deltas.ts';
import { summary } from '../fixtures/summaries.ts';

const meta: Meta<typeof DeltaRow> = {
  title: 'Dashboard/DeltaRow',
  component: DeltaRow,
  args: { href: '#' },
};
export default meta;
type Story = StoryObj<typeof DeltaRow>;

export const LocalOnly: Story = { args: { summary: summary(selfDelta) } };
export const PrOnly: Story = { args: { summary: summary(prOnly) } };
export const LocalAndPrUncommittedAndUnpushed: Story = { args: { summary: summary(localAndPr) } };
export const NeverPushed: Story = { args: { summary: summary(neverPushed) } };
export const CustomCategories: Story = { args: { summary: summary(customCategories) } };
export const Muted: Story = { args: { summary: summary(selfDelta, 'muted') } };
export const NoChanges: Story = { args: { summary: summary(empty) } };
