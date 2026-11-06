import type { Meta, StoryObj } from '@storybook/react-vite';
import { CategoryCounts } from './CategoryCounts.tsx';
import { customCategories, selfDelta } from '../fixtures/deltas.ts';

const meta: Meta<typeof CategoryCounts> = {
  title: 'Delta/CategoryCounts',
  component: CategoryCounts,
};
export default meta;
type Story = StoryObj<typeof CategoryCounts>;

const stats = selfDelta.overview.categories.map(({ files: _, ...s }) => s);

export const Default: Story = { args: { categories: stats } };
export const SingleCategory: Story = { args: { categories: stats.slice(0, 1) } };
export const Custom: Story = { args: { categories: customCategories.overview.categories.map(({ files: _, ...s }) => s) } };
export const Empty: Story = { args: { categories: [] } };
