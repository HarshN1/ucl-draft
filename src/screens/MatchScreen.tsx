'use client';

import { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import type { Squad, BracketTeam, MatchResult, MatchEvent } from '@/types';
import { EventFeed } from '@/components/match/EventFeed';
import { MatchStats } from '@/components/match/MatchStats';
import { PostMatchModal } from '@/components/match/PostMatchModal';

interface MatchScreenProps {
  squad: Squad;
  opponent: BracketTeam;
  roundIndex: number;
  roundName: string;
  isFinalRound: boolean;
  matchResult: MatchResult | null;
  onSimulate: () => void;
  onMatchComplete: (result: MatchResult) => void;
  onContinue: () => void;
  playGoalSound?: () => void;
}

export function MatchScreen({
  squad,
  opponent,
  roundName,
  isFinalRound,
  matchResult,
  onSimulate,
  onMatchComplete,
  onContinue,
  playGoalSound,
}: MatchScreenProps) {
  const [currentMinute, setCurrentMinute] = useState(0);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [highlightEvent, setHighlightEvent] = useState<MatchEvent | null>(null);
  const [eventsComplete, setEventsComplete] = useState(false);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const acknowledgedRef = useRef(false);
  const playedGoalMinutesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!matchResult) onSimulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalMinute = matchResult?.wentToET ? 120 : 90;

  useEffect(() => {
    if (!matchResult || eventsComplete) return;

    if (currentMinute >= finalMinute) {
      setEventsComplete(true);
      setHighlightEvent(null);
      if (!acknowledgedRef.current) {
        acknowledgedRef.current = true;
        onMatchComplete(matchResult);
      }
      return;
    }

    const nextMin = currentMinute + 1;
    const minEvents = matchResult.events.filter((e) => e.minute === nextMin);
    const goalEv = minEvents.find((e) => e.isGoal);
    const bigEv =
      goalEv ??
      minEvents.find(
        (e) => e.type === 'SAVE' || e.type === 'SUBSTITUTION' || e.type === 'RED_CARD'
      );

    // Zoom quickly through quiet minutes (~65ms at 1x, ~32ms at 2x),
    // slow down on big events so the user can read the broadcast commentary breakdown!
    let delay = speed === 2 ? 32 : 65;
    if (goalEv) {
      delay = speed === 2 ? 550 : 1050;
    } else if (bigEv) {
      delay = speed === 2 ? 320 : 620;
    } else if (minEvents.length > 0) {
      delay = speed === 2 ? 150 : 280;
    }

    const timer = setTimeout(() => {
      setCurrentMinute(nextMin);
      if (goalEv) {
        const key = `${goalEv.minute}-${goalEv.description}`;
        if (!playedGoalMinutesRef.current.has(key)) {
          playedGoalMinutesRef.current.add(key);
          playGoalSound?.();
        }
        setHighlightEvent(goalEv);
      } else if (bigEv) {
        setHighlightEvent(bigEv);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    matchResult,
    currentMinute,
    finalMinute,
    speed,
    eventsComplete,
    onMatchComplete,
    playGoalSound,
  ]);

  function handleSkipToFullTime() {
    if (!matchResult) return;
    setCurrentMinute(finalMinute);
    setEventsComplete(true);
    setHighlightEvent(null);
    if (!acknowledgedRef.current) {
      acknowledgedRef.current = true;
      onMatchComplete(matchResult);
    }
  }

  function handleContinue() {
    setShowPostMatch(false);
    onContinue();
  }

  const result = matchResult;
  // Live scoreboard: only count goals up to currentMinute so the final score is never spoiled early!
  const liveUserGoals = result
    ? eventsComplete
      ? result.userScore
      : result.events.filter((e) => e.isGoal && e.isUserTeam && e.minute <= currentMinute).length
    : 0;
  const liveOppGoals = result
    ? eventsComplete
      ? result.opponentScore
      : result.events.filter((e) => e.isGoal && !e.isUserTeam && e.minute <= currentMinute).length
    : 0;

  return (
    <div className="h-full overflow-hidden flex flex-col px-3 py-2 md:py-3">
      {/* Top Broadcast Scorebug & Sim Controls */}
      <div className="flex flex-col items-center justify-center mb-2 shrink-0 gap-1.5">
        <div className="bg-primary border border-gold/35 rounded-[4px] px-5 py-2 text-center min-w-[280px] sm:min-w-[360px] shadow-xl">
          <div className="flex items-center justify-between text-[9px] font-display uppercase tracking-widest text-white/45 mb-1">
            <span>{roundName}</span>
            <span
              className={clsx(
                'px-1.5 py-[1px] rounded-[2px] font-bold tabular-nums',
                eventsComplete
                  ? 'bg-gold/20 text-gold'
                  : 'bg-ucl-green/20 text-ucl-green animate-pulse'
              )}
            >
              {eventsComplete ? 'FULL TIME' : `${currentMinute}'`}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="text-right flex-1 min-w-0">
              <div className="font-display font-bold text-white text-xs sm:text-sm truncate">
                {squad.teamName}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-3xl md:text-4xl tabular-nums',
                  result && liveUserGoals > liveOppGoals ? 'text-ucl-green' : 'text-white'
                )}
              >
                {result ? liveUserGoals : '–'}
              </div>
            </div>
            <div className="font-display text-white/30 text-xl">–</div>
            <div className="text-left flex-1 min-w-0">
              <div className="font-display font-bold text-white text-xs sm:text-sm truncate">
                {opponent.name}
              </div>
              <div
                className={clsx(
                  'font-display font-bold text-3xl md:text-4xl tabular-nums',
                  result && liveOppGoals > liveUserGoals ? 'text-ucl-red' : 'text-white'
                )}
              >
                {result ? liveOppGoals : '–'}
              </div>
            </div>
          </div>

          {/* Match Clock Progress Bar */}
          <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gold transition-all duration-100"
              style={{ width: `${Math.min(100, (currentMinute / finalMinute) * 100)}%` }}
            />
          </div>

          {eventsComplete && result?.wentToET && (
            <div className="font-display text-[9px] text-gold mt-1 uppercase tracking-widest">
              {result.wentToPenalties
                ? `Penalties: ${result.userPenScore}–${result.oppPenScore}`
                : 'After Extra Time'}
            </div>
          )}
        </div>

        {/* Sim Speed Controls (1x / 2x / Skip to FT) */}
        {!eventsComplete && result && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpeed(1)}
              className={clsx(
                'px-2.5 py-0.5 rounded-[2px] font-display text-[10px] uppercase tracking-wider border transition-colors',
                speed === 1
                  ? 'bg-gold text-black border-gold font-bold'
                  : 'bg-black/40 text-white/60 border-white/15 hover:text-white'
              )}
            >
              1× Speed
            </button>
            <button
              type="button"
              onClick={() => setSpeed(2)}
              className={clsx(
                'px-2.5 py-0.5 rounded-[2px] font-display text-[10px] uppercase tracking-wider border transition-colors',
                speed === 2
                  ? 'bg-gold text-black border-gold font-bold'
                  : 'bg-black/40 text-white/60 border-white/15 hover:text-white'
              )}
            >
              2× Fast
            </button>
            <button
              type="button"
              onClick={handleSkipToFullTime}
              className="px-2.5 py-0.5 rounded-[2px] font-display text-[10px] uppercase tracking-wider border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Skip to FT ⏭
            </button>
          </div>
        )}
      </div>

      {/* Live Key-Event Slowdown Commentary Banner */}
      {highlightEvent && !eventsComplete && (
        <div
          className={clsx(
            'max-w-md w-full mx-auto mb-2 px-3 py-2 rounded-[3px] border text-center animate-fade-in shrink-0',
            highlightEvent.isGoal
              ? highlightEvent.isUserTeam
                ? 'bg-accent/20 border-accent text-white shadow-[0_0_16px_rgba(47,208,230,0.35)]'
                : 'bg-ucl-red/20 border-ucl-red text-white shadow-[0_0_16px_rgba(224,71,59,0.35)]'
              : highlightEvent.type === 'SUBSTITUTION'
                ? 'bg-gold/15 border-gold/60 text-gold'
                : 'bg-white/10 border-white/30 text-white'
          )}
        >
          <div className="font-display font-bold text-[10px] uppercase tracking-[0.2em] opacity-85">
            {highlightEvent.isGoal
              ? '⚽ KEY HIGHLIGHT — GOAL!'
              : highlightEvent.type === 'SUBSTITUTION'
                ? '🔄 TOUCHLINE — MANAGER TACTICAL SUB'
                : '🧤 KEY MOMENT — BIG SAVE'}
          </div>
          <div className="font-body text-xs sm:text-sm font-semibold mt-0.5">
            {highlightEvent.description}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-3 max-w-5xl mx-auto w-full justify-center items-stretch">
        <div className="flex-1 min-w-0 max-w-md flex flex-col min-h-0">
          <div className="font-display text-[9px] text-white/40 uppercase tracking-widest mb-1 shrink-0 flex items-center justify-between">
            <span>Live Commentary Breakdown</span>
            {squad.manager && (
              <span className="text-gold/80">Manager: {squad.manager.name}</span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {result ? (
              <EventFeed events={result.events} currentMinute={currentMinute} />
            ) : (
              <div className="text-white/30 font-body text-sm animate-pulse">Loading match…</div>
            )}
          </div>
        </div>

        {eventsComplete && result && (
          <div className="w-48 shrink-0 animate-fade-in hidden sm:block">
            <div className="font-display text-[9px] text-white/40 uppercase tracking-widest mb-1">
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

      {eventsComplete && result && (
        <div className="shrink-0 flex justify-center mt-2 pb-[env(safe-area-inset-bottom)]">
          <button
            onClick={() => setShowPostMatch(true)}
            className="font-display font-bold text-accent border border-accent/50 px-5 py-2 rounded-[3px] hover:bg-accent/10 transition-colors text-sm uppercase tracking-wider"
          >
            View Match Report →
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
