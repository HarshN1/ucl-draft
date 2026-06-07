'use client';

import type { BracketRound } from '@/types';
import { UCLBracket } from '@/components/bracket/UCLBracket';
import { Button } from '@/components/ui/Button';
import { findUserMatch } from '@/engine/bracketEngine';

interface BracketScreenProps {
  rounds: BracketRound[];
  currentRound: number;
  currentMatchIndex: number;
  onPlayMatch: () => void;
  teamName: string;
}

export function BracketScreen({
  rounds,
  currentRound,
  currentMatchIndex,
  onPlayMatch,
  teamName,
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
    <div className="h-full overflow-y-auto flex flex-col px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
        <div>
          <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-1">
            UCL Knockout Stage
          </div>
          <h2 className="font-display font-bold text-3xl text-white">
            <span className="text-accent">{roundName}</span>
          </h2>
        </div>

        {opponent && (
          <div className="text-right">
            <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-1">
              Your Next Match
            </div>
            <div className="font-display font-bold text-white text-lg">
              {teamName}{' '}
              <span className="text-white/30">vs</span>{' '}
              <span className="text-accent">{opponent.name}</span>
            </div>
            <div className="font-body text-white/40 text-xs mt-0.5">
              OVR {opponent.ovr}
            </div>
          </div>
        )}
      </div>

      {/* Bracket */}
      <div className="max-w-7xl mx-auto w-full flex-1">
        <UCLBracket
          rounds={rounds}
          currentRound={currentRound}
          currentMatchIndex={currentMatchIndex}
          onPlayMatch={onPlayMatch}
        />
      </div>

      {/* Play button */}
      <div className="flex justify-center mt-8">
        <Button variant="primary" size="lg" onClick={onPlayMatch}>
          ▶ Play Match
        </Button>
      </div>
    </div>
  );
}
