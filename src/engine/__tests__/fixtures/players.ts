import type { Player } from '@/types';

let _id = 1;

export function makePlayer(overrides: Partial<Player> & Pick<Player, 'position' | 'overall'>): Player {
  const id = overrides.id ?? _id++;
  return {
    id,
    name: overrides.name ?? `Player ${id}`,
    overall: overrides.overall,
    position: overrides.position,
    pac: overrides.pac ?? 80,
    sho: overrides.sho ?? 80,
    pas: overrides.pas ?? 80,
    dri: overrides.dri ?? 80,
    def: overrides.def ?? 80,
    phy: overrides.phy ?? 80,
    clubId: overrides.clubId ?? 1,
    clubName: overrides.clubName ?? 'Test FC',
    leagueName: overrides.leagueName ?? 'Premier League',
    nationalityId: overrides.nationalityId ?? 1,
    nationalityName: overrides.nationalityName ?? 'England',
    imageUrl: overrides.imageUrl ?? '',
    ...overrides,
  };
}

export const MESSI = makePlayer({
  name: 'L. Messi',
  position: 'RW',
  overall: 91,
  sho: 92,
  dri: 95,
  clubName: 'Inter Miami',
  leagueName: 'MLS',
  nationalityName: 'Argentina',
});

export const HAALAND = makePlayer({
  name: 'E. Haaland',
  position: 'ST',
  overall: 91,
  sho: 94,
  clubName: 'Manchester City',
  leagueName: 'Premier League',
  nationalityName: 'Norway',
});

export const DE_BRUYNE = makePlayer({
  name: 'K. De Bruyne',
  position: 'CAM',
  overall: 91,
  pas: 94,
  clubName: 'Manchester City',
  leagueName: 'Premier League',
  nationalityName: 'Belgium',
});

export const ALISSON = makePlayer({
  name: 'Alisson',
  position: 'GK',
  overall: 89,
  clubName: 'Liverpool',
  leagueName: 'Premier League',
  nationalityName: 'Brazil',
});

export const VAN_DIJK = makePlayer({
  name: 'V. van Dijk',
  position: 'CB',
  overall: 90,
  def: 92,
  clubName: 'Liverpool',
  leagueName: 'Premier League',
  nationalityName: 'Netherlands',
});

export const LEGEND_PELÉ = makePlayer({
  name: 'Pelé',
  position: 'CAM',
  overall: 95,
  isLegend: true,
  nationalityName: 'Brazil',
  clubName: 'Icons',
  leagueName: 'Icons',
});

export const TEST_POOL: Player[] = [
  ALISSON,
  VAN_DIJK,
  HAALAND,
  DE_BRUYNE,
  MESSI,
  LEGEND_PELÉ,
  makePlayer({ position: 'LB', overall: 84, clubName: 'Arsenal', leagueName: 'Premier League', nationalityName: 'England' }),
  makePlayer({ position: 'RB', overall: 83, clubName: 'Chelsea', leagueName: 'Premier League', nationalityName: 'England' }),
  makePlayer({ position: 'CM', overall: 85, clubName: 'Real Madrid', leagueName: 'LaLiga EA SPORTS', nationalityName: 'Spain' }),
  makePlayer({ position: 'LW', overall: 86, clubName: 'Barcelona', leagueName: 'LaLiga EA SPORTS', nationalityName: 'Spain' }),
  makePlayer({ position: 'ST', overall: 82, clubName: 'Juventus', leagueName: 'Serie A', nationalityName: 'Italy' }),
  makePlayer({ position: 'CDM', overall: 84, clubName: 'Bayern Munich', leagueName: 'Bundesliga', nationalityName: 'Germany' }),
];
