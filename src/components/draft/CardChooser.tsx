'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { PlayerCard } from './PlayerCard';
import { positionCategory } from '@/engine/chemistryEngine';

interface CardChooserProps {
  cards: Player[];
  onPick: (player: Player) => void;
  /** Optional: resulting team chemistry if this candidate is chosen (starters only). */
  chemForCandidate?: (player: Player) => number;
  baseChem?: number;
  /** Slot group being drafted — colours each card's position badge by fit. */
  slotGroup?: string;
}

export function CardChooser({ cards, onPick, chemForCandidate, baseChem = 0, slotGroup }: CardChooserProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    setPicked(null);
    setHovered(null);
  }, [cards]);

  function handle(p: Player, idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    setTimeout(() => onPick(p), 250);
  }

  return (
    <div className="flex flex-nowrap items-start justify-center gap-1 max-w-full overflow-x-auto pb-1 px-1">
      {cards.map((card, idx) => {
        const isPicked = picked === idx;
        const isOther = picked !== null && picked !== idx;
        const delta =
          chemForCandidate && hovered === idx ? chemForCandidate(card) - baseChem : null;
        return (
          <div
            key={card.id}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            className={clsx(
              'flex flex-col items-center gap-1 transition-transform duration-75',
              isOther && 'opacity-30 scale-90',
              isPicked && 'animate-card-flip'
            )}
          >
            {/* cascading 3D flip + sheen sweep, left → right */}
            <div className="relative animate-pack-flip" style={{ animationDelay: `${idx * 90}ms` }}>
              <PlayerCard
                player={card}
                isSelected={isPicked}
                onClick={() => handle(card, idx)}
                size="md"
                posFit={slotGroup ? positionCategory(card.position, slotGroup) : undefined}
              />
              <div className="card-sheen" style={{ ['--sheen-delay' as string]: `${idx * 90 + 380}ms` } as CSSProperties} />
            </div>
            <div className="h-4">
              {delta !== null && (
                <span
                  className={clsx(
                    'font-display text-[11px] font-bold',
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
  );
}
