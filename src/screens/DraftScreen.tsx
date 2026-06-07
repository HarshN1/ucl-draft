'use client';

import { useState } from 'react';
import type { Player, Formation, ChemistryPreview } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { SquadBoard } from '@/components/draft/SquadBoard';
import { CardChooser } from '@/components/draft/CardChooser';

interface DraftScreenProps {
  formation: Formation;
  awaitingCaptain: boolean;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  benchGroups: string[];
  subsCount: number;
  activeSlot: ActiveSlot | null;
  currentCards: Player[];
  chemPreview: ChemistryPreview;
  squadRating: number;
  filledCount: number;
  getChemPreviewForCandidate: (p: Player) => number;
  onPickCaptain: (p: Player) => void;
  onSelectSlot: (s: ActiveSlot) => void;
  onPickPlayer: (p: Player) => void;
  onSwapSlots: (a: ActiveSlot, b: ActiveSlot) => void;
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-pod text-center">
      <div className="font-display font-bold text-4xl leading-none" style={{ color }}>
        {value}
      </div>
      <div className="font-display text-[10px] tracking-widest text-white/40 uppercase mt-1">{label}</div>
    </div>
  );
}

export function DraftScreen(props: DraftScreenProps) {
  const {
    formation, awaitingCaptain, starterPlayers, benchPlayers, benchGroups, subsCount,
    activeSlot, currentCards, chemPreview, squadRating, filledCount,
    getChemPreviewForCandidate, onPickCaptain, onSelectSlot,
    onPickPlayer, onSwapSlots,
  } = props;

  const [draggingSlot, setDraggingSlot] = useState<ActiveSlot | null>(null);
  const picking = awaitingCaptain || !!activeSlot;

  const chemColor =
    chemPreview.total > 75 ? '#16d36a' : chemPreview.total >= 50 ? '#e0a000' : '#d63a3a';

  function handleDrop(target: ActiveSlot) {
    if (draggingSlot && !(draggingSlot.zone === target.zone && draggingSlot.index === target.index)) {
      onSwapSlots(draggingSlot, target);
    }
    setDraggingSlot(null);
  }

  const activeLabel =
    activeSlot?.zone === 'starter'
      ? formation.positions[activeSlot.index]?.slot
      : activeSlot
      ? benchGroups[activeSlot.index]
      : '';
  const activeGroup =
    activeSlot?.zone === 'starter'
      ? formation.positions[activeSlot.index]?.positionGroup
      : activeSlot
      ? benchGroups[activeSlot.index]
      : undefined;

  return (
    <div className="h-full flex flex-col px-4 py-3 overflow-hidden" onDragEnd={() => setDraggingSlot(null)}>
      {/* Counters */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full mb-2 shrink-0">
        <Counter label="Rating" value={squadRating} color="#ffffff" />
        <div className="text-center">
          <div className="font-display text-white/30 text-[10px] uppercase tracking-widest">
            {formation.name}
          </div>
          <div className="font-display font-bold text-2xl text-accent">{filledCount}/23 DRAFTED</div>
        </div>
        <Counter label="Chemistry" value={chemPreview.total} color={chemColor} />
      </div>

      {/* Board */}
      <div className="max-w-xl mx-auto w-full flex-1 min-h-0 flex flex-col justify-center overflow-visible">
        <SquadBoard
          formation={formation}
          starterPlayers={starterPlayers}
          benchPlayers={benchPlayers}
          benchGroups={benchGroups}
          subsCount={subsCount}
          chem={chemPreview}
          activeSlot={activeSlot}
          draggingSlot={draggingSlot}
          onSlotClick={(s) => {
            const occupied = s.zone === 'starter' ? starterPlayers[s.index] : benchPlayers[s.index];
            if (!occupied && !awaitingCaptain) onSelectSlot(s);
          }}
          onDragStart={(s) => setDraggingSlot(s)}
          onDrop={handleDrop}
        />
      </div>

      {/* Hint banner when idle */}
      {!picking && (
        <div className="text-center mt-4 font-body text-white/45 text-sm">
          Tap an <span className="text-accent">empty position</span> to draft it — pick the order
          yourself. Drag drafted players to rearrange.
        </div>
      )}

      {/* Draft picker modal overlay (contained within the console stage) */}
      {picking && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          <div className="absolute inset-0 draft-overlay" />
          <div className="relative z-10 w-full" style={{ perspective: '1200px' }}>
            {/* Bar across the screen */}
            <div className="w-full border-y-2 border-gold/50 bg-primary/80 py-4 text-center">
              <div className="font-display text-white/40 text-[10px] uppercase tracking-[0.35em]">
                {awaitingCaptain ? 'Choose your captain' : `Draft your ${activeLabel}`}
              </div>
              <div className="font-display font-bold uppercase text-3xl text-gold mt-1 text-glow-gold">
                {awaitingCaptain ? '⚡ Pick Your Captain' : `Pick ${activeLabel}`}
              </div>
            </div>

            <div className="mt-8 flex justify-center px-1">
              {awaitingCaptain ? (
                <CardChooser cards={currentCards} onPick={onPickCaptain} />
              ) : (
                <CardChooser
                  cards={currentCards}
                  onPick={onPickPlayer}
                  chemForCandidate={getChemPreviewForCandidate}
                  baseChem={chemPreview.total}
                  slotGroup={activeGroup}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
