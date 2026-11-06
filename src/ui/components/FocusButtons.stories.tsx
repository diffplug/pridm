import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { dark, waitForDiffs } from '../stories.ts';
import type { Focus } from '../../types.ts';
import { FocusButtons } from './FocusButtons.tsx';

// Clicking works, so both buttons can be tried. Inside a dashboard row, a
// button that's off only shows on hover; here they always show.
function Interactive({ focus: initial }: { focus: Focus }) {
  const [focus, setFocus] = useState(initial);
  return (
    <div className="pridm-delta-title">
      <FocusButtons focus={focus} onChange={setFocus} />
    </div>
  );
}

const meta: Meta<typeof Interactive> = {
  title: 'Dashboard/FocusButtons',
  component: Interactive,
  play: waitForDiffs,
};
export default meta;
type Story = StoryObj<typeof Interactive>;

export const Normal: Story = { args: { focus: 'normal' } };
export const Pinned: Story = { args: { focus: 'pinned' } };
export const Muted: Story = { args: { focus: 'muted' } };

export const NormalDark = dark(Normal);
export const PinnedDark = dark(Pinned);
export const MutedDark = dark(Muted);
