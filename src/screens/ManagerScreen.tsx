'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Manager, Player } from '@/types';
import nationFlags from '@/data/nationFlags.json';
import { proxied } from '@/lib/img';

const FLAGS = nationFlags as Record<string, string>;

interface ManagerScreenProps {
  managers: Manager[];
  starters: Player[];
  onPick: (manager: Manager) => void;
}

function ManagerAvatar({ manager }: { manager: Manager }) {
  const [flagError, setFlagError] = useState(false);
  const initials = manager.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
  const code = FLAGS[manager.nationalityName];
  const flagSrc = code ? `https://cdn.sofifa.net/flags/${code}.png` : '';

  return (
    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-background border-2 border-white/20 flex items-center justify-center">
      <span className="font-display font-bold text-2xl text-white/80">{initials}</span>
      {flagSrc && !flagError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxied(flagSrc)}
          alt={manager.nationalityName}
          className="absolute -bottom-1 -right-1 h-5 w-7 object-cover rounded-sm border border-black/40"
          onError={() => setFlagError(true)}
        />
      )}
    </div>
  );
}

/** Count how many starters this manager would boost (matching league or nationality). */
function countBoost(manager: Manager, starters: Player[]): number {
  const normLeague = (s: string) => (s || '').toLowerCase();
  let n = 0;
  for (const p of starters) {
    const sameNation =
      p.nationalityName.toLowerCase() === manager.nationalityName.toLowerCase();
    const sameLeague =
      normLeague(p.leagueName).includes(normLeague(manager.leagueName).split(' ')[0]) ||
      normLeague(manager.leagueName).includes(normLeague(p.leagueName).split(' ')[0]);
    if (sameNation || sameLeague) n++;
  }
  return n;
}

export function ManagerScreen({ managers, starters, onPick }: ManagerScreenProps) {
  const [picked, setPicked] = useState<string | null>(null);

  function handlePick(m: Manager) {
    if (picked) return;
    setPicked(m.id);
    setTimeout(() => onPick(m), 280);
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-10">
        <div className="font-display text-white/30 text-xs uppercase tracking-widest mb-1">
          Final Step · Squad Building
        </div>
        <h2 className="font-display font-bold text-4xl text-white">
          Choose Your <span className="text-accent">Manager</span>
        </h2>
        <p className="font-body text-white/40 text-sm mt-2">
          A manager whose league or nationality matches your players boosts chemistry.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 max-w-5xl">
        {managers.map((m) => {
          const boost = countBoost(m, starters);
          const isPicked = picked === m.id;
          const CUT = 'polygon(0 0, 100% 0, 100% 82%, 86% 100%, 0 100%)';
          return (
            <button
              key={m.id}
              onClick={() => handlePick(m)}
              className={clsx(
                'group relative w-44 h-60 cursor-pointer transition-transform duration-200',
                isPicked ? 'scale-105' : 'hover:scale-[1.03]'
              )}
            >
              {/* sharp EA-cut border + fill */}
              <div
                className={clsx(
                  'absolute inset-0 transition-colors duration-150',
                  isPicked ? 'bg-gold' : 'bg-white/15 group-hover:bg-gold/60'
                )}
                style={{ clipPath: CUT, filter: isPicked ? 'drop-shadow(0 0 9px rgba(226,174,22,0.7))' : undefined }}
              />
              <div
                className="absolute inset-[2px] flex flex-col items-center gap-3 text-center px-4 pt-5 pb-4"
                style={{ clipPath: CUT, background: 'linear-gradient(160deg,#0f2937,#081822)' }}
              >
                <ManagerAvatar manager={m} />
                <div>
                  <div className="font-display font-bold uppercase tracking-wide text-white text-base leading-tight">
                    {m.name}
                  </div>
                  <div className="font-display uppercase tracking-[0.15em] text-white/45 text-[11px] mt-1">
                    {m.nationalityName}
                  </div>
                  <div className="font-display uppercase tracking-[0.15em] text-white/35 text-[10px]">
                    {m.leagueName}
                  </div>
                </div>
                <div className="ea-skew mt-auto px-3 py-1 border" style={{
                  borderColor: boost >= 6 ? '#2fd07a' : boost >= 3 ? '#e2ae16' : 'rgba(255,255,255,0.25)',
                  background: boost >= 6 ? 'rgba(47,208,122,0.12)' : boost >= 3 ? 'rgba(226,174,22,0.12)' : 'rgba(255,255,255,0.06)',
                }}>
                  <span
                    className="ea-unskew block font-display font-bold uppercase tracking-wider text-[11px]"
                    style={{ color: boost >= 6 ? '#2fd07a' : boost >= 3 ? '#e2ae16' : 'rgba(255,255,255,0.6)' }}
                  >
                    +{boost} Chem
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
