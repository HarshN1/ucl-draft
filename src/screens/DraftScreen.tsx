'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player, Formation, ChemistryPreview, Squad } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { SquadBoard } from '@/components/draft/SquadBoard';
import { CardChooser } from '@/components/draft/CardChooser';
import { Button } from '@/components/ui/Button';
import { DraftSideAction } from '@/components/draft/DraftSideAction';
import { SquadTab } from '@/components/draft/SquadTab';
import { SquadShareActions } from '@/components/draft/SquadShareActions';

interface DraftScreenProps {
  formation: Formation;
  awaitingCaptain: boolean;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  benchGroups: ReadonlyArray<string>;
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
  onConfirmSquad?: () => void;
  onFinishReview?: () => void;
  onQuickSimToReview?: () => void;
  allFilled?: boolean;
  reviewMode?: boolean;
  managerName?: string;
  shareSquad?: Squad | null;
  onPlayClick?: () => void;
  onPlayPick?: () => void;
}

function Counter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-pod text-center">
      <div
        className="font-display font-bold leading-none draft-stat-value"
        style={{ color }}
      >
        {value}
      </div>
      <div className="font-display tracking-widest text-white/40 uppercase mt-0.5 draft-stat-label">
        {label}
      </div>
    </div>
  );
}

function sameSlot(a: ActiveSlot, b: ActiveSlot) {
  return a.zone === b.zone && a.index === b.index;
}

