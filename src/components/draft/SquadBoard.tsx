'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Formation, Player, ChemistryPreview } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { PlayerCard } from './PlayerCard';
import { getAdjacency, positionCategory } from '@/engine/chemistryEngine';

type PositionFit = 'perfect' | 'related' | 'outOfRole' | 'wrong';

const SHIELD =
  'polygon(3% 8%, 9% 2%, 22% 0.6%, 40% 1.8%, 50% 3%, 60% 1.8%, 78% 0.6%, 91% 2%, 97% 8%, 98% 56%, 96% 76%, 86% 90%, 68% 98.5%, 50% 100%, 32% 98.5%, 14% 90%, 4% 76%, 2% 56%)';
const UNLIT_LINE = 'var(--chem-unlit)';

const BENCH_PEEK_H = 28;

interface SquadBoardProps {
  formation: Formation;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  subsCount: number;
  chem: ChemistryPreview;
  activeSlot: ActiveSlot | null;
  draggingSlot: ActiveSlot | null;
  swapSource: ActiveSlot | null;
  compact?: boolean;
  readOnly?: boolean;
  onSlotClick: (slot: ActiveSlot) => void;
  onDragStart: (slot: ActiveSlot) => void;
  onDrop: (slot: ActiveSlot) => void;
}

function linkColor(q: string) {
  if (q === 'green') return 'var(--chem-green)';
  if (q === 'yellow') return 'var(--chem-yellow)';
  return 'var(--chem-red)';
}

const PADX = 8;
const PADY = 10;
const cx = (x: number) => PADX + (x / 100) * (100 - 2 * PADX);
const cy = (y: number) => PADY + ((100 - y) / 100) * (100 - 2 * PADY);

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
  readOnly,
  cardScale,
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
  readOnly?: boolean;
  cardScale?: number;
}) {
  const scale = cardScale ?? 1;
  return (
    <div
      className="group relative"
      onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
      onDrop={
        readOnly
          ? undefined
          : (e) => {
              e.preventDefault();
              onDrop?.();
            }
      }
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      <div
        draggable={!readOnly}
        onDragStart={readOnly ? undefined : onDragStart}
        onClick={readOnly ? undefined : onTap}
        className={clsx(
          'relative touch-manipulation',
          readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
          dragging && 'opacity-40',
          swapSelected && 'glow-active scale-105'
        )}
      >
        <PlayerCard player={player} size="2xs" chemScore={chem} posFit={posFit} />
      </div>
      {!readOnly && (
        <div
          className={clsx(
            'pitch-hover-card hidden group-hover:block absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none drop-shadow-2xl',
            popoverBelow ? 'top-full mt-1' : 'bottom-full mb-1'
          )}
        >
          <PlayerCard player={player} size="sm" chemScore={chem} posFit={posFit} />
        </div>
      )}
    </div>
  );
}

