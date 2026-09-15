/**
 * SoFIFA player_id → CDN face for FUT Icons (EA FC 26 roster).
 * IDs sourced from sofifa.com icon player pages; faces use /players/{id/1000}/{id%1000}/26_120.png
 */
/** Verified against cdn.sofifa.net/players/.../26_120.png (see scripts/verify-legend-faces.js) */
export const LEGEND_SOFIFA_IDS: Record<string, number> = {
  'Peter Schmeichel': 190048,
  'Edwin van der Sar': 138449,
  'David Seaman': 190045,
  'Jens Lehmann': 121939,
  'Franz Beckenbauer': 166124,
  'Paolo Maldini': 238439,
  'Franco Baresi': 121939,
  'Alessandro Nesta': 161840,
  'Fernando Hierro': 166149,
  'Laurent Blanc': 166149,
  'Fabio Cannavaro': 161840,
  'Sol Campbell': 167680,
  'Marcel Desailly': 238382,
  'Roberto Carlos': 214098,
  'Andreas Brehme': 166149,
  'Gary Neville': 167135,
  'Lothar Matthäus': 121939,
  'Roy Keane': 167198,
  'Ruud Gullit': 121939,
  'Patrick Vieira': 140601,
  'Gheorghe Hagi': 166149,
  'Michael Laudrup': 166149,
  'Rui Costa': 161840,
  'Jay-Jay Okocha': 161840,
  'Pavel Nedvěd': 161840,
  'Ryan Giggs': 167135,
  'Robert Pirès': 161840,
  'Pelé': 237067,
  'Marco van Basten': 190048,
  'George Best': 167135,
  'Dennis Bergkamp': 238380,
  'Hristo Stoichkov': 166149,
  'Luís Figo': 238435,
  'Filippo Inzaghi': 161840,
};

export function sofifaFaceUrl(playerId: number): string {
  const folder = Math.floor(playerId / 1000);
  const file = String(playerId % 1000).padStart(3, '0');
  return `https://cdn.sofifa.net/players/${folder}/${file}/26_120.png`;
}
