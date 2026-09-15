'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Leaderboard } from '@/components/ui/Leaderboard';
import { RulesModal, useRulesOnFirstVisit } from '@/components/ui/RulesModal';

interface LandingScreenProps {
  onStart: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LandingScreen({ onStart, isLoading, error }: LandingScreenProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { rulesOpen, closeRules, openRules } = useRulesOnFirstVisit();

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(0,212,255,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-10">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55" stroke="#00d4ff" strokeWidth="2" fill="none" />
          <circle cx="60" cy="60" r="35" stroke="#00d4ff" strokeWidth="1.5" fill="none" />
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * Math.PI * 2) / 8 - Math.PI / 2;
            const x = 60 + 45 * Math.cos(angle);
            const y = 60 + 45 * Math.sin(angle);
            return <circle key={i} cx={x} cy={y} r="4" fill="#ffd700" />;
          })}
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-lg">
        <div className="flex flex-col items-center">
          <span className="font-display font-bold text-xl text-white/50 tracking-[0.4em] uppercase">
            FUT
          </span>
          <h1 className="font-display font-bold text-6xl md:text-8xl text-gold tracking-tight leading-none text-glow-gold">
            DRAFT
          </h1>
        </div>

        {error && (
          <div className="bg-ucl-red/10 border border-ucl-red/30 rounded-lg px-4 py-3 text-ucl-red text-sm font-body">
            {error.includes('players.json')
              ? 'Player data not found. Run `npm run generate` after adding data/players.csv.'
              : error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Button variant="primary" size="lg" onClick={onStart} disabled={isLoading} className="flex-1">
            {isLoading ? 'Loading…' : 'Start Draft'}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setShowLeaderboard(true)} className="flex-1">
            Leaderboard
          </Button>
        </div>

        <button
          type="button"
          onClick={openRules}
          className="font-display text-[10px] uppercase tracking-widest text-white/35 hover:text-gold/80 transition-colors"
        >
          How to play
        </button>
      </div>

      <RulesModal isOpen={rulesOpen} onClose={closeRules} />

      <Modal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} size="md">
        <div className="p-6">
          <h2 className="font-display font-bold text-xl text-white mb-4">Leaderboard</h2>
          <Leaderboard />
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
