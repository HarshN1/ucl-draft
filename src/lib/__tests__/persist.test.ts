import { describe, expect, it } from 'vitest';
import {
  RUN_SCHEMA,
  DATA_VERSION,
  persistedRunSchema,
  type PersistedRun,
} from '@/lib/persist';

function sampleRun(overrides: Partial<PersistedRun> = {}): PersistedRun {
  return {
    schema: RUN_SCHEMA,
    runId: 'test-run',
    createdAt: Date.now(),
    dataVersion: DATA_VERSION,
    mode: 'free',
    seed: 42,
    cursor: 3,
    phase: 'DRAFT',
    difficulty: 0,
    formationName: '4-3-3',
    formationLabel: 'Balanced',
    managerId: null,
    starters: [1, null, 3, null, null, null, null, null, null, null, null],
    bench: Array.from({ length: 12 }, () => null),
    pendingDraw: [10, 11, 12, 13, 14],
    awaitingCaptain: false,
    activeSlot: { zone: 'starter', index: 1 },
    teamName: 'Test FC',
    results: [],
    coins: 0,
    ...overrides,
  };
}

describe('persistedRunSchema', () => {
  it('accepts a valid run', () => {
    const parsed = persistedRunSchema.safeParse(sampleRun());
    expect(parsed.success).toBe(true);
  });

  it('rejects wrong schema version', () => {
    const parsed = persistedRunSchema.safeParse(sampleRun({ schema: 999 as never }));
    expect(parsed.success).toBe(false);
  });

  it('rejects missing seed', () => {
    const bad = { ...sampleRun() } as Record<string, unknown>;
    delete bad.seed;
    expect(persistedRunSchema.safeParse(bad).success).toBe(false);
  });
});
