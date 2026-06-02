'use client';

interface ChemistryBarProps {
  value: number; // 0–100
  label?: string;
  showNumber?: boolean;
  className?: string;
}

function getChemColor(value: number) {
  if (value > 75) return '#00ff88';
  if (value >= 50) return '#fbbf24';
  return '#ff4444';
}

export function ChemistryBar({
  value,
  label = 'CHEMISTRY',
  showNumber = true,
  className = '',
}: ChemistryBarProps) {
  const color = getChemColor(value);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-display text-xs font-semibold tracking-widest text-white/50 uppercase">
          {label}
        </span>
        {showNumber && (
          <span
            className="font-display font-bold text-sm"
            style={{ color }}
          >
            {value}
          </span>
        )}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full chem-bar-fill"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
