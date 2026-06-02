'use client';

import { useState } from 'react';
import type { Squad } from '@/types';
import { DraftScoreCard } from '@/components/draft/DraftScoreCard';
import { Button } from '@/components/ui/Button';

interface DraftScoreScreenProps {
  squad: Squad;
  onContinue: (teamName: string) => void;
}

export function DraftScoreScreen({ squad, onContinue }: DraftScoreScreenProps) {
  const [teamName, setTeamName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    const name = teamName.trim() || 'My Team';
    setSubmitted(true);
    setTimeout(() => onContinue(name), 300);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-2">
            Draft Complete
          </div>
          <h2 className="font-display font-bold text-4xl text-white">
            Your <span className="text-accent">Draft Score</span>
          </h2>
        </div>

        <DraftScoreCard squad={squad} />

        {/* Team name input */}
        <div className="w-full flex flex-col gap-2">
          <label className="font-display text-xs text-white/40 uppercase tracking-widest">
            Name Your Team
          </label>
          <input
            type="text"
            placeholder="My Dream Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value.slice(0, 24))}
            maxLength={24}
            className="w-full bg-primary border border-white/20 rounded-lg px-4 py-3 font-body text-white placeholder-white/30 focus:outline-none focus:border-accent"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full"
        >
          Enter the UCL Draw →
        </Button>
      </div>
    </div>
  );
}
