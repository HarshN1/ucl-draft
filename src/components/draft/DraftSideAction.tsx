'use client';

import { clsx } from 'clsx';

interface DraftSideActionProps {
  label: string;
  onClick: () => void;
  variant?: 'sim' | 'submit';
  className?: string;
}

/** Small fixed side control for Quick Sim / Submit. */
export function DraftSideAction({ label, onClick, variant = 'sim', className }: DraftSideActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-[60]',
        'font-display text-[9px] md:text-[10px] font-bold uppercase tracking-widest',
        'px-2 py-3 md:px-2.5 md:py-4 rounded-sm border backdrop-blur-sm',
        'transition-colors hover:brightness-110 active:scale-95',
        variant === 'submit'
          ? 'border-gold/70 bg-gold/20 text-gold'
          : 'border-white/25 bg-black/40 text-white/70 hover:text-white',
        className
      )}
      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
    >
      {label}
    </button>
  );
}
