'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { Squad, BracketTeam, MatchResult } from '@/types';
import { simulateMatch } from '@/engine/matchSimulator';
import { EventFeed } from '@/components/match/EventFeed';
import { MatchStats } from '@/components/match/MatchStats';
import { PostMatchModal } from '@/components/match/PostMatchModal';

interface MatchScreenProps {
  squad: Squad;
  opponent: BracketTeam;
  roundIndex: number;
  roundName: string;
  isFinalRound: boolean;
  onMatchComplete: (result: MatchResult) => void;
  onContinue: () => void;
  playGoalSound?: () => void;
}

export function MatchScreen({
  squad,
  opponent,
  roundIndex,
  roundName,
  isFinalRound,
  onMatchComplete,
  onContinue,
  playGoalSound,
}: MatchScreenProps) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [eventsComplete, setEventsComplete] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);

  useEffect(() => {
    const r = simulateMatch(squad, opponent, roundIndex);
    setResult(r);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAllEventsShown() {
    setEventsComplete(true);
    if (result) onMatchComplete(result);
  }

  function handleContinue() {
    setShowPostMatch(false);
    onContinue();
  }

  const userScore = result ? result.userScore : 0;
  const oppScore = result ? result.opponentScore : 0;

  return (
    <div className="h-full overflow-hidden flex flex-col px-3 py-2 md:py-3">
      <div className="flex items-center justify-center mb-2 shrink-0">
        <div className="bg-primary border border-white/10 rounded-xl px-5 py-2 text-center min-w-[240px]">
          <div className="font-display text-white/30 text-[9px] uppercase tracking-widest mb-1">
            {roundName}
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-right">
              <div className="font-display font-bold text-white text-xs truncate max-w-[100px]">
                {squad.teamName}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-3xl md:text-4xl',
                  result && userScore > oppScore ? 'text-ucl-green' : 'text-white'
                )}
              >
                {result ? userScore : '–'}
              </div>
            </div>
            <div className="font-display text-white/30 text-xl">–</div>
            <div className="text-left">
              <div className="font-display font-bold text-white text-xs truncate max-w-[100px]">
                {opponent.name}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-3xl md:text-4xl',
                  result && oppScore > userScore ? 'text-ucl-red' : 'text-white'
                )}
              >
                {result ? oppScore : '–'}
              </div>
            </div>
          </div>
          {result?.wentToET && (
            <div className="font-display text-[9px] text-gold mt-0.5 uppercase tracking-widest">
              {result.wentToPenalties
                ? `${result.userPenScore}–${result.oppPenScore} pens`
                : 'AET'}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 max-w-5xl mx-auto w-full justify-center items-stretch">
        <div className="flex-1 min-w-0 max-w-md flex flex-col min-h-0">
          <div className="font-display text-[9px] text-white/30 uppercase tracking-widest mb-1 shrink-0">
            Match Events
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {result ? (
              <EventFeed
                events={result.events}
                onAllEventsShown={handleAllEventsShown}
                onGoalEvent={playGoalSound}
              />
            ) : (
              <div className="text-white/30 font-body text-sm animate-pulse">Loading match…</div>
            )}
          </div>
        </div>

        {eventsComplete && result && (
          <div className="w-44 shrink-0 animate-fade-in hidden sm:block">
            <div className="font-display text-[9px] text-white/30 uppercase tracking-widest mb-1">
              Stats
            </div>
            <MatchStats
              result={result}
              userTeamName={squad.teamName}
              opponentName={opponent.name}
            />
          </div>
        )}
      </div>

      {eventsComplete && result && (
        <div className="shrink-0 flex justify-center mt-2 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => setShowPostMatch(true)}
            className="font-display font-bold text-accent border border-accent/50 px-5 py-2 rounded-lg hover:bg-accent/10 transition-colors text-sm"
          >
            View Full Result →
          </button>
        </div>
      )}

      {result && (
        <PostMatchModal
          isOpen={showPostMatch}
          result={result}
          userTeamName={squad.teamName}
          opponent={opponent}
          roundName={roundName}
          isFinalRound={isFinalRound}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
