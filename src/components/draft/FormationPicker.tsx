'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import type { Formation, FormationPosition } from '@/types';

interface FormationPickerProps {
  formations: Formation[];
  onSelect: (formation: Formation) => void;
}

function MiniField({ positions }: { positions: FormationPosition[] }) {
  return (
    <svg viewBox="0 0 100 130" className="w-full h-full" fill="none">
      {/* Pitch */}
      <rect x="0" y="0" width="100" height="130" fill="#1a3a1a" rx="2" />
      {/* Centre circle */}
      <circle cx="50" cy="65" r="12" stroke="#ffffff20" strokeWidth="0.8" fill="none" />
      <line x1="0" y1="65" x2="100" y2="65" stroke="#ffffff20" strokeWidth="0.8" />
      {/* Penalty areas */}
      <rect x="25" y="100" width="50" height="28" stroke="#ffffff20" strokeWidth="0.8" fill="none" />
      <rect x="25" y="2" width="50" height="28" stroke="#ffffff20" strokeWidth="0.8" fill="none" />
      {/* Player dots */}
      {positions.map((pos) => {
        // Map coords: y=0 GK end (bottom of pitch visual), y=100 forward end (top)
        // SVG y increases downward, so flip: svgY = 130 - (y/100 * 130)
        const svgX = (pos.x / 100) * 100;
        const svgY = 130 - (pos.y / 100) * 118 - 6;
        return (
          <circle
            key={pos.slot}
            cx={svgX}
            cy={svgY}
            r="4.5"
            fill="#00d4ff"
            stroke="#0a0e1a"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

export function FormationPicker({ formations, onSelect }: FormationPickerProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(f: Formation) {
    setSelected(f.name);
    setTimeout(() => onSelect(f), 250);
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {formations.map((f) => {
        const isHovered = hovered === f.name;
        const isSelected = selected === f.name;
        return (
          <div
            key={f.name}
            onClick={() => handleSelect(f)}
            onMouseEnter={() => setHovered(f.name)}
            onMouseLeave={() => setHovered(null)}
            className={clsx(
              'w-32 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200',
              'bg-primary flex flex-col items-center gap-2',
              isSelected
                ? 'border-gold glow-gold scale-105'
                : isHovered
                ? 'border-accent glow-accent scale-102'
                : 'border-white/10 hover:border-accent/50'
            )}
          >
            {/* Mini pitch */}
            <div className="w-full aspect-[10/13]">
              <MiniField positions={f.positions} />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-white text-sm">{f.name}</div>
              <div className="font-body text-white/50 text-xs">{f.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
