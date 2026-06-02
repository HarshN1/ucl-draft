'use client';

import type { MatchResult } from '@/types';

interface MatchStatsProps {
  result: MatchResult;
  userTeamName: string;
  opponentName: string;
}

function StatRow({
  label,
  userVal,
  oppVal,
}: {
  label: string;
  userVal: number;
  oppVal: number;
}) {
  const total = userVal + oppVal || 1;
  const userPct = (userVal / total) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between font-body text-xs text-white/50">
        <span>{userVal}</span>
        <span className="uppercase tracking-wider text-white/30 text-[10px]">{label}</span>
        <span>{oppVal}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-accent rounded-full transition-all duration-1000"
          style={{ width: `${userPct}%` }}
        />
      </div>
    </div>
  );
}

export function MatchStats({ result, userTeamName, opponentName }: MatchStatsProps) {
  return (
    <div className="w-full space-y-4">
      {/* Team headers */}
      <div className="flex justify-between font-display text-xs font-semibold text-white/40 uppercase tracking-wider">
        <span className="text-accent truncate max-w-[100px]">{userTeamName}</span>
        <span className="text-white/30">vs</span>
        <span className="truncate max-w-[100px] text-right">{opponentName}</span>
      </div>

      <StatRow label="Possession %" userVal={result.possession} oppVal={100 - result.possession} />
      <StatRow label="Shots" userVal={result.userShots} oppVal={result.opponentShots} />
      <StatRow label="On Target" userVal={result.userShotsOnTarget} oppVal={result.opponentShotsOnTarget} />

      <div className="flex justify-between font-body text-xs">
        <span className="text-white/50">{result.userXg} xG</span>
        <span className="uppercase tracking-wider text-white/30 text-[10px]">Expected Goals</span>
        <span className="text-white/50">{result.opponentXg} xG</span>
      </div>

      {/* Player ratings */}
      <div className="mt-4 space-y-1">
        <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-2">
          Player Ratings
        </div>
        {result.playerRatings.map(({ player, rating }) => (
          <div
            key={player.player.id}
            className="flex items-center justify-between font-body text-xs"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {player.player.id === result.motm.player.id && (
                <span className="text-gold text-[10px]">⭐</span>
              )}
              <span className="text-white/70 truncate">{player.player.name}</span>
              <span className="text-white/30 text-[10px]">{player.slot}</span>
            </div>
            <span
              className={
                rating >= 8.0
                  ? 'text-ucl-green font-bold'
                  : rating >= 7.0
                  ? 'text-accent'
                  : rating >= 6.0
                  ? 'text-white/70'
                  : 'text-ucl-red'
              }
            >
              {rating.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
