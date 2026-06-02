'use client';

import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { Player, DraftedPlayer, Formation, ChemistryPreview } from '@/types';
import { PlayerCard } from './PlayerCard';
import { ChemistryBar } from './ChemistryBar';
import { previewChemistryWithCandidate } from '@/engine/chemistryEngine';

interface DraftPickerProps {
  cards: Player[];
  slotLabel: string;
  slotIndex: number;
  formation: Formation;
  draftedStarters: DraftedPlayer[];
  currentChemistry: ChemistryPreview;
  isCaptainPick: boolean;
  onPick: (player: Player) => void;
}

const CARD_ROTATIONS = [-8, -4, 0, 4, 8];

export function DraftPicker({
  cards,
  slotLabel,
  slotIndex,
  formation,
  draftedStarters,
  currentChemistry,
  isCaptainPick,
  onPick,
}: DraftPickerProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [chemPreviews, setChemPreviews] = useState<number[]>([]);

  // Reset picked state when new cards arrive (new pick round)
  useEffect(() => {
    setPickedIdx(null);
    setHoveredIdx(null);
  }, [cards]);

  // Compute chemistry previews for all 5 cards
  useEffect(() => {
    const slot = formation.positions[slotIndex];
    if (!slot) return;
    const previews = cards.map((card) => {
      const provisional: DraftedPlayer = {
        player: card,
        slot: slot.slot,
        slotIndex,
        chemistry: 1,
      };
      return previewChemistryWithCandidate(draftedStarters, provisional, formation).total;
    });
    setChemPreviews(previews);
  }, [cards, slotIndex, formation, draftedStarters]);

  function handlePick(player: Player, idx: number) {
    if (pickedIdx !== null) return;
    setPickedIdx(idx);
    setTimeout(() => onPick(player), 300);
  }

  const hoveredChem = hoveredIdx !== null ? chemPreviews[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Slot label */}
      <div className="text-center">
        <div className="font-display font-bold text-white/50 text-xs tracking-widest uppercase">
          {isCaptainPick ? 'Choose Your Captain' : 'Picking Position'}
        </div>
        <div className="font-display font-bold text-accent text-2xl">{slotLabel}</div>
      </div>

      {/* Card fan */}
      <div className="relative flex items-end justify-center h-64">
        {cards.map((card, idx) => {
          const rotation = CARD_ROTATIONS[idx] ?? 0;
          const isHovered = hoveredIdx === idx;
          const isPicked = pickedIdx === idx;
          const isOtherPicked = pickedIdx !== null && pickedIdx !== idx;

          return (
            <div
              key={card.id}
              className={clsx(
                'absolute transition-all duration-300',
                isOtherPicked && 'opacity-30 scale-90'
              )}
              style={{
                transform: isHovered
                  ? `rotate(0deg) translateY(-20px)`
                  : isPicked
                  ? `rotate(0deg) translateY(-40px) scale(1.08)`
                  : `rotate(${rotation}deg)`,
                left: `${idx * 90}px`,
                transformOrigin: 'bottom center',
                zIndex: isHovered || isPicked ? 10 : idx,
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <PlayerCard
                player={card}
                isSelected={isPicked}
                chemScore={draftedStarters.length > 0 ? undefined : undefined}
                onClick={() => handlePick(card, idx)}
                size="md"
              />
            </div>
          );
        })}
      </div>

      {/* Chemistry preview */}
      <div className="w-64 space-y-2">
        <ChemistryBar
          value={hoveredChem ?? currentChemistry.total}
          label={hoveredChem !== null ? 'CHEM IF PICKED' : 'CURRENT CHEM'}
        />
        {hoveredChem !== null && (
          <div className="text-center">
            <span
              className={clsx(
                'font-display text-xs font-semibold',
                hoveredChem > currentChemistry.total
                  ? 'text-ucl-green'
                  : hoveredChem < currentChemistry.total
                  ? 'text-ucl-red'
                  : 'text-white/50'
              )}
            >
              {hoveredChem > currentChemistry.total && '+'}
              {hoveredChem - currentChemistry.total} vs current
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
