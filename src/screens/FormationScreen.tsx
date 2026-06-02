'use client';

import type { Formation } from '@/types';
import { FormationPicker } from '@/components/draft/FormationPicker';

interface FormationScreenProps {
  formations: Formation[];
  onSelect: (formation: Formation) => void;
}

export function FormationScreen({ formations, onSelect }: FormationScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="font-display font-bold text-white/30 text-xs tracking-widest uppercase mb-2">
            Step 1 of 3
          </div>
          <h2 className="font-display font-bold text-4xl text-white">
            Choose Your{' '}
            <span className="text-accent">Formation</span>
          </h2>
          <p className="font-body text-white/40 text-sm mt-2">
            This will be locked for your entire UCL run.
          </p>
        </div>

        <FormationPicker formations={formations} onSelect={onSelect} />
      </div>
    </div>
  );
}
