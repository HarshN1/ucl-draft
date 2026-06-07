import { describe, it, expect, afterEach } from 'vitest';
import {
  getAcceptablePositions,
  computeOvrAvg,
  findBestSlotForCaptain,
  sampleFormations,
  drawCardsForSlot,
} from '@/engine/playerUtils';
import { FORMATION_433, ALL_FORMATIONS } from './fixtures/formations';
import { TEST_POOL, HAALAND } from './fixtures/players';
import { mockRandom } from './helpers/mockRandom';

describe('getAcceptablePositions', () => {
  it('returns position lists for known groups', () => {
    expect(getAcceptablePositions('GK')).toEqual(['GK']);
    expect(getAcceptablePositions('ST')).toContain('ST');
    expect(getAcceptablePositions('WG')).toContain('LW');
  });

  it('falls back for unknown groups', () => {
    const positions = getAcceptablePositions('UNKNOWN');
    expect(positions.length).toBeGreaterThan(0);
  });
});

describe('computeOvrAvg', () => {
  it('averages overall ratings and rounds', () => {
    expect(computeOvrAvg([HAALAND, { ...HAALAND, id: 99, overall: 89 }])).toBe(90);
  });

  it('returns 0 for an empty list', () => {
    expect(computeOvrAvg([])).toBe(0);
  });
});

describe('findBestSlotForCaptain', () => {
  it('places a striker in an attacking slot', () => {
    const slot = findBestSlotForCaptain('ST', FORMATION_433);
    const pos = FORMATION_433.positions[slot];
    expect(['ST', 'WG', 'CAM']).toContain(pos.positionGroup);
  });

  it('avoids placing outfield players in GK', () => {
    const slot = findBestSlotForCaptain('CAM', FORMATION_433);
    expect(FORMATION_433.positions[slot].positionGroup).not.toBe('GK');
  });
});

describe('sampleFormations', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
  });

  it('returns 5 distinct formation names', () => {
    restore = mockRandom([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.15]);
    const sampled = sampleFormations(ALL_FORMATIONS);
    expect(sampled).toHaveLength(5);
    const names = new Set(sampled.map((f) => f.name));
    expect(names.size).toBe(5);
  });
});

describe('drawCardsForSlot', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
  });

  it('returns up to 5 unique players for a starter slot', () => {
    restore = mockRandom(
      Array.from({ length: 40 }, (_, i) => (i * 0.023) % 1)
    );
    const cards = drawCardsForSlot(TEST_POOL, FORMATION_433, 9, [], new Set());
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(5);
    const ids = new Set(cards.map((p) => p.id));
    expect(ids.size).toBe(cards.length);
  });

  it('never returns already-drafted players', () => {
    restore = mockRandom(
      Array.from({ length: 40 }, (_, i) => (i * 0.031) % 1)
    );
    const used = new Set(TEST_POOL.slice(0, 3).map((p) => p.id));
    const cards = drawCardsForSlot(TEST_POOL, FORMATION_433, 9, [], used);
    for (const card of cards) {
      expect(used.has(card.id)).toBe(false);
    }
  });
});
