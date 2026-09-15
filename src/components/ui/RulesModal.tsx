'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'ucl-draft-seen-rules';

export function hasSeenRules(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markRulesSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-5 md:p-6 max-h-[min(80dvh,520px)] overflow-hidden flex flex-col">
        <h2 className="font-display font-bold text-xl text-gold mb-3 shrink-0">How FUT Draft Works</h2>
        <ul className="font-body text-sm text-white/75 space-y-2.5 overflow-hidden">
          <li>
            <span className="text-white font-medium">Chemistry links</span> — Green lines between
            starters mean strong club, league, or nation ties. More green = higher chemistry.
          </li>
          <li>
            <span className="text-white font-medium">Manager boost</span> — Pick a manager whose
            league or nationality matches your XI for extra chemistry.
          </li>
          <li>
            <span className="text-white font-medium">Draft score</span> — Squad rating + chemistry.
            Higher draft score = stronger tournament run on average.
          </li>
          <li>
            <span className="text-white font-medium">Special cards</span> — Icons and heroes can
            appear multiple times, but odds taper as you draft more of them.
          </li>
          <li>
            <span className="text-white font-medium">Bench order</span> — Subs follow FIFA order
            (GK, DEF, MID, ATT). Hover or tap the bench to see full cards.
          </li>
        </ul>
        <div className="mt-4 shrink-0 flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              markRulesSeen();
              onClose();
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Auto-opens rules on first visit until dismissed. */
export function useRulesOnFirstVisit() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSeenRules()) setOpen(true);
  }, []);

  return {
    rulesOpen: open,
    closeRules: () => {
      markRulesSeen();
      setOpen(false);
    },
    openRules: () => setOpen(true),
  };
}