export function DraftScreen(props: DraftScreenProps) {
  const {
    formation,
    awaitingCaptain,
    starterPlayers,
    benchPlayers,
    benchGroups,
    subsCount,
    activeSlot,
    currentCards,
    chemPreview,
    squadRating,
    filledCount,
    getChemPreviewForCandidate,
    onPickCaptain,
    onSelectSlot,
    onPickPlayer,
    onSwapSlots,
    onConfirmSquad,
    onQuickSimToReview,
    allFilled,
    reviewMode,
    managerName,
    shareSquad,
    onPlayClick,
    onPlayPick,
  } = props;

  const [draggingSlot, setDraggingSlot] = useState<ActiveSlot | null>(null);
  const [swapSource, setSwapSource] = useState<ActiveSlot | null>(null);
  const [squadPreview, setSquadPreview] = useState(false);
  const picking = !reviewMode && (awaitingCaptain || !!activeSlot);

  const chemColor =
    chemPreview.total > 75 ? '#16d36a' : chemPreview.total >= 50 ? '#e0a000' : '#d63a3a';

  function isOccupied(s: ActiveSlot) {
    return s.zone === 'starter' ? !!starterPlayers[s.index] : !!benchPlayers[s.index];
  }

  function handleSlotClick(s: ActiveSlot) {
    const occupied = isOccupied(s);

    if (swapSource) {
      if (sameSlot(swapSource, s)) {
        setSwapSource(null);
        return;
      }
      if (occupied) {
        onSwapSlots(swapSource, s);
        onPlayClick?.();
        setSwapSource(null);
        return;
      }
      setSwapSource(null);
    }

    if (!occupied && !awaitingCaptain) {
      onPlayClick?.();
      onSelectSlot(s);
      return;
    }

    if (occupied) {
      onPlayClick?.();
      setSwapSource(s);
    }
  }

  function handleDrop(target: ActiveSlot) {
    if (draggingSlot && !sameSlot(draggingSlot, target)) {
      onSwapSlots(draggingSlot, target);
      onPlayClick?.();
    }
    setDraggingSlot(null);
    setSwapSource(null);
  }

  const benchRole = activeSlot?.zone === 'bench' ? benchGroups[activeSlot.index] : '';
  const isReservePick = benchRole === 'RES';
  const activeLabel =
    activeSlot?.zone === 'starter'
      ? formation.positions[activeSlot.index]?.slot
      : activeSlot?.zone === 'bench'
        ? isReservePick
          ? 'Reserve'
          : 'Substitute'
        : '';
  const activeGroup =
    activeSlot?.zone === 'starter' ? formation.positions[activeSlot.index]?.positionGroup : undefined;

  function handlePickCaptain(p: Player) {
    onPlayPick?.();
    onPickCaptain(p);
  }

  function handlePickPlayer(p: Player) {
    onPlayPick?.();
    onPickPlayer(p);
  }

  const showQuickSim = !reviewMode && !!onQuickSimToReview;
  const showSubmit = reviewMode && !!onQuickSimToReview;
  const pickTitle = awaitingCaptain ? 'Pick Captain' : `Pick ${activeLabel}`;

  return (
    <div
      className="relative h-full w-full flex flex-col overflow-hidden draft-screen"
      onDragEnd={() => setDraggingSlot(null)}
    >
      {showQuickSim && (
        <DraftSideAction
          label="Quick Sim"
          onClick={() => {
            onPlayClick?.();
            onQuickSimToReview!();
          }}
        />
      )}
      {showSubmit && (
        <DraftSideAction
          label="Submit"
          variant="submit"
          onClick={() => {
            onPlayClick?.();
            onQuickSimToReview!();
          }}
        />
      )}

      <div className="flex items-center justify-between w-full mb-[clamp(2px,0.8cqh,8px)] shrink-0 gap-2 px-[clamp(4px,2cqw,16px)]">
        <Counter label="Rating" value={squadRating} color="#ffffff" />
        <div className="text-center min-w-0 flex-1">
          <div className="font-display text-white/30 uppercase tracking-widest truncate draft-header-sub">
            {formation.name}
            {reviewMode && managerName ? ` · ${managerName}` : ''}
          </div>
          <div className="font-display font-bold text-accent draft-header-main">
            {reviewMode ? 'FINAL SQUAD' : `${filledCount}/23`}
          </div>
        </div>
        <Counter label="Chemistry" value={chemPreview.total} color={chemColor} />
      </div>

      <div
        className={clsx(
          'flex-1 min-h-0 flex flex-col justify-center overflow-hidden w-full mx-auto draft-board-wrap',
          picking && !squadPreview && 'draft-board--dimmed',
          picking && squadPreview && 'draft-board--focused'
        )}
      >
        <SquadBoard
          formation={formation}
          starterPlayers={starterPlayers}
          benchPlayers={benchPlayers}
          subsCount={subsCount}
          chem={chemPreview}
          activeSlot={activeSlot}
          draggingSlot={draggingSlot}
          swapSource={swapSource}
          onSlotClick={handleSlotClick}
          onDragStart={(s) => {
            setSwapSource(null);
            setDraggingSlot(s);
          }}
          onDrop={handleDrop}
        />
      </div>

      {!picking && (
        <div className="shrink-0 mt-1 flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom)] px-2">
          {reviewMode && shareSquad && (
            <SquadShareActions squad={shareSquad} resultLabel="Draft" compact />
          )}
          {!reviewMode && allFilled && onConfirmSquad && (
            <Button
              variant="gold"
              size="md"
              onClick={() => {
                onPlayClick?.();
                onConfirmSquad();
              }}
              className="font-display tracking-widest uppercase text-sm"
            >
              △ Complete Squad
            </Button>
          )}
          <p className="text-center font-body text-white/40 leading-snug px-2 draft-hint">
            {swapSource ? (
              <>Tap another player to <span className="text-gold">swap</span></>
            ) : reviewMode ? (
              <>Rearrange, then <span className="text-gold">Submit</span> on the right</>
            ) : allFilled ? (
              <>All 23 picked — <span className="text-gold">Complete Squad</span></>
            ) : (
              <>Click empty slot to draft · drag to rearrange</>
            )}
          </p>
        </div>
      )}

      {picking && (
        <>
          <div
            className={clsx(
              'absolute inset-0 z-30 pointer-events-none transition-opacity duration-200',
              squadPreview ? 'draft-scrim--peek' : 'draft-scrim'
            )}
            aria-hidden
          />

          <SquadTab
            active={squadPreview}
            onActivate={() => setSquadPreview(true)}
            onDeactivate={() => setSquadPreview(false)}
            onToggle={() => setSquadPreview((v) => !v)}
          />

          {!squadPreview && (
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 draft-pick-band">
              <div className="draft-pick-band__inner">
                <div className="draft-pick-band__title font-display font-bold uppercase text-gold text-center">
                  {pickTitle}
                </div>
                <div className="draft-pick-band__cards">
                  {awaitingCaptain ? (
                    <CardChooser cards={currentCards} onPick={handlePickCaptain} fluid />
                  ) : (
                    <CardChooser
                      cards={currentCards}
                      onPick={handlePickPlayer}
                      chemForCandidate={getChemPreviewForCandidate}
                      baseChem={chemPreview.total}
                      slotGroup={activeGroup}
                      fluid
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {squadPreview && (
            <div className="absolute bottom-[clamp(8px,2cqh,20px)] left-0 right-0 z-40 text-center pointer-events-none">
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-white/45">
                Release Squad to pick
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
