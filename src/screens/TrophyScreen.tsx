'use client';

import { useState } from 'react';
import type { Squad } from '@/types';
import { getDraftScoreTier } from '@/types';
import { Button } from '@/components/ui/Button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getRoundResultLabel } from '@/engine/bracketEngine';

interface TrophyScreenProps {
  squad: Squad;
  isChampion: boolean;
  roundReached: number;
  onPlayAgain: () => void;
}

function Confetti() {
  const colors = ['#ffd700', '#00d4ff', '#00ff88', '#ffffff', '#ffd700'];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 40 }, (_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            backgroundColor: colors[i % colors.length],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2.5 + Math.random() * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TrophyScreen({
  squad,
  isChampion,
  roundReached,
  onPlayAgain,
}: TrophyScreenProps) {
  const [saved, setSaved] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState(squad.teamName);
  const { saveEntry } = useLeaderboard();

  const tier = getDraftScoreTier(squad.draftScore);
  const resultLabel = isChampion
    ? 'Champions'
    : getRoundResultLabel(roundReached, false);

  function handleSave() {
    saveEntry(teamNameInput || squad.teamName, squad.formation.name, squad.draftScore, resultLabel);
    setSaved(true);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {isChampion && <Confetti />}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isChampion
            ? 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,215,0,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,68,68,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md w-full">
        {/* Trophy or elimination */}
        <div className="text-8xl">{isChampion ? '🏆' : '❌'}</div>

        <div>
          {isChampion ? (
            <>
              <h1 className="font-display font-bold text-5xl text-gold animate-shimmer bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent bg-[length:200%_auto]">
                CHAMPIONS OF EUROPE
              </h1>
              <p className="font-body text-white/50 mt-2">
                You&apos;ve conquered the UCL. Legendary.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-4xl text-ucl-red">
                ELIMINATED
              </h1>
              <p className="font-body text-white/50 mt-2">{resultLabel}</p>
            </>
          )}
        </div>

        {/* Draft Score summary */}
        <div className="bg-primary border border-white/10 rounded-xl px-6 py-4 w-full">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display font-bold text-2xl text-white">
                {squad.ovrAvg}
              </div>
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">
                OVR
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ucl-green">
                {squad.chemistry}
              </div>
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">
                Chem
              </div>
            </div>
            <div>
              <div
                className={`font-display font-bold text-2xl ${
                  squad.draftScore >= 190
                    ? 'text-gold'
                    : squad.draftScore >= 180
                    ? 'text-accent'
                    : 'text-white'
                }`}
              >
                {squad.draftScore}
              </div>
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">
                Draft Score
              </div>
            </div>
          </div>
          <div className="mt-2 font-body text-white/40 text-xs">{tier}</div>
        </div>

        {/* Save to leaderboard */}
        {!saved ? (
          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={teamNameInput}
              onChange={(e) => setTeamNameInput(e.target.value.slice(0, 24))}
              placeholder="Team name"
              className="w-full bg-primary border border-white/20 rounded-lg px-4 py-2.5 font-body text-white placeholder-white/30 focus:outline-none focus:border-accent text-sm"
            />
            <Button variant="gold" size="md" onClick={handleSave} className="w-full">
              Save to Leaderboard
            </Button>
          </div>
        ) : (
          <div className="font-body text-ucl-green text-sm">✓ Saved to leaderboard!</div>
        )}

        <Button variant="ghost" size="md" onClick={onPlayAgain} className="w-full">
          Play Again
        </Button>
      </div>
    </div>
  );
}
