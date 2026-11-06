import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dashboard } from './Dashboard.tsx';
import { summaries } from '../fixtures/summaries.ts';

const meta: Meta<typeof Dashboard> = {
  title: 'Dashboard/Dashboard',
  component: Dashboard,
};
export default meta;
type Story = StoryObj<typeof Dashboard>;

export const Several: Story = { args: { summaries } };
export const Empty: Story = { args: { summaries: [] } };
