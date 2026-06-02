import type { Player } from '@/types';

/**
 * 30 representative mock players for development / testing before
 * the real players.json is generated from the CSV.
 * Covers GK, CB, FB, CDM, CM, CAM, LW, RW, ST positions at various OVR tiers.
 */
export const MOCK_PLAYERS: Player[] = [
  // GK
  { id: 167495, name: 'T. Courtois', overall: 91, position: 'GK', pac: 55, sho: 35, pas: 63, dri: 53, def: 22, phy: 78, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 7, nationalityName: 'Belgium', imageUrl: 'https://cdn.sofifa.net/players/167495/26_120.png' },
  { id: 192119, name: 'A. Onana', overall: 84, position: 'GK', pac: 52, sho: 23, pas: 58, dri: 49, def: 18, phy: 70, clubId: 10, clubName: 'Manchester United', leagueName: 'Premier League', nationalityId: 35, nationalityName: 'Cameroon', imageUrl: 'https://cdn.sofifa.net/players/192119/26_120.png' },
  { id: 210835, name: 'D. Vlachodimos', overall: 79, position: 'GK', pac: 55, sho: 22, pas: 55, dri: 46, def: 15, phy: 72, clubId: 678, clubName: 'Benfica', leagueName: 'Liga Portugal Betclic', nationalityId: 61, nationalityName: 'Greece', imageUrl: 'https://cdn.sofifa.net/players/210835/26_120.png' },

  // CB
  { id: 192448, name: 'V. van Dijk', overall: 90, position: 'CB', pac: 78, sho: 60, pas: 70, dri: 72, def: 91, phy: 90, clubId: 9, clubName: 'Liverpool', leagueName: 'Premier League', nationalityId: 124, nationalityName: 'Netherlands', imageUrl: 'https://cdn.sofifa.net/players/192448/26_120.png' },
  { id: 240476, name: 'W. Saliba', overall: 88, position: 'CB', pac: 81, sho: 43, pas: 72, dri: 72, def: 88, phy: 84, clubId: 1, clubName: 'Arsenal', leagueName: 'Premier League', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/240476/26_120.png' },
  { id: 187215, name: 'A. Rüdiger', overall: 86, position: 'CB', pac: 76, sho: 49, pas: 62, dri: 66, def: 86, phy: 91, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 21, nationalityName: 'Germany', imageUrl: 'https://cdn.sofifa.net/players/187215/26_120.png' },
  { id: 200145, name: 'S. Pavard', overall: 83, position: 'CB', pac: 71, sho: 56, pas: 72, dri: 70, def: 81, phy: 78, clubId: 505, clubName: 'Inter Milan', leagueName: 'Serie A', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/200145/26_120.png' },

  // LB / RB
  { id: 220834, name: 'T. Alexander-Arnold', overall: 88, position: 'RB', pac: 79, sho: 76, pas: 90, dri: 82, def: 78, phy: 71, clubId: 9, clubName: 'Liverpool', leagueName: 'Premier League', nationalityId: 14, nationalityName: 'England', imageUrl: 'https://cdn.sofifa.net/players/220834/26_120.png' },
  { id: 213345, name: 'A. Davies', overall: 84, position: 'LB', pac: 90, sho: 52, pas: 74, dri: 78, def: 76, phy: 75, clubId: 21, clubName: 'Bayern Munich', leagueName: 'Bundesliga', nationalityId: 38, nationalityName: 'Canada', imageUrl: 'https://cdn.sofifa.net/players/213345/26_120.png' },

  // CDM / CM
  { id: 192985, name: 'K. Casemiro', overall: 87, position: 'CDM', pac: 64, sho: 66, pas: 77, dri: 73, def: 88, phy: 86, clubId: 10, clubName: 'Manchester United', leagueName: 'Premier League', nationalityId: 54, nationalityName: 'Brazil', imageUrl: 'https://cdn.sofifa.net/players/192985/26_120.png' },
  { id: 184799, name: 'T. Kroos', overall: 88, position: 'CM', pac: 51, sho: 78, pas: 93, dri: 84, def: 75, phy: 74, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 21, nationalityName: 'Germany', imageUrl: 'https://cdn.sofifa.net/players/184799/26_120.png' },
  { id: 226327, name: 'F. Ruiz', overall: 86, position: 'CM', pac: 65, sho: 79, pas: 88, dri: 85, def: 64, phy: 71, clubId: 73, clubName: 'Paris Saint-Germain', leagueName: 'Ligue 1', nationalityId: 45, nationalityName: 'Spain', imageUrl: 'https://cdn.sofifa.net/players/226327/26_120.png' },
  { id: 244180, name: 'J. Bellingham', overall: 91, position: 'CM', pac: 79, sho: 83, pas: 86, dri: 88, def: 78, phy: 82, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 14, nationalityName: 'England', imageUrl: 'https://cdn.sofifa.net/players/244180/26_120.png' },
  { id: 231443, name: 'P. Foden', overall: 90, position: 'CAM', pac: 82, sho: 86, pas: 88, dri: 92, def: 53, phy: 65, clubId: 11, clubName: 'Manchester City', leagueName: 'Premier League', nationalityId: 14, nationalityName: 'England', imageUrl: 'https://cdn.sofifa.net/players/231443/26_120.png' },
  { id: 200104, name: 'M. Ødegaard', overall: 89, position: 'CAM', pac: 74, sho: 84, pas: 91, dri: 90, def: 61, phy: 63, clubId: 1, clubName: 'Arsenal', leagueName: 'Premier League', nationalityId: 125, nationalityName: 'Norway', imageUrl: 'https://cdn.sofifa.net/players/200104/26_120.png' },

  // LW / RW
  { id: 231747, name: 'V. Díaz', overall: 83, position: 'LW', pac: 88, sho: 75, pas: 76, dri: 84, def: 42, phy: 71, clubId: 9, clubName: 'Liverpool', leagueName: 'Premier League', nationalityId: 56, nationalityName: 'Colombia', imageUrl: 'https://cdn.sofifa.net/players/231747/26_120.png' },
  { id: 246411, name: 'B. Saka', overall: 88, position: 'RW', pac: 88, sho: 83, pas: 84, dri: 88, def: 54, phy: 65, clubId: 1, clubName: 'Arsenal', leagueName: 'Premier League', nationalityId: 14, nationalityName: 'England', imageUrl: 'https://cdn.sofifa.net/players/246411/26_120.png' },
  { id: 212198, name: 'R. Leão', overall: 86, position: 'LW', pac: 91, sho: 80, pas: 76, dri: 88, def: 41, phy: 79, clubId: 569, clubName: 'AC Milan', leagueName: 'Serie A', nationalityId: 38, nationalityName: 'Portugal', imageUrl: 'https://cdn.sofifa.net/players/212198/26_120.png' },
  { id: 176580, name: 'L. Messi', overall: 90, position: 'RW', pac: 85, sho: 92, pas: 91, dri: 95, def: 38, phy: 64, clubId: 241, clubName: 'Inter Miami CF', leagueName: 'MLS', nationalityId: 52, nationalityName: 'Argentina', imageUrl: 'https://cdn.sofifa.net/players/176580/26_120.png' },
  { id: 239085, name: 'K. Mbappé', overall: 91, position: 'ST', pac: 97, sho: 89, pas: 80, dri: 92, def: 36, phy: 78, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/239085/26_120.png' },

  // ST / CF
  { id: 188545, name: 'R. Lewandowski', overall: 89, position: 'ST', pac: 77, sho: 92, pas: 80, dri: 86, def: 44, phy: 82, clubId: 241265, clubName: 'Barcelona', leagueName: 'LaLiga', nationalityId: 130, nationalityName: 'Poland', imageUrl: 'https://cdn.sofifa.net/players/188545/26_120.png' },
  { id: 178603, name: 'H. Kane', overall: 90, position: 'ST', pac: 71, sho: 92, pas: 86, dri: 83, def: 52, phy: 84, clubId: 21, clubName: 'Bayern Munich', leagueName: 'Bundesliga', nationalityId: 14, nationalityName: 'England', imageUrl: 'https://cdn.sofifa.net/players/178603/26_120.png' },
  { id: 222665, name: 'V. Osimhen', overall: 87, position: 'ST', pac: 94, sho: 86, pas: 66, dri: 81, def: 40, phy: 88, clubId: 48, clubName: 'Napoli', leagueName: 'Serie A', nationalityId: 126, nationalityName: 'Nigeria', imageUrl: 'https://cdn.sofifa.net/players/222665/26_120.png' },
  { id: 253026, name: 'L. Martínez', overall: 85, position: 'ST', pac: 83, sho: 87, pas: 76, dri: 83, def: 48, phy: 78, clubId: 505, clubName: 'Inter Milan', leagueName: 'Serie A', nationalityId: 52, nationalityName: 'Argentina', imageUrl: 'https://cdn.sofifa.net/players/253026/26_120.png' },
  { id: 202652, name: 'C. Immobile', overall: 82, position: 'ST', pac: 73, sho: 87, pas: 69, dri: 77, def: 33, phy: 74, clubId: 497, clubName: 'Lazio', leagueName: 'Serie A', nationalityId: 27, nationalityName: 'Italy', imageUrl: 'https://cdn.sofifa.net/players/202652/26_120.png' },
  { id: 252024, name: 'G. Ramos', overall: 82, position: 'ST', pac: 81, sho: 85, pas: 71, dri: 78, def: 40, phy: 77, clubId: 73, clubName: 'Paris Saint-Germain', leagueName: 'Ligue 1', nationalityId: 38, nationalityName: 'Portugal', imageUrl: 'https://cdn.sofifa.net/players/252024/26_120.png' },
  { id: 227702, name: 'M. Guendouzi', overall: 80, position: 'CM', pac: 72, sho: 68, pas: 80, dri: 77, def: 72, phy: 77, clubId: 116, clubName: 'Lazio', leagueName: 'Serie A', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/227702/26_120.png' },
  { id: 265010, name: 'E. Camavinga', overall: 85, position: 'CM', pac: 82, sho: 70, pas: 81, dri: 83, def: 76, phy: 80, clubId: 243, clubName: 'Real Madrid', leagueName: 'LaLiga', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/265010/26_120.png' },
  { id: 231901, name: 'G. Rutter', overall: 77, position: 'CAM', pac: 84, sho: 75, pas: 76, dri: 80, def: 44, phy: 68, clubId: 379, clubName: 'Brighton', leagueName: 'Premier League', nationalityId: 18, nationalityName: 'France', imageUrl: 'https://cdn.sofifa.net/players/231901/26_120.png' },
];
