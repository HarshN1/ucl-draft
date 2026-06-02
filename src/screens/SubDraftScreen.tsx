'use client';

import { useState } from 'react';
import type { Player } from '@/types';
import { PlayerCard } from '@/components/draft/PlayerCard';

interface SubDraftScreenProps {
  currentPickIndex: number;
  currentCards: Player[];
  onPick: (player: Player) => void;
}

const CARD_ROTATIONS = [-8, -4, 0, 4, 8];

export function SubDraftScreen({
  currentPickIndex,
  currentCards,
  onPick,
}: SubDraftScreenProps) {
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Reset animation state when index changes
  const key = currentPickIndex;

  function handlePick(player: Player, idx: number) {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    setTimeout(() => {
      setPickedIdx(null);
      onPick(player);
    }, 300);
  }

  return (
    <div key={key} className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-1">
          Substitutes · {currentPickIndex + 1}/5
        </div>
        <h2 className="font-display font-bold text-4xl text-white">
          Pick Sub <span className="text-accent">{currentPickIndex + 1}</span>
        </h2>
        <p className="font-body text-white/30 text-sm mt-2">
          These won&apos;t affect your chemistry score.
        </p>
      </div>

      {/* Card fan */}
      <div className="relative flex items-end justify-center" style={{ height: 260, width: 450 }}>
        {currentCards.map((card, idx) => {
          const rotation = CARD_ROTATIONS[idx] ?? 0;
          const isHovered = hoveredIdx === idx;
          const isPicked = pickedIdx === idx;
          const isOther = pickedIdx !== null && pickedIdx !== idx;

          return (
            <div
              key={card.id}
              className={`absolute transition-all duration-300 ${isOther ? 'opacity-30 scale-90' : ''}`}
              style={{
                transform: isHovered
                  ? 'rotate(0deg) translateY(-20px)'
                  : isPicked
                  ? 'rotate(0deg) translateY(-40px) scale(1.08)'
                  : `rotate(${rotation}deg)`,
                left: `${idx * 82}px`,
                transformOrigin: 'bottom center',
                zIndex: isHovered || isPicked ? 10 : idx,
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <PlayerCard
                player={card}
                isSelected={isPicked}
                onClick={() => handlePick(card, idx)}
                size="md"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
