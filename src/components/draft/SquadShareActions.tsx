'use client';

import { useState } from 'react';
import type { Squad } from '@/types';
import { Button } from '@/components/ui/Button';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { shareDraft } from '@/lib/share';
import { squadToSnapshot, buildShareUrl } from '@/lib/squadShare';

interface SquadShareActionsProps {
  squad: Squad;
  /** Leaderboard result label — defaults to pre-tournament "Draft". */
  resultLabel?: string;
  compact?: boolean;
}

export function SquadShareActions({ squad, resultLabel = 'Draft', compact }: SquadShareActionsProps) {
  const { saveEntry, saving } = useLeaderboard();
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'global' | 'local' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const snapshot = squadToSnapshot(squad);
  const shareUrl = buildShareUrl(snapshot);

  async function handleShare() {
    const result = await shareDraft(
      squad.draftScore,
      squad.formation.name,
      squad.teamName,
      shareUrl
    );
    setShareStatus(result);
    if (result !== 'failed') setTimeout(() => setShareStatus('idle'), 3000);
  }

  async function handleSave() {
    setSaveError(null);
    try {
      const { mode } = await saveEntry({
        teamName: squad.teamName,
        formation: squad.formation.name,
        draftScore: squad.draftScore,
        result: resultLabel,
        squad: snapshot,
        shareUrl,
      });
      setSaveStatus(mode === 'global' ? 'global' : 'local');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  const btnSize = compact ? 'sm' : 'md';

  return (
    <div className={`flex flex-col gap-2 w-full ${compact ? 'max-w-xs' : 'max-w-sm'}`}>
      {saveStatus === 'global' && (
        <p className="font-display text-[10px] uppercase tracking-widest text-ucl-green text-center">
          Saved to leaderboard
        </p>
      )}
      {saveStatus === 'local' && (
        <p className="font-body text-[10px] text-amber-400/90 text-center">Saved on this device</p>
      )}
      {(saveError || saving) && saveStatus === 'idle' && (
        <p className="font-body text-[10px] text-white/40 text-center">{saving ? 'Saving…' : saveError}</p>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size={btnSize}
          onClick={handleSave}
          disabled={saving || saveStatus !== 'idle'}
          className="flex-1 text-xs"
        >
          {saveStatus !== 'idle' ? 'Saved' : 'Save score'}
        </Button>
        <Button variant="gold" size={btnSize} onClick={handleShare} className="flex-1 text-xs">
          {shareStatus === 'shared'
            ? 'Shared!'
            : shareStatus === 'copied'
              ? 'Copied!'
              : 'Share squad'}
        </Button>
      </div>
    </div>
  );
}
