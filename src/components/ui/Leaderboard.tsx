'use client';

import { useLeaderboard } from '@/hooks/useLeaderboard';

const TIER_COLORS: Record<string, string> = {
  Champions: 'text-gold',
  'Won Final': 'text-gold',
  'Won Semi-Final': 'text-accent',
  'Won Quarter-Final': 'text-ucl-green',
};

export function Leaderboard() {
  const { entries } = useLeaderboard();

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-white/40 font-body">
        <p>No entries yet.</p>
        <p className="text-sm mt-1">Complete a draft to appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full font-body text-sm">
        <thead>
          <tr className="text-white/50 border-b border-white/10 text-left">
            <th className="pb-2 pr-3 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">Team</th>
            <th className="pb-2 pr-3 font-medium">Formation</th>
            <th className="pb-2 pr-3 font-medium text-right">Score</th>
            <th className="pb-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.id}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-2.5 pr-3">
                <span
                  className={
                    i === 0
                      ? 'text-gold font-bold'
                      : i === 1
                      ? 'text-white/60'
                      : 'text-white/40'
                  }
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[120px]">
                {entry.teamName}
              </td>
              <td className="py-2.5 pr-3 text-white/60">{entry.formation}</td>
              <td className="py-2.5 pr-3 text-right">
                <span
                  className={
                    entry.draftScore >= 190
                      ? 'text-gold font-bold'
                      : entry.draftScore >= 180
                      ? 'text-accent font-semibold'
                      : 'text-white'
                  }
                >
                  {entry.draftScore}
                </span>
              </td>
              <td
                className={`py-2.5 text-xs ${
                  TIER_COLORS[entry.result] ?? 'text-white/50'
                }`}
              >
                {entry.result}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
