#!/usr/bin/env node
/**
 * Curates Men's-only players.json and special-cards.json:
 * - Removes all Women's leagues and Women's Icons from special-cards.json
 * - Bakes fan-friendly display names and altPositions into both files
 * - Generates authentic 2026/27 Men's TOTY, TOTS, MOTM, and FUTTIES cards
 *   from verified top players in players.json
 *
 * Run: node scripts/apply-display-names.js  (or: npm run apply-names)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAPS = require(path.join(ROOT, 'src', 'data', 'playerDisplayNames.json'));
const PLAYERS_PATH = path.join(ROOT, 'public', 'data', 'players.json');
const SPECIALS_PATH = path.join(ROOT, 'public', 'data', 'special-cards.json');

const BY_ID = Object.fromEntries(
  Object.entries(MAPS.byId).map(([k, v]) => [Number(k), v])
);
const BY_EXACT = MAPS.byExact;

const WOMENS_LEAGUES = new Set([
  'Barclays WSL',
  'D1 Arkema',
  'Liga F',
  'GPFBL',
  'NWSL',
  'Calcio A Femminile',
  'Arkema Première Ligue',
  'Google Pixel Frauen-Bundesliga',
]);

const WOMENS_ICON_IDS = new Set([
  275243, 275276, 226293, 226301, 227006, 227324, 226975,
  227002, 71608, 226369, 227263, 77676, 71587,
]);

/**
 * Curated 2026/27 Men's FIFA 16-style promo rosters keyed by SoFIFA player_id.
 */
