#!/usr/bin/env node
/**
 * Fetches EA FC 26 special cards from Futbin's public API and writes
 * public/data/special-cards.json for the draft pool.
 *
 * Usage: node scripts/fetch-special-cards.js  (or: npm run fetch-specials)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT = path.join(__dirname, '..', 'public', 'data', 'special-cards.json');
const NATION_FLAGS = require(path.join(__dirname, '..', 'src', 'data', 'nationFlags.json'));

const VERSIONS = [
  { slug: 'icons', cardType: 'icon', promoLabel: 'ICON', isLegend: true },
  { slug: 'heroes', cardType: 'hero', promoLabel: 'HERO', isLegend: false },
  { slug: 'gold_if', cardType: 'totw', promoLabel: 'TOTW', isLegend: false },
  { slug: 'cornerstones', cardType: 'cornerstones', promoLabel: 'Cornerstones', isLegend: false },
  { slug: 'thunderstruck', cardType: 'thunderstruck', promoLabel: 'Thunderstruck', isLegend: false },
  { slug: 'thunderstruck_icon', cardType: 'thunderstruck_icon', promoLabel: 'Thunderstruck ICON', isLegend: true },
];

const ISO_OVERRIDE = {
  Egypt: 'eg',
  'Czech Republic': 'cz',
  Bulgaria: 'bg',
  Romania: 'ro',
  Nigeria: 'ng',
  Denmark: 'dk',
  'Northern Ireland': 'gb-nir',
  Wales: 'gb-wls',
  'Republic of Ireland': 'ie',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (ucl-draft)' } }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function flagUrl(nation) {
  const iso = NATION_FLAGS[nation] ?? ISO_OVERRIDE[nation];
  return iso ? `https://cdn.sofifa.net/flags/${iso}.png` : '';
}

function sofifaFace(playerId) {
  const id = Number(playerId);
  if (!id) return '';
  const major = Math.floor(id / 1000);
  const minor = id % 1000;
  return `https://cdn.sofifa.net/players/${major}/${minor}/26_120.png`;
}

function pickImage(row) {
  if (row.specialPlayerImage) return row.specialPlayerImage;
  if (row.normalPlayerImage) return row.normalPlayerImage;
  return sofifaFace(row.playerid ?? row.playerimage);
}

function mapRow(row, meta) {
  const playerId = Number(row.playerid ?? row.playerimage ?? 0);
  const resourceId = Number(row.resource_id ?? row.ID ?? 0);
  const clubId = Number(row.club ?? 0);
  const position = String(row.position || 'ST').trim();

  return {
    id: resourceId || playerId * 1000 + meta.cardType.length,
    resourceId,
    basePlayerId: playerId,
    name: String(row.playername || row.name || 'Unknown'),
    overall: Number(row.rating) || 75,
    position,
    pac: Number(row.pac) || 0,
    sho: Number(row.sho) || 0,
    pas: Number(row.pas) || 0,
    dri: Number(row.dri) || 0,
    def: Number(row.def) || 0,
    phy: Number(row.phy) || 0,
    clubId,
    clubName: String(row.club_name || (meta.cardType === 'icon' ? 'Icons' : 'Special')),
    leagueName: String(
      row.league_name || (meta.cardType === 'icon' ? 'FUT_LEGENDS' : meta.promoLabel)
    ),
    nationalityId: Number(row.nation ?? 0),
    nationalityName: String(row.nation_name || ''),
    imageUrl: pickImage(row),
    badgeUrl: clubId > 0 ? `https://cdn.sofifa.net/teams/${clubId}/60.png` : undefined,
    flagUrl: flagUrl(row.nation_name) || undefined,
    cardType: meta.cardType,
    cardVersion: meta.slug,
    promoLabel: row.rareTypeName || meta.promoLabel,
    rareType: Number(row.raretype) || 0,
    cardFrameUrl: row.cardImage || undefined,
    isLegend: meta.isLegend,
  };
}

async function fetchVersion(meta) {
  const players = [];
  const seen = new Set();
  let page = 1;

  while (true) {
    const url = `https://www.futbin.org/futbin/api/26/getFilteredPlayers?page=${page}&version=${meta.slug}`;
    const json = await getJson(url);
    const rows = json.data || [];
    if (!rows.length) break;

    for (const row of rows) {
      const rid = Number(row.resource_id ?? row.ID);
      if (seen.has(rid)) continue;
      seen.add(rid);
      players.push(mapRow(row, meta));
    }

    process.stdout.write(`  ${meta.slug}: page ${page} (${players.length} cards)\r`);
    page += 1;
    await sleep(400);
  }

  console.log(`  ${meta.slug}: ${players.length} cards`);
  return players;
}

async function main() {
  console.log('Fetching EA FC 26 special cards from Futbin…\n');
  const all = [];
  const globalSeen = new Set();

  for (const meta of VERSIONS) {
    const batch = await fetchVersion(meta);
    for (const p of batch) {
      if (globalSeen.has(p.id)) continue;
      globalSeen.add(p.id);
      all.push(p);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(all));
  console.log(`\n✓ Wrote ${all.length} special cards → ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
