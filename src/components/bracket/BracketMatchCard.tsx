'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { BracketMatch } from '@/types';
import { proxied } from '@/lib/img';

interface BracketMatchCardProps {
  match: BracketMatch;
  isActive?: boolean;
  compact?: boolean;
}

function TeamRow({
  team,
  score,
  isWinner,
  isUser,
  compact,
}: {
  team: { name: string; ovr: number; isUser: boolean; badgeUrl?: string } | null;
  score: number | null;
  isWinner: boolean;
  isUser: boolean;
  compact?: boolean;
}) {
  const [badgeError, setBadgeError] = useState(false);

  if (!team) {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-2',
          compact ? 'py-1' : 'py-1.5'
        )}
      >
        <div className="h-4 w-4 rounded-full bg-white/10" />
        <span className="font-body text-white/20 text-xs flex-1">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2 transition-colors',
        compact ? 'py-1' : 'py-1.5',
        isUser && 'bg-accent/10',
        isWinner && 'bg-ucl-green/5'
      )}
    >
      {team.badgeUrl && !badgeError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied(team.badgeUrl)}
          alt={team.name}
          className="h-4 w-4 object-contain flex-shrink-0"
          onError={() => setBadgeError(true)}
        />
      ) : (
        <div
          className={clsx(
            'h-4 w-4 rounded-full flex-shrink-0',
            isUser ? 'bg-accent/40' : 'bg-white/20'
          )}
        />
      )}
      <span
        className={clsx(
          'font-body flex-1 truncate',
          compact ? 'text-xs' : 'text-xs',
          isUser ? 'text-accent font-semibold' : isWinner ? 'text-white font-medium' : 'text-white/70'
        )}
      >
        {team.name}
      </span>
      {score !== null && (
        <span
          className={clsx(
            'font-display font-bold text-sm flex-shrink-0',
            isWinner ? 'text-white' : 'text-white/40'
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function BracketMatchCard({ match, isActive = false, compact = false }: BracketMatchCardProps) {
  const teamAIsWinner = match.winner?.id === match.teamA?.id;
  const teamBIsWinner = match.winner?.id === match.teamB?.id;

  return (
    <div
      className={clsx(
        'rounded border overflow-hidden',
        compact ? 'w-36' : 'w-44',
        isActive
          ? 'border-accent glow-accent'
          : match.winner
          ? 'border-white/20'
          : 'border-white/10',
        'bg-primary'
      )}
    >
      <TeamRow
        team={match.teamA}
        score={match.scoreA}
        isWinner={teamAIsWinner}
        isUser={match.teamA?.isUser ?? false}
        compact={compact}
      />
      <div className="h-px bg-white/10" />
      <TeamRow
        team={match.teamB}
        score={match.scoreB}
        isWinner={teamBIsWinner}
        isUser={match.teamB?.isUser ?? false}
        compact={compact}
      />
    </div>
  );
}
