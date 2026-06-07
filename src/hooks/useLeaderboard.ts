'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LeaderboardEntry } from '@/types';

const STORAGE_KEY = 'ucl-draft-leaderboard';
const LOCAL_MAX_ENTRIES = 10;

export type LeaderboardMode = 'global' | 'local';

function readLocalEntries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — degrade silently
  }
}

function saveLocalEntry(
  teamName: string,
  formation: string,
  draftScore: number,
  result: string
): LeaderboardEntry[] {
  const newEntry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    teamName,
    formation,
    draftScore,
    result,
    timestamp: Date.now(),
  };

  const updated = [...readLocalEntries(), newEntry]
    .sort((a, b) => b.draftScore - a.draftScore)
    .slice(0, LOCAL_MAX_ENTRIES);

  writeLocalEntries(updated);
  return updated;
}

async function fetchFromApi(limit = 10): Promise<{
  entries: LeaderboardEntry[];
  mode: LeaderboardMode;
}> {
  const res = await fetch(`/api/leaderboard?limit=${limit}`);
  const modeHeader = res.headers.get('X-Leaderboard-Mode');
  const mode: LeaderboardMode = modeHeader === 'global' ? 'global' : 'local';

  if (res.status === 503 || !res.ok) {
    return { entries: readLocalEntries(), mode: 'local' };
  }

  const data = (await res.json()) as LeaderboardEntry[];
  if (mode === 'local' && data.length === 0) {
    return { entries: readLocalEntries(), mode: 'local' };
  }
  return { entries: data, mode };
}

async function postToApi(
  teamName: string,
  formation: string,
  draftScore: number,
  result: string
): Promise<{ ok: boolean; mode: LeaderboardMode; entries?: LeaderboardEntry[] }> {
  const res = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, formation, draftScore, result }),
  });

  const modeHeader = res.headers.get('X-Leaderboard-Mode');
  const mode: LeaderboardMode = modeHeader === 'global' ? 'global' : 'local';

  if (res.status === 503) {
    return { ok: false, mode: 'local' };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === 'string' ? body.error : `Save failed (${res.status})`;
    throw new Error(message);
  }

  const saved = (await res.json()) as LeaderboardEntry;
  return { ok: true, mode, entries: [saved] };
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [mode, setMode] = useState<LeaderboardMode>('local');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { entries: fetched, mode: fetchedMode } = await fetchFromApi();
      setEntries(fetched);
      setMode(fetchedMode);
    } catch {
      setEntries(readLocalEntries());
      setMode('local');
      setError('Could not load global leaderboard — showing local entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async (
      teamName: string,
      formation: string,
      draftScore: number,
      result: string
    ): Promise<LeaderboardEntry[]> => {
      setSaving(true);
      setError(null);
      try {
        const apiResult = await postToApi(teamName, formation, draftScore, result);
        if (apiResult.ok) {
          await refresh();
          return entries;
        }
        // API unavailable — fall back to localStorage
        const updated = saveLocalEntry(teamName, formation, draftScore, result);
        setEntries(updated);
        setMode('local');
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save entry';
        // Network or server error — try local fallback
        try {
          const updated = saveLocalEntry(teamName, formation, draftScore, result);
          setEntries(updated);
          setMode('local');
          setError(`${message} — saved locally instead.`);
          return updated;
        } catch {
          setError(message);
          throw err;
        }
      } finally {
        setSaving(false);
      }
    },
    [entries, refresh]
  );

  const clearEntries = useCallback(() => {
    writeLocalEntries([]);
    setEntries([]);
    setMode('local');
  }, []);

  return { entries, mode, loading, error, saving, saveEntry, clearEntries, refresh };
}
