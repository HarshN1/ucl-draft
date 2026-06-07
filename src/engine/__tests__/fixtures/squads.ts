import type { DraftedPlayer, Manager, Squad } from '@/types';
import { FORMATION_433 } from './formations';
import { ALISSON, HAALAND, DE_BRUYNE, MESSI, VAN_DIJK } from './players';

function drafted(
  player: typeof ALISSON,
  slot: string,
  slotIndex: number,
  chemistry = 10
): DraftedPlayer {
  return { player, slot, slotIndex, chemistry };
}

/** Minimal 11-starter squad on 4-3-3 for match/bracket tests. */
export function makeTestSquad(overrides?: Partial<Squad>): Squad {
  const starters: DraftedPlayer[] = [
    drafted(ALISSON, 'GK', 0),
    drafted(makePlayer('LB', 82), 'LB', 1),
    drafted(VAN_DIJK, 'LCB', 2),
    drafted(makePlayer('RCB', 83), 'RCB', 3),
    drafted(makePlayer('RB', 81), 'RB', 4),
    drafted(makePlayer('LCM', 84), 'LCM', 5),
    drafted(makePlayer('CM', 85), 'CM', 6),
    drafted(makePlayer('RCM', 84), 'RCM', 7),
    drafted(MESSI, 'LW', 8),
    drafted(HAALAND, 'ST', 9),
    drafted(DE_BRUYNE, 'RW', 10),
  ];

  const manager: Manager = {
    id: 'm1',
    name: 'Pep Guardiola',
    nationalityName: 'Spain',
    nationalityId: 1,
    leagueName: 'Premier League',
  };

  return {
    formation: FORMATION_433,
    starters,
    subs: [],
    reserves: [],
    manager,
    teamName: 'Test United',
    ovrAvg: 86,
    chemistry: 88,
    draftScore: 174,
    ...overrides,
  };
}

function makePlayer(position: string, overall: number) {
  return {
    id: Math.floor(Math.random() * 100000),
    name: `${position} Player`,
    overall,
    position,
    pac: 80,
    sho: 80,
    pas: 80,
    dri: 80,
    def: 80,
    phy: 80,
    clubId: 1,
    clubName: 'Test FC',
    leagueName: 'Premier League',
    nationalityId: 1,
    nationalityName: 'England',
    imageUrl: '',
  };
}
