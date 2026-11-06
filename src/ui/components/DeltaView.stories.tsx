import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import type { Category, CategoryDiff } from '../../types.ts';
import { DeltaView } from './DeltaView.tsx';
import { customCategories, empty, localAndPr, neverPushed, prOnly, selfDelta, type DeltaFixture } from '../fixtures/deltas.ts';

// Keeps which sections are open, and "loads" a section's diffs the first time
// it opens, after a short delay, the way the app will fetch them.
function Interactive({ fixture, initiallyOpen = [], neverLoad = false }: { fixture: DeltaFixture; initiallyOpen?: Category[]; neverLoad?: boolean }) {
  const [open, setOpen] = useState<Category[]>(initiallyOpen);
  const [diffs, setDiffs] = useState<Partial<Record<Category, CategoryDiff>>>(() =>
    neverLoad ? {} : Object.fromEntries(initiallyOpen.map((c) => [c, fixture.diffs[c]])),
  );
  const onToggle = (category: Category, isOpen: boolean) => {
    setOpen((prev) => (isOpen ? [...prev, category] : prev.filter((c) => c !== category)));
    if (isOpen && !diffs[category] && !neverLoad) {
      setTimeout(() => setDiffs((d) => ({ ...d, [category]: fixture.diffs[category] })), 400);
    }
  };
  return <DeltaView overview={fixture.overview} open={open} onToggle={onToggle} diffs={diffs} />;
}

const meta: Meta<typeof Interactive> = {
  title: 'Delta/DeltaView',
  component: Interactive,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof Interactive>;

export const SelfReview: Story = { args: { fixture: selfDelta } };
export const SpecAndTestOpen: Story = { args: { fixture: selfDelta, initiallyOpen: ['spec', 'test'] } };
export const Loading: Story = { args: { fixture: selfDelta, initiallyOpen: ['spec'], neverLoad: true } };
export const CustomCategories: Story = { args: { fixture: customCategories } };
export const PrOnly: Story = { args: { fixture: prOnly } };
export const LocalAndPr: Story = { args: { fixture: localAndPr } };
export const NeverPushed: Story = { args: { fixture: neverPushed } };
export const Empty: Story = { args: { fixture: empty } };

export const SelfReviewDark = dark(SelfReview);
export const SpecAndTestOpenDark = dark(SpecAndTestOpen);
export const LoadingDark = dark(Loading);
export const CustomCategoriesDark = dark(CustomCategories);
export const PrOnlyDark = dark(PrOnly);
export const LocalAndPrDark = dark(LocalAndPr);
export const NeverPushedDark = dark(NeverPushed);
export const EmptyDark = dark(Empty);
