import { describe, it, expect } from 'vitest';
import {
  getAcceptablePositions,
  computeOvrAvg,
  findBestSlotForCaptain,
  sampleFormations,
  drawCardsForSlot,
  drawReserveWildcard,
} from '@/engine/playerUtils';
import { Rng } from '@/engine/rng';
import { FORMATION_433, ALL_FORMATIONS } from './fixtures/formations';
import { TEST_POOL, HAALAND } from './fixtures/players';

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
    const pos = FORMATION_433.positions[slot]!;
    expect(['ST', 'WG', 'CAM']).toContain(pos.positionGroup);
  });

  it('avoids placing outfield players in GK', () => {
    const slot = findBestSlotForCaptain('CAM', FORMATION_433);
    expect(FORMATION_433.positions[slot]!.positionGroup).not.toBe('GK');
  });
});

describe('sampleFormations', () => {
  it('returns 5 distinct formation names', () => {
    const sampled = sampleFormations(new Rng(1), ALL_FORMATIONS);
    expect(sampled).toHaveLength(5);
    const names = new Set(sampled.map((f) => f.name));
    expect(names.size).toBe(5);
  });
});

describe('drawCardsForSlot', () => {
  it('returns up to 5 unique players for a starter slot', () => {
    const cards = drawCardsForSlot(new Rng(1), TEST_POOL, FORMATION_433, 9, [], new Set());
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(5);
    const ids = new Set(cards.map((p) => p.id));
    expect(ids.size).toBe(cards.length);
  });

  it('never returns already-drafted players or duplicate basePlayerId versions', () => {
    const used = new Set(TEST_POOL.slice(0, 3).map((p) => p.id));
    const poolWithPromo = [
      ...TEST_POOL,
      {
        ...HAALAND,
        id: 8000999,
        basePlayerId: HAALAND.id,
        overall: 97,
        cardType: 'toty' as const,
      },
    ];
    used.add(HAALAND.id);
    const cards = drawCardsForSlot(new Rng(1), poolWithPromo, FORMATION_433, 9, [], used);
    for (const card of cards) {
      expect(used.has(card.id)).toBe(false);
      expect(card.basePlayerId).not.toBe(HAALAND.id);
    }
  });
});

describe('drawReserveWildcard', () => {
  it('returns up to 5 unique players', () => {
    const cards = drawReserveWildcard(new Rng(1), TEST_POOL, new Set());
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(5);
    expect(new Set(cards.map((p) => p.id)).size).toBe(cards.length);
  });

  it('never offers more than one goalkeeper per hand', () => {
    for (let i = 0; i < 30; i++) {
      const cards = drawReserveWildcard(new Rng(i + 1), TEST_POOL, new Set());
      const gks = cards.filter((p) => p.position === 'GK');
      expect(gks.length).toBeLessThanOrEqual(1);
    }
  });
});
