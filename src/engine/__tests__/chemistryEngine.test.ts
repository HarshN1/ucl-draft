import { describe, it, expect } from 'vitest';
import {
  getAdjacency,
  isInPosition,
  isExactPosition,
  positionCategory,
  linkQuality,
  linkIntensity,
  normalizeLeague,
  calculateChemistry,
  previewChemistryWithCandidate,
} from '@/engine/chemistryEngine';
import type { DraftedPlayer } from '@/types';
import { FORMATION_433 } from './fixtures/formations';
import { HAALAND, DE_BRUYNE, MESSI, LEGEND_PELÉ, VAN_DIJK } from './fixtures/players';

function drafted(
  player: typeof HAALAND,
  slot: string,
  slotIndex: number
): DraftedPlayer {
  return { player, slot, slotIndex, chemistry: 0 };
}

describe('isInPosition', () => {
  it('returns true for exact position group match', () => {
    expect(isInPosition('ST', 'ST')).toBe(true);
    expect(isInPosition('GK', 'GK')).toBe(true);
  });

  it('returns true for related position groups', () => {
    expect(isInPosition('LW', 'WG')).toBe(true);
    expect(isInPosition('LB', 'FB')).toBe(true);
    expect(isInPosition('CB', 'FB')).toBe(true);
  });

  it('returns false for unrelated positions', () => {
    expect(isInPosition('GK', 'ST')).toBe(false);
    expect(isInPosition('ST', 'GK')).toBe(false);
  });
});

describe('isExactPosition', () => {
  it('matches only the exact group', () => {
    expect(isExactPosition('ST', 'ST')).toBe(true);
    expect(isExactPosition('LW', 'ST')).toBe(false);
    expect(isExactPosition('CAM', 'WG')).toBe(false);
  });
});

describe('positionCategory', () => {
  it('classifies perfect, related, outOfRole, and wrong fits', () => {
    expect(positionCategory('ST', 'ST')).toBe('perfect');
    expect(positionCategory('CAM', 'WG')).toBe('related');
    expect(positionCategory('CM', 'ST')).toBe('outOfRole');
    expect(positionCategory('GK', 'ST')).toBe('wrong');
  });
});

describe('linkIntensity & linkQuality', () => {
  it('gives hyper link for same club and nation', () => {
    const a = { ...HAALAND, clubName: 'City', nationalityName: 'Norway' };
    const b = { ...DE_BRUYNE, clubName: 'City', nationalityName: 'Norway' };
    expect(linkIntensity(a, b)).toBe(2);
    expect(linkQuality(a, b)).toBe('green');
  });

  it('gives strong link for same club only', () => {
    const a = { ...HAALAND, clubName: 'City', nationalityName: 'Norway' };
    const b = { ...DE_BRUYNE, clubName: 'City', nationalityName: 'Belgium' };
    expect(linkIntensity(a, b)).toBe(1);
    expect(linkQuality(a, b)).toBe('green');
  });

  it('treats legends as chemistry bridges', () => {
    expect(linkIntensity(LEGEND_PELÉ, HAALAND)).toBe(0);
    expect(linkIntensity(LEGEND_PELÉ, { ...MESSI, nationalityName: 'Brazil' })).toBe(1);
    expect(linkIntensity(LEGEND_PELÉ, LEGEND_PELÉ)).toBe(1);
  });
});

describe('normalizeLeague', () => {
  it('maps variant league names to canonical tokens', () => {
    expect(normalizeLeague('Premier League')).toBe('premier');
    expect(normalizeLeague('LaLiga EA SPORTS')).toBe('laliga');
    expect(normalizeLeague('Serie A TIM')).toBe('seriea');
    expect(normalizeLeague('Bundesliga')).toBe('bundesliga');
  });
});

describe('getAdjacency', () => {
  it('builds a connected graph for every starter slot', () => {
    const adj = getAdjacency(FORMATION_433);
    expect(adj).toHaveLength(11);
    for (const neighbors of adj) {
      expect(neighbors.length).toBeGreaterThan(0);
    }
  });

  it('uses explicit formation links when defined', () => {
    const adj = getAdjacency(FORMATION_433);
    const gkIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'GK');
    const lcbIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'LCB');
    expect(adj[gkIdx]).toContain(lcbIdx);
  });

  it('omits removed FUT16 side-CM to side-CB links in 4-3-3', () => {
    const adj = getAdjacency(FORMATION_433);
    const lcmIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'LCM');
    const lcbIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'LCB');
    const rcmIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'RCM');
    const rcbIdx = FORMATION_433.positions.findIndex((p) => p.slot === 'RCB');
    expect(adj[lcmIdx]).not.toContain(lcbIdx);
    expect(adj[rcmIdx]).not.toContain(rcbIdx);
  });
});

describe('calculateChemistry', () => {
  it('returns zero chemistry for empty starters', () => {
    const result = calculateChemistry([], FORMATION_433);
    expect(result.total).toBe(0);
    expect(result.perPlayer.every((c) => c === 0)).toBe(true);
  });

  it('awards chemistry to in-position players with strong links', () => {
    const cityStriker = { ...HAALAND, clubName: 'Manchester City', nationalityName: 'Belgium' };
    const cityMid = { ...DE_BRUYNE, clubName: 'Manchester City', nationalityName: 'Belgium' };
    const starters = [
      drafted(cityStriker, 'ST', 9),
      drafted(cityMid, 'CM', 6),
      drafted(VAN_DIJK, 'LCB', 2),
    ];
    const result = calculateChemistry(starters, FORMATION_433);
    expect(result.total).toBeGreaterThan(0);
    expect(result.links.length).toBeGreaterThan(0);
    expect(result.perPlayer[9]).toBeGreaterThan(0);
  });

  it('caps team chemistry at 100', () => {
    const fullStarters = FORMATION_433.positions.map((pos, i) =>
      drafted(
        { ...HAALAND, id: i + 100, clubName: 'Manchester City', nationalityName: 'Belgium' },
        pos.slot,
        i
      )
    );
    const result = calculateChemistry(fullStarters, FORMATION_433, {
      id: 'm1',
      name: 'Pep',
      nationalityName: 'Belgium',
      nationalityId: 1,
      leagueName: 'Premier League',
    });
    expect(result.total).toBeLessThanOrEqual(100);
  });
});

describe('previewChemistryWithCandidate', () => {
  it('includes the candidate in the hypothetical squad', () => {
    const existing = [drafted(HAALAND, 'ST', 9)];
    const candidate = drafted(MESSI, 'RW', 10);
    const preview = previewChemistryWithCandidate(existing, candidate, FORMATION_433);
    expect(preview.total).toBeGreaterThanOrEqual(0);
    expect(preview.perPlayer[10]).toBeGreaterThanOrEqual(0);
  });
});
