'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { MatchEvent } from '@/types';

interface EventFeedProps {
  events: MatchEvent[];
  onAllEventsShown?: () => void;
  onGoalEvent?: () => void;
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

export function EventFeed({ events, onAllEventsShown, onGoalEvent }: EventFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (events.length === 0) return;

    let current = 0;
    const reveal = () => {
      current++;
      setVisibleCount(current);

      const event = events[current - 1];
      if (event?.isGoal && onGoalEvent) {
        onGoalEvent();
      }

      if (current < events.length) {
        setTimeout(reveal, 900);
      } else {
        if (onAllEventsShown) setTimeout(onAllEventsShown, 900);
      }
    };

    const start = setTimeout(reveal, 400);
    return () => clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const visibleEvents = events.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-2">
      {visibleEvents.map((event, idx) => (
        <div
          key={idx}
          className={clsx(
            'flex items-start gap-3 px-3 py-2 rounded-lg text-sm animate-fade-in',
            event.isGoal
              ? 'bg-accent/10 border border-accent/30 animate-goal-flash'
              : 'bg-white/5'
          )}
        >
          <span className="text-base flex-shrink-0 mt-0.5">
            {EVENT_ICONS[event.type] ?? '•'}
          </span>
          <span
            className={clsx(
              'font-body leading-snug',
              event.isGoal
                ? event.isUserTeam
                  ? 'text-accent font-semibold'
                  : 'text-ucl-red font-semibold'
                : 'text-white/80'
            )}
          >
            {event.description}
          </span>
        </div>
      ))}

      {/* Pulsing indicator while events are loading */}
      {visibleCount < events.length && (
        <div className="flex items-center gap-2 px-3 py-2 text-white/30 text-xs">
          <span className="animate-pulse">●</span>
          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
        </div>
      )}
    </div>
  );
}
