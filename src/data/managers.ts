import type { Manager } from '@/types';

/**
 * ~36 real 2026-era managers across the top European leagues.
 * Used for the FIFA-16-style manager pick — a manager whose nationality or
 * league matches your players boosts squad chemistry.
 *
 * leagueName values are kept human-readable; chemistry matching normalizes
 * them (see chemistryEngine.normalizeLeague) so they link to dataset leagues
 * regardless of exact formatting (e.g. "LaLiga EA SPORTS").
 *
 * nationalityId uses sofifa flag IDs where known; the manager card falls back
 * to initials if the flag image 404s.
 */
export const MANAGERS: Manager[] = [
  // ── Premier League ──
  { id: 'guardiola', name: 'Pep Guardiola', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Premier League' },
  { id: 'arteta', name: 'Mikel Arteta', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Premier League' },
  { id: 'slot', name: 'Arne Slot', nationalityName: 'Netherlands', nationalityId: 34, leagueName: 'Premier League' },
  { id: 'maresca', name: 'Enzo Maresca', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Premier League' },
  { id: 'amorim', name: 'Rúben Amorim', nationalityName: 'Portugal', nationalityId: 38, leagueName: 'Premier League' },
  { id: 'howe', name: 'Eddie Howe', nationalityName: 'England', nationalityId: 14, leagueName: 'Premier League' },
  { id: 'emery', name: 'Unai Emery', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Premier League' },
  { id: 'iraola', name: 'Andoni Iraola', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Premier League' },

  // ── LaLiga ──
  { id: 'xabi', name: 'Xabi Alonso', nationalityName: 'Spain', nationalityId: 45, leagueName: 'LaLiga' },
  { id: 'flick', name: 'Hansi Flick', nationalityName: 'Germany', nationalityId: 21, leagueName: 'LaLiga' },
  { id: 'simeone', name: 'Diego Simeone', nationalityName: 'Argentina', nationalityId: 52, leagueName: 'LaLiga' },
  { id: 'valverde', name: 'Ernesto Valverde', nationalityName: 'Spain', nationalityId: 45, leagueName: 'LaLiga' },
  { id: 'baena', name: 'Marcelino', nationalityName: 'Spain', nationalityId: 45, leagueName: 'LaLiga' },

  // ── Serie A ──
  { id: 'conte', name: 'Antonio Conte', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },
  { id: 'motta', name: 'Thiago Motta', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },
  { id: 'gasperini', name: 'Gian Piero Gasperini', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },
  { id: 'fonseca', name: 'Paulo Fonseca', nationalityName: 'Portugal', nationalityId: 38, leagueName: 'Serie A' },
  { id: 'italiano', name: 'Vincenzo Italiano', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },

  // ── Bundesliga ──
  { id: 'kompany', name: 'Vincent Kompany', nationalityName: 'Belgium', nationalityId: 7, leagueName: 'Bundesliga' },
  { id: 'kovac', name: 'Niko Kovač', nationalityName: 'Croatia', nationalityId: 10, leagueName: 'Bundesliga' },
  { id: 'rose', name: 'Marco Rose', nationalityName: 'Germany', nationalityId: 21, leagueName: 'Bundesliga' },
  { id: 'hoeness', name: 'Sebastian Hoeneß', nationalityName: 'Germany', nationalityId: 21, leagueName: 'Bundesliga' },

  // ── Ligue 1 ──
  { id: 'luisenrique', name: 'Luis Enrique', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Ligue 1' },
  { id: 'dezerbi', name: 'Roberto De Zerbi', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Ligue 1' },
  { id: 'haise', name: 'Franck Haise', nationalityName: 'France', nationalityId: 18, leagueName: 'Ligue 1' },

  // ── International / legendary (nationality-focused chem) ──
  { id: 'ancelotti', name: 'Carlo Ancelotti', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Brazil Série A' },
  { id: 'deschamps', name: 'Didier Deschamps', nationalityName: 'France', nationalityId: 18, leagueName: 'Ligue 1' },
  { id: 'scaloni', name: 'Lionel Scaloni', nationalityName: 'Argentina', nationalityId: 52, leagueName: 'LaLiga' },
  { id: 'tuchel', name: 'Thomas Tuchel', nationalityName: 'Germany', nationalityId: 21, leagueName: 'Premier League' },
  { id: 'nagelsmann', name: 'Julian Nagelsmann', nationalityName: 'Germany', nationalityId: 21, leagueName: 'Bundesliga' },
  { id: 'martinez', name: 'Roberto Martínez', nationalityName: 'Spain', nationalityId: 45, leagueName: 'Liga Portugal' },
  { id: 'spalletti', name: 'Luciano Spalletti', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },
  { id: 'southgate', name: 'Lee Carsley', nationalityName: 'England', nationalityId: 14, leagueName: 'Premier League' },
  { id: 'koeman', name: 'Ronald Koeman', nationalityName: 'Netherlands', nationalityId: 34, leagueName: 'Eredivisie' },
  { id: 'mourinho', name: 'José Mourinho', nationalityName: 'Portugal', nationalityId: 38, leagueName: 'Liga Portugal' },
  { id: 'guardiola2', name: 'Roberto Mancini', nationalityName: 'Italy', nationalityId: 27, leagueName: 'Serie A' },
];
