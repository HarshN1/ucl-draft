import type { Player } from '@/types';
import nationFlags from '@/data/nationFlags.json';
import { LEGEND_SOFIFA_IDS, sofifaFaceUrl } from '@/data/legendSofifaIds';

// FUT 16 Legends ("Icons"). Stat order maps to PAC/SHO/PAS/DRI/DEF/PHY (GK
// stats are mapped onto the same six fields). They use the systemic tokens
// club "Icons" / league "FUT_LEGENDS" and special chemistry link rules.

const FLAGS = nationFlags as Record<string, string>;
const ISO_OVERRIDE: Record<string, string> = {
  'Czech Republic': 'cz',
  Bulgaria: 'bg',
  Romania: 'ro',
  Nigeria: 'ng',
  Denmark: 'dk',
  'Northern Ireland': 'gb-nir',
  Wales: 'gb-wls',
  'Republic of Ireland': 'ie',
};
function flagUrl(nation: string): string | undefined {
  const iso = FLAGS[nation] ?? ISO_OVERRIDE[nation];
  return iso ? `https://cdn.sofifa.net/flags/${iso}.png` : undefined;
}

interface RawLegend {
  name: string;
  ovr: number;
  position: string;
  nationality: string;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

const RAW: RawLegend[] = [
  // Goalkeepers
  { name: 'Peter Schmeichel', ovr: 90, position: 'GK', nationality: 'Denmark', pac: 90, sho: 87, pas: 84, dri: 92, def: 54, phy: 88 },
  { name: 'Edwin van der Sar', ovr: 89, position: 'GK', nationality: 'Netherlands', pac: 84, sho: 87, pas: 82, dri: 88, def: 49, phy: 90 },
  { name: 'David Seaman', ovr: 84, position: 'GK', nationality: 'England', pac: 83, sho: 81, pas: 80, dri: 85, def: 47, phy: 82 },
  { name: 'Jens Lehmann', ovr: 84, position: 'GK', nationality: 'Germany', pac: 82, sho: 81, pas: 81, dri: 84, def: 45, phy: 83 },
  // Defenders
  { name: 'Franz Beckenbauer', ovr: 93, position: 'CB', nationality: 'Germany', pac: 82, sho: 69, pas: 83, dri: 79, def: 94, phy: 81 },
  { name: 'Paolo Maldini', ovr: 92, position: 'CB', nationality: 'Italy', pac: 86, sho: 56, pas: 74, dri: 67, def: 95, phy: 80 },
  { name: 'Franco Baresi', ovr: 92, position: 'CB', nationality: 'Italy', pac: 76, sho: 39, pas: 73, dri: 70, def: 94, phy: 82 },
  { name: 'Alessandro Nesta', ovr: 90, position: 'CB', nationality: 'Italy', pac: 67, sho: 32, pas: 62, dri: 61, def: 92, phy: 76 },
  { name: 'Fernando Hierro', ovr: 89, position: 'CB', nationality: 'Spain', pac: 69, sho: 71, pas: 72, dri: 65, def: 90, phy: 84 },
  { name: 'Laurent Blanc', ovr: 89, position: 'CB', nationality: 'France', pac: 77, sho: 68, pas: 72, dri: 69, def: 91, phy: 84 },
  { name: 'Fabio Cannavaro', ovr: 89, position: 'CB', nationality: 'Italy', pac: 78, sho: 43, pas: 61, dri: 63, def: 92, phy: 83 },
  { name: 'Sol Campbell', ovr: 87, position: 'CB', nationality: 'England', pac: 73, sho: 39, pas: 55, dri: 52, def: 86, phy: 90 },
  { name: 'Marcel Desailly', ovr: 87, position: 'CB', nationality: 'France', pac: 75, sho: 51, pas: 63, dri: 58, def: 86, phy: 87 },
  { name: 'Roberto Carlos', ovr: 88, position: 'LB', nationality: 'Brazil', pac: 92, sho: 83, pas: 81, dri: 81, def: 82, phy: 86 },
  { name: 'Andreas Brehme', ovr: 86, position: 'LB', nationality: 'Germany', pac: 78, sho: 79, pas: 84, dri: 77, def: 85, phy: 80 },
  { name: 'Javier Zanetti', ovr: 88, position: 'RB', nationality: 'Argentina', pac: 83, sho: 58, pas: 78, dri: 76, def: 88, phy: 82 },
  { name: 'Gary Neville', ovr: 86, position: 'RB', nationality: 'England', pac: 76, sho: 45, pas: 75, dri: 71, def: 84, phy: 81 },
  // Midfielders
  { name: 'Lothar Matthäus', ovr: 91, position: 'CDM', nationality: 'Germany', pac: 86, sho: 86, pas: 86, dri: 77, def: 88, phy: 82 },
  { name: 'Roy Keane', ovr: 86, position: 'CDM', nationality: 'Republic of Ireland', pac: 75, sho: 67, pas: 78, dri: 73, def: 86, phy: 88 },
  { name: 'Ruud Gullit', ovr: 90, position: 'CM', nationality: 'Netherlands', pac: 84, sho: 86, pas: 86, dri: 83, def: 80, phy: 86 },
  { name: 'Patrick Vieira', ovr: 90, position: 'CM', nationality: 'France', pac: 83, sho: 74, pas: 80, dri: 79, def: 89, phy: 91 },
  { name: 'Gheorghe Hagi', ovr: 89, position: 'CAM', nationality: 'Romania', pac: 82, sho: 87, pas: 89, dri: 88, def: 37, phy: 66 },
  { name: 'Michael Laudrup', ovr: 89, position: 'CAM', nationality: 'Denmark', pac: 84, sho: 77, pas: 89, dri: 89, def: 39, phy: 68 },
  { name: 'Rui Costa', ovr: 88, position: 'CAM', nationality: 'Portugal', pac: 84, sho: 78, pas: 86, dri: 85, def: 44, phy: 77 },
  { name: 'Jay-Jay Okocha', ovr: 87, position: 'CAM', nationality: 'Nigeria', pac: 85, sho: 76, pas: 80, dri: 93, def: 33, phy: 62 },
  { name: 'Pavel Nedvěd', ovr: 89, position: 'LM', nationality: 'Czech Republic', pac: 83, sho: 86, pas: 86, dri: 85, def: 54, phy: 79 },
  { name: 'Ryan Giggs', ovr: 87, position: 'LM', nationality: 'Wales', pac: 87, sho: 76, pas: 86, dri: 87, def: 43, phy: 65 },
  { name: 'Robert Pirès', ovr: 87, position: 'LM', nationality: 'France', pac: 85, sho: 81, pas: 84, dri: 86, def: 39, phy: 66 },
  // Attackers
  { name: 'Pelé', ovr: 95, position: 'CF', nationality: 'Brazil', pac: 95, sho: 89, pas: 89, dri: 94, def: 53, phy: 73 },
  { name: 'Marco van Basten', ovr: 91, position: 'ST', nationality: 'Netherlands', pac: 83, sho: 94, pas: 73, dri: 81, def: 34, phy: 70 },
  { name: 'George Best', ovr: 90, position: 'RW', nationality: 'Northern Ireland', pac: 91, sho: 86, pas: 81, dri: 93, def: 32, phy: 68 },
  { name: 'Dennis Bergkamp', ovr: 90, position: 'CF', nationality: 'Netherlands', pac: 83, sho: 90, pas: 83, dri: 87, def: 26, phy: 79 },
  { name: 'Hristo Stoichkov', ovr: 90, position: 'ST', nationality: 'Bulgaria', pac: 84, sho: 88, pas: 85, dri: 87, def: 51, phy: 82 },
  { name: 'Luís Figo', ovr: 90, position: 'RW', nationality: 'Portugal', pac: 83, sho: 81, pas: 86, dri: 90, def: 38, phy: 78 },
  { name: 'Filippo Inzaghi', ovr: 85, position: 'ST', nationality: 'Italy', pac: 79, sho: 86, pas: 55, dri: 73, def: 26, phy: 64 },
];

export const LEGENDS: Player[] = RAW.map((r, i) => ({
  id: 9_000_000 + i,
  name: r.name,
  overall: r.ovr,
  position: r.position,
  pac: r.pac,
  sho: r.sho,
  pas: r.pas,
  dri: r.dri,
  def: r.def,
  phy: r.phy,
  clubId: 0,
  clubName: 'Icons',
  leagueName: 'FUT_LEGENDS',
  nationalityId: 0,
  nationalityName: r.nationality,
  imageUrl: LEGEND_SOFIFA_IDS[r.name] ? sofifaFaceUrl(LEGEND_SOFIFA_IDS[r.name]) : '',
  flagUrl: flagUrl(r.nationality),
  isLegend: true,
}));
