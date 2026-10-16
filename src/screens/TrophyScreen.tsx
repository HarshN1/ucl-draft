'use client';

import { useState } from 'react';
import type { Squad, BracketTeam } from '@/types';
import { getDraftScoreTier } from '@/types';
import { Button } from '@/components/ui/Button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getRoundResultLabel } from '@/engine/bracketEngine';
import { proxied } from '@/lib/img';
import { shareResult } from '@/lib/share';
import { squadToSnapshot, buildShareUrl } from '@/lib/squadShare';

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
      {Array.from({ length: 30 }, (_, i) => {
        const leftPct = (i * 37 + 13) % 100;
        const topPct = (i * 19 + 5) % 20;
        const delaySec = ((i * 29) % 20) / 10;
        const durationSec = 2.5 + ((i * 17) % 15) / 10;
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm animate-confetti"
            style={{
              left: `${leftPct}%`,
              top: `-${topPct}%`,
              backgroundColor: colors[i % colors.length],
              animationDelay: `${delaySec}s`,
              animationDuration: `${durationSec}s`,
            }}
          />
        );
      })}
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'global' | 'local' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  const { saveEntry, saving } = useLeaderboard();

  const tier = getDraftScoreTier(squad.draftScore);
  const resultLabel = isChampion
    ? 'Champions'
    : getRoundResultLabel(roundReached, false);
  const snapshot = squadToSnapshot(squad);
  const shareUrl = buildShareUrl(snapshot);

  async function handleSaveLeaderboard() {
    setSaveError(null);
    try {
      const { mode } = await saveEntry({
        teamName: squad.teamName,
        formation: squad.formation.name,
        draftScore: squad.draftScore,
        result: resultLabel,
        squad: snapshot,
        shareUrl,
      });
      setSaveStatus(mode === 'global' ? 'global' : 'local');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleShare() {
    const result = await shareResult(
      squad.draftScore,
      resultLabel,
      squad.formation.name,
      squad.teamName,
      shareUrl
    );
    setShareStatus(result);
    if (result !== 'failed') {
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  }

  return (
    <div className="h-full overflow-hidden flex flex-col items-center justify-center px-3 py-3 relative">
      {isChampion && <Confetti />}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isChampion
            ? 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,215,0,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(255,68,68,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3 text-center max-w-md w-full pb-[env(safe-area-inset-bottom)]">
        <div className="text-5xl md:text-6xl">{isChampion ? '🏆' : '❌'}</div>

        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxied('https://cdn.sofifa.net/teams/918/60.png')}
            alt={squad.teamName}
            className="h-6 w-6 object-contain"
          />
          <span className="font-display font-bold uppercase tracking-wide text-white text-sm md:text-base">{squad.teamName}</span>
        </div>

        <div>
          {isChampion ? (
            <>
              <h1 className="font-display font-bold text-2xl md:text-3xl text-gold">CHAMPIONS OF EUROPE</h1>
              <p className="font-body text-white/50 mt-1 text-xs">You&apos;ve conquered the UCL.</p>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl md:text-3xl text-ucl-red">ELIMINATED</h1>
              <p className="font-body text-white/50 mt-1 text-xs">{resultLabel}</p>
            </>
          )}
        </div>

        {!isChampion && champion && (
          <div className="flex items-center gap-2 bg-gold/10 border border-gold/40 px-3 py-2 w-full">
            <span className="text-lg">🏆</span>
            {champion.badgeUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={proxied(champion.badgeUrl)}
                alt={champion.name}
                className="h-6 w-6 object-contain"
              />
            )}
            <div className="text-left min-w-0">
              <div className="font-display text-[9px] tracking-widest text-gold/70 uppercase">Winner</div>
              <div className="font-display font-bold text-white text-sm truncate">{champion.name}</div>
            </div>
          </div>
        )}

        <div className="bg-primary border border-white/10 px-4 py-3 w-full">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-display font-bold text-xl text-white">{squad.ovrAvg}</div>
              <div className="font-display text-[9px] text-white/30 uppercase tracking-widest">OVR</div>
            </div>
            <div>
              <div className="font-display font-bold text-xl text-ucl-green">{squad.chemistry}</div>
              <div className="font-display text-[9px] text-white/30 uppercase tracking-widest">Chem</div>
            </div>
            <div>
              <div
                className={`font-display font-bold text-xl ${
                  squad.draftScore >= 190
                    ? 'text-gold'
                    : squad.draftScore >= 180
                    ? 'text-accent'
                    : 'text-white'
                }`}
              >
                {squad.draftScore}
              </div>
              <div className="font-display text-[9px] text-white/30 uppercase tracking-widest">Score</div>
            </div>
          </div>
          <div className="mt-1 font-body text-white/40 text-[10px]">{tier}</div>
        </div>

        {saveStatus === 'global' && (
          <p className="font-display uppercase tracking-widest text-ucl-green text-xs">Saved to leaderboard</p>
        )}
        {saveStatus === 'local' && (
          <p className="font-display text-amber-400/90 text-[10px]">Saved on this device</p>
        )}
        {(saveError || saving) && saveStatus === 'idle' && (
          <p className="text-white/50 text-[10px] font-body">{saving ? 'Saving…' : saveError}</p>
        )}

        {saveStatus === 'idle' && (
          <Button variant="primary" size="sm" onClick={handleSaveLeaderboard} disabled={saving} className="w-full">
            Save to Leaderboard
          </Button>
        )}

        <Button variant="gold" size="sm" onClick={handleShare} className="w-full">
          {shareStatus === 'shared'
            ? 'Shared!'
            : shareStatus === 'copied'
            ? 'Link copied!'
            : `Share squad (${squad.draftScore})`}
        </Button>

        <Button variant="ghost" size="sm" onClick={onPlayAgain} className="w-full">
          Play Again
        </Button>
      </div>
    </div>
  );
}
