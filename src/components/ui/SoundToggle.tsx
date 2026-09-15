'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { getMuted, setMuted } from '@/lib/soundSettings';

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(getMuted());
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={clsx(
        'z-[70] font-display text-[10px] uppercase tracking-widest',
        'px-2 py-1.5 rounded-sm border border-white/20 bg-black/45 text-white/60',
        'hover:text-white hover:border-white/35 backdrop-blur-sm transition-colors',
        className
      )}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Sound off' : 'Sound on'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
