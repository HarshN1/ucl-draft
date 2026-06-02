'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  chemScore?: number; // 1–10
  chemPreviewTotal?: number; // 0–100 (shown on hover)
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showChemDot?: boolean;
}

function getCardTier(ovr: number) {
  if (ovr >= 90) return 'gold';
  if (ovr >= 85) return 'silver';
  if (ovr >= 80) return 'bronze';
  return 'common';
}

function getChemColor(score: number) {
  if (score >= 8) return '#00ff88';
  if (score >= 5) return '#fbbf24';
  return '#ff4444';
}

const STAT_LABELS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'] as const;
const STAT_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'] as const;

export function PlayerCard({
  player,
  isSelected = false,
  chemScore,
  chemPreviewTotal,
  onClick,
  size = 'md',
  showChemDot = false,
}: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);
  const [badgeError, setBadgeError] = useState(false);
  const tier = getCardTier(player.overall);

  const dimensions = {
    sm: { card: 'w-28 h-40', ovr: 'text-2xl', name: 'text-[10px]', stat: 'text-[9px]' },
    md: { card: 'w-36 h-52', ovr: 'text-3xl', name: 'text-xs', stat: 'text-[10px]' },
    lg: { card: 'w-44 h-64', ovr: 'text-4xl', name: 'text-sm', stat: 'text-xs' },
  }[size];

  return (
    <div
      onClick={onClick}
      className={clsx(
        dimensions.card,
        'card-tier-' + tier,
        'relative flex flex-col border-2 rounded-lg p-2 select-none',
        'transition-all duration-200',
        onClick && 'hover:scale-105 hover:shadow-lg cursor-pointer',
        !onClick && 'cursor-default',
        isSelected && 'ring-2 ring-gold glow-gold scale-105'
      )}
    >
      {/* Chemistry dot */}
      {showChemDot && chemScore !== undefined && (
        <div
          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black/30"
          style={{ backgroundColor: getChemColor(chemScore) }}
        />
      )}

      {/* Header row: position + OVR */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={clsx(
            'font-display font-bold text-white/80 leading-none',
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
        >
          {player.position}
        </span>
        <span
          className={clsx(
            'font-display font-bold leading-none',
            dimensions.ovr,
            tier === 'gold' && 'text-gold',
            tier === 'silver' && 'text-white',
            tier === 'bronze' && 'text-amber-600',
            tier === 'common' && 'text-white/80'
          )}
        >
          {player.overall}
        </span>
      </div>

      {/* Player image */}
      <div className="flex-1 flex items-center justify-center my-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgError ? '/card-fallback.svg' : player.imageUrl}
          alt={player.name}
          className={clsx(
            'object-contain',
            size === 'sm' ? 'h-16' : size === 'md' ? 'h-20' : 'h-24'
          )}
          onError={() => setImgError(true)}
        />
      </div>

      {/* Player name */}
      <div
        className={clsx(
          'font-display font-semibold text-white text-center truncate leading-tight mb-1',
          dimensions.name
        )}
      >
        {player.name}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-1">
        {STAT_KEYS.map((key, i) => (
          <div key={key} className={clsx('text-center', dimensions.stat)}>
            <span className="text-white/50">{STAT_LABELS[i]} </span>
            <span className="text-white font-medium">{player[key]}</span>
          </div>
        ))}
      </div>

      {/* Footer: club badge + nation flag */}
      <div className="flex justify-between items-center mt-1">
        {!badgeError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://cdn.sofifa.net/teams/${player.clubId}/light_60.png`}
            alt={player.clubName}
            className="h-4 w-4 object-contain"
            onError={() => setBadgeError(true)}
          />
        ) : (
          <div className="h-4 w-4 rounded-full bg-white/10" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://cdn.sofifa.net/flags/${player.nationalityId}.png`}
          alt={player.nationalityName}
          className="h-3 w-5 object-cover rounded-sm"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Chemistry preview on hover */}
      {chemPreviewTotal !== undefined && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-accent font-display font-semibold opacity-0 group-hover:opacity-100 pointer-events-none">
          CHEM {chemPreviewTotal}
        </div>
      )}
    </div>
  );
}
