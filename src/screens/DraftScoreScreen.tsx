'use client';

import { useState } from 'react';
import type { Squad, DraftedPlayer } from '@/types';
import { getDraftScoreTier } from '@/types';
import { PlayerCard } from '@/components/draft/PlayerCard';
import { Button } from '@/components/ui/Button';
import { SquadShareActions } from '@/components/draft/SquadShareActions';
import { proxied } from '@/lib/img';
import { normalizeTeamName } from '@/lib/squadShare';

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

const PLACEHOLDER = 'FK Bodø/Glimt';

function avg(players: DraftedPlayer[]) {
  if (!players.length) return 0;
  return Math.round(players.reduce((s, p) => s + p.player.overall, 0) / players.length);
}

function RatingRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, value) / 100;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#ffffff14" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 26 26)"
        />
        <text x="26" y="31" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" className="font-display">
          {value}
        </text>
      </svg>
      <span className="font-display text-[8px] uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
}

export function DraftScoreScreen({ squad, onContinue }: DraftScoreScreenProps) {
  const [teamName, setTeamName] = useState('');
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
  const displayName = normalizeTeamName(teamName);

  function handleSubmit() {
    setSubmitted(true);
    setTimeout(() => onContinue(displayName), 250);
  }

  return (
    <div className="h-full overflow-hidden px-3 py-2 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl flex flex-col items-center gap-2 min-h-0">
        <div className="text-center shrink-0">
          <div className="font-display text-gold text-[9px] uppercase tracking-[0.35em]">FUT Draft Summary</div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-white">Your Squad</h2>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-5 shrink-0">
          <div className="text-center">
            <div className="font-display font-bold text-2xl md:text-3xl text-ucl-green">{squad.chemistry}</div>
            <div className="font-display text-[8px] tracking-widest text-white/40 uppercase">Chem</div>
          </div>
          <span className="font-display text-xl text-white/40">+</span>
          <div className="text-center">
            <div className="font-display font-bold text-2xl md:text-3xl text-white">{squad.ovrAvg}</div>
            <div className="font-display text-[8px] tracking-widest text-white/40 uppercase">Rating</div>
          </div>
          <span className="font-display text-xl text-white/40">=</span>
          <div className="text-center">
            <div className="font-display font-bold text-3xl md:text-4xl" style={{ color: tierColor }}>{squad.draftScore}</div>
            <div className="font-display text-[8px] tracking-widest text-white/40 uppercase">Draft Score</div>
          </div>
        </div>
        <div className="font-display font-bold text-xs -mt-1 shrink-0" style={{ color: tierColor }}>{tier}</div>

        <div className="flex items-center justify-center gap-5 shrink-0">
          <RatingRing label="Attack" value={attack} color="#ff5d6c" />
          <RatingRing label="Mid" value={midfield} color="#ffd700" />
          <RatingRing label="Def" value={defense} color="#00d4ff" />
        </div>

        <div className="flex flex-wrap justify-center gap-4 w-full shrink-0 scale-[0.88] origin-center">
          {attackers.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="font-display text-[9px] tracking-[0.2em] text-ucl-red uppercase">Attack</div>
              <div className="flex gap-1">
                {attackers.map((dp) => <PlayerCard key={dp.player.id} player={dp.player} size="xs" />)}
              </div>
            </div>
          )}
          {defenders.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="font-display text-[9px] tracking-[0.2em] text-accent uppercase">Defense</div>
              <div className="flex gap-1">
                {defenders.map((dp) => <PlayerCard key={dp.player.id} player={dp.player} size="xs" />)}
              </div>
            </div>
          )}
        </div>

        <SquadShareActions squad={squad} resultLabel="Draft" compact />

        <div className="w-full max-w-sm flex flex-col items-center gap-2 shrink-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-2 border-2 border-white/15 bg-primary/70 px-3 py-2 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxied('https://cdn.sofifa.net/teams/918/60.png')}
              alt="FK Bodø/Glimt"
              className="h-7 w-7 object-contain shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-display text-[8px] uppercase tracking-[0.2em] text-white/40">Club Name</div>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value.slice(0, 40))}
                placeholder={PLACEHOLDER}
                className="w-full bg-transparent font-display font-bold uppercase tracking-wide text-white text-base leading-none outline-none placeholder:text-white/25 placeholder:font-normal"
                maxLength={40}
                aria-label="Team name"
              />
            </div>
          </div>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={submitted} className="w-full">
            Enter the UCL Draw →
          </Button>
        </div>
      </div>
    </div>
  );
}
