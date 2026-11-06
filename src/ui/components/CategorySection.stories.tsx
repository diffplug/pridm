import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { CategorySection } from './CategorySection.tsx';
import { customCategories, selfDelta } from '../fixtures/deltas.ts';

const section = (name: string, fixture = selfDelta) => fixture.overview.categories.find((c) => c.category === name)!;

const meta: Meta<typeof CategorySection> = {
  title: 'Delta/CategorySection',
  component: CategorySection,
  play: waitForDiffs,
  args: { onToggle: () => {} },
};
export default meta;
type Story = StoryObj<typeof CategorySection>;

export const Collapsed: Story = { args: { section: section('spec'), open: false } };
export const Expanded: Story = { args: { section: section('spec'), open: true, diff: selfDelta.diffs.spec } };
export const ExpandedManyFiles: Story = { args: { section: section('prod'), open: true, diff: selfDelta.diffs.prod } };
export const Loading: Story = { args: { section: section('spec'), open: true } };
export const CustomCategory: Story = {
  args: { section: section('ui', customCategories), open: true, diff: customCategories.diffs.ui },
};

export const CollapsedDark = dark(Collapsed);
export const ExpandedDark = dark(Expanded);
export const ExpandedManyFilesDark = dark(ExpandedManyFiles);
export const LoadingDark = dark(Loading);
export const CustomCategoryDark = dark(CustomCategory);
