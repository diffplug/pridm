import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { DeltaRow } from './DeltaRow.tsx';
import { customCategories, empty, localAndPr, neverPushed, prOnly, selfDelta } from '../fixtures/deltas.ts';
import { draftPr, summary, unavailablePr } from '../fixtures/summaries.ts';

const meta: Meta<typeof DeltaRow> = {
  title: 'Dashboard/DeltaRow',
  component: DeltaRow,
  play: waitForDiffs,
  args: { href: '#', onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof DeltaRow>;

export const LocalOnly: Story = { args: { summary: summary(selfDelta) } };
export const PrOnly: Story = { args: { summary: summary(prOnly) } };
export const DraftPr: Story = { args: { summary: draftPr } };
export const PrNotCloned: Story = { args: { summary: unavailablePr } };
export const LocalAndPrUncommittedAndUnpushed: Story = { args: { summary: summary(localAndPr) } };
export const NeverPushed: Story = { args: { summary: summary(neverPushed) } };
export const CustomCategories: Story = { args: { summary: summary(customCategories) } };
export const Pinned: Story = { args: { summary: summary(selfDelta, 'pinned') } };
export const Muted: Story = { args: { summary: summary(selfDelta, 'muted') } };
export const NoChanges: Story = { args: { summary: summary(empty) } };

export const LocalOnlyDark = dark(LocalOnly);
export const PrOnlyDark = dark(PrOnly);
export const DraftPrDark = dark(DraftPr);
export const PrNotClonedDark = dark(PrNotCloned);
export const LocalAndPrUncommittedAndUnpushedDark = dark(LocalAndPrUncommittedAndUnpushed);
export const NeverPushedDark = dark(NeverPushed);
export const CustomCategoriesDark = dark(CustomCategories);
export const PinnedDark = dark(Pinned);
export const MutedDark = dark(Muted);
export const NoChangesDark = dark(NoChanges);
