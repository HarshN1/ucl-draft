'use client';

import type { Formation } from '@/types';
import { FormationPicker } from '@/components/draft/FormationPicker';

interface FormationScreenProps {
  formations: Formation[];
  onSelect: (formation: Formation) => void;
}

export function FormationScreen({ formations, onSelect }: FormationScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-5 overflow-hidden">
      <div className="w-full flex flex-col items-center gap-4">
        <div className="text-center shrink-0 w-full max-w-2xl">
          <div className="fut-breadcrumb mb-3">
            <span>
              FUT DRAFT <span className="text-gold/80">&gt;</span> CHOOSE FORMATION
            </span>
          </div>

          <div className="flex gap-1 w-full max-w-md mx-auto mb-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={step === 1 ? 'h-1 flex-1 bg-gold' : 'h-1 flex-1 bg-white/15'}
              />
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-white">
            Choose Your <span className="text-accent">Formation</span>
          </h2>
        </div>

        <FormationPicker formations={formations} onSelect={onSelect} />
      </div>
    </div>
  );
}
