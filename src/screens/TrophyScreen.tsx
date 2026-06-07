'use client';

import { useState, useEffect, useRef } from 'react';
import type { Squad, BracketTeam } from '@/types';
import { getDraftScoreTier } from '@/types';
import { Button } from '@/components/ui/Button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getRoundResultLabel } from '@/engine/bracketEngine';
import { proxied } from '@/lib/img';
import { shareResult } from '@/lib/share';

interface TrophyScreenProps {
  squad: Squad;
  isChampion: boolean;
  roundReached: number;
  champion?: BracketTeam | null;
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
  champion,
  onPlayAgain,
}: TrophyScreenProps) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  const { saveEntry, saving } = useLeaderboard();
  const autoSaved = useRef(false);

  const tier = getDraftScoreTier(squad.draftScore);
  const resultLabel = isChampion
    ? 'Champions'
    : getRoundResultLabel(roundReached, false);

  // Auto-save to leaderboard on mount
  useEffect(() => {
    if (autoSaved.current) return;
    autoSaved.current = true;
    (async () => {
      try {
        await saveEntry(squad.teamName, squad.formation.name, squad.draftScore, resultLabel);
        setSaved(true);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save');
      }
    })();
  }, [squad.teamName, squad.formation.name, squad.draftScore, resultLabel, saveEntry]);

  async function handleShare() {
    const result = await shareResult(
      squad.draftScore,
      resultLabel,
      squad.formation.name,
      squad.teamName
    );
    setShareStatus(result);
    if (result !== 'failed') {
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center px-4 py-10 relative">
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
        <div className="text-8xl">{isChampion ? '🏆' : '❌'}</div>

        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxied('https://cdn.sofifa.net/teams/918/60.png')}
            alt={squad.teamName}
            className="h-7 w-7 object-contain"
          />
          <span className="font-display font-bold uppercase tracking-wide text-white text-lg">{squad.teamName}</span>
        </div>

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

        {!isChampion && champion && (
          <div className="flex items-center gap-3 bg-gold/10 border-2 border-gold/40 px-5 py-3">
            <span className="text-2xl">🏆</span>
            {champion.badgeUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxied(champion.badgeUrl)}
                alt={champion.name}
                className="h-8 w-8 object-contain"
              />
            )}
            <div className="text-left">
              <div className="font-display text-[10px] tracking-widest text-gold/70 uppercase">
                Tournament Winner
              </div>
              <div className="font-display font-bold text-white text-lg leading-tight">
                {champion.name}
              </div>
            </div>
          </div>
        )}

        <div className="bg-primary border-2 border-white/10 px-6 py-4 w-full">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display font-bold text-2xl text-white">{squad.ovrAvg}</div>
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">OVR</div>
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ucl-green">{squad.chemistry}</div>
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">Chem</div>
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
              <div className="font-display text-xs text-white/30 uppercase tracking-widest">Draft Score</div>
            </div>
          </div>
          <div className="mt-2 font-body text-white/40 text-xs">{tier}</div>
        </div>

        {(saveError || saving) && (
          <div className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white/50 text-xs font-body text-center">
            {saving ? 'Saving to leaderboard…' : saveError}
          </div>
        )}
        {saved && !saveError && (
          <div className="font-display uppercase tracking-widest text-ucl-green text-sm">✓ Saved to leaderboard</div>
        )}

        <Button variant="gold" size="md" onClick={handleShare} className="w-full">
          {shareStatus === 'shared'
            ? '✓ Shared!'
            : shareStatus === 'copied'
            ? '✓ Copied link!'
            : `📣 I scored ${squad.draftScore} — beat me`}
        </Button>

        <Button variant="ghost" size="md" onClick={onPlayAgain} className="w-full">
          Play Again
        </Button>
      </div>
    </div>
  );
}
