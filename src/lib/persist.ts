import { z } from 'zod';

export const RUN_SCHEMA = 1;
export const DATA_VERSION = 'fc26' as const;

export const SESSION_KEY = 'ucl-draft:run';
export const BACKUP_KEY = 'ucl-draft:run-backup';
export const BACKUP_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

const slotZoneSchema = z.enum(['starter', 'bench']);

export const persistedRunSchema = z.object({
  schema: z.literal(RUN_SCHEMA),
  runId: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  dataVersion: z.enum(['fc26', 'fc27']),
  mode: z.enum(['free', 'daily']),
  dailyKey: z.string().optional(),
  seed: z.number().int().nonnegative(),
  cursor: z.number().int().nonnegative(),
  phase: z.string().min(1),
  difficulty: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  formationName: z.string().nullable(),
  formationLabel: z.string().nullable(),
  managerId: z.string().nullable(),
  /** Starter slot item ids (null = empty). */
  starters: z.array(z.number().int().nullable()),
  /** Bench item ids (subs + reserves). */
  bench: z.array(z.number().int().nullable()),
  pendingDraw: z.array(z.number().int()).nullable(),
  awaitingCaptain: z.boolean(),
  activeSlot: z
    .object({
      zone: slotZoneSchema,
      index: z.number().int().nonnegative(),
    })
    .nullable(),
  teamName: z.string(),
  /** Lightweight match summaries only — full events recomputed if needed. */
  results: z.array(
    z.object({
      round: z.number().int().nonnegative(),
      userScore: z.number().int(),
      opponentScore: z.number().int(),
      userWon: z.boolean(),
    })
  ),
  coins: z.number().int().nonnegative().default(0),
});

export type PersistedRun = z.infer<typeof persistedRunSchema>;

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Safari private mode throws
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function parseRun(raw: string | null): PersistedRun | null {
  if (!raw) return null;
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = persistedRunSchema.safeParse(json);
    if (!parsed.success) return null;
    if (parsed.data.dataVersion !== DATA_VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Read session run, falling back to a fresh-enough localStorage backup. */
export function loadPersistedRun(): PersistedRun | null {
  if (typeof window === 'undefined') return null;
  const fromSession = parseRun(safeGet(sessionStorage, SESSION_KEY));
  if (fromSession) return fromSession;
  const backup = parseRun(safeGet(localStorage, BACKUP_KEY));
  if (!backup) return null;
  if (Date.now() - backup.createdAt > BACKUP_MAX_AGE_MS) {
    safeRemove(localStorage, BACKUP_KEY);
    return null;
  }
  return backup;
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced 250ms write to session + localStorage mirror. */
export function savePersistedRun(run: PersistedRun): void {
  if (typeof window === 'undefined') return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    const raw = JSON.stringify(run);
    safeSet(sessionStorage, SESSION_KEY, raw);
    safeSet(localStorage, BACKUP_KEY, raw);
  }, 250);
}

export function clearPersistedRun(): void {
  if (typeof window === 'undefined') return;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  safeRemove(sessionStorage, SESSION_KEY);
  safeRemove(localStorage, BACKUP_KEY);
}

export function newRunId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}`;
}
