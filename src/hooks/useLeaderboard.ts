'use client';

import { useState, useCallback } from 'react';
import type { LeaderboardEntry } from '@/types';

const STORAGE_KEY = 'ucl-draft-leaderboard';
const MAX_ENTRIES = 10;

function readEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function writeEntries(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — degrade silently
  }
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => readEntries());

  const saveEntry = useCallback(
    (
      teamName: string,
      formation: string,
      draftScore: number,
      result: string
    ) => {
      const newEntry: LeaderboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        teamName,
        formation,
        draftScore,
        result,
        timestamp: Date.now(),
      };

      const updated = [...readEntries(), newEntry]
        .sort((a, b) => b.draftScore - a.draftScore)
        .slice(0, MAX_ENTRIES);

      writeEntries(updated);
      setEntries(updated);
      return updated;
    },
    []
  );

  const clearEntries = useCallback(() => {
    writeEntries([]);
    setEntries([]);
  }, []);

  const refresh = useCallback(() => {
    setEntries(readEntries());
  }, []);

  return { entries, saveEntry, clearEntries, refresh };
}
