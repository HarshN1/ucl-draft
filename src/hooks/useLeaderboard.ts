'use client';

import { useState, useCallback, useEffect } from 'react';
import type { LeaderboardEntry } from '@/types';

const STORAGE_KEY = 'ucl-draft-leaderboard';
const LOCAL_MAX_ENTRIES = 25;

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
    // degrade silently
  }
}

function upsertLocalEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
  const existing = readLocalEntries().filter((e) => e.id !== entry.id);
  const updated = [...existing, entry]
    .sort((a, b) => b.draftScore - a.draftScore || b.timestamp - a.timestamp)
    .slice(0, LOCAL_MAX_ENTRIES);
  writeLocalEntries(updated);
  return updated;
}

function saveLocalEntry(input: Omit<LeaderboardEntry, 'id' | 'timestamp'>): LeaderboardEntry {
  const newEntry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    ...input,
  };
  upsertLocalEntry(newEntry);
  return newEntry;
}

function mergeEntries(global: LeaderboardEntry[], local: LeaderboardEntry[]): LeaderboardEntry[] {
  const byId = new Map<string, LeaderboardEntry>();
  for (const e of [...global, ...local]) {
    const prev = byId.get(e.id);
    if (!prev || e.timestamp > prev.timestamp) byId.set(e.id, e);
  }
  return Array.from(byId.values())
    .sort((a, b) => b.draftScore - a.draftScore || b.timestamp - a.timestamp)
    .slice(0, 10);
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
  const local = readLocalEntries();

  if (mode === 'global') {
    if (data.length === 0 && local.length > 0) {
      return { entries: local, mode: 'local' };
    }
    return { entries: mergeEntries(data, local), mode: 'global' };
  }

  return { entries: local.length ? local : data, mode: 'local' };
}

async function postToApi(
  entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>
): Promise<{ ok: boolean; mode: LeaderboardMode; saved?: LeaderboardEntry }> {
  const res = await fetch('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...entry, timestamp: Date.now() }),
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
  return { ok: true, mode, saved };
}

export interface SaveLeaderboardInput {
  teamName: string;
  formation: string;
  draftScore: number;
  result: string;
  squad?: import('@/types').SquadSnapshot;
  shareUrl?: string;
}

export type SaveResult = { mode: LeaderboardMode; entry: LeaderboardEntry };

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
      setError('Could not load global leaderboard — showing saved entries on this device.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveEntry = useCallback(
    async (input: SaveLeaderboardInput): Promise<SaveResult> => {
      setSaving(true);
      setError(null);
      try {
        const apiResult = await postToApi(input);
        if (apiResult.ok && apiResult.saved) {
          upsertLocalEntry(apiResult.saved);
          await refresh();
          return { mode: apiResult.mode, entry: apiResult.saved };
        }
        const local = saveLocalEntry(input);
        setEntries(upsertLocalEntry(local));
        setMode('local');
        return { mode: 'local', entry: local };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save entry';
        try {
          const local = saveLocalEntry(input);
          const updated = upsertLocalEntry(local);
          setEntries(updated);
          setMode('local');
          setError(`${message} — saved on this device only.`);
          return { mode: 'local', entry: local };
        } catch {
          setError(message);
          throw err;
        }
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  const clearEntries = useCallback(() => {
    writeLocalEntries([]);
    setEntries([]);
    setMode('local');
  }, []);

  return { entries, mode, loading, error, saving, saveEntry, clearEntries, refresh };
}
