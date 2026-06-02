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
    <div className="min-h-screen flex flex-col px-4 py-8">
      {/* Score ticker */}
      <div className="flex items-center justify-center mb-8">
        <div className="bg-primary border border-white/10 rounded-xl px-8 py-4 text-center min-w-[280px]">
          <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-2">
            {roundName}
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="text-right">
              <div className="font-display font-bold text-white text-sm truncate max-w-[120px]">
                {squad.teamName}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-5xl',
                  result && userScore > oppScore ? 'text-ucl-green' : 'text-white'
                )}
              >
                {result ? userScore : '–'}
              </div>
            </div>
            <div className="font-display text-white/30 text-2xl">–</div>
            <div className="text-left">
              <div className="font-display font-bold text-white text-sm truncate max-w-[120px]">
                {opponent.name}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-5xl',
                  result && oppScore > userScore ? 'text-ucl-red' : 'text-white'
                )}
              >
                {result ? oppScore : '–'}
              </div>
            </div>
          </div>
          {result?.wentToET && (
            <div className="font-display text-xs text-gold mt-1">
              {result.wentToPenalties ? '(Penalties)' : '(After Extra Time)'}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-8 max-w-5xl mx-auto w-full flex-wrap justify-center">
        {/* Events feed */}
        <div className="flex-1 min-w-[280px] max-w-xl">
          <div className="font-display text-xs text-white/30 uppercase tracking-widest mb-3">
            Match Events
          </div>
          {result ? (
            <EventFeed
              events={result.events}
              onAllEventsShown={handleAllEventsShown}
              onGoalEvent={playGoalSound}
            />
          ) : (
            <div className="text-white/30 font-body text-sm animate-pulse">
              Loading match data...
            </div>
          )}
        </div>

        {/* Stats panel */}
        {eventsComplete && result && (
          <div className="w-64 animate-fade-in">
            <div className="font-display text-xs text-white/30 uppercase tracking-widest mb-3">
              Full-Time Stats
            </div>
            <MatchStats
              result={result}
              userTeamName={squad.teamName}
              opponentName={opponent.name}
            />
          </div>
        )}
      </div>

      {/* View result button */}
      {eventsComplete && result && (
        <div className="flex justify-center mt-8 animate-fade-in">
          <button
            onClick={() => setShowPostMatch(true)}
            className="font-display font-bold text-accent border border-accent/50 px-6 py-3 rounded-lg hover:bg-accent/10 transition-colors"
          >
            View Full Result →
          </button>
        </div>
      )}

      {/* Post-match modal */}
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
