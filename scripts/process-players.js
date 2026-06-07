#!/usr/bin/env node
/**
 * process-players.js
 * Reads the rovnez "FC 26 (FIFA 26) Player Data" Kaggle CSV (sofifa scrape) from
 * /data and writes /public/data/players.json.
 *
 * Usage:  node scripts/process-players.js   (or: npm run generate)
 *
 * Auto-detects the CSV file in /data (first *.csv). Bakes final, verified sofifa
 * CDN URLs into each record:
 *   - imageUrl : player_face_url from the dataset (IDs are split into the path)
 *   - badgeUrl : https://cdn.sofifa.net/teams/{club_team_id}/60.png
 *   - flagUrl  : https://cdn.sofifa.net/flags/{iso-code}.png  (via nationFlags.json)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'players.json');
const NATION_FLAGS = require(path.join(__dirname, '..', 'src', 'data', 'nationFlags.json'));
const MIN_OVR = 70;

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
  // Prefer a file that looks like the FC26 export
  const preferred = files.find((f) => /fc.?26/i.test(f)) || files[0];
  return path.join(DATA_DIR, preferred);
}

function flagUrl(nationName) {
  const code = NATION_FLAGS[nationName];
  return code ? `https://cdn.sofifa.net/flags/${code}.png` : '';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const inputPath = findCsv();
  if (!inputPath) {
    console.error(`\n❌  No CSV found in ${DATA_DIR}`);
    console.error('    Download the rovnez FC 26 dataset and place the .csv in /data\n');
    process.exit(1);
  }

  console.log(`📂  Reading ${path.basename(inputPath)} ...`);
  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const header = parseCSVLine(lines[0]);

  const idx = {};
  header.forEach((h, i) => (idx[h] = i));

  // Required columns (rovnez sofifa schema)
  const required = ['player_id', 'short_name', 'overall', 'player_positions', 'player_face_url'];
  const missing = required.filter((c) => idx[c] === undefined);
  if (missing.length) {
    console.error(`❌  Missing expected columns: ${missing.join(', ')}`);
    console.error('    First columns found:', header.slice(0, 15).join(', '));
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
    if (!id || seen.has(id)) { skippedBad++; continue; }

    const overall = getInt(r[idx.overall]);
    if (overall < MIN_OVR) { skippedLow++; continue; }

    const name = r[idx.short_name] || r[idx.long_name];
    if (!name) { skippedBad++; continue; }

    const positions = (r[idx.player_positions] || 'ST').split(',').map((p) => p.trim());
    const position = (positions[0] || 'ST').toUpperCase();
    const isGK = position === 'GK';

    // Outfield stats live in pace/shooting/...; GKs use goalkeeping_* columns.
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

    seen.add(id);
    players.push({
      id,
      name,
      overall,
      position,
      pac: stat('pace', 'goalkeeping_diving'),
      sho: stat('shooting', 'goalkeeping_handling'),
      pas: stat('passing', 'goalkeeping_kicking'),
      dri: stat('dribbling', 'goalkeeping_reflexes'),
      def: stat('defending', 'goalkeeping_speed'),
      phy: stat('physic', 'goalkeeping_positioning'),
      clubId,
      clubName: r[idx.club_name] || 'Free Agent',
      leagueName: r[idx.league_name] || '',
      nationalityId: getInt(r[idx.nationality_id]),
      nationalityName: nationName,
      imageUrl: (r[idx.player_face_url] || '').trim(),
      badgeUrl: clubId ? `https://cdn.sofifa.net/teams/${clubId}/60.png` : '',
      flagUrl: fUrl,
    });
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
