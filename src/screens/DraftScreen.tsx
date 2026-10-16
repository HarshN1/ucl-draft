'use client';

import { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import type { Player, Formation, ChemistryPreview, Squad } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { SquadBoard } from '@/components/draft/SquadBoard';
import { CardChooser } from '@/components/draft/CardChooser';
import { Button } from '@/components/ui/Button';
import { DraftSideAction } from '@/components/draft/DraftSideAction';
import { SquadTab } from '@/components/draft/SquadTab';
import { SquadShareActions } from '@/components/draft/SquadShareActions';
import {
  calculateChemistry,
  getAdjacency,
  linkQuality,
} from '@/engine/chemistryEngine';
import { startersDrafted, weightedRating } from '@/engine/draftMachine';

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

/**
 * FIFA 16 Star Rating Indicator (0.5 to 5.0 stars based on Squad Rating).
 */
function StarMeter({ rating }: { rating: number }) {
  const stars = rating >= 83 ? 5 : rating >= 78 ? 4.5 : rating >= 74 ? 4 : rating > 0 ? 3.5 : 0;
  return (
    <div className="flex items-center gap-[2px]" aria-label={`${stars} stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = stars >= i + 1;
        const half = !filled && stars >= i + 0.5;
        return (
          <span
            key={i}
            className="text-[10px] leading-none"
            style={{ color: filled || half ? '#e2ae16' : 'rgba(255,255,255,0.2)' }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

/**
 * Authentic FIFA 16 HUD Pod for Rating (with 5-star bar) and Chemistry (with 0–100 bar).
 */
function FifaHudPod({
  label,
  value,
  delta,
  color,
  mode,
}: {
  label: string;
  value: number;
  delta?: number;
  color: string;
  mode: 'rating' | 'chemistry';
}) {
  const barPct = Math.max(0, Math.min(100, value));
  return (
    <div className="stat-pod min-w-[116px] sm:min-w-[144px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display tracking-widest text-white/60 uppercase draft-stat-label">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className="font-display font-bold leading-none draft-stat-value tabular-nums"
            style={{ color }}
          >
            {value}
          </span>
          {delta !== undefined && delta !== 0 && (
            <span
              className={clsx(
                'font-display font-bold text-xs tabular-nums',
                delta > 0 ? 'text-ucl-green' : 'text-ucl-red'
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-1.5">
        {mode === 'rating' && <StarMeter rating={value} />}
        <div className="flex-1 h-1.5 bg-black/55 rounded-[1px] overflow-hidden border border-white/10">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${barPct}%`, backgroundColor: color }}
          />
        </div>
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
  const [hoveredSlot, setHoveredSlot] = useState<ActiveSlot | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<Player | null>(null);
  const [squadPreview, setSquadPreview] = useState(false);
  const picking = !reviewMode && (awaitingCaptain || !!activeSlot);

  const handleHoverCandidate = useCallback((p: Player | null) => {
    setHoveredCandidate(p);
  }, []);

  /**
   * Live Hypothetical Board State:
   * - When hovering a candidate card in the 5-card ribbon, project that player
   *   onto the active slot so the pitch shows live Green/Orange/Red chemistry link lines!
   * - When a swap source is selected and hovering another slot, preview the swap live!
   */
  const { displayStarters, displayBench, displayChem, displayRating } = useMemo(() => {
    if (picking && hoveredCandidate && activeSlot) {
      const nextStarters = [...starterPlayers];
      const nextBench = [...benchPlayers];
      if (activeSlot.zone === 'starter') {
        nextStarters[activeSlot.index] = hoveredCandidate;
      } else {
        nextBench[activeSlot.index] = hoveredCandidate;
      }
      const previewChem =
        activeSlot.zone === 'starter'
          ? calculateChemistry(startersDrafted(nextStarters, formation), formation, shareSquad?.manager)
          : chemPreview;
      const previewRating = weightedRating(nextStarters, nextBench);
      return {
        displayStarters: nextStarters,
        displayBench: nextBench,
        displayChem: previewChem,
        displayRating: previewRating,
      };
    }

    if (!picking && swapSource && hoveredSlot && !sameSlot(swapSource, hoveredSlot)) {
      const nextStarters = [...starterPlayers];
      const nextBench = [...benchPlayers];
      const get = (s: ActiveSlot) =>
        s.zone === 'starter' ? nextStarters[s.index] : nextBench[s.index];
      const set = (s: ActiveSlot, p: Player | null) => {
        if (s.zone === 'starter') nextStarters[s.index] = p;
        else nextBench[s.index] = p;
      };
      const pa = get(swapSource) ?? null;
      const pb = get(hoveredSlot) ?? null;
      if (pa || pb) {
        set(swapSource, pb);
        set(hoveredSlot, pa);
        return {
          displayStarters: nextStarters,
          displayBench: nextBench,
          displayChem: calculateChemistry(
            startersDrafted(nextStarters, formation),
            formation,
            shareSquad?.manager
          ),
          displayRating: weightedRating(nextStarters, nextBench),
        };
      }
    }

    return {
      displayStarters: starterPlayers,
      displayBench: benchPlayers,
      displayChem: chemPreview,
      displayRating: squadRating,
    };
  }, [
    picking,
    hoveredCandidate,
    activeSlot,
    swapSource,
    hoveredSlot,
    starterPlayers,
    benchPlayers,
    formation,
    chemPreview,
    squadRating,
    shareSquad?.manager,
  ]);

  /**
   * FIFA 16 "Fade Unaffected Players" Swap Mode:
   * When `swapSource` is selected, dim any starter slot that doesn't link to
   * the swap source/target or share a club/league/nation link with the selected player.
   */
  const dimmedStarterIndices = useMemo(() => {
    if (!swapSource) return undefined;
    const selectedPlayer =
      swapSource.zone === 'starter'
        ? starterPlayers[swapSource.index]
        : benchPlayers[swapSource.index];
    if (!selectedPlayer) return undefined;

    const adj = getAdjacency(formation);
    const affected = new Set<number>();

    if (swapSource.zone === 'starter') {
      affected.add(swapSource.index);
      for (const n of adj[swapSource.index] ?? []) affected.add(n);
    }
    if (hoveredSlot?.zone === 'starter') {
      affected.add(hoveredSlot.index);
      for (const n of adj[hoveredSlot.index] ?? []) affected.add(n);
    }

    starterPlayers.forEach((p, idx) => {
      if (!p) return;
      if (linkQuality(selectedPlayer, p) !== 'red') {
        affected.add(idx);
      }
    });

    const dimmed = new Set<number>();
    for (let i = 0; i < formation.positions.length; i++) {
      if (!affected.has(i)) dimmed.add(i);
    }
    return dimmed;
  }, [swapSource, hoveredSlot, starterPlayers, benchPlayers, formation]);

  const chemColor =
    displayChem.total > 75 ? '#79b928' : displayChem.total >= 50 ? '#e2ae16' : '#e0473b';

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
        setHoveredSlot(null);
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
    setHoveredSlot(null);
  }

  const benchRole = activeSlot?.zone === 'bench' ? benchGroups[activeSlot.index] : '';
  const isReservePick = benchRole === 'RES';
  const activeLabel =
    activeSlot?.zone === 'starter'
      ? formation.positions[activeSlot.index]?.slot
      : activeSlot?.zone === 'bench'
        ? isReservePick
          ? 'Reserve'
          : `Substitute (${benchRole})`
        : '';
  const activeGroup =
    activeSlot?.zone === 'starter' ? formation.positions[activeSlot.index]?.positionGroup : undefined;

  function handlePickCaptain(p: Player) {
    setHoveredCandidate(null);
    onPlayPick?.();
    onPickCaptain(p);
  }

  function handlePickPlayer(p: Player) {
    setHoveredCandidate(null);
    onPlayPick?.();
    onPickPlayer(p);
  }

  const showQuickSim = !reviewMode && !!onQuickSimToReview;
  const showSubmit = reviewMode && !!onQuickSimToReview;
  const pickTitle = awaitingCaptain ? 'Choose Your Captain' : `Select Player — ${activeLabel}`;

  const chemDelta = displayChem.total - chemPreview.total;
  const ratingDelta = displayRating - squadRating;

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

      {/* FIFA 16 Top Broadcast HUD: Rating Pod | Formation & Progress | Chemistry Pod */}
      <div className="flex items-center justify-between w-full mb-[clamp(2px,0.8cqh,8px)] shrink-0 gap-2 px-[clamp(4px,2cqw,16px)] z-40">
        <FifaHudPod
          label="Rating"
          value={displayRating}
          delta={ratingDelta}
          color="#e2ae16"
          mode="rating"
        />
        <div className="text-center min-w-0 flex-1">
          <div className="font-display text-white/45 uppercase tracking-widest truncate draft-header-sub">
            {formation.name}
            {reviewMode && managerName ? ` · MGR: ${managerName}` : ''}
          </div>
          <div className="font-display font-bold text-accent draft-header-main">
            {reviewMode ? 'FINAL SQUAD' : `FUT DRAFT · ${filledCount}/23`}
          </div>
        </div>
        <FifaHudPod
          label="Chemistry"
          value={displayChem.total}
          delta={chemDelta}
          color={chemColor}
          mode="chemistry"
        />
      </div>

      {/* Pitch & Bench Board — stays sharp so live chemistry links shine behind the 5-card ribbon */}
      <div
        className={clsx(
          'flex-1 min-h-0 flex flex-col justify-center overflow-hidden w-full mx-auto draft-board-wrap',
          picking && !squadPreview && 'draft-board--dimmed',
          picking && squadPreview && 'draft-board--focused'
        )}
      >
        <SquadBoard
          formation={formation}
          starterPlayers={displayStarters}
          benchPlayers={displayBench}
          subsCount={subsCount}
          chem={displayChem}
          activeSlot={activeSlot}
          draggingSlot={draggingSlot}
          swapSource={swapSource}
          dimmedStarterIndices={dimmedStarterIndices}
          onSlotClick={handleSlotClick}
          onSlotHover={setHoveredSlot}
          onDragStart={(s) => {
            setSwapSource(null);
            setDraggingSlot(s);
          }}
          onDrop={handleDrop}
        />
      </div>

      {!picking && (
        <div className="shrink-0 mt-1 flex flex-col items-center gap-1.5 pb-[env(safe-area-inset-bottom)] px-2">
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
              △ Lock Squad & Pick Manager
            </Button>
          )}
          <p className="text-center font-body text-white/45 leading-snug px-2 draft-hint">
            {swapSource ? (
              <>
                Swap mode active (unaffected players dimmed) — tap another slot to{' '}
                <span className="text-gold">swap</span>
              </>
            ) : reviewMode ? (
              <>
                Rearrange starters & bench for max chemistry, then click{' '}
                <span className="text-gold">Submit</span>
              </>
            ) : allFilled ? (
              <>
                All 23 players drafted — click{' '}
                <span className="text-gold">Lock Squad & Pick Manager</span>
              </>
            ) : (
              <>Click any empty slot to draft 1 of 5 players · click or drag players to swap</>
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
            <div className="absolute inset-x-0 bottom-[clamp(42px,8cqh,76px)] z-40 draft-pick-band">
              <div className="draft-pick-band__inner">
                <div className="flex items-center justify-between px-2 mb-1">
                  <div className="draft-pick-band__title font-display font-bold uppercase text-gold">
                    {pickTitle}
                  </div>
                  <span className="font-display text-[10px] uppercase tracking-widest text-white/55 hidden sm:inline">
                    Hover a card to preview live pitch chemistry links · Hold [RT] Squad to inspect
                  </span>
                </div>
                <div className="draft-pick-band__cards">
                  {awaitingCaptain ? (
                    <CardChooser
                      cards={currentCards}
                      onPick={handlePickCaptain}
                      onHoverCandidate={handleHoverCandidate}
                      fluid
                    />
                  ) : (
                    <CardChooser
                      cards={currentCards}
                      onPick={handlePickPlayer}
                      onHoverCandidate={handleHoverCandidate}
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
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/85 bg-black/70 px-3 py-1 rounded-[2px] border border-gold/30">
                Inspecting Pitch — Release Squad Tab to Return to Picks
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
