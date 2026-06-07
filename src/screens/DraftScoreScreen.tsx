'use client';

import { useState } from 'react';
import type { Squad, DraftedPlayer } from '@/types';
import { getDraftScoreTier } from '@/types';
import { PlayerCard } from '@/components/draft/PlayerCard';
import { Button } from '@/components/ui/Button';
import { proxied } from '@/lib/img';

interface DraftScoreScreenProps {
  squad: Squad;
  onContinue: (teamName: string) => void;
}

const FWD = new Set(['ST', 'CF', 'LW', 'RW']);
const MID = new Set(['CAM', 'CM', 'CDM', 'DM', 'LM', 'RM']);
const ATT_POSITIONS = new Set(['ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'CAM']);

const TIER_COLOR: Record<string, string> = {
  'World Class Draft': '#ffd700',
  'Elite Draft': '#00d4ff',
  'Strong Draft': '#ffffff',
  'Good Draft': 'rgba(255,255,255,0.7)',
};

function avg(players: DraftedPlayer[]) {
  if (!players.length) return 0;
  return Math.round(players.reduce((s, p) => s + p.player.overall, 0) / players.length);
}

function RatingRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, value) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#ffffff14" strokeWidth="6" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 34 34)"
        />
        <text x="34" y="40" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" className="font-display">
          {value}
        </text>
      </svg>
      <span className="font-display text-[10px] uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
}

export function DraftScoreScreen({ squad, onContinue }: DraftScoreScreenProps) {
  const [submitted, setSubmitted] = useState(false);

  const byOvr = (a: DraftedPlayer, b: DraftedPlayer) => b.player.overall - a.player.overall;
  const starters = squad.starters;
  const attack = avg(starters.filter((dp) => FWD.has(dp.player.position)));
  const midfield = avg(starters.filter((dp) => MID.has(dp.player.position)));
  const defense = avg(starters.filter((dp) => !FWD.has(dp.player.position) && !MID.has(dp.player.position)));

  const isAtt = (dp: DraftedPlayer) => ATT_POSITIONS.has(dp.player.position);
  const attackers = starters.filter(isAtt).sort(byOvr).slice(0, 3);
  const defenders = starters.filter((dp) => !isAtt(dp)).sort(byOvr).slice(0, 3);

  const tier = getDraftScoreTier(squad.draftScore);
  const tierColor = TIER_COLOR[tier];

  function handleSubmit() {
    setSubmitted(true);
    setTimeout(() => onContinue(squad.teamName), 250);
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col items-center gap-5">
        <div className="text-center shrink-0">
          <div className="font-display text-gold text-xs uppercase tracking-[0.35em]">FUT Draft Summary</div>
          <h2 className="font-display font-bold text-3xl text-white mt-1">Your Squad</h2>
        </div>

        {/* Chemistry + Rating = Squad Rating */}
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <div className="text-center">
            <div className="font-display font-bold text-4xl text-ucl-green">{squad.chemistry}</div>
            <div className="font-display text-[9px] tracking-widest text-white/40 uppercase">Chemistry</div>
          </div>
          <span className="font-display text-3xl text-white/40">+</span>
          <div className="text-center">
            <div className="font-display font-bold text-4xl text-white">{squad.ovrAvg}</div>
            <div className="font-display text-[9px] tracking-widest text-white/40 uppercase">Rating</div>
          </div>
          <span className="font-display text-3xl text-white/40">=</span>
          <div className="text-center">
            <div className="font-display font-bold text-5xl" style={{ color: tierColor }}>{squad.draftScore}</div>
            <div className="font-display text-[9px] tracking-widest text-white/40 uppercase">Draft Score</div>
          </div>
        </div>
        <div className="font-display font-bold -mt-3" style={{ color: tierColor }}>{tier}</div>

        {/* Line rating gauges */}
        <div className="flex items-center justify-center gap-8">
          <RatingRing label="Attack" value={attack} color="#ff5d6c" />
          <RatingRing label="Midfield" value={midfield} color="#ffd700" />
          <RatingRing label="Defense" value={defense} color="#00d4ff" />
        </div>

        {/* Top players */}
        <div className="flex flex-wrap justify-center gap-8 w-full">
          {attackers.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="font-display text-[11px] tracking-[0.25em] text-ucl-red uppercase">Top Attackers</div>
              <div className="flex gap-2">
                {attackers.map((dp) => <PlayerCard key={dp.player.id} player={dp.player} size="sm" />)}
              </div>
            </div>
          )}
          {defenders.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div className="font-display text-[11px] tracking-[0.25em] text-accent uppercase">Top Defenders</div>
              <div className="flex gap-2">
                {defenders.map((dp) => <PlayerCard key={dp.player.id} player={dp.player} size="sm" />)}
              </div>
            </div>
          )}
        </div>

        {/* Locked team identity + enter */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3 pb-4">
          <div className="flex items-center justify-center gap-3 border-2 border-white/15 bg-primary/70 px-5 py-3 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxied('https://cdn.sofifa.net/teams/918/60.png')}
              alt="FK Bodø/Glimt"
              className="h-9 w-9 object-contain"
            />
            <div className="text-left">
              <div className="font-display text-[9px] uppercase tracking-[0.25em] text-white/40">Your Club</div>
              <div className="font-display font-bold uppercase tracking-wide text-white text-lg leading-none">
                {squad.teamName}
              </div>
            </div>
          </div>
          <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitted} className="w-full">
            Enter the UCL Draw →
          </Button>
        </div>
      </div>
    </div>
  );
}
