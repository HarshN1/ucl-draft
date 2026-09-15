'use client';

import { useMemo } from 'react';
import type { Squad } from '@/types';
import { getDraftScoreTier } from '@/types';
import { SquadBoard } from '@/components/draft/SquadBoard';
import { Button } from '@/components/ui/Button';
import { proxied } from '@/lib/img';
import { squadToBoardArrays } from '@/lib/squadShare';
import { SUBS_COUNT } from '@/constants/squadLayout';
import { calculateChemistry } from '@/engine/chemistryEngine';
import { useIsMobile } from '@/hooks/useIsMobile';

interface SquadViewerProps {
  squad: Squad;
  resultLabel?: string;
  onClose?: () => void;
  shareUrl?: string;
}

const TIER_COLOR: Record<string, string> = {
  'World Class Draft': '#ffd700',
  'Elite Draft': '#00d4ff',
  'Strong Draft': '#ffffff',
  'Good Draft': 'rgba(255,255,255,0.7)',
};

export function SquadViewer({ squad, resultLabel, onClose, shareUrl }: SquadViewerProps) {
  const isMobile = useIsMobile();
  const tier = getDraftScoreTier(squad.draftScore);
  const tierColor = TIER_COLOR[tier];

  const { starterPlayers, benchPlayers } = useMemo(() => squadToBoardArrays(squad), [squad]);
  const chem = useMemo(
    () => calculateChemistry(squad.starters, squad.formation, squad.manager),
    [squad]
  );

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full overflow-y-auto px-2 md:px-4 py-3 flex flex-col">
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxied('https://cdn.sofifa.net/teams/918/60.png')}
            alt=""
            className="h-7 w-7 object-contain shrink-0"
          />
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg text-white uppercase truncate">{squad.teamName}</h2>
            <div className="font-display text-white/45 text-[10px] uppercase tracking-widest">
              {squad.formation.name}
              {resultLabel ? ` · ${resultLabel}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-center">
          <div>
            <div className="font-display font-bold text-lg text-ucl-green">{squad.chemistry}</div>
            <div className="font-display text-[8px] text-white/35 uppercase">Chem</div>
          </div>
          <div>
            <div className="font-display font-bold text-lg text-white">{squad.ovrAvg}</div>
            <div className="font-display text-[8px] text-white/35 uppercase">OVR</div>
          </div>
          <div>
            <div className="font-display font-bold text-xl" style={{ color: tierColor }}>{squad.draftScore}</div>
            <div className="font-display text-[8px] text-white/35 uppercase">Score</div>
          </div>
        </div>
      </div>

      {squad.manager && (
        <div className="shrink-0 flex items-center justify-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center font-display font-bold text-gold text-[10px]">
            {squad.manager.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="font-display text-sm text-white/80">{squad.manager.name}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <SquadBoard
          readOnly
          compact={isMobile}
          formation={squad.formation}
          starterPlayers={starterPlayers}
          benchPlayers={benchPlayers}
          subsCount={SUBS_COUNT}
          chem={chem}
          activeSlot={null}
          draggingSlot={null}
          swapSource={null}
          onSlotClick={() => {}}
          onDragStart={() => {}}
          onDrop={() => {}}
        />
      </div>

      <div className="shrink-0 flex gap-2 pt-3 pb-[env(safe-area-inset-bottom)]">
        {shareUrl && (
          <Button variant="gold" size="md" onClick={copyLink} className="flex-1">
            Copy link
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