const CURATED_PROMOS = [
  // ─── TOTY (Royal Sapphire Blue & Gold, 94–97 OVR) ──────────────────────────
  { baseId: 231747, cardType: 'toty', promoLabel: 'TOTY', ovr: 97, boost: 6 }, // Mbappé
  { baseId: 231866, cardType: 'toty', promoLabel: 'TOTY', ovr: 97, boost: 7 }, // Rodri
  { baseId: 238794, cardType: 'toty', promoLabel: 'TOTY', ovr: 97, boost: 7 }, // Vini Jr
  { baseId: 239085, cardType: 'toty', promoLabel: 'TOTY', ovr: 96, boost: 6 }, // Haaland
  { baseId: 252371, cardType: 'toty', promoLabel: 'TOTY', ovr: 96, boost: 6 }, // Bellingham
  { baseId: 209331, cardType: 'toty', promoLabel: 'TOTY', ovr: 96, boost: 6 }, // Salah
  { baseId: 203376, cardType: 'toty', promoLabel: 'TOTY', ovr: 96, boost: 7 }, // van Dijk
  { baseId: 243715, cardType: 'toty', promoLabel: 'TOTY', ovr: 95, boost: 7 }, // Saliba
  { baseId: 204963, cardType: 'toty', promoLabel: 'TOTY', ovr: 95, boost: 8 }, // Carvajal
  { baseId: 210035, cardType: 'toty', promoLabel: 'TOTY', ovr: 94, boost: 8 }, // Grimaldo
  { baseId: 268421, cardType: 'toty', promoLabel: 'TOTY', ovr: 95, boost: 8 }, // Palmer
  { baseId: 202811, cardType: 'toty', promoLabel: 'TOTY', ovr: 94, boost: 7 }, // E. Martínez (GK)

  // ─── TOTS (Cobalt Blue & Gold Sash, 91–95 OVR) ─────────────────────────────
  { baseId: 202126, cardType: 'tots', promoLabel: 'TOTS', ovr: 96, boost: 6 }, // Kane
  { baseId: 277643, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 7 }, // Lamine Yamal
  { baseId: 246669, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 7 }, // Saka
  { baseId: 256630, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 6 }, // Wirtz
  { baseId: 256790, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 6 }, // Musiala
  { baseId: 239053, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 6 }, // Valverde
  { baseId: 234378, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 7 }, // Declan Rice
  { baseId: 251854, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 6 }, // Pedri
  { baseId: 255253, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 6 }, // Vitinha
  { baseId: 212198, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 6 }, // Bruno Fernandes
  { baseId: 231478, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 6 }, // Lautaro Martínez
  { baseId: 233419, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 6 }, // Raphinha
  { baseId: 241671, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 7 }, // Gyökeres
  { baseId: 237383, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 7 }, // Bastoni
  { baseId: 232580, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 6 }, // Gabriel
  { baseId: 235212, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 6 }, // Hakimi
  { baseId: 232656, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 7 }, // Theo Hernández
  { baseId: 205452, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 6 }, // Rüdiger
  { baseId: 192119, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 5 }, // Courtois
  { baseId: 212831, cardType: 'tots', promoLabel: 'TOTS', ovr: 94, boost: 5 }, // Alisson
  { baseId: 230621, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 5 }, // Donnarumma
  { baseId: 231443, cardType: 'tots', promoLabel: 'TOTS', ovr: 95, boost: 5 }, // Dembélé
  { baseId: 247635, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 6 }, // Kvaratskhelia
  { baseId: 222665, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 6 }, // Ødegaard
  { baseId: 224232, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 6 }, // Barella
  { baseId: 233731, cardType: 'tots', promoLabel: 'TOTS', ovr: 93, boost: 6 }, // Isak
  { baseId: 244896, cardType: 'tots', promoLabel: 'TOTS', ovr: 92, boost: 7 }, // Olise

  // ─── MOTM (Blazing Knockout Orange, 87–91 OVR) ─────────────────────────────
  { baseId: 230899, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 6 }, // Lookman
  { baseId: 246191, cardType: 'motm', promoLabel: 'MOTM', ovr: 91, boost: 4 }, // Julián Alvarez
  { baseId: 264652, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 6 }, // Barcola
  { baseId: 234396, cardType: 'motm', promoLabel: 'MOTM', ovr: 89, boost: 5 }, // Alphonso Davies
  { baseId: 212622, cardType: 'motm', promoLabel: 'MOTM', ovr: 91, boost: 3 }, // Kimmich
  { baseId: 228702, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 3 }, // Frenkie de Jong
  { baseId: 248243, cardType: 'motm', promoLabel: 'MOTM', ovr: 89, boost: 5 }, // Camavinga
  { baseId: 241721, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 5 }, // Rafael Leão
  { baseId: 215441, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 4 }, // Guirassy
  { baseId: 237692, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 4 }, // Foden
  { baseId: 239837, cardType: 'motm', promoLabel: 'MOTM', ovr: 90, boost: 3 }, // Mac Allister
  { baseId: 200389, cardType: 'motm', promoLabel: 'MOTM', ovr: 91, boost: 3 }, // Oblak
  { baseId: 229558, cardType: 'motm', promoLabel: 'MOTM', ovr: 89, boost: 4 }, // Upamecano
  { baseId: 223697, cardType: 'motm', promoLabel: 'MOTM', ovr: 88, boost: 5 }, // Dumfries

  // ─── FUTTIES (Fan-Favourite Pink & Gold, 89–93 OVR) ────────────────────────
  { baseId: 200104, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 92, boost: 6 }, // Son
  { baseId: 194765, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 92, boost: 6 }, // Griezmann
  { baseId: 20801, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 93, boost: 7 },  // Ronaldo
  { baseId: 215914, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 91, boost: 6 }, // Kanté
  { baseId: 192985, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 93, boost: 5 }, // De Bruyne
  { baseId: 231677, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 90, boost: 8 }, // Rashford
  { baseId: 240130, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 91, boost: 6 }, // Militão
  { baseId: 228618, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 90, boost: 7 }, // Ferland Mendy
  { baseId: 211110, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 91, boost: 5 }, // Dybala
  { baseId: 251570, cardType: 'futties', promoLabel: 'FUTTIES', ovr: 91, boost: 6 }, // Ronald Araujo
];

