'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { proxied } from '@/lib/img';

type PositionFit = 'perfect' | 'related' | 'outOfRole' | 'wrong';

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  chemScore?: number; // 0–10 — when set, shows the individual chem number badge
  posFit?: PositionFit; // colours the position badge green/amber/orange/red
  onClick?: () => void;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg';
  showChemDot?: boolean;
}

function fitColor(fit: PositionFit): string {
  if (fit === 'perfect') return '#16a34a';
  if (fit === 'related') return '#84cc16';
  if (fit === 'outOfRole') return '#f59e0b';
  return '#dc2626';
}

type Tier = 'goldRare' | 'gold' | 'silver' | 'bronze';

function getCardTier(ovr: number): Tier {
  if (ovr >= 84) return 'goldRare';
  if (ovr >= 75) return 'gold';
  if (ovr >= 65) return 'silver';
  return 'bronze';
}

// FUT-style metal palettes (dark ink on metal, like classic gold/silver/bronze cards)
const TIER_STYLE: Record<
  Tier,
  { bg: string; ink: string; sub: string; border: string; divider: string }
> = {
  goldRare: {
    bg: 'linear-gradient(160deg,#fff4c2 0%,#f4d779 26%,#caa23c 55%,#8a6d1e 100%)',
    ink: '#241a00',
    sub: '#5c4708',
    border: '#ffe899',
    divider: 'rgba(36,26,0,0.35)',
  },
  gold: {
    bg: 'linear-gradient(160deg,#f6e29a 0%,#e3c463 30%,#bd9a3c 60%,#8f7126 100%)',
    ink: '#2a1f02',
    sub: '#5e4a0d',
    border: '#f0d680',
    divider: 'rgba(42,31,2,0.32)',
  },
  silver: {
    bg: 'linear-gradient(160deg,#eef1f5 0%,#cdd3db 32%,#a7afba 62%,#7f8893 100%)',
    ink: '#1c2026',
    sub: '#444c57',
    border: '#e3e8ef',
    divider: 'rgba(28,32,38,0.28)',
  },
  bronze: {
    bg: 'linear-gradient(160deg,#e6b98c 0%,#cd9362 30%,#a96f3f 62%,#7c4e28 100%)',
    ink: '#2a1606',
    sub: '#5a3318',
    border: '#e8c298',
    divider: 'rgba(42,22,6,0.3)',
  },
};

// Legends use a premium off-white marble finish with a gold edge.
const LEGEND_STYLE = {
  bg: 'linear-gradient(135deg,#fbfbf9 0%,#e5dfcb 100%)',
  ink: '#2a1f02',
  sub: '#6b5a2a',
  border: '#caa23c',
  divider: 'rgba(42,31,2,0.28)',
};

function getChemColor(score: number) {
  if (score >= 7) return '#2fd07a';
  if (score >= 4) return '#e2ae16';
  return '#e0473b';
}

// Shield/badge silhouette — rounded top shoulders that taper to a soft point,
// like a real FUT gold card. (Polygon in % so it scales across card sizes.)
const SHIELD =
  'polygon(3% 8%, 9% 2%, 22% 0.6%, 40% 1.8%, 50% 3%, 60% 1.8%, 78% 0.6%, 91% 2%, 97% 8%, 98% 56%, 96% 76%, 86% 90%, 68% 98.5%, 50% 100%, 32% 98.5%, 14% 90%, 4% 76%, 2% 56%)';

// FUT stat layout: two columns × three rows
const STAT_ROWS: { key: keyof Player; label: string }[][] = [
  [
    { key: 'pac', label: 'PAC' },
    { key: 'dri', label: 'DRI' },
  ],
  [
    { key: 'sho', label: 'SHO' },
    { key: 'def', label: 'DEF' },
  ],
  [
    { key: 'pas', label: 'PAS' },
    { key: 'phy', label: 'PHY' },
  ],
];

