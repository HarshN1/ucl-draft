'use client';

import { useEffect, useState } from 'react';
import type { Squad } from '@/types';
import { getDraftScoreTier } from '@/types';
import { ChemistryBar } from './ChemistryBar';

interface DraftScoreCardProps {
  squad: Squad;
}

const TIER_CONFIG = {
  'World Class Draft': { emoji: '🏆', color: 'text-gold', glow: 'glow-gold' },
  'Elite Draft':       { emoji: '⭐⭐⭐', color: 'text-accent', glow: 'glow-accent' },
  'Strong Draft':      { emoji: '⭐⭐', color: 'text-white', glow: '' },
  'Good Draft':        { emoji: '⭐', color: 'text-white/70', glow: '' },
};

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.round((elapsed / duration) * target));
      }
    }, 50);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export function DraftScoreCard({ squad }: DraftScoreCardProps) {
  const animOvr = useCountUp(squad.ovrAvg, 1000);
  const animChem = useCountUp(squad.chemistry, 1200);
  const [showTotal, setShowTotal] = useState(false);
  const animTotal = useCountUp(showTotal ? squad.draftScore : 0, 800);

  useEffect(() => {
    const t = setTimeout(() => setShowTotal(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const tier = getDraftScoreTier(squad.draftScore);
  const { emoji, color, glow } = TIER_CONFIG[tier];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      {/* Formation */}
      <div className="font-body text-white/50 text-sm">{squad.formation.name}</div>

      {/* OVR + Chemistry */}
      <div className="grid grid-cols-2 gap-6 w-full">
        <div className="bg-primary border border-white/10 rounded-xl p-4 text-center">
          <div className="font-display font-bold text-5xl text-white">{animOvr}</div>
          <div className="font-display text-xs tracking-widest text-white/40 uppercase mt-1">
            Squad OVR
          </div>
        </div>
        <div className="bg-primary border border-white/10 rounded-xl p-4 text-center">
          <div className="font-display font-bold text-5xl text-ucl-green">{animChem}</div>
          <div className="font-display text-xs tracking-widest text-white/40 uppercase mt-1">
            Chemistry
          </div>
        </div>
      </div>

      {/* Chemistry bar */}
      <div className="w-full">
        <ChemistryBar value={squad.chemistry} />
      </div>

      {/* Draft Score */}
      {showTotal && (
        <div className={`text-center animate-fade-in ${glow}`}>
          <div
            className={`font-display font-bold text-7xl ${color}`}
          >
            {animTotal}
          </div>
          <div className="font-display font-bold text-xl text-white/60 mt-1">/ 200</div>
          <div className={`font-display font-bold text-lg mt-3 ${color}`}>
            {emoji} {tier}
          </div>
        </div>
      )}
    </div>
  );
}
