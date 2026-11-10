import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import { Nav, RefreshButton } from './Nav.tsx';

const meta: Meta<typeof Nav> = {
  title: 'Dashboard/Nav',
  component: Nav,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof Nav>;

const count = <span className="pridm-muted">48 deltas</span>;

export const OnDashboard: Story = {
  args: {
    children: (
      <>
        {count}
        <RefreshButton onRefresh={() => {}} />
      </>
    ),
  },
};
export const Refreshing: Story = {
  args: {
    children: (
      <>
        {count}
        <RefreshButton onRefresh={() => {}} refreshing />
      </>
    ),
  },
};
export const OnProject: Story = {
  args: {
    crumbs: [{ label: 'diffplug/pridm' }],
    children: (
      <>
        <span className="pridm-muted">7 deltas</span>
        <RefreshButton onRefresh={() => {}} />
      </>
    ),
  },
};
export const OnDelta: Story = {
  args: { crumbs: [{ label: 'diffplug/pridm', href: '#/project/github.com%2Fdiffplug%2Fpridm' }, { label: 'Show single-line code changes on one line' }] },
};
export const Bare: Story = { args: {} };

export const OnDashboardDark = dark(OnDashboard);
export const RefreshingDark = dark(Refreshing);
export const OnProjectDark = dark(OnProject);
export const OnDeltaDark = dark(OnDelta);
export const BareDark = dark(Bare);
