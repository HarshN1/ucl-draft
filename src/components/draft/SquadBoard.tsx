'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Formation, Player, ChemistryPreview } from '@/types';
import type { ActiveSlot } from '@/hooks/useDraft';
import { PlayerCard } from './PlayerCard';
import { getAdjacency, positionCategory, type PositionCategory } from '@/engine/chemistryEngine';
import { BENCH_SUB_ROLES } from '@/constants/squadLayout';

const FIFA16_SHIELD =
  'polygon(' +
  '5% 9%, 11% 3.2%, 23% 0.8%, 39% 1.8%, 50% 3.4%, 61% 1.8%, 77% 0.8%, 89% 3.2%, 95% 9%, ' +
  '97% 19%, 93.5% 29%, 96.5% 42%, 96.5% 74%, ' +
  '87% 86%, 71% 94.5%, 50% 100%, 29% 94.5%, 13% 86%, ' +
  '3.5% 74%, 3.5% 42%, 6.5% 29%, 3% 19%' +
  ')';
const UNLIT_LINE = 'var(--chem-unlit)';

const BENCH_PEEK_H = 38;

interface SquadBoardProps {
  formation: Formation;
  starterPlayers: (Player | null)[];
  benchPlayers: (Player | null)[];
  subsCount: number;
  chem: ChemistryPreview;
  activeSlot: ActiveSlot | null;
  draggingSlot: ActiveSlot | null;
  swapSource: ActiveSlot | null;
  /** Optional slot index sets for FIFA 16 "Fade Unaffected Players" swap mode */
  dimmedStarterIndices?: Set<number>;
  compact?: boolean;
  readOnly?: boolean;
  onSlotClick: (slot: ActiveSlot) => void;
  onSlotHover?: (slot: ActiveSlot | null) => void;
  onDragStart: (slot: ActiveSlot) => void;
  onDrop: (slot: ActiveSlot) => void;
}

function linkColor(q: string) {
  if (q === 'green') return 'var(--chem-green)';
  if (q === 'yellow') return 'var(--chem-yellow)';
  return 'var(--chem-red)';
}

function fitDotColor(fit: PositionCategory | undefined): string {
  if (!fit) return 'rgba(255,255,255,0.28)';
  if (fit === 'perfect') return '#22c55e';
  if (fit === 'related') return '#eab308';
  if (fit === 'outOfRole') return '#f97316';
  return '#ef4444';
}

function chemBarColor(score: number): string {
  if (score >= 7) return '#79b928';
  if (score >= 4) return '#e2ae16';
  return '#e0473b';
}

const PADX = 9;
const PADY = 11;
const cx = (x: number) => PADX + (x / 100) * (100 - 2 * PADX);
const cy = (y: number) => PADY + ((100 - y) / 100) * (100 - 2 * PADY);

/**
 * Authentic FIFA 16 Under-Card Slot Pill:
 * Displays [Position Fit Dot] [Slot Label (e.g. LW, LCM)] + [10-segment Chemistry Bar]
 */
