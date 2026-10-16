'use client';

import { clsx } from 'clsx';
import type { MatchEvent } from '@/types';

interface EventFeedProps {
  events: MatchEvent[];
  currentMinute?: number;
}

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽',
  YELLOW_CARD: '🟨',
  RED_CARD: '🟥',
  SAVE: '🧤',
  CHANCE: '🎯',
  SUBSTITUTION: '🔄',
  KEY_PASS: '🎯',
  FOUL: '⚠️',
};

const EVENT_TAG: Record<string, string> = {
  GOAL: 'GOAL',
  SUBSTITUTION: 'MANAGER SUB',
  SAVE: 'BIG SAVE',
  CHANCE: 'CLOSE CHANCE',
  YELLOW_CARD: 'BOOKING',
  RED_CARD: 'RED CARD',
};

export function EventFeed({ events, currentMinute }: EventFeedProps) {
  const visibleEvents =
    currentMinute === undefined
      ? events
      : events.filter((e) => e.minute <= currentMinute);

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-y-auto pr-1">
      {visibleEvents.map((event, idx) => {
        const isSub = event.type === 'SUBSTITUTION';
        const isBig = event.isGoal || event.type === 'SAVE' || isSub;
        const tag = EVENT_TAG[event.type];
        return (
          <div
            key={idx}
            className={clsx(
              'flex items-start gap-2 px-2.5 py-1.5 rounded-[3px] text-xs animate-fade-in border',
              event.isGoal
                ? event.isUserTeam
                  ? 'bg-accent/15 border-accent/50 animate-goal-flash'
                  : 'bg-ucl-red/15 border-ucl-red/50 animate-goal-flash'
                : isSub
                  ? 'bg-gold/10 border-gold/35'
                  : event.type === 'SAVE'
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/5 border-white/5'
            )}
          >
            <span className="text-sm flex-shrink-0 mt-0.5">
              {EVENT_ICONS[event.type] ?? '•'}
            </span>
            <div className="flex-1 min-w-0">
              {isBig && tag && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className={clsx(
                      'font-display font-bold text-[9px] uppercase tracking-widest px-1 py-[0.5px] rounded-[2px]',
                      event.isGoal
                        ? event.isUserTeam
                          ? 'bg-accent text-black'
                          : 'bg-ucl-red text-white'
                        : isSub
                          ? 'bg-gold text-black'
                          : 'bg-white/20 text-white'
                    )}
                  >
                    {tag}
                  </span>
                </div>
              )}
              <span
                className={clsx(
                  'font-body leading-snug block',
                  event.isGoal
                    ? event.isUserTeam
                      ? 'text-accent font-semibold'
                      : 'text-ucl-red font-semibold'
                    : isSub
                      ? 'text-gold font-medium'
                      : 'text-white/85'
                )}
              >
                {event.description}
              </span>
            </div>
          </div>
        );
      })}

      {visibleEvents.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-4 text-white/35 text-xs font-display uppercase tracking-widest justify-center">
          Kick-off underway — match clock advancing…
        </div>
      )}
    </div>
  );
}
