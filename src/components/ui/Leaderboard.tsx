'use client';

import { useState } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { SquadViewer } from '@/components/draft/SquadViewer';
import { snapshotToSquad } from '@/lib/squadShare';

const TIER_COLORS: Record<string, string> = {
  Champions: 'text-gold',
  'Won Final': 'text-gold',
  'Won Semi-Final': 'text-accent',
  'Won Quarter-Final': 'text-ucl-green',
};

export function Leaderboard() {
  const { entries, mode, loading, error } = useLeaderboard();
  const [viewingId, setViewingId] = useState<string | null>(null);

  const viewingEntry = entries.find((e) => e.id === viewingId);
  const viewingSquad = viewingEntry?.squad ? snapshotToSquad(viewingEntry.squad) : null;

  if (loading) {
    return (
      <div className="text-center py-8 text-white/40 font-body">
        <p>Loading leaderboard…</p>
      </div>
    );
  }

  if (viewingSquad) {
    return (
      <SquadViewer
        squad={viewingSquad}
        resultLabel={viewingEntry?.result}
        shareUrl={viewingEntry?.shareUrl}
        onClose={() => setViewingId(null)}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`font-display text-[10px] uppercase tracking-widest px-2 py-0.5 border ${
            mode === 'global'
              ? 'text-accent border-accent/40 bg-accent/10'
              : 'text-white/50 border-white/20 bg-white/5'
          }`}
        >
          {mode === 'global' ? 'Global' : 'Local'}
        </span>
        {mode === 'local' && (
          <span className="font-body text-[10px] text-white/30">
            Stored on this device
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-ucl-red/10 border border-ucl-red/30 text-ucl-red text-xs font-body">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-white/40 font-body">
          <p>No entries yet.</p>
          <p className="text-sm mt-1">Complete a draft to appear here.</p>
        </div>
      ) : (
        <>
          <p className="font-body text-[10px] text-white/30 mb-2">Tap a row to view the squad</p>
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
              {entries.map((entry, i) => {
                const clickable = !!entry.squad;
                return (
                  <tr
                    key={entry.id}
                    onClick={() => clickable && setViewingId(entry.id)}
                    className={`border-b border-white/5 transition-colors ${
                      clickable ? 'hover:bg-white/10 cursor-pointer' : 'hover:bg-white/5'
                    }`}
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
                      {clickable && <span className="ml-1 text-accent text-[10px]">↗</span>}
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
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