/** Single bench slot — collapsed peek; hover/scroll reveals full card above. */
function BenchSlot({
  player,
  label,
  isReserve,
  active,
  dragging,
  swapSelected,
  posFit,
  onClick,
  onDragStart,
  onDrop,
  readOnly,
}: {
  player: Player | null;
  label: string;
  isReserve?: boolean;
  active?: boolean;
  dragging?: boolean;
  swapSelected?: boolean;
  posFit?: PositionFit;
  onClick?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      className={clsx(
        'bench-slot group relative flex-1 min-w-0 max-w-[48px] rounded-sm transition-all duration-200',
        isReserve && 'opacity-90',
        active && 'ring-1 ring-gold/70',
        swapSelected && 'ring-2 ring-gold',
        !player && 'border border-dashed',
        !player ? 'border-white/25 bg-white/[0.03]' : 'border-white/10 bg-black/20'
      )}
      style={{ height: BENCH_PEEK_H }}
      onDragOver={readOnly ? undefined : (e) => e.preventDefault()}
      onDrop={
        readOnly
          ? undefined
          : (e) => {
              e.preventDefault();
              onDrop?.();
            }
      }
    >
      {player ? (
        <>
          <div
            className="absolute inset-0 overflow-hidden rounded-sm"
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : onDragStart}
            onClick={readOnly ? undefined : onClick}
            style={{ cursor: readOnly ? 'default' : 'grab' }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ opacity: dragging ? 0.35 : 1 }}
            >
              <PlayerCard player={player} size="2xs" posFit={posFit} />
            </div>
          </div>
          {!readOnly && (
            <div className="bench-slot-expand absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none drop-shadow-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <PlayerCard player={player} size="sm" posFit={posFit} />
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={readOnly}
          onClick={onClick}
          className="absolute inset-0 flex items-end justify-center pb-0.5 touch-manipulation disabled:cursor-default"
        >
          <span
            className={clsx(
              'font-display font-bold text-[8px] tracking-wide uppercase',
              active ? 'text-gold' : 'text-white/35'
            )}
          >
            {label}
          </span>
        </button>
      )}
    </div>
  );
}

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
      <div
        className="absolute inset-0"
        style={{
          clipPath: SHIELD,
          background: active
            ? 'linear-gradient(160deg, rgba(226,174,22,0.18), rgba(226,174,22,0.05))'
            : 'linear-gradient(160deg, rgba(30,41,59,0.55), rgba(15,23,42,0.4))',
        }}
      />
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
  subsCount,
  chem,
  activeSlot,
  draggingSlot,
  swapSource,
  compact = false,
  readOnly = false,
  onSlotClick,
  onDragStart,
  onDrop,
}: SquadBoardProps) {
  const [benchOpen, setBenchOpen] = useState(false);
  const noop = () => {};
  const onClick = readOnly ? noop : onSlotClick;
  const onDrag = readOnly ? noop : onDragStart;
  const onDropSlot = readOnly ? noop : onDrop;

  const isActive = (zone: 'starter' | 'bench', i: number) =>
    activeSlot?.zone === zone && activeSlot.index === i;
  const isDragging = (zone: 'starter' | 'bench', i: number) =>
    draggingSlot?.zone === zone && draggingSlot.index === i;
  const isSwapSelected = (zone: 'starter' | 'bench', i: number) =>
    swapSource?.zone === zone && swapSource.index === i;

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
    const isReserve = i >= subsCount;
    return (
      <BenchSlot
        key={i}
        player={bp}
        label=""
        isReserve={isReserve}
        active={isActive('bench', i)}
        dragging={isDragging('bench', i)}
        swapSelected={isSwapSelected('bench', i)}
        posFit={undefined}
        readOnly={readOnly}
        onClick={() => onClick({ zone: 'bench', index: i })}
        onDragStart={() => onDrag({ zone: 'bench', index: i })}
        onDrop={() => onDropSlot({ zone: 'bench', index: i })}
      />
    );
  };

  return (
    <div className="flex flex-col gap-1 h-full min-h-0">
      <div
        className="relative mx-auto w-full flex-1 min-h-0"
        style={{
          aspectRatio: '7 / 9',
          maxHeight: compact ? 'min(40cqh, 50vh)' : 'min(62cqh, 78vh)',
        }}
      >
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-white/10"
          style={{ background: 'linear-gradient(180deg,#0f2818,#0c2014 50%,#0f2818)' }}
        >
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="none">
            <rect x="2" y="2" width="96" height="129" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <line x1="2" y1="66.5" x2="98" y2="66.5" stroke="#ffffff12" strokeWidth="0.5" />
            <circle cx="50" cy="66.5" r="10" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <rect x="22" y="2" width="56" height="18" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
            <rect x="35" y="2" width="30" height="6" fill="none" stroke="#ffffff12" strokeWidth="0.5" />
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
                  readOnly={readOnly}
                  cardScale={compact ? 0.78 : 1}
                  onTap={() => onClick({ zone: 'starter', index: i })}
                  onDragStart={() => onDrag({ zone: 'starter', index: i })}
                  onDrop={() => onDropSlot({ zone: 'starter', index: i })}
                />
              ) : (
                <CardSkeleton
                  label={pos.slot}
                  active={isActive('starter', i)}
                  compact={compact}
                  onClick={readOnly ? undefined : () => onClick({ zone: 'starter', index: i })}
                  onDrop={readOnly ? undefined : () => onDropSlot({ zone: 'starter', index: i })}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bench: all 12 slots visible; hover lifts full cards */}
      <div
        className="group/bench relative mx-auto w-full shrink-0"
        tabIndex={0}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setBenchOpen(false);
        }}
      >
        <button
          type="button"
          className="font-display text-[8px] tracking-[0.25em] text-white/35 uppercase mb-0.5 text-center w-full hover:text-gold/70 transition-colors"
          onClick={() => setBenchOpen((v) => !v)}
          aria-expanded={benchOpen}
          aria-label="Toggle bench preview"
        >
          Bench {benchOpen ? '▾' : '▸'}
        </button>
        <div className="bench-strip flex flex-nowrap items-end gap-0.5 px-1 py-1.5 rounded-lg bg-black/25 border border-white/8">
          {benchPlayers.map((_, i) => (
            <span key={i} className="contents">
              {i === subsCount && (
                <div
                  className="shrink-0 w-px self-stretch bg-white/15 mx-px"
                  aria-hidden
                  style={{ minHeight: BENCH_PEEK_H }}
                />
              )}
              {benchSlot(i)}
            </span>
          ))}
        </div>
        <div
          className={clsx(
            'pointer-events-none absolute bottom-full left-0 right-0 mb-1 scale-[0.97] transition-all duration-200 z-50',
            'opacity-0 group-hover/bench:opacity-100 group-hover/bench:scale-100',
            'group-focus-within/bench:opacity-100 group-focus-within/bench:scale-100',
            benchOpen && 'opacity-100 scale-100'
          )}
        >
          <div className="rounded-lg border border-gold/35 bg-primary/98 shadow-2xl px-1 py-2">
            <div className="flex flex-nowrap items-end justify-between gap-0.5">
              {benchPlayers.map((bp, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-0 flex justify-center"
                  style={{ maxWidth: '48px' }}
                >
                  {bp ? (
                    <PlayerCard player={bp} size="xs" />
                  ) : (
                    <div
                      className="border border-dashed border-white/20 rounded-sm w-full"
                      style={{ height: 52 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
