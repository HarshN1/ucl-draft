'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { PlayerCard } from './PlayerCard';
import { positionCategory } from '@/engine/chemistryEngine';

interface CardChooserProps {
  cards: Player[];
  onPick: (player: Player) => void;
  onHoverCandidate?: (player: Player | null) => void;
  chemForCandidate?: (player: Player) => number;
  baseChem?: number;
  slotGroup?: string;
  /** Scale cards to fit narrow containers (uses container query units). */
  fluid?: boolean;
}

export function CardChooser({
  cards,
  onPick,
  onHoverCandidate,
  chemForCandidate,
  baseChem = 0,
  slotGroup,
  fluid,
}: CardChooserProps) {
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
    onHoverCandidate?.(null);
  }, [cards, onHoverCandidate]);

  function handle(p: Player, idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    onHoverCandidate?.(null);
    setTimeout(() => onPick(p), fluid ? 150 : 200);
  }

  const cardSize = fluid ? 'sm' : 'md';
  const showChem = !!chemForCandidate;

  return (
    <div
      className="w-full overflow-hidden px-[clamp(4px,2cqw,16px)]"
      onMouseLeave={() => onHoverCandidate?.(null)}
    >
      <div
        className="flex flex-nowrap items-end justify-center w-full draft-card-row"
        style={{ gap: fluid ? 'clamp(6px, 1.8cqw, 16px)' : undefined }}
      >
        {cards.map((card, idx) => {
          const isPicked = picked === idx;
          const isOther = picked !== null && picked !== idx;
          const delta = chemForCandidate ? chemForCandidate(card) - baseChem : null;
          const fit = slotGroup
            ? positionCategory(card.position, slotGroup, card.altPositions)
            : undefined;
          return (
            <div
              key={card.id}
              onMouseEnter={() => onHoverCandidate?.(card)}
              onFocus={() => onHoverCandidate?.(card)}
              className={clsx(
                'flex flex-col items-center gap-1 transition-transform duration-100 draft-card-slot',
                isOther && 'opacity-30 scale-90',
                isPicked && 'animate-card-flip'
              )}
            >
              <div className="relative animate-pack-flip" style={{ animationDelay: `${idx * 75}ms` }}>
                <PlayerCard
                  player={card}
                  isSelected={isPicked}
                  onClick={() => handle(card, idx)}
                  size={cardSize}
                  posFit={fit}
                />
                <div
                  className="card-sheen"
                  style={{ ['--sheen-delay' as string]: `${idx * 75 + 320}ms` } as CSSProperties}
                />
              </div>
              <div className="h-[clamp(14px,2.5cqh,20px)] flex items-center justify-center">
                {delta !== null && (showChem || delta !== 0) && (
                  <span
                    className={clsx(
                      'font-display font-bold draft-chem-delta px-1.5 py-[1px] rounded-[2px] border border-white/10 bg-black/50',
                      delta > 0 ? 'text-ucl-green' : delta < 0 ? 'text-ucl-red' : 'text-white/55'
                    )}
                  >
                    {delta > 0 ? `+${delta}` : delta} CHEM
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