export function PlayerCard({
  player,
  isSelected = false,
  chemScore,
  posFit,
  onClick,
  size = 'md',
  showChemDot = false,
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [badgeError, setBadgeError] = useState(false);
  const isLegend = !!player.isLegend;
  const tier = getCardTier(player.overall);
  const s = isLegend ? LEGEND_STYLE : TIER_STYLE[tier];

  const initials = (() => {
    const parts = player.name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}. ${parts[parts.length - 1][0]}.`.toUpperCase();
  })();

  const dim = {
    '2xs': { w: 'w-[50px]', h: 'h-[72px]', ovr: 'text-[12px]', pos: 'text-[6px]', name: 'text-[7px]', stat: 'text-[6px]', meta: 'text-[5px]', flag: 'h-[7px] w-[11px]', badge: 'h-2.5 w-2.5' },
    xs: { w: 'w-[60px]', h: 'h-[86px]', ovr: 'text-sm', pos: 'text-[7px]', name: 'text-[8px]', stat: 'text-[7px]', meta: 'text-[6px]', flag: 'h-2 w-3', badge: 'h-3 w-3' },
    sm: { w: 'w-24', h: 'h-36', ovr: 'text-xl', pos: 'text-[9px]', name: 'text-[10px]', stat: 'text-[9px]', meta: 'text-[7px]', flag: 'h-3 w-[18px]', badge: 'h-4 w-4' },
    md: { w: 'w-36', h: 'h-52', ovr: 'text-3xl', pos: 'text-xs', name: 'text-sm', stat: 'text-[11px]', meta: 'text-[9px]', flag: 'h-3.5 w-[22px]', badge: 'h-5 w-5' },
    lg: { w: 'w-44', h: 'h-64', ovr: 'text-4xl', pos: 'text-sm', name: 'text-base', stat: 'text-sm', meta: 'text-[10px]', flag: 'h-4 w-6', badge: 'h-6 w-6' },
  }[size];
  const compact = size === 'xs' || size === '2xs'; // hide stat grid + league for legibility

  const surname = player.name.includes(' ')
    ? player.name.split(' ').slice(1).join(' ')
    : player.name;

  return (
    <div
      onClick={onClick}
      className={clsx(
        dim.w,
        dim.h,
        'relative select-none transition-transform duration-200',
        onClick && 'hover:scale-105 cursor-pointer',
        !onClick && 'cursor-default',
        isSelected && 'scale-105'
      )}
    >
      {/* Shield border ring */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: SHIELD,
          background: isSelected ? '#2fd0e6' : s.border,
          filter: isSelected ? 'drop-shadow(0 0 7px rgba(47,208,230,0.8))' : 'drop-shadow(0 5px 9px rgba(0,0,0,0.5))',
        }}
      />
      {/* Shield metal fill (clips the sunburst + sheen) */}
      <div className="absolute inset-[1.5px] overflow-hidden" style={{ clipPath: SHIELD, background: s.bg }}>
        {/* soft sunburst glow from the lower-left, like a FUT gold card */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 110% at 22% 72%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 32%, rgba(0,0,0,0.10) 78%)',
          }}
        />
        {/* lower stat panel — a slightly brighter band, as on real cards */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '34%', background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.06) 100%)' }}
        />
        {/* diagonal sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 35%)' }}
        />
      </div>

      {/* Player cutout — pokes above the top edge (overlaps the border).
          Legends (and any failed remote image) fall back to a gold-rimmed
          silhouette + initials medallion so the card never looks broken. */}
      {!isLegend && !imgError && player.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied(player.imageUrl)}
          alt={player.name}
          className="absolute z-[2] object-contain object-top drop-shadow-[0_4px_6px_rgba(0,0,0,0.45)]"
          style={{ top: compact ? '-3%' : '-5%', right: '-2%', height: compact ? '80%' : '76%', width: '70%' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="absolute z-[2] flex items-center justify-center"
          style={{ top: compact ? '3%' : '5%', right: '1%', height: compact ? '60%' : '56%', width: '64%' }}
        >
          <div
            className="relative rounded-full flex items-center justify-center"
            style={{
              width: '82%',
              aspectRatio: '1',
              border: `2px solid ${isLegend ? '#caa23c' : 'rgba(0,0,0,0.35)'}`,
              background: isLegend
                ? 'radial-gradient(circle at 50% 32%, #ffffff 0%, #e5dfcb 100%)'
                : 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.35) 0%, rgba(0,0,0,0.18) 100%)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
            }}
          >
            <svg viewBox="0 0 24 24" className="absolute" style={{ width: '72%', height: '72%', opacity: 0.22, color: isLegend ? '#5c4708' : '#0b0b0b' }} fill="currentColor">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 6v2h16v-2c0-3.8-3.6-6-8-6z" />
            </svg>
            <span className="relative z-10 font-display font-bold" style={{ color: isLegend ? '#5c4708' : '#0b0b0b', fontSize: compact ? '9px' : '15px', letterSpacing: '0.04em' }}>
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Individual chemistry number badge (top-right) */}
      {chemScore !== undefined && (
        <div
          className={clsx(
            'absolute z-20 flex items-center justify-center rounded-[3px] font-display font-bold border border-black/40',
            compact ? 'top-1 right-1 h-3.5 min-w-3.5 px-[2px] text-[8px]' : 'top-2 right-2 h-5 min-w-5 px-1 text-[11px]'
          )}
          style={{ backgroundColor: getChemColor(chemScore), color: '#0b0b0b' }}
        >
          {chemScore}
        </div>
      )}
      {/* Legacy chem dot fallback */}
      {showChemDot && chemScore === undefined && (
        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border z-20" style={{ borderColor: 'rgba(0,0,0,0.4)' }} />
      )}

      {/* Top-left cluster: OVR / position / nation flag / club badge */}
      <div
        className={clsx('absolute z-10 flex flex-col items-center', compact ? 'top-1.5 left-1.5' : 'top-3 left-3')}
        style={{ color: s.ink, textShadow: '0 1px 1px rgba(255,255,255,0.25)' }}
      >
        <span className={clsx('font-display font-bold leading-none', dim.ovr)}>{player.overall}</span>
        {posFit ? (
          <span
            className={clsx('font-display font-bold leading-none mt-0.5 rounded-[2px] px-1 py-[1px]', dim.pos)}
            style={{ backgroundColor: fitColor(posFit), color: posFit === 'wrong' ? '#fff' : '#0b0b0b', textShadow: 'none' }}
          >
            {player.position}
          </span>
        ) : (
          <span className={clsx('font-display font-bold leading-none mt-0.5', dim.pos)}>{player.position}</span>
        )}
        <div className="mt-1 flex flex-col items-center gap-1">
          {player.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxied(player.flagUrl)}
              alt={player.nationalityName}
              className={clsx('object-cover rounded-[1px] shadow', dim.flag)}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
          )}
          {player.badgeUrl && !badgeError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxied(player.badgeUrl)}
              alt={player.clubName}
              className={clsx('object-contain', dim.badge)}
              onError={() => setBadgeError(true)}
            />
          ) : null}
        </div>
      </div>

      {/* Bottom: name + (club · league) + stats — lifted above the shield tip */}
      <div
        className={clsx('absolute inset-x-0 z-10', compact ? 'px-1.5' : 'px-3')}
        style={{ color: s.ink, bottom: compact ? '14%' : '12%' }}
      >
        <div className={clsx('font-display font-bold uppercase text-center truncate tracking-wide', dim.name)}>
          {surname}
        </div>
        {!compact && (
          <>
            <div
              className={clsx('font-display font-semibold uppercase text-center truncate tracking-wide', dim.meta)}
              style={{ color: s.sub }}
              title={isLegend ? 'FUT Icon' : `${player.clubName} · ${player.leagueName}`}
            >
              {isLegend ? 'FUT ICON' : `${player.clubName}${player.leagueName ? ` · ${player.leagueName}` : ''}`}
            </div>
            <div className="my-1 h-px w-full" style={{ background: s.divider }} />
            <div className="grid grid-cols-2 gap-x-3">
              {STAT_ROWS.map((row, ri) => (
                <div key={ri} className="contents">
                  {row.map(({ key, label }) => (
                    <div key={label} className={clsx('flex items-center gap-1 justify-center', dim.stat)}>
                      <span className="font-display font-bold tabular-nums">{player[key] as number}</span>
                      <span className="font-display font-semibold" style={{ color: s.sub }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
