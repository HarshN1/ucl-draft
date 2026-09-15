'use client';

import { clsx } from 'clsx';

interface SquadTabProps {
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onToggle: () => void;
}

/** Side tab — hover (desktop) or tap to hide picks and view full squad. */
export function SquadTab({ active, onActivate, onDeactivate, onToggle }: SquadTabProps) {
  return (
    <button
      type="button"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) onActivate();
      }}
      onMouseLeave={() => {
        if (window.matchMedia('(hover: hover)').matches) onDeactivate();
      }}
      onClick={() => {
        if (!window.matchMedia('(hover: hover)').matches) onToggle();
      }}
      className={clsx(
        'absolute left-2 md:left-3 top-1/2 -translate-y-1/2 z-[55]',
        'font-display text-[9px] md:text-[10px] font-bold uppercase tracking-widest',
        'px-2 py-3 md:px-2.5 md:py-4 rounded-sm border backdrop-blur-md transition-colors',
        active
          ? 'border-gold/70 bg-gold/20 text-gold shadow-[0_0_20px_rgba(226,174,22,0.25)]'
          : 'border-white/25 bg-primary/60 text-white/65 hover:text-gold hover:border-gold/50'
      )}
      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      aria-label={active ? 'Back to draft picks' : 'View squad'}
      aria-pressed={active}
    >
      Squad
    </button>
  );
}