function SlotPill({
  slotLabel,
  posFit,
  chem,
  active,
  filled,
  compact,
}: {
  slotLabel: string;
  posFit?: PositionCategory;
  chem?: number;
  active?: boolean;
  filled?: boolean;
  compact?: boolean;
}) {
  const chemVal = chem ?? 0;
  return (
    <div
      className={clsx(
        'flex flex-col items-center rounded-[3px] border backdrop-blur-sm select-none pointer-events-none',
        compact ? 'px-1 py-[1px] min-w-[36px]' : 'px-1.5 py-[2px] min-w-[46px]',
        active
          ? 'bg-black/85 border-gold shadow-[0_0_8px_rgba(226,174,22,0.55)]'
          : 'bg-black/75 border-white/15'
      )}
    >
      <div className="flex items-center justify-center gap-1 leading-none">
        <span
          className={clsx('rounded-full shrink-0', compact ? 'w-1.5 h-1.5' : 'w-2 h-2')}
          style={{
            backgroundColor: filled ? fitDotColor(posFit) : active ? '#e2ae16' : 'rgba(255,255,255,0.22)',
            boxShadow: filled ? `0 0 4px ${fitDotColor(posFit)}` : undefined,
          }}
        />
        <span
          className={clsx(
            'font-display font-bold tracking-wider uppercase leading-none',
            compact ? 'text-[7px]' : 'text-[8.5px]',
            active ? 'text-gold' : 'text-white/90'
          )}
        >
          {slotLabel}
        </span>
        {filled && chem !== undefined && !compact && (
          <span
            className="font-display font-bold text-[7.5px] tabular-nums leading-none"
            style={{ color: chemBarColor(chemVal) }}
          >
            {chemVal}
          </span>
        )}
      </div>
      {/* FIFA 16 10-segment Individual Chemistry Meter */}
      <div
        className={clsx(
          'w-full flex items-center gap-[1px] mt-[2px]',
          compact ? 'h-[2px]' : 'h-[2.5px]'
        )}
      >
        {Array.from({ length: 10 }, (_, seg) => {
          const lit = filled && seg < chemVal;
          return (
            <span
              key={seg}
              className="flex-1 h-full rounded-[0.5px]"
              style={{
                backgroundColor: lit ? chemBarColor(chemVal) : 'rgba(255,255,255,0.14)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function PitchCard({
  player,
  slotLabel,
  chem,
  posFit,
  dragging,
  swapSelected,
  dimmed,
  popoverBelow,
  onTap,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrop,
  readOnly,
  cardScale,
  compact,
}: {
  player: Player;
  slotLabel: string;
  chem?: number;
  posFit?: PositionCategory;
  dragging?: boolean;
  swapSelected?: boolean;
  dimmed?: boolean;
  popoverBelow?: boolean;
  onTap?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  readOnly?: boolean;
  cardScale?: number;
  compact?: boolean;
}) {
  const scale = cardScale ?? 1;
  return (
    <div
      className={clsx(
        'group relative flex flex-col items-center transition-opacity duration-200',
        dimmed && 'opacity-40 saturate-50'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
          'relative touch-manipulation flex flex-col items-center',
          readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
          dragging && 'opacity-40',
          swapSelected && 'glow-active scale-105'
        )}
      >
        <PlayerCard player={player} size="2xs" posFit={posFit} />
        <div className="-mt-1 z-20">
          <SlotPill
            slotLabel={slotLabel}
            posFit={posFit}
            chem={chem}
            active={swapSelected}
            filled
            compact={compact}
          />
        </div>
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
  roleLabel,
  isReserve,
  active,
  dragging,
  swapSelected,
  posFit,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrop,
  readOnly,
}: {
  player: Player | null;
  roleLabel: string;
  isReserve?: boolean;
  active?: boolean;
  dragging?: boolean;
  swapSelected?: boolean;
  posFit?: PositionCategory;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      className={clsx(
        'bench-slot group relative flex-1 min-w-0 max-w-[54px] rounded-[3px] transition-all duration-150 flex flex-col items-center',
        isReserve && 'opacity-90',
        active && 'ring-1 ring-gold shadow-[0_0_8px_rgba(226,174,22,0.45)]',
        swapSelected && 'ring-2 ring-gold shadow-[0_0_10px_rgba(226,174,22,0.75)]',
        !player && 'border border-dashed',
        !player ? 'border-white/25 bg-white/[0.04]' : 'border border-white/15 bg-black/35'
      )}
      style={{ height: BENCH_PEEK_H }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
            className="absolute inset-0 overflow-hidden rounded-[2px]"
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
            <div className="absolute inset-x-0 bottom-0 h-3.5 bg-black/80 border-t border-white/15 flex items-center justify-between px-1 pointer-events-none">
              <span className="font-display font-bold text-[7px] text-gold tracking-wider">
                {player.overall}
              </span>
              <span className="font-display font-semibold text-[6.5px] text-white/75">
                {player.position}
              </span>
            </div>
          </div>
          {!readOnly && (
            <div className="bench-slot-expand absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none drop-shadow-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              <PlayerCard player={player} size="sm" posFit={posFit} />
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={readOnly}
          onClick={onClick}
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 touch-manipulation disabled:cursor-default hover:bg-gold/10 transition-colors"
        >
          <span className="text-[9px] text-white/25 font-display leading-none">+</span>
          <span
            className={clsx(
              'font-display font-bold text-[7.5px] tracking-wider uppercase leading-none',
              active ? 'text-gold' : 'text-white/45'
            )}
          >
            {roleLabel}
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
  const w = compact ? 38 : 52;
  const h = compact ? 54 : 76;
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      className={clsx(
        'cursor-pointer group relative flex flex-col items-center',
        compact ? '' : '-translate-x-1/2 -translate-y-1/2',
        active && 'glow-active'
      )}
    >
      <div className="relative" style={{ width: w, height: h }}>
        <div
          className="absolute inset-0"
          style={{
            clipPath: FIFA16_SHIELD,
            background: active
              ? 'linear-gradient(160deg, rgba(226,174,22,0.32), rgba(226,174,22,0.08))'
              : 'linear-gradient(160deg, rgba(20,35,48,0.72), rgba(10,20,30,0.58))',
          }}
        />
        <div
          className="absolute"
          style={{
            inset: 3,
            clipPath: FIFA16_SHIELD,
            border: `1px dashed ${active ? 'rgba(226,174,22,0.9)' : 'rgba(148,163,184,0.45)'}`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={clsx(
              'font-display font-bold tracking-wider transition-colors',
              compact ? 'text-[8px]' : 'text-[10px]',
              active ? 'text-gold' : 'text-slate-300/65 group-hover:text-gold/80'
            )}
          >
            +
          </span>
        </div>
      </div>
      <div className="-mt-1 z-20">
        <SlotPill slotLabel={label} active={active} filled={false} compact={compact} />
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
  dimmedStarterIndices,
  compact = false,
  readOnly = false,
  onSlotClick,
  onSlotHover,
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
    for (const j of adj[i] ?? []) {
      if (i < j) allLinks.push([i, j, litMap.get(`${i}-${j}`) ?? null]);
    }
  }

  const benchSlot = (i: number) => {
    const bp = benchPlayers[i] ?? null;
    const isReserve = i >= subsCount;
    const roleLabel = isReserve ? 'RES' : (BENCH_SUB_ROLES[i] ?? 'SUB');
    return (
      <BenchSlot
        key={i}
        player={bp}
        roleLabel={roleLabel}
        isReserve={isReserve}
        active={isActive('bench', i)}
        dragging={isDragging('bench', i)}
        swapSelected={isSwapSelected('bench', i)}
        posFit={undefined}
        readOnly={readOnly}
        onClick={() => onClick({ zone: 'bench', index: i })}
        onMouseEnter={() => onSlotHover?.({ zone: 'bench', index: i })}
        onMouseLeave={() => onSlotHover?.(null)}
        onDragStart={() => onDrag({ zone: 'bench', index: i })}
        onDrop={() => onDropSlot({ zone: 'bench', index: i })}
      />
    );
  };

  const subsFilled = benchPlayers.slice(0, subsCount).filter(Boolean).length;
  const resFilled = benchPlayers.slice(subsCount).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-1.5 h-full min-h-0">
      {/* FIFA 16 Perspective Stadium Turf Container */}
      <div
        className="relative mx-auto w-full flex-1 min-h-0 fifa16-pitch-perspective"
        style={{
          aspectRatio: '7 / 9',
          maxHeight: compact ? 'min(40cqh, 50vh)' : 'min(62cqh, 76vh)',
        }}
      >
        <div
          className="absolute inset-0 rounded-[4px] overflow-hidden border border-white/15 fifa16-pitch-surface"
          style={{
            background:
              'repeating-linear-gradient(180deg, #133820 0%, #133820 9.09%, #0f2d19 9.09%, #0f2d19 18.18%)',
            boxShadow:
              'inset 0 0 55px rgba(0,0,0,0.65), 0 12px 28px rgba(0,0,0,0.55)',
          }}
        >
          {/* Stadium floodlight sheen from top */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 85% 45% at 50% 0%, rgba(185,245,215,0.12) 0%, transparent 70%)',
            }}
          />

          {/* Crisp chalk pitch markings */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 133"
            preserveAspectRatio="none"
          >
            <rect x="3" y="3" width="94" height="127" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <line x1="3" y1="66.5" x2="97" y2="66.5" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <circle cx="50" cy="66.5" r="10.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <circle cx="50" cy="66.5" r="0.9" fill="rgba(255,255,255,0.22)" />
            {/* Top Penalty Box & Arc */}
            <rect x="22" y="3" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <rect x="35" y="3" width="30" height="6.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <path d="M 41 21 A 9 9 0 0 0 59 21" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            {/* Bottom Penalty Box & Arc */}
            <rect x="22" y="112" width="56" height="18" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <rect x="35" y="123.5" width="30" height="6.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
            <path d="M 41 112 A 9 9 0 0 1 59 112" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
          </svg>

          {/* FIFA 16 Dual-Layer Glowing Chemistry Link Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            {allLinks.map(([from, to, quality], i) => {
              const a = formation.positions[from];
              const b = formation.positions[to];
              if (!a || !b) return null;
              const lit = quality !== null;
              const isHighlighted =
                (activeSlot?.zone === 'starter' &&
                  (activeSlot.index === from || activeSlot.index === to)) ||
                (swapSource?.zone === 'starter' &&
                  (swapSource.index === from || swapSource.index === to));
              const strokeCol = lit ? linkColor(quality) : UNLIT_LINE;
              return (
                <g key={i}>
                  {/* Outer halo line */}
                  {lit && (
                    <line
                      x1={`${cx(a.x)}%`}
                      y1={`${cy(a.y)}%`}
                      x2={`${cx(b.x)}%`}
                      y2={`${cy(b.y)}%`}
                      stroke={strokeCol}
                      strokeOpacity={isHighlighted ? 0.55 : 0.3}
                      strokeWidth={isHighlighted ? 7 : 5}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Inner core line */}
                  <line
                    x1={`${cx(a.x)}%`}
                    y1={`${cy(a.y)}%`}
                    x2={`${cx(b.x)}%`}
                    y2={`${cy(b.y)}%`}
                    stroke={strokeCol}
                    strokeOpacity={lit ? 1 : 0.4}
                    strokeWidth={isHighlighted ? 3.5 : 2.6}
                    strokeLinecap="round"
                    strokeDasharray={lit ? undefined : '4 3'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 11 Starting XI Slots */}
        {formation.positions.map((pos, i) => {
          const player = starterPlayers[i] ?? null;
          const isDimmed = dimmedStarterIndices ? dimmedStarterIndices.has(i) : false;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${cx(pos.x)}%`,
                top: `${cy(pos.y)}%`,
                zIndex: isActive('starter', i) || isSwapSelected('starter', i) ? 15 : player ? 5 : 2,
              }}
            >
              {player ? (
                <PitchCard
                  player={player}
                  slotLabel={pos.slot}
                  chem={chem.perPlayer[i]}
                  posFit={positionCategory(player.position, pos.positionGroup, player.altPositions)}
                  dragging={isDragging('starter', i)}
                  swapSelected={isSwapSelected('starter', i)}
                  dimmed={isDimmed}
                  popoverBelow={pos.y >= 52}
                  readOnly={readOnly}
                  cardScale={compact ? 0.78 : 1}
                  compact={compact}
                  onTap={() => onClick({ zone: 'starter', index: i })}
                  onMouseEnter={() => onSlotHover?.({ zone: 'starter', index: i })}
                  onMouseLeave={() => onSlotHover?.(null)}
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

      {/* FIFA 16 Docked Bottom Substitutes (7) | Reserves (5) Tray */}
      <div
        className="group/bench relative mx-auto w-full shrink-0"
        tabIndex={0}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setBenchOpen(false);
        }}
      >
        <div className="flex items-center justify-between px-2 mb-0.5">
          <button
            type="button"
            className="font-display text-[9px] tracking-[0.2em] text-gold/85 uppercase hover:text-gold transition-colors flex items-center gap-1"
            onClick={() => setBenchOpen((v) => !v)}
            aria-expanded={benchOpen}
            aria-label="Toggle Substitutes and Reserves tray"
          >
            <span>Substitutes ({subsFilled}/{subsCount})</span>
            <span className="text-white/30">·</span>
            <span className="text-white/65">Reserves ({resFilled}/{benchPlayers.length - subsCount})</span>
            <span>{benchOpen ? '▾' : '▴'}</span>
          </button>
          <span className="font-display text-[8px] tracking-widest uppercase text-white/35 hidden sm:inline">
            Hover or tap to inspect bench
          </span>
        </div>

        <div className="bench-strip flex flex-nowrap items-end gap-0.5 px-1.5 py-1.5 rounded-[3px] bg-black/45 border border-white/15">
          {benchPlayers.map((_, i) => (
            <span key={i} className="contents">
              {i === subsCount && (
                <div
                  className="shrink-0 w-[2px] self-stretch bg-gold/45 mx-1"
                  aria-hidden
                  style={{ minHeight: BENCH_PEEK_H }}
                />
              )}
              {benchSlot(i)}
            </span>
          ))}
        </div>

        {/* Slide-up Full Card Drawer on Hover / Toggle */}
        <div
          className={clsx(
            'pointer-events-none absolute bottom-full left-0 right-0 mb-1 scale-[0.98] transition-all duration-200 z-50',
            'opacity-0 group-hover/bench:opacity-100 group-hover/bench:scale-100',
            'group-focus-within/bench:opacity-100 group-focus-within/bench:scale-100',
            benchOpen && 'opacity-100 scale-100'
          )}
        >
          <div className="rounded-[4px] border border-gold/50 bg-primary/95 backdrop-blur-md shadow-2xl px-2 py-2">
            <div className="flex items-center justify-between text-[9px] font-display uppercase tracking-widest text-gold/80 mb-1 px-1">
              <span>Substitutes (Count Toward Squad Rating)</span>
              <span className="text-white/55">Reserves (5 Wildcards)</span>
            </div>
            <div className="flex flex-nowrap items-end justify-between gap-0.5">
              {benchPlayers.map((bp, i) => (
                <span key={i} className="contents">
                  {i === subsCount && (
                    <div className="shrink-0 w-[2px] self-stretch bg-gold/40 mx-1" />
                  )}
                  <div
                    className="flex-1 min-w-0 flex justify-center"
                    style={{ maxWidth: '58px' }}
                  >
                    {bp ? (
                      <PlayerCard player={bp} size="xs" />
                    ) : (
                      <div
                        className="border border-dashed border-white/20 rounded-[2px] w-full flex items-center justify-center font-display text-[8px] text-white/30"
                        style={{ height: 64 }}
                      >
                        {i < subsCount ? BENCH_SUB_ROLES[i] : 'RES'}
                      </div>
                    )}
                  </div>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
