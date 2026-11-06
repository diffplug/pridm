import { BellSlashIcon, PinIcon } from '@primer/octicons-react';
import type { Focus } from '../../types.ts';

// Pin and mute. Each toggles between itself and normal; pinning a muted delta unmutes it.
export function FocusButtons({ focus, onChange }: { focus: Focus; onChange: (focus: Focus) => void }) {
  return (
    <span className="pridm-focus" data-focus={focus}>
      <button
        type="button"
        aria-pressed={focus === 'pinned'}
        title={focus === 'pinned' ? 'Unpin' : 'Pin to the top'}
        onClick={() => onChange(focus === 'pinned' ? 'normal' : 'pinned')}
      >
        <PinIcon size={14} />
      </button>
      <button
        type="button"
        aria-pressed={focus === 'muted'}
        title={focus === 'muted' ? 'Unmute' : 'Mute: move to the bottom'}
        onClick={() => onChange(focus === 'muted' ? 'normal' : 'muted')}
      >
        <BellSlashIcon size={14} />
      </button>
    </span>
  );
}
