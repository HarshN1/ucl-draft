import type { LeaderboardEntry } from '@/types';
import { getRedis } from '@/lib/kv';

export const LEADERBOARD_KEY = 'leaderboard:global';
export const MAX_ENTRIES = 100;

const MAX_TEAM_NAME = 40;
const MAX_FORMATION = 30;
const MAX_RESULT = 60;
const VALID_RESULTS = new Set([
  'Champions',
  'Won Round of 16',
  'Won Quarter-Final',
  'Won Semi-Final',
  'Won Final',
  'Eliminated Round of 16',
  'Eliminated Quarter-Final',
  'Eliminated Semi-Final',
  'Eliminated Final',
]);

/** Sorted-set score: higher draftScore wins; ties favour earlier submissions. */
export function scoreFor(draftScore: number, timestamp: number): number {
  return draftScore * 1e13 + (9_999_999_999_999 - timestamp);
}

export function validateEntry(
  entry: Pick<LeaderboardEntry, 'teamName' | 'formation' | 'draftScore' | 'result' | 'timestamp'>
): string | null {
  const teamName = entry.teamName?.trim();
  if (!teamName) return 'teamName is required';
  if (teamName.length > MAX_TEAM_NAME) return 'teamName too long';

  const formation = entry.formation?.trim();
  if (!formation) return 'formation is required';
  if (formation.length > MAX_FORMATION) return 'formation too long';

  if (!Number.isFinite(entry.draftScore) || entry.draftScore < 0 || entry.draftScore > 200) {
    return 'draftScore must be between 0 and 200';
  }

  const result = entry.result?.trim();
  if (!result) return 'result is required';
  if (result.length > MAX_RESULT) return 'result too long';
  if (!VALID_RESULTS.has(result)) return 'invalid result';

  if (!Number.isFinite(entry.timestamp) || entry.timestamp <= 0) {
    return 'invalid timestamp';
  }

  return null;
}

export async function addEntry(
  entry: Omit<LeaderboardEntry, 'id'> & { id?: string }
): Promise<LeaderboardEntry> {
  const full: LeaderboardEntry = {
    id: entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    teamName: entry.teamName.trim(),
    formation: entry.formation.trim(),
    draftScore: entry.draftScore,
    result: entry.result.trim(),
    timestamp: entry.timestamp,
  };

  const err = validateEntry(full);
  if (err) throw new Error(err);

  const redis = getRedis();
  await redis.zadd(LEADERBOARD_KEY, {
    score: scoreFor(full.draftScore, full.timestamp),
    member: JSON.stringify(full),
  });
  // Keep only the top MAX_ENTRIES (highest scores).
  await redis.zremrangebyrank(LEADERBOARD_KEY, 0, -(MAX_ENTRIES + 1));

  return full;
}

export async function getTop(limit = 10): Promise<LeaderboardEntry[]> {
  const redis = getRedis();
  const raw = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, { rev: true });
  if (!raw?.length) return [];

  return raw
    .map((item) => {
      try {
        return typeof item === 'string'
          ? (JSON.parse(item) as LeaderboardEntry)
          : (item as LeaderboardEntry);
      } catch {
        return null;
      }
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}
