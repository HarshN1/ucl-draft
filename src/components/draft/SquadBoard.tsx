'use client';

import { clsx } from 'clsx';
import type { Formation, Player, ChemistryPreview } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { PlayerCard } from './PlayerCard';
import { getAdjacency, positionCategory } from '@/engine/chemistryEngine';

type PositionFit = 'perfect' | 'related' | 'outOfRole' | 'wrong';

// Shield silhouette shared with PlayerCard (empty skeletons match real cards).
const SHIELD =
  'polygon(3% 8%, 9% 2%, 22% 0.6%, 40% 1.8%, 50% 3%, 60% 1.8%, 78% 0.6%, 91% 2%, 97% 8%, 98% 56%, 96% 76%, 86% 90%, 68% 98.5%, 50% 100%, 32% 98.5%, 14% 90%, 4% 76%, 2% 56%)';
const UNLIT_LINE = 'var(--chem-unlit)';

interface SquadBoardProps {
  formation: Formation;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  benchGroups: string[];
  subsCount: number;
  chem: ChemistryPreview;
  activeSlot: ActiveSlot | null;
  draggingSlot: ActiveSlot | null;
  swapSource: ActiveSlot | null;
  onSlotClick: (slot: ActiveSlot) => void;
  onDragStart: (slot: ActiveSlot) => void;
  onDrop: (slot: ActiveSlot) => void;
}

function linkColor(q: string) {
  if (q === 'green') return 'var(--chem-green)';
  if (q === 'yellow') return 'var(--chem-yellow)';
  return 'var(--chem-red)';
}

// Inset the formation coordinates so no card ever touches (and gets clipped by)
// the edge of the pitch.
const PADX = 8;
const PADY = 10;
const cx = (x: number) => PADX + (x / 100) * (100 - 2 * PADX);
const cy = (y: number) => PADY + ((100 - y) / 100) * (100 - 2 * PADY);

/** A drafted player on the pitch: compact card at rest, full card on hover. */
function PitchCard({
  player,
  chem,
  posFit,
  dragging,
  swapSelected,
  popoverBelow,
  onTap,
  onDragStart,
  onDrop,
}: {
  player: Player;
  chem?: number;
  posFit?: PositionFit;
  dragging?: boolean;
  swapSelected?: boolean;
  popoverBelow?: boolean;
  onTap?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}) {
  return (
    <div
      className="group relative -translate-x-1/2 -translate-y-1/2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onClick={onTap}
        className={clsx(
          'relative cursor-grab active:cursor-grabbing touch-manipulation',
          dragging && 'opacity-40',
          swapSelected && 'glow-active scale-105'
        )}
        title={`${player.name} — tap or drag to swap`}
      >
        <PlayerCard player={player} size="2xs" chemScore={chem} posFit={posFit} />
      </div>
      {/* Full card on hover — the same card you draft, with stats + club/league */}
      <div
        className={clsx(
          'hidden group-hover:block absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none drop-shadow-2xl',
          popoverBelow ? 'top-full mt-1' : 'bottom-full mb-1'
        )}
      >
        <PlayerCard player={player} size="sm" chemScore={chem} posFit={posFit} />
      </div>
    </div>
  );
}

