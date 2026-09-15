'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { BracketRound, BracketMatch } from '@/types';
import { BracketMatchCard } from './BracketMatchCard';

interface UCLBracketProps {
  rounds: BracketRound[];
  currentRound: number;
  currentMatchIndex: number;
  onPlayMatch?: () => void;
}

const COL_W = 156;

export function UCLBracket({
  rounds,
  currentRound,
  currentMatchIndex,
  onPlayMatch,
}: UCLBracketProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function fit() {
      const availW = outer!.clientWidth;
      const availH = outer!.clientHeight;
      const contentW = inner!.scrollWidth;
      const contentH = inner!.scrollHeight;
      if (!contentW || !contentH) return;
      const s = Math.min(1, availW / contentW, availH / contentH);
      setScale(s);
    }

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [rounds, currentRound]);

  return (
    <div ref={outerRef} className="w-full h-full overflow-hidden flex items-center justify-center">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: scale < 1 ? `${100 / scale}%` : '100%',
          height: scale < 1 ? `${100 / scale}%` : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div ref={innerRef} className="flex gap-0 shrink-0">
          {rounds.map((round, roundIdx) => (
            <div key={round.name} className="flex flex-col">
              <div
                className={clsx(
                  'font-display font-bold text-[10px] tracking-widest uppercase text-center mb-2 pb-1 border-b',
                  roundIdx === currentRound
                    ? 'text-accent border-accent/40'
                    : 'text-white/40 border-white/10'
                )}
                style={{ width: COL_W, minWidth: COL_W }}
              >
                {round.name}
              </div>

              <div
                className="flex flex-col relative"
                style={{
                  gap: `${getMatchSpacing(roundIdx)}px`,
                  paddingTop: `${getColumnPaddingTop(roundIdx)}px`,
                  width: COL_W,
                }}
              >
                {round.matches.map((match, matchIdx) => {
                  const isActive = roundIdx === currentRound && matchIdx === currentMatchIndex;
                  return (
                    <div key={match.id} className="relative flex items-center">
                      {roundIdx > 0 && (
                        <div
                          className="absolute -left-5 top-1/2 w-5 h-px bracket-line border-t border-dashed"
                          style={{ transform: 'translateY(-50%)' }}
                        />
                      )}

                      <div onClick={isActive && onPlayMatch ? onPlayMatch : undefined}>
                        <BracketMatchCard match={match} isActive={isActive} compact />
                      </div>

                      {roundIdx < rounds.length - 1 && (
                        <div
                          className="absolute -right-5 top-1/2 w-5 h-px bracket-line border-t border-dashed"
                          style={{ transform: 'translateY(-50%)' }}
                        />
                      )}
                    </div>
                  );
                })}

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
    </div>
  );
}

function getMatchSpacing(roundIdx: number): number {
  return 8 + roundIdx * 64;
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
  const cardHeight = 44;
  const pairs = Math.floor(matches.length / 2);

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ right: -20, top: 0, width: 20, height: '100%' }}
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
              x2="10" y2={topCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="10" y1={topCenter}
              x2="10" y2={bottomCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="10" y1={bottomCenter}
              x2="0" y2={bottomCenter}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
            <line
              x1="10" y1={midY}
              x2="20" y2={midY}
              stroke="rgba(0,212,255,0.3)" strokeWidth="1" strokeDasharray="3,3"
            />
          </g>
        );
      })}
    </svg>
  );
}
