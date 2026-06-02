'use client';

import { clsx } from 'clsx';
import type { MatchResult, BracketTeam } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PlayerCard } from '@/components/draft/PlayerCard';
import { MatchStats } from './MatchStats';

interface PostMatchModalProps {
  isOpen: boolean;
  result: MatchResult;
  userTeamName: string;
  opponent: BracketTeam;
  roundName: string;
  isFinalRound: boolean;
  onContinue: () => void;
}

export function PostMatchModal({
  isOpen,
  result,
  userTeamName,
  opponent,
  roundName,
  isFinalRound,
  onContinue,
}: PostMatchModalProps) {
  const resultLabel = result.userWon ? 'WIN' : 'LOSS';
  const resultColor = result.userWon ? 'text-ucl-green' : 'text-ucl-red';

  return (
    <Modal isOpen={isOpen} disableBackdropClose size="xl">
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="font-display text-xs tracking-widest text-white/40 uppercase mb-1">
            {roundName}
          </div>
          <div className="font-display font-bold text-5xl text-white mb-2">
            {result.userScore} – {result.opponentScore}
          </div>
          <div className={clsx('font-display font-bold text-2xl', resultColor)}>
            {resultLabel}
            {result.wentToPenalties && ' (Pens)'}
            {result.wentToET && !result.wentToPenalties && ' (AET)'}
          </div>
          <div className="text-white/40 font-body text-sm mt-1">
            {userTeamName} vs {opponent.name}
          </div>
        </div>

        {/* MOTM + Stats */}
        <div className="flex gap-6 flex-wrap justify-center">
          {/* MOTM */}
          <div className="flex flex-col items-center gap-2">
            <div className="font-display text-xs tracking-widest text-gold uppercase">
              Man of the Match
            </div>
            <PlayerCard player={result.motm.player} size="md" />
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-[240px]">
            <MatchStats
              result={result}
              userTeamName={userTeamName}
              opponentName={opponent.name}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex justify-center">
          <Button
            variant={result.userWon ? 'primary' : 'ghost'}
            size="lg"
            onClick={onContinue}
          >
            {result.userWon
              ? isFinalRound
                ? '🏆 Claim the Trophy'
                : 'Continue to Next Round'
              : 'View Final Bracket'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
