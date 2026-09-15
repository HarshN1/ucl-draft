'use client';

import type { BracketRound } from '@/types';
import { UCLBracket } from '@/components/bracket/UCLBracket';
import { Button } from '@/components/ui/Button';
import { findUserMatch } from '@/engine/bracketEngine';
import { proxied } from '@/lib/img';

interface BracketScreenProps {
  rounds: BracketRound[];
  currentRound: number;
  currentMatchIndex: number;
  onPlayMatch: () => void;
  teamName: string;
  draftScore?: number;
}

export function BracketScreen({
  rounds,
  currentRound,
  currentMatchIndex,
  onPlayMatch,
  teamName,
  draftScore,
}: BracketScreenProps) {
  const userMatchInfo = findUserMatch(rounds, currentRound);
  const userMatch = userMatchInfo?.match;
  const opponent = userMatch
    ? userMatch.teamA.isUser
      ? userMatch.teamB
      : userMatch.teamA
    : null;

  const roundName = rounds[currentRound]?.name ?? '';

  return (
    <div className="h-full overflow-hidden flex flex-col px-2 md:px-3 py-2 md:py-3">
      <div className="max-w-7xl mx-auto w-full shrink-0 rounded-lg border border-white/10 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/90 px-3 py-2 mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-accent text-[9px] uppercase tracking-[0.3em]">
              UEFA Champions League
            </div>
            <h2 className="font-display font-bold text-lg md:text-xl text-white truncate">{roundName}</h2>
          </div>
          {opponent && (
            <div className="flex items-center gap-2 shrink-0 text-right">
              <div className="min-w-0">
                <div className="font-display text-white/35 text-[8px] uppercase tracking-widest">Next</div>
                <div className="font-display font-bold text-white text-xs md:text-sm truncate max-w-[140px]">
                  vs <span className="text-accent">{opponent.name}</span>
                </div>
              </div>
              {opponent.badgeUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proxied(opponent.badgeUrl)}
                  alt=""
                  className="h-8 w-8 object-contain shrink-0"
                />
              )}
            </div>
          )}
        </div>
        <div className="mt-1 font-display text-[9px] text-white/30 uppercase tracking-widest truncate">
          {teamName}
          {draftScore !== undefined ? ` · Draft score ${draftScore}` : ''}
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 min-h-0 rounded-lg border border-white/8 bg-black/20 p-1 md:p-2">
        <UCLBracket
          rounds={rounds}
          currentRound={currentRound}
          currentMatchIndex={currentMatchIndex}
          onPlayMatch={onPlayMatch}
        />
      </div>

      <div className="shrink-0 flex justify-center mt-2 pb-[env(safe-area-inset-bottom)] max-w-md mx-auto w-full">
        <Button variant="primary" size="md" onClick={onPlayMatch} className="w-full">
          Play Match
        </Button>
      </div>
    </div>
  );
}
