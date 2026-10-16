#!/usr/bin/env node
/**
 * process-players.js
 * Reads the rovnez "FC 26 (FIFA 26) Player Data" Kaggle CSV (sofifa scrape) from
 * /data and writes /public/data/players.json (Men's dataset, OVR >= 70).
 *
 * Usage:  node scripts/process-players.js   (or: npm run generate)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'players.json');
const NATION_FLAGS = require(path.join(__dirname, '..', 'src', 'data', 'nationFlags.json'));
const DISPLAY_NAMES = require(path.join(__dirname, '..', 'src', 'data', 'playerDisplayNames.json'));
const MIN_OVR = 70;

/**
 * Disambiguate leagues that share generic names ("Pro League", "Premier League",
 * "Bundesliga", "Serie A", "Super League", "Premiership") across countries in SoFIFA CSV.
 */
const LEAGUE_BY_ID = {
  13: 'Premier League',
  332: 'Ukrainian Premier League',
  19: 'Bundesliga',
  80: 'Ö. Bundesliga',
  31: 'Serie A',
  2018: 'LigaPro Ecuador',
  53: 'La Liga',
  16: 'Ligue 1',
  308: 'Primeira Liga',
  10: 'Eredivisie',
  350: 'ROSHN Saudi League',
  4: '1A Pro League',
  2013: 'UAE Pro League',
  39: 'Major League Soccer',
  68: 'Süper Lig',
  50: 'Scottish Premiership',
  353: 'Liga Profesional de Fútbol',
  1: '3F Superliga',
  63: 'Super League Greece',
  189: 'Credit Suisse Super League',
  2012: 'Chinese Super League',
  2149: 'Hero ISL',
  14: 'Championship',
};

// ─── CSV parsing (handles quoted fields + CRLF) ────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((c) => c.replace(/\r/g, '').trim());
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInt(val, fallback = 0) {
  if (val === undefined || val === '') return fallback;
  const n = parseInt(String(val).replace(/[^0-9-]/g, ''), 10);
  return Number.isNaN(n) ? fallback : n;
}

function findCsv() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.csv'));
  if (files.length === 0) return null;
  const preferred = files.find((f) => /fc.?26/i.test(f)) || files[0];
  return path.join(DATA_DIR, preferred);
}

function flagUrl(nationName) {
  const code = NATION_FLAGS[nationName];
  return code ? `https://cdn.sofifa.net/flags/${code}.png` : '';
}

function resolveDisplayName(id, rawName) {
  return (
    DISPLAY_NAMES.byId[String(id)] ||
    DISPLAY_NAMES.byExact[rawName] ||
    rawName
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const inputPath = findCsv();
  if (!inputPath) {
    console.error(`\n❌  No CSV found in ${DATA_DIR}`);
    process.exit(1);
  }

  console.log(`📂  Reading ${path.basename(inputPath)} ...`);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const header = parseCSVLine(lines[0]);

  const idx = {};
  header.forEach((h, i) => (idx[h] = i));

  const required = ['player_id', 'short_name', 'overall', 'player_positions', 'player_face_url'];
  const missing = required.filter((c) => idx[c] === undefined);
  if (missing.length) {
    console.error(`❌  Missing expected columns: ${missing.join(', ')}`);
    process.exit(1);
  }

  const players = [];
  const seen = new Set();
  let skippedLow = 0;
  let skippedBad = 0;
  let missingFlag = 0;
  const unmappedNations = new Set();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const r = parseCSVLine(lines[i]);

    const id = getInt(r[idx.player_id]);
    if (!id || seen.has(id)) {
      skippedBad++;
      continue;
    }

    const overall = getInt(r[idx.overall]);
    if (overall < MIN_OVR) {
      skippedLow++;
      continue;
    }

    const rawName = r[idx.short_name] || r[idx.long_name];
    if (!rawName) {
      skippedBad++;
      continue;
    }
    const name = resolveDisplayName(id, rawName);

    const positions = (r[idx.player_positions] || 'ST')
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    const position = positions[0] || 'ST';
    const altPositions = positions.slice(1);
    const isGK = position === 'GK';

    const stat = (col, gkCol) => {
      const v = getInt(r[idx[col]], -1);
      if (v >= 0) return v;
      if (isGK && gkCol && idx[gkCol] !== undefined) return getInt(r[idx[gkCol]], overall - 5);
      return overall - 5;
    };

    const nationName = r[idx.nationality_name] || 'Unknown';
    const fUrl = flagUrl(nationName);
    if (!fUrl && nationName !== 'Unknown') {
      missingFlag++;
      unmappedNations.add(nationName);
    }

    const clubId = getInt(r[idx.club_team_id]);
    const leagueId = getInt(r[idx.league_id]);
    const leagueName = LEAGUE_BY_ID[leagueId] || r[idx.league_name] || '';

    seen.add(id);
    const record = {
      id,
      name,
      overall,
      position,
      ...(altPositions.length > 0 ? { altPositions } : {}),
      pac: stat('pace', 'goalkeeping_diving'),
      sho: stat('shooting', 'goalkeeping_handling'),
      pas: stat('passing', 'goalkeeping_kicking'),
      dri: stat('dribbling', 'goalkeeping_reflexes'),
      def: stat('defending', 'goalkeeping_speed'),
      phy: stat('physic', 'goalkeeping_positioning'),
      clubId,
      clubName: r[idx.club_name] || 'Free Agent',
      leagueName,
      nationalityId: getInt(r[idx.nationality_id]),
      nationalityName: nationName,
      imageUrl: (r[idx.player_face_url] || '').trim(),
      badgeUrl: clubId ? `https://cdn.sofifa.net/teams/${clubId}/60.png` : '',
      flagUrl: fUrl,
    };
    players.push(record);
  }

  players.sort((a, b) => b.overall - a.overall);

  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(players));

  console.log(`\n✅  Done!`);
  console.log(`    Players (OVR ≥ ${MIN_OVR}):  ${players.length}`);
  console.log(`    Skipped (low OVR):    ${skippedLow}`);
  console.log(`    Skipped (invalid):    ${skippedBad}`);
  console.log(`    Players missing flag: ${missingFlag}`);
  if (unmappedNations.size) {
    console.log(`    Unmapped nations:     ${[...unmappedNations].join(', ')}`);
  }
  console.log(`    Output:               ${OUTPUT_PATH}`);
  console.log(`    File size:            ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)} KB\n`);
}

main();
