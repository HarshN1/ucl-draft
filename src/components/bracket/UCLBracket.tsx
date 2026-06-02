'use client';

import { clsx } from 'clsx';
import type { BracketRound, BracketMatch } from '@/types';
import { BracketMatchCard } from './BracketMatchCard';

interface UCLBracketProps {
  rounds: BracketRound[];
  currentRound: number;
  currentMatchIndex: number;
  onPlayMatch?: () => void;
}

export function UCLBracket({
  rounds,
  currentRound,
  currentMatchIndex,
  onPlayMatch,
}: UCLBracketProps) {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-0 min-w-max mx-auto">
        {rounds.map((round, roundIdx) => (
          <div key={round.name} className="flex flex-col">
            {/* Round header */}
            <div
              className={clsx(
                'font-display font-bold text-xs tracking-widest uppercase text-center mb-3 pb-1 border-b',
                roundIdx === currentRound
                  ? 'text-accent border-accent/40'
                  : 'text-white/40 border-white/10'
              )}
              style={{ width: roundIdx === 3 ? '180px' : '180px', minWidth: '180px' }}
            >
              {round.name}
            </div>

            {/* Matches column */}
            <div
              className="flex flex-col relative"
              style={{
                gap: `${getMatchSpacing(roundIdx)}px`,
                paddingTop: `${getColumnPaddingTop(roundIdx)}px`,
                width: '180px',
              }}
            >
              {round.matches.map((match, matchIdx) => {
                const isActive = roundIdx === currentRound && matchIdx === currentMatchIndex;
                return (
                  <div key={match.id} className="relative flex items-center">
                    {/* Connector line from previous round */}
                    {roundIdx > 0 && (
                      <div
                        className="absolute -left-6 top-1/2 w-6 h-px bracket-line border-t border-dashed"
                        style={{ transform: 'translateY(-50%)' }}
                      />
                    )}

                    <div onClick={isActive && onPlayMatch ? onPlayMatch : undefined}>
                      <BracketMatchCard
                        match={match}
                        isActive={isActive}
                      />
                    </div>

                    {/* Connector line to next round */}
                    {roundIdx < rounds.length - 1 && (
                      <div
                        className="absolute -right-6 top-1/2 w-6 h-px bracket-line border-t border-dashed"
                        style={{ transform: 'translateY(-50%)' }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Vertical bracket lines connecting match pairs */}
              {roundIdx < rounds.length - 1 && round.matches.length > 1 && (
                <BracketConnectors
                  matches={round.matches}
                  matchSpacing={getMatchSpacing(roundIdx)}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getMatchSpacing(roundIdx: number): number {
  // Each subsequent round doubles the spacing
  return 12 + roundIdx * 76;
}

function getColumnPaddingTop(roundIdx: number): number {
  if (roundIdx === 0) return 0;
  return (getMatchSpacing(roundIdx) - getMatchSpacing(roundIdx - 1)) / 2;
}

function BracketConnectors({
  matches,
  matchSpacing,
}: {
  matches: BracketMatch[];
  matchSpacing: number;
}) {
  // Draw vertical lines connecting pairs of matches
  const cardHeight = 52; // approximate height of BracketMatchCard
  const pairs = Math.floor(matches.length / 2);

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ right: -24, top: 0, width: 24, height: '100%' }}
    >
      {Array.from({ length: pairs }, (_, i) => {
        const topMatchIdx = i * 2;
        const bottomMatchIdx = i * 2 + 1;
        const topCenter = topMatchIdx * (cardHeight + matchSpacing) + cardHeight / 2;
        const bottomCenter = bottomMatchIdx * (cardHeight + matchSpacing) + cardHeight / 2;
        const midY = (topCenter + bottomCenter) / 2;

        return (
          <g key={i}>
            <line
              x1="0" y1={topCenter}
              x2="12" y2={topCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="12" y1={topCenter}
              x2="12" y2={bottomCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="12" y1={bottomCenter}
              x2="0" y2={bottomCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="12" y1={midY}
              x2="24" y2={midY}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
          </g>
        );
      })}
    </svg>
  );
}