/** Bench/reserve: peek (top of card) at rest, full card on hover. */
function BenchSlot({
  player,
  label,
  active,
  dragging,
  swapSelected,
  posFit,
  onClick,
  onDragStart,
  onDrop,
}: {
  player: Player | null;
  label: string;
  active?: boolean;
  dragging?: boolean;
  swapSelected?: boolean;
  posFit?: PositionFit;
  onClick?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}) {
  if (!player) {
    return (
      <div style={{ width: 50, height: 30 }} className="flex items-start justify-center overflow-visible">
        <CardSkeleton label={label} active={active} compact onClick={onClick} onDrop={onDrop} />
      </div>
    );
  }
  return (
    <div
      className="group relative overflow-hidden hover:overflow-visible hover:z-40"
      style={{ width: 50, height: 30 }}
      title={`${player.name} — drag to swap`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
    >
      {/* peek */}
      <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        className={clsx(
          'absolute top-0 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing touch-manipulation',
          dragging && 'opacity-40',
          swapSelected && 'glow-active scale-105'
        )}
      >
        <PlayerCard player={player} size="2xs" posFit={posFit} />
      </div>
      {/* full card on hover */}
      <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 pointer-events-none drop-shadow-2xl">
        <PlayerCard player={player} size="sm" posFit={posFit} />
      </div>
    </div>
  );
}

/** Empty starter outline — a shield-shaped slate skeleton with the slot label. */
function CardSkeleton({
  label,
  active,
  compact,
  onClick,
  onDrop,
}: {
  label: string;
  active?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onDrop?: () => void;
}) {
  const w = compact ? 36 : 50;
  const h = compact ? 52 : 72;
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      className={clsx(
        'cursor-pointer group relative',
        compact ? '' : '-translate-x-1/2 -translate-y-1/2',
        active && 'glow-active'
      )}
      style={{ width: w, height: h }}
    >
      {/* slate shield body */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: SHIELD,
          background: active
            ? 'linear-gradient(160deg, rgba(226,174,22,0.18), rgba(226,174,22,0.05))'
            : 'linear-gradient(160deg, rgba(30,41,59,0.55), rgba(15,23,42,0.4))',
        }}
      />
      {/* dashed inner border (inset shield) */}
      <div
        className="absolute"
        style={{
          inset: 4,
          clipPath: SHIELD,
          border: `1px dashed ${active ? 'rgba(226,174,22,0.8)' : 'rgba(148,163,184,0.45)'}`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={clsx(
            'font-display font-bold tracking-wide transition-colors',
            compact ? 'text-[7px]' : 'text-[9px]',
            active ? 'text-gold' : 'text-slate-400/70 group-hover:text-gold/70'
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function SquadBoard({
  formation,
  starterPlayers,
  benchPlayers,
  benchGroups,
  subsCount,
  chem,
  activeSlot,
  draggingSlot,
  swapSource,
  onSlotClick,
  onDragStart,
  onDrop,
}: SquadBoardProps) {
  const isActive = (zone: 'starter' | 'bench', i: number) =>
    activeSlot?.zone === zone && activeSlot.index === i;
  const isDragging = (zone: 'starter' | 'bench', i: number) =>
    draggingSlot?.zone === zone && draggingSlot.index === i;
  const isSwapSelected = (zone: 'starter' | 'bench', i: number) =>
    swapSource?.zone === zone && swapSource.index === i;

  // Full structural link graph — drawn immediately on formation lock. Each edge
  // is "unlit" charcoal until BOTH its slots are occupied, then it lights up.
  const adj = getAdjacency(formation);
  const litMap = new Map<string, string>();
  for (const l of chem.links) litMap.set(`${l.from}-${l.to}`, l.quality);
  const allLinks: Array<[number, number, string | null]> = [];
  for (let i = 0; i < adj.length; i++) {
    for (const j of adj[i]) {
      if (i < j) allLinks.push([i, j, litMap.get(`${i}-${j}`) ?? null]);
    }
  }

  const benchSlot = (i: number) => {
    const bp = benchPlayers[i] ?? null;
    const group = benchGroups[i] ?? '?';
    return (
      <BenchSlot
        key={i}
        player={bp}
        label={group}
        active={isActive('bench', i)}
        dragging={isDragging('bench', i)}
        swapSelected={isSwapSelected('bench', i)}
        posFit={bp && group !== 'RES' ? positionCategory(bp.position, group) : undefined}
        onClick={() => onSlotClick({ zone: 'bench', index: i })}
        onDragStart={() => onDragStart({ zone: 'bench', index: i })}
        onDrop={() => onDrop({ zone: 'bench', index: i })}
      />
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Pitch — wrapper is overflow-visible so hover cards aren't clipped; the
          grass + chem lines live in an inner clipped layer. */}
      <div
        className="relative mx-auto"
        style={{ aspectRatio: '7 / 9', height: 'min(64cqh, 680px)', maxWidth: '94cqw' }}
      >
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-white/10"
          style={{ background: 'linear-gradient(180deg,#0f2818,#0c2014 50%,#0f2818)' }}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="129" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <line x1="2" y1="66.5" x2="98" y2="66.5" stroke="#ffffff12" strokeWidth="0.5" />
            <circle cx="50" cy="66.5" r="10" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            {/* Top penalty area */}
            <rect x="22" y="2" width="56" height="18" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <rect x="35" y="2" width="30" height="6" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            {/* Bottom penalty area */}
            <rect x="22" y="113" width="56" height="18" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <rect x="35" y="125" width="30" height="6" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
          </svg>
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {allLinks.map(([from, to, quality], i) => {
              const a = formation.positions[from];
              const b = formation.positions[to];
              if (!a || !b) return null;
              const lit = quality !== null;
              return (
                <line
                  key={i}
                  x1={`${cx(a.x)}%`}
                  y1={`${cy(a.y)}%`}
                  x2={`${cx(b.x)}%`}
                  y2={`${cy(b.y)}%`}
                  stroke={lit ? linkColor(quality) : UNLIT_LINE}
                  strokeOpacity={lit ? 1 : 0.35}
                  strokeWidth={3}
                  strokeLinecap="round"
                  style={
                    lit
                      ? {
                          filter: `drop-shadow(0 0 3px ${linkColor(quality)}) drop-shadow(0 0 8px ${linkColor(quality)})`,
                        }
                      : undefined
                  }
                />
              );
            })}
          </svg>
        </div>

        {formation.positions.map((pos, i) => {
          const player = starterPlayers[i] ?? null;
          return (
            <div
              key={i}
              className="absolute"
              style={{ left: `${cx(pos.x)}%`, top: `${cy(pos.y)}%`, zIndex: player ? 5 : 1 }}
            >
              {player ? (
                <PitchCard
                  player={player}
                  chem={chem.perPlayer[i]}
                  posFit={positionCategory(player.position, pos.positionGroup)}
                  dragging={isDragging('starter', i)}
                  swapSelected={isSwapSelected('starter', i)}
                  popoverBelow={pos.y >= 52}
                  onTap={() => onSlotClick({ zone: 'starter', index: i })}
                  onDragStart={() => onDragStart({ zone: 'starter', index: i })}
                  onDrop={() => onDrop({ zone: 'starter', index: i })}
                />
              ) : (
                <CardSkeleton
                  label={pos.slot}
                  active={isActive('starter', i)}
                  onClick={() => onSlotClick({ zone: 'starter', index: i })}
                  onDrop={() => onDrop({ zone: 'starter', index: i })}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Substitutes */}
      <div className="mx-auto w-full max-w-xl">
        <div className="font-display text-[10px] tracking-[0.3em] text-white/40 uppercase mb-0.5 text-center">
          Substitutes
        </div>
        <div className="bench-strip flex flex-nowrap justify-center gap-1.5 rounded-lg pt-1.5 pb-2 px-2">
          {Array.from({ length: subsCount }, (_, k) => benchSlot(k))}
        </div>
      </div>

      {/* Reserves */}
      <div className="mx-auto w-full max-w-xl">
        <div className="font-display text-[10px] tracking-[0.3em] text-white/40 uppercase mb-0.5 text-center">
          Reserves
        </div>
        <div className="bench-strip flex flex-nowrap justify-center gap-1.5 rounded-lg pt-1.5 pb-2 px-2">
          {Array.from({ length: benchPlayers.length - subsCount }, (_, k) => benchSlot(subsCount + k))}
        </div>
      </div>
    </div>
  );
}
