'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';
import { proxied } from '@/lib/img';
import { getCardStyle, getCardLabel } from '@/lib/cardStyles';
import { displayName } from '@/lib/playerNames';

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
  if (fit === 'perfect') return '#16a34a';
  if (fit === 'related') return '#84cc16';
  if (fit === 'outOfRole') return '#f59e0b';
  return '#dc2626';
}

function getChemColor(score: number) {
  if (score >= 7) return '#2fd07a';
  if (score >= 4) return '#e2ae16';
  return '#e0473b';
}

const SHIELD =
  'polygon(3% 8%, 9% 2%, 22% 0.6%, 40% 1.8%, 50% 3%, 60% 1.8%, 78% 0.6%, 91% 2%, 97% 8%, 98% 56%, 96% 76%, 86% 90%, 68% 98.5%, 50% 100%, 32% 98.5%, 14% 90%, 4% 76%, 2% 56%)';

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
  const s = getCardStyle(player);
  const cardLabel = getCardLabel(player);
  const isIconStyle = player.cardType === 'icon' || (player.isLegend && !player.cardType);
  const showSilhouette = imgError || (isIconStyle && !player.imageUrl);
  const shownName = displayName(player);

  const initials = (() => {
    const parts = shownName.split(' ').filter(Boolean);
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
  const compact = size === 'xs' || size === '2xs';

  const surname = shownName.includes(' ')
    ? shownName.split(' ').slice(1).join(' ')
    : shownName;

  const clubLine = player.clubName
    ? `${player.clubName}${player.leagueName && player.leagueName.length < 12 ? ` · ${player.leagueName}` : ''}`
    : '';
  const metaLine = cardLabel || (isIconStyle ? 'ICON' : clubLine);

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
      <div
        className="absolute inset-0"
        style={{
          clipPath: SHIELD,
          background: isSelected ? '#2fd0e6' : s.border,
          filter: isSelected ? 'drop-shadow(0 0 7px rgba(47,208,230,0.8))' : 'drop-shadow(0 5px 9px rgba(0,0,0,0.5))',
        }}
      />
      <div className="absolute inset-[1.5px] overflow-hidden" style={{ clipPath: SHIELD, background: s.bg }}>
        {s.glow && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: s.glow }} />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 110% at 22% 72%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 32%, rgba(0,0,0,0.10) 78%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '34%', background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.06) 100%)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 35%)' }}
        />
        {player.cardType === 'totw' && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,212,255,0.08) 4px, rgba(0,212,255,0.08) 8px)',
            }}
          />
        )}
      </div>

      {!showSilhouette && player.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied(player.imageUrl)}
          alt={shownName}
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
              border: `2px solid ${isIconStyle ? '#caa23c' : 'rgba(0,0,0,0.35)'}`,
              background: isIconStyle
                ? 'radial-gradient(circle at 50% 32%, #ffffff 0%, #e5dfcb 100%)'
                : 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.35) 0%, rgba(0,0,0,0.18) 100%)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
            }}
          >
            <svg viewBox="0 0 24 24" className="absolute" style={{ width: '72%', height: '72%', opacity: 0.22, color: isIconStyle ? '#5c4708' : s.ink }} fill="currentColor">
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 6v2h16v-2c0-3.8-3.6-6-8-6z" />
            </svg>
            <span className="relative z-10 font-display font-bold" style={{ color: isIconStyle ? '#5c4708' : s.ink, fontSize: compact ? '9px' : '15px', letterSpacing: '0.04em' }}>
              {initials}
            </span>
          </div>
        </div>
      )}

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
      {showChemDot && chemScore === undefined && (
        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border z-20" style={{ borderColor: 'rgba(0,0,0,0.4)' }} />
      )}

      <div
        className={clsx('absolute z-10 flex flex-col items-center', compact ? 'top-1.5 left-1.5' : 'top-3 left-3')}
        style={{ color: s.ink, textShadow: player.cardType === 'totw' ? 'none' : '0 1px 1px rgba(255,255,255,0.25)' }}
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
          {player.badgeUrl && !badgeError && player.cardType !== 'icon' && !isIconStyle ? (
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
              className={clsx(
                'font-display font-semibold uppercase text-center tracking-wide leading-tight',
                dim.meta,
                cardLabel ? 'truncate px-0.5' : 'truncate'
              )}
              style={{ color: s.sub, maxWidth: '100%' }}
              title={cardLabel ? player.promoLabel ?? cardLabel : metaLine}
            >
              {metaLine}
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