function displayName(player, baseMap) {
  const id = player.basePlayerId ?? player.id;
  if (BY_ID[id]) return BY_ID[id];
  if (BY_ID[player.id]) return BY_ID[player.id];
  if (BY_EXACT[player.name]) return BY_EXACT[player.name];
  // If Futbin gave a multi-word legal name, prefer the official EA FC short_name from players.json
  const base = baseMap && baseMap.get(id);
  if (base && base.name) {
    return BY_ID[id] || BY_EXACT[base.name] || base.name;
  }
  return player.name;
}

function clampStat(val) {
  return Math.max(30, Math.min(99, Math.round(val)));
}

function main() {
  const baseRows = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));
  const baseMap = new Map();
  let baseUpdated = 0;

  for (const p of baseRows) {
    const next = displayName(p, null);
    if (next !== p.name) {
      p.name = next;
      baseUpdated++;
    }
    baseMap.set(p.id, p);
  }
  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(baseRows));

  const rawSpecials = JSON.parse(fs.readFileSync(SPECIALS_PATH, 'utf8'));
  const filteredSpecials = [];
  let removedWomens = 0;
  let specialsUpdated = 0;

  for (const p of rawSpecials) {
    // Strip previously synthesized promo cards (id >= 8_000_000) so re-runs are idempotent
    if (p.id >= 8_000_000 && p.id < 9_000_000) continue;

    const baseId = p.basePlayerId ?? p.id;
    if (WOMENS_LEAGUES.has(p.leagueName) || WOMENS_ICON_IDS.has(baseId)) {
      removedWomens++;
      continue;
    }

    const base = baseMap.get(baseId);
    const nextName = displayName(p, baseMap);
    if (nextName !== p.name) {
      p.name = nextName;
      specialsUpdated++;
    }

    if (base && base.altPositions && !p.altPositions) {
      p.altPositions = base.altPositions;
    }
    if (base && base.leagueName && p.cardType !== 'icon' && p.cardType !== 'thunderstruck_icon' && p.cardType !== 'hero') {
      p.leagueName = base.leagueName;
    }

    filteredSpecials.push(p);
  }

  // Synthesize curated 2026/27 Men's TOTY, TOTS, MOTM, and FUTTIES cards
  let synthesizedCount = 0;
  CURATED_PROMOS.forEach((entry, idx) => {
    const base = baseMap.get(entry.baseId);
    if (!base) return;
    const boost = entry.boost;
    const synth = {
      id: 8_000_000 + idx,
      basePlayerId: base.id,
      name: displayName(base, baseMap),
      overall: entry.ovr,
      position: base.position,
      ...(base.altPositions ? { altPositions: base.altPositions } : {}),
      pac: clampStat(base.pac + boost),
      sho: clampStat(base.sho + boost),
      pas: clampStat(base.pas + boost),
      dri: clampStat(base.dri + boost),
      def: clampStat(base.def + (base.def >= 65 ? boost : Math.ceil(boost * 0.6))),
      phy: clampStat(base.phy + boost),
      clubId: base.clubId,
      clubName: base.clubName,
      leagueName: base.leagueName,
      nationalityId: base.nationalityId,
      nationalityName: base.nationalityName,
      imageUrl: base.imageUrl,
      badgeUrl: base.badgeUrl,
      flagUrl: base.flagUrl,
      cardType: entry.cardType,
      cardVersion: entry.cardType,
      promoLabel: entry.promoLabel,
      isLegend: false,
    };
    filteredSpecials.push(synth);
    synthesizedCount++;
  });

  filteredSpecials.sort((a, b) => b.overall - a.overall);
  fs.writeFileSync(SPECIALS_PATH, JSON.stringify(filteredSpecials));

  console.log(
    `players.json: ${baseUpdated}/${baseRows.length} renamed · ` +
    `special-cards.json: ${filteredSpecials.length} total (${removedWomens} women's removed, ${specialsUpdated} renamed, ${synthesizedCount} TOTY/TOTS/MOTM/FUTTIES synthesized)`
  );
}

main();
