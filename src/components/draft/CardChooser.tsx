'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { PlayerCard } from './PlayerCard';
import { positionCategory } from '@/engine/chemistryEngine';

interface CardChooserProps {
  cards: Player[];
  onPick: (player: Player) => void;
  chemForCandidate?: (player: Player) => number;
  baseChem?: number;
  slotGroup?: string;
  /** Scale cards to fit narrow containers (uses container query units). */
  fluid?: boolean;
}

export function CardChooser({
  cards,
  onPick,
  chemForCandidate,
  baseChem = 0,
  slotGroup,
  fluid,
}: CardChooserProps) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [cards]);

  function handle(p: Player, idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    setTimeout(() => onPick(p), fluid ? 150 : 200);
  }

  const cardSize = fluid ? 'sm' : 'md';
  const showChem = !!chemForCandidate;

  return (
    <div className="w-full overflow-hidden px-[clamp(4px,2cqw,16px)]">
      <div
        className="flex flex-nowrap items-end justify-center w-full draft-card-row"
        style={{ gap: fluid ? 'clamp(4px, 1.5cqw, 14px)' : undefined }}
      >
        {cards.map((card, idx) => {
          const isPicked = picked === idx;
          const isOther = picked !== null && picked !== idx;
          const delta = chemForCandidate ? chemForCandidate(card) - baseChem : null;
          return (
            <div
              key={card.id}
              className={clsx(
                'flex flex-col items-center gap-0.5 transition-transform duration-75 draft-card-slot',
                isOther && 'opacity-30 scale-90',
                isPicked && 'animate-card-flip'
              )}
            >
              <div className="relative animate-pack-flip" style={{ animationDelay: `${idx * 90}ms` }}>
                <PlayerCard
                  player={card}
                  isSelected={isPicked}
                  onClick={() => handle(card, idx)}
                  size={cardSize}
                  posFit={slotGroup ? positionCategory(card.position, slotGroup) : undefined}
                />
                <div
                  className="card-sheen"
                  style={{ ['--sheen-delay' as string]: `${idx * 90 + 380}ms` } as CSSProperties}
                />
              </div>
              <div className="h-[clamp(12px,2.5cqh,18px)]">
                {delta !== null && (showChem || delta !== 0) && (
                  <span
                    className={clsx(
                      'font-display font-bold draft-chem-delta',
                      delta > 0 ? 'text-ucl-green' : delta < 0 ? 'text-ucl-red' : 'text-white/40'
                    )}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta} chem
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
