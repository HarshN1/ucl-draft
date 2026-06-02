'use client';

import type { Player, DraftedPlayer, Formation, ChemistryPreview } from '@/types';
import { DraftPicker } from '@/components/draft/DraftPicker';
import { ChemistryBar } from '@/components/draft/ChemistryBar';
import { PlayerCard } from '@/components/draft/PlayerCard';

interface DraftScreenProps {
  formation: Formation;
  currentPickIndex: number;
  pendingSlotIndices: number[];
  currentCards: Player[];
  draftedStarters: DraftedPlayer[];
  currentChemistry: ChemistryPreview;
  onPick: (player: Player) => void;
}

export function DraftScreen({
  formation,
  currentPickIndex,
  pendingSlotIndices,
  currentCards,
  draftedStarters,
  currentChemistry,
  onPick,
}: DraftScreenProps) {
  const totalSlots = formation.positions.length;
  const isCaptainPick = currentPickIndex === 0;
  // For captain pick, show "CAP" label; otherwise show the next pending slot
  const currentSlotIndex = isCaptainPick ? null : pendingSlotIndices[0] ?? null;
  const currentSlot = currentSlotIndex !== null
    ? formation.positions[currentSlotIndex]
    : null;

  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto w-full">
        <div>
          <div className="font-display text-white/30 text-xs uppercase tracking-widest">
            {formation.name} · {isCaptainPick ? 'Captain Pick' : `Pick ${currentPickIndex + 1}/${totalSlots}`}
          </div>
          <h2 className="font-display font-bold text-2xl text-white">
            {isCaptainPick ? '⚡ Choose Your Captain' : 'Select a Player'}
          </h2>
        </div>

        {/* Progress bar */}
        <div className="w-40">
          <div className="flex justify-between text-xs text-white/30 font-display mb-1">
            <span>{currentPickIndex}</span>
            <span>{totalSlots} players</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${(currentPickIndex / totalSlots) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-8 max-w-6xl mx-auto w-full flex-wrap justify-center">
        {/* Left: already drafted */}
        <div className="flex flex-col gap-2 w-36">
          <div className="font-display text-xs text-white/30 uppercase tracking-widest mb-1">
            Drafted
          </div>
          {draftedStarters.map((dp) => (
            <div key={dp.slotIndex} className="flex items-center gap-2">
              <span className="text-white/30 font-display text-xs w-8">{dp.slot}</span>
              <span className="text-white text-xs font-body truncate flex-1">
                {dp.player.name}
              </span>
              <span className="text-white/40 font-display text-xs">{dp.player.overall}</span>
            </div>
          ))}
          {/* Remaining slots */}
          {(pendingSlotIndices ?? []).map((si) => (
            <div key={`empty-${si}`} className="flex items-center gap-2 opacity-30">
              <span className="font-display text-xs w-8 text-white/20">
                {formation.positions[si]?.slot ?? '?'}
              </span>
              <div className="h-3 w-16 bg-white/10 rounded" />
            </div>
          ))}
          {isCaptainPick && (
            <div className="flex items-center gap-2 opacity-50">
              <span className="font-display text-xs w-8 text-accent">CAP</span>
              <div className="h-3 w-16 bg-accent/20 rounded" />
            </div>
          )}

          {/* Chemistry so far */}
          <div className="mt-4">
            <ChemistryBar value={currentChemistry.total} label="Live Chem" />
          </div>
        </div>

        {/* Center: card picker */}
        <div className="flex-1 flex items-center justify-center min-w-[400px]">
          <DraftPicker
            cards={currentCards}
            slotLabel={isCaptainPick ? 'CAPTAIN' : (currentSlot?.slot ?? '?')}
            slotIndex={currentSlotIndex ?? 0}
            formation={formation}
            draftedStarters={draftedStarters}
            currentChemistry={currentChemistry}
            isCaptainPick={isCaptainPick}
            onPick={onPick}
          />
        </div>

        {/* Right: mini squad view (drafted cards) */}
        <div className="w-36 flex flex-col gap-1">
          <div className="font-display text-xs text-white/30 uppercase tracking-widest mb-1">
            Squad
          </div>
          <div className="flex flex-wrap gap-1">
            {draftedStarters.map((dp) => (
              <PlayerCard
                key={dp.slotIndex}
                player={dp.player}
                size="sm"
                chemScore={dp.chemistry}
                showChemDot
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
