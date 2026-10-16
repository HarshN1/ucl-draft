'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { proxied } from '@/lib/img';
import { getCardStyle, getCardLabel } from '@/lib/cardStyles';
import { displayName, formatCardName } from '@/lib/playerNames';

type PositionFit = 'perfect' | 'related' | 'outOfRole' | 'wrong';

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  chemScore?: number;
  posFit?: PositionFit;
  onClick?: () => void;
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg';
  showChemDot?: boolean;
}

function fitColor(fit: PositionFit): string {
  if (fit === 'perfect') return '#22c55e';
  if (fit === 'related') return '#eab308';
  if (fit === 'outOfRole') return '#f97316';
  return '#ef4444';
}

function getChemColor(score: number) {
  if (score >= 7) return '#2fd07a';
  if (score >= 4) return '#e2ae16';
  return '#e0473b';
}

/**
 * Authentic FIFA 16 Shield Geometry:
 * - Elongated curved top crown ("hood") with central crest dip
 * - Subtle pinched waist around y=28%
 * - Flared lower hip at y=60% tapering to a sharp V-point at y=100%
 */
const FIFA16_SHIELD =
  'polygon(' +
  '5% 9%, 11% 3.2%, 23% 0.8%, 39% 1.8%, 50% 3.4%, 61% 1.8%, 77% 0.8%, 89% 3.2%, 95% 9%, ' +
  '97% 19%, 93.5% 29%, 96.5% 42%, 96.5% 74%, ' +
  '87% 86%, 71% 94.5%, 50% 100%, 29% 94.5%, 13% 86%, ' +
  '3.5% 74%, 3.5% 42%, 6.5% 29%, 3% 19%' +
  ')';

