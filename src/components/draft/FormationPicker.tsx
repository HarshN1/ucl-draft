'use client';

import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { clsx } from 'clsx';
import type { Formation, FormationPosition } from '@/types';
import { Button } from '@/components/ui/Button';

interface FormationPickerProps {
  formations: Formation[];
  onSelect: (formation: Formation) => void;
}

function dotColor(group: string) {
  if (group === 'GK') return '#ffd700';
  if (group === 'CB' || group === 'FB') return '#00d4ff';
  if (group === 'ST' || group === 'WG') return '#ff5d6c';
  return '#ffffff';
}

function PitchDiagram({ positions, big = false }: { positions: FormationPosition[]; big?: boolean }) {
  return (
    <svg viewBox="0 0 100 132" className="w-full h-full">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16432a" />
          <stop offset="50%" stopColor="#0f3120" />
          <stop offset="100%" stopColor="#16432a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="132" fill="url(#pg)" rx="3" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="0" y={i * 22} width="100" height="11" fill="#ffffff05" />
      ))}
      <rect x="3" y="3" width="94" height="126" fill="none" stroke="#ffffff25" strokeWidth="0.6" />
      <line x1="3" y1="66" x2="97" y2="66" stroke="#ffffff25" strokeWidth="0.6" />
      <circle cx="50" cy="66" r="11" stroke="#ffffff25" strokeWidth="0.6" fill="none" />
      <rect x="28" y="3" width="44" height="18" stroke="#ffffff20" strokeWidth="0.6" fill="none" />
      <rect x="28" y="111" width="44" height="18" stroke="#ffffff20" strokeWidth="0.6" fill="none" />
      {positions.map((pos) => {
        const cx = pos.x;
        const cy = 132 - (pos.y / 100) * 122 - 6;
        return (
          <g key={pos.slot}>
            <circle cx={cx} cy={cy} r={big ? 4.5 : 5} fill={dotColor(pos.positionGroup)} stroke="#0a0e1a" strokeWidth="1" />
            {big && (
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="4.2" fill="#ffffffcc" fontWeight="700">
                {pos.slot}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function FormationPicker({ formations, onSelect }: FormationPickerProps) {
  const isMobile = useIsMobile();
  const [focusName, setFocusName] = useState<string>(formations[0]?.name ?? '');
  const [selected, setSelected] = useState<string | null>(null);
  const focused = formations.find((f) => f.name === focusName) ?? formations[0];

  function confirm(f: Formation) {
    setSelected(f.name);
    setTimeout(() => onSelect(f), 250);
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-5 w-full max-w-4xl mx-auto items-stretch justify-center">
      {/* Formation list */}
      <div className="w-full md:w-64 flex flex-col gap-2 overflow-y-auto max-h-[42vh] md:max-h-[62cqh] shrink-0">
        {formations.map((f) => {
          const isFocus = focusName === f.name;
          return (
            <button
              key={f.name}
              onMouseEnter={() => setFocusName(f.name)}
              onClick={() => (isMobile || isFocus ? confirm(f) : setFocusName(f.name))}
              className={clsx(
                'ea-skew flex items-center gap-3 border-2 px-3 py-2 transition-[background-color,border-color] duration-75 ease-out shrink-0 text-left',
                isFocus
                  ? 'border-gold bg-gold/15 glow-active'
                  : 'border-white/10 bg-primary/70 hover:border-gold/50'
              )}
            >
              <div className="ea-unskew flex items-center gap-3">
                <div className="w-9 h-12 shrink-0">
                  <PitchDiagram positions={f.positions} />
                </div>
                <div>
                  <div
                    className={clsx(
                      'font-display font-bold text-lg leading-tight uppercase tracking-wide',
                      isFocus ? 'text-gold' : 'text-white'
                    )}
                  >
                    {f.name}
                  </div>
                  <div className="font-display text-[11px] uppercase tracking-[0.2em] text-white/45">{f.label}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview — hidden on phone (list is enough) */}
      <div className="hidden md:flex flex-1 min-w-[260px] flex-col items-center">
        <div className="w-full flex items-baseline gap-2 mb-2">
          <span className="font-display text-white/40 text-xs uppercase tracking-widest">Formation:</span>
          <span className="font-display font-bold text-accent text-2xl">{focused?.name}</span>
          <span className="font-display text-white/40 text-xs uppercase tracking-widest ml-auto">{focused?.label}</span>
        </div>
        <div className="rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: '7/9', height: 'min(52cqh, 480px)' }}>
          {focused && <PitchDiagram positions={focused.positions} big />}
        </div>
        <Button
          variant="primary"
          size="lg"
          className="mt-4 w-full max-w-xs"
          disabled={!!selected}
          onClick={() => focused && confirm(focused)}
        >
          Select {focused?.name} →
        </Button>
      </div>
    </div>
  );
}
