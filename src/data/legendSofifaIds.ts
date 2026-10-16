/**
 * SoFIFA player_id → CDN face for FUT Icons (EA FC 26/27 Men's roster).
 */
export const LEGEND_SOFIFA_IDS: Record<string, number> = {
  'Peter Schmeichel': 238428,
  'Edwin van der Sar': 51539,
  'David Seaman': 238428,
  'Jens Lehmann': 488,
  'Franz Beckenbauer': 168473,
  'Paolo Maldini': 238439,
  'Franco Baresi': 166906,
  'Alessandro Nesta': 1088,
  'Fernando Hierro': 161840,
  'Laurent Blanc': 238443,
  'Fabio Cannavaro': 1183,
  'Sol Campbell': 243029,
  'Marcel Desailly': 1116,
  'Roberto Carlos': 238430,
  'Andreas Brehme': 121939,
  'Javier Zanetti': 1041,
  'Gary Neville': 246,
  'Lothar Matthäus': 238435,
  'Roy Keane': 240,
  'Ruud Gullit': 214100,
  'Patrick Vieira': 238427,
  'Gheorghe Hagi': 166124,
  'Michael Laudrup': 222000,
  'Rui Costa': 176676,
  'Jay-Jay Okocha': 570,
  'Pavel Nedvěd': 6235,
  'Ryan Giggs': 71557,
  'Robert Pirès': 1605,
  'Pelé': 237067,
  'Marco van Basten': 192181,
  'George Best': 226764,
  'Dennis Bergkamp': 238388,
  'Hristo Stoichkov': 4833,
  'Luís Figo': 5589,
  'Filippo Inzaghi': 238382,
};

export function sofifaFaceUrl(playerId: number): string {
  const folder = Math.floor(playerId / 1000);
  const file = String(playerId % 1000).padStart(3, '0');
  return `https://cdn.sofifa.net/players/${folder}/${file}/26_120.png`;
}