const OUTFIELD_STAT_ROWS: { key: keyof Player; label: string }[][] = [
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

const GK_STAT_ROWS: { key: keyof Player; label: string }[][] = [
  [
    { key: 'pac', label: 'DIV' },
    { key: 'dri', label: 'REF' },
  ],
  [
    { key: 'sho', label: 'HAN' },
    { key: 'def', label: 'SPD' },
  ],
  [
    { key: 'pas', label: 'KIC' },
    { key: 'phy', label: 'POS' },
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
  const s = getCardStyle(player);
  const cardLabel = getCardLabel(player);
  const isIconStyle =
    player.cardType === 'icon' ||
    player.cardType === 'thunderstruck_icon' ||
    (player.isLegend && !player.cardType);
  const isHeroStyle = player.cardType === 'hero';
  const showSilhouette = imgError || !player.imageUrl;
  const shownName = displayName(player);
  const nameplateName = formatCardName(player);
  const isGK = player.position.toUpperCase() === 'GK';
  const statRows = isGK ? GK_STAT_ROWS : OUTFIELD_STAT_ROWS;

  const initials = (() => {
    const parts = shownName.split(' ').filter(Boolean);
    if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  })();

  const dim = {
    '2xs': {
      w: 'w-[52px]',
      h: 'h-[76px]',
      ovr: 'text-[12px]',
      pos: 'text-[6.5px]',
      name: nameplateName.length > 11 ? 'text-[6px]' : 'text-[7px]',
      stat: 'text-[6px]',
      meta: 'text-[5px]',
      flag: 'h-[7px] w-[11px]',
      badge: 'h-3 w-3',
    },
    xs: {
      w: 'w-[64px]',
      h: 'h-[92px]',
      ovr: 'text-[14px]',
      pos: 'text-[7.5px]',
      name: nameplateName.length > 11 ? 'text-[7px]' : 'text-[8.5px]',
      stat: 'text-[7px]',
      meta: 'text-[6px]',
      flag: 'h-2 w-3.5',
      badge: 'h-3.5 w-3.5',
    },
    sm: {
      w: 'w-[100px]',
      h: 'h-[146px]',
      ovr: 'text-[21px]',
      pos: 'text-[9.5px]',
      name: nameplateName.length > 12 ? 'text-[9px]' : 'text-[10.5px]',
      stat: 'text-[9px]',
      meta: 'text-[7px]',
      flag: 'h-3 w-[18px]',
      badge: 'h-4 w-4',
    },
    md: {
      w: 'w-36',
      h: 'h-52',
      ovr: 'text-[28px]',
      pos: 'text-[11px]',
      name: nameplateName.length > 12 ? 'text-xs' : 'text-sm',
      stat: 'text-[11px]',
      meta: 'text-[8.5px]',
      flag: 'h-3.5 w-[22px]',
      badge: 'h-5 w-5',
    },
    lg: {
      w: 'w-44',
      h: 'h-64',
      ovr: 'text-[34px]',
      pos: 'text-xs',
      name: nameplateName.length > 12 ? 'text-sm' : 'text-base',
      stat: 'text-[13px]',
      meta: 'text-[10px]',
      flag: 'h-4 w-6',
      badge: 'h-6 w-6',
    },
  }[size];
  const compact = size === 'xs' || size === '2xs';

  return (
    <div
      onClick={onClick}
      className={clsx(
        dim.w,
        dim.h,
        'relative select-none transition-transform duration-150',
        onClick && 'hover:scale-105 cursor-pointer',
        !onClick && 'cursor-default',
        isSelected && 'scale-105'
      )}
    >
      {/* Metallic outer shield frame */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: FIFA16_SHIELD,
          background: isSelected
            ? 'linear-gradient(180deg, #ffe98a 0%, #2fd0e6 50%, #f5b700 100%)'
            : `linear-gradient(170deg, #ffffff 0%, ${s.border} 35%, ${s.border} 75%, rgba(0,0,0,0.65) 100%)`,
          filter: isSelected
            ? 'drop-shadow(0 0 10px rgba(47,208,230,0.85))'
            : 'drop-shadow(0 5px 10px rgba(0,0,0,0.6))',
        }}
      />

      {/* Inner FIFA 16 shield body */}
      <div
        className="absolute inset-[1.5px] overflow-hidden"
        style={{ clipPath: FIFA16_SHIELD, background: s.bg }}
      >
        {/* Upper hood radial sun-rays / glow */}
        {s.glow && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: s.glow }} />
        )}

        {/* FIFA 16 curved upper crown ("hood") accent */}
        {s.hoodBg && (
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: '52%',
              background: s.hoodBg,
              clipPath: 'ellipse(74% 56% at 50% 8%)',
            }}
          />
        )}

        {/* Diagonal sash / geometric foil reflection */}
        {s.sashBg && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: s.sashBg }} />
        )}

        {/* Subtle brushed foil sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(118deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 36%, rgba(0,0,0,0.12) 100%)',
          }}
        />

        {/* Special card micro-pattern */}
        {(player.cardType === 'totw' || player.cardType === 'toty' || player.cardType === 'tots') && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(245,208,97,0.10) 4px, rgba(245,208,97,0.10) 8px)',
            }}
          />
        )}
      </div>

      {/* Right-aligned Player Dynamic / Headshot Cutout */}
      {!showSilhouette && player.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied(player.imageUrl)}
          alt={shownName}
          className="absolute z-[2] object-contain object-bottom drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{
            top: compact ? '6%' : '5%',
            right: compact ? '1%' : '2%',
            height: compact ? '52%' : '47%',
            width: compact ? '66%' : '64%',
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="absolute z-[2] flex items-center justify-center pointer-events-none"
          style={{
            top: compact ? '8%' : '7%',
            right: '4%',
            height: compact ? '46%' : '42%',
            width: '58%',
          }}
        >
          <div
            className="relative rounded-full flex items-center justify-center"
            style={{
              width: '78%',
              aspectRatio: '1',
              border: `1.5px solid ${isIconStyle ? '#caa23c' : s.divider}`,
              background: isIconStyle
                ? 'radial-gradient(circle at 50% 32%, #ffffff 0%, #e5dfcb 100%)'
                : 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.28) 0%, rgba(0,0,0,0.22) 100%)',
            }}
          >
            <span
              className="relative z-10 font-display font-bold"
              style={{
                color: isIconStyle ? '#5c4708' : s.ink,
                fontSize: compact ? '9px' : '14px',
                letterSpacing: '0.04em',
              }}
            >
              {initials}
            </span>
          </div>
        </div>
      )}

      {/* Optional top-right chemistry badge (when explicitly requested) */}
      {chemScore !== undefined && (
        <div
          className={clsx(
            'absolute z-20 flex items-center justify-center rounded-[2px] font-display font-bold border border-black/50 shadow-sm',
            compact
              ? 'top-1 right-1 h-3.5 min-w-3.5 px-[2px] text-[8px]'
              : 'top-2 right-2 h-4 min-w-4 px-1 text-[10px]'
          )}
          style={{ backgroundColor: getChemColor(chemScore), color: '#0b0b0b' }}
        >
          {chemScore}
        </div>
      )}
      {showChemDot && chemScore === undefined && (
        <div
          className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border z-20"
          style={{ borderColor: 'rgba(0,0,0,0.4)' }}
        />
      )}

      {/* FIFA 16 Left Vertical Column: OVR -> POS -> Club Crest -> Nation Flag */}
      <div
        className={clsx(
          'absolute z-10 flex flex-col items-center',
          compact ? 'top-[10%] left-[9%] w-[30%]' : 'top-[9%] left-[9%] w-[29%]'
        )}
        style={{
          color: s.ink,
          textShadow: s.isDark ? '0 1px 2px rgba(0,0,0,0.65)' : '0 1px 0 rgba(255,255,255,0.35)',
        }}
      >
        <span className={clsx('font-display font-extrabold leading-[0.88] tracking-tight', dim.ovr)}>
          {player.overall}
        </span>
        {posFit ? (
          <span
            className={clsx(
              'font-display font-bold leading-none mt-0.5 rounded-[2px] px-1 py-[1px]',
              dim.pos
            )}
            style={{
              backgroundColor: fitColor(posFit),
              color: posFit === 'wrong' ? '#fff' : '#0b0b0b',
              textShadow: 'none',
            }}
          >
            {player.position}
          </span>
        ) : (
          <span className={clsx('font-display font-bold leading-none mt-0.5', dim.pos)}>
            {player.position}
          </span>
        )}

        {/* Thin horizontal separator under POS */}
        <div className="w-4/5 h-px my-0.5" style={{ background: s.divider }} />

        {/* Club Badge (or Icon/Hero emblem) + Nation Flag */}
        <div className="flex flex-col items-center gap-0.5">
          {player.badgeUrl && !badgeError && !isIconStyle && !isHeroStyle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxied(player.badgeUrl)}
              alt={player.clubName}
              className={clsx('object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]', dim.badge)}
              onError={() => setBadgeError(true)}
            />
          ) : (isIconStyle || isHeroStyle) && !compact ? (
            <div
              className={clsx('flex items-center justify-center rounded-full border', dim.badge)}
              style={{
                borderColor: s.border,
                background: isIconStyle ? 'rgba(212,175,55,0.22)' : 'rgba(229,193,88,0.18)',
              }}
            >
              <span className="text-[7px] font-display font-bold leading-none" style={{ color: s.ink }}>
                ★
              </span>
            </div>
          ) : null}

          {player.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxied(player.flagUrl)}
              alt={player.nationalityName}
              className={clsx('object-cover rounded-[1px] shadow-sm border border-black/20', dim.flag)}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
            />
          )}
        </div>
      </div>

      {/* FIFA 16 Full-Width Horizontal Nameplate Bar across the middle */}
      <div
        className={clsx(
          'absolute inset-x-[4%] z-10 flex items-center justify-center px-1',
          compact ? 'top-[58%] h-[16%]' : 'top-[53.5%] h-[11.5%]'
        )}
        style={{
          background: s.nameBarBg ?? 'rgba(255,255,255,0.75)',
          color: s.nameBarInk ?? s.ink,
          borderTop: `1px solid ${s.divider}`,
          borderBottom: `1px solid ${s.divider}`,
        }}
      >
        <span
          className={clsx(
            'font-display font-extrabold uppercase text-center truncate tracking-wider leading-none w-full',
            dim.name
          )}
          title={shownName}
        >
          {nameplateName}
        </span>
      </div>

      {/* Lower Half: 2x3 Attribute Grid (md/lg/sm) or Compact Stat Summary (xs/2xs) */}
      {!compact ? (
        <div
          className="absolute inset-x-[9%] z-10 flex flex-col justify-between"
          style={{
            top: '66.5%',
            bottom: cardLabel ? '11.5%' : '8.5%',
            color: s.ink,
          }}
        >
          <div className="relative grid grid-cols-2 gap-x-2.5 gap-y-[1px] items-center my-auto">
            {/* Center vertical divider line between left & right stat columns */}
            <div
              className="absolute left-1/2 top-[6%] bottom-[6%] w-px -translate-x-1/2 pointer-events-none"
              style={{ background: s.divider }}
            />
            {statRows.map((row, ri) => (
              <div key={ri} className="contents">
                {row.map(({ key, label }) => (
                  <div
                    key={label}
                    className={clsx('flex items-baseline justify-center gap-1 leading-none', dim.stat)}
                  >
                    <span className="font-display font-extrabold tabular-nums">
                      {player[key] as number}
                    </span>
                    <span
                      className="font-display font-bold tracking-tight"
                      style={{ color: s.sub, fontSize: '0.86em' }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Compact pitch/bench card lower strip: Promo tag or 3 key stats */
        <div
          className="absolute inset-x-[10%] z-10 flex items-center justify-center gap-1"
          style={{ top: '76%', bottom: '8%', color: s.ink }}
        >
          {cardLabel ? (
            <span
              className="font-display font-extrabold uppercase tracking-wider leading-none truncate"
              style={{ fontSize: size === '2xs' ? '5.5px' : '6.5px', color: s.sub }}
            >
              {cardLabel}
            </span>
          ) : (
            <span
              className="font-display font-bold tabular-nums tracking-tight leading-none"
              style={{ fontSize: size === '2xs' ? '6px' : '7px', color: s.sub }}
            >
              {isGK ? `${player.pac}D ${player.dri}R` : `${player.pac}P ${player.sho}S ${player.dri}D`}
            </span>
          )}
        </div>
      )}

      {/* Bottom V-Point Promo Label or Chemistry Anchor Dot */}
      {!compact && (
        <div
          className="absolute inset-x-0 bottom-[3%] z-10 flex items-center justify-center pointer-events-none"
          style={{ color: s.sub }}
        >
          {cardLabel ? (
            <span
              className={clsx(
                'font-display font-extrabold uppercase tracking-widest leading-none px-1.5 py-[1px] rounded-[2px]',
                dim.meta
              )}
              style={{
                color: s.ink,
                background: s.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              }}
            >
              {cardLabel}
            </span>
          ) : (
            <div
              className="w-2 h-1 rounded-full"
              style={{ background: s.divider }}
            />
          )}
        </div>
      )}
    </div>
  );
}
