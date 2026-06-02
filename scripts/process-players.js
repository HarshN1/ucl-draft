#!/usr/bin/env node
/**
 * process-players.js
 * Reads data/players.csv (Kaggle FC26 export) and writes public/data/players.json.
 *
 * Usage:
 *   node scripts/process-players.js
 *   npm run generate
 *
 * The script auto-detects column names from both common Kaggle FC26 variants.
 */

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'data', 'players.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'data', 'players.json');
const MIN_OVR = 70;

// ─── Column name aliases ───────────────────────────────────────────────────────
// Maps our canonical field names to possible CSV column names (checked in order).

const COLUMN_ALIASES = {
  id:          ['sofifa_id', 'player_id', 'id', 'ID'],
  name:        ['short_name', 'name', 'Name', 'player_name'],
  overall:     ['overall', 'ova', 'Overall', 'OVA'],
  position:    ['player_positions', 'positions', 'Position', 'preferred_positions', 'pos'],
  pace:        ['pace', 'pac', 'PAC', 'Pace'],
  shooting:    ['shooting', 'sho', 'SHO', 'Shooting'],
  passing:     ['passing', 'pas', 'PAS', 'Passing'],
  dribbling:   ['dribbling', 'dri', 'DRI', 'Dribbling'],
  defending:   ['defending', 'def', 'DEF', 'Defending'],
  physic:      ['physic', 'phy', 'PHY', 'Physical', 'physicality'],
  clubId:      ['club_team_id', 'club_id', 'team_id', 'Club ID'],
  clubName:    ['club_name', 'club', 'Club', 'team_name'],
  leagueName:  ['league_name', 'league', 'League'],
  nationalityId: ['nationality_id', 'nation_id', 'flag_id'],
  nationalityName: ['nationality_name', 'nationality', 'Nationality'],
};

// ─── CSV parser ────────────────────────────────────────────────────────────────
// Simple but handles quoted fields with commas.

function parseCSV(raw) {
  const lines = raw.split('\n').filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV appears empty');

  const headers = parseCSVLine(lines[0]);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue; // skip malformed rows
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

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
  return result;
}

// ─── Column resolver ──────────────────────────────────────────────────────────

function buildColumnMap(headers) {
  const map = {};
  const missing = [];
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const found = aliases.find((alias) => headers.includes(alias));
    if (found) {
      map[field] = found;
    } else {
      missing.push(field);
    }
  }
  return { map, missing };
}

// ─── Value extractors ─────────────────────────────────────────────────────────

function getInt(row, col, fallback = 0) {
  const v = row[col];
  if (!v) return fallback;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? fallback : n;
}

function getString(row, col, fallback = '') {
  return (row[col] ?? fallback).trim();
}

function getPrimaryPosition(posStr) {
  if (!posStr) return 'ST';
  // Positions can be comma-separated: "ST, CF" → take first
  return posStr.split(/[,|]/)[0].trim().toUpperCase();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`\n❌  Input file not found: ${INPUT_PATH}`);
    console.error('    Download a player CSV from Kaggle and place it at data/players.csv\n');
    process.exit(1);
  }

  console.log(`📂  Reading ${INPUT_PATH}...`);
  const raw = fs.readFileSync(INPUT_PATH, 'utf8');

  const { headers, rows } = parseCSV(raw);
  console.log(`    Found ${rows.length} rows, ${headers.length} columns.`);

  const { map, missing } = buildColumnMap(headers);
  if (missing.length > 0) {
    console.warn(`⚠️   Could not find columns for: ${missing.join(', ')}`);
    console.warn('    Available columns:', headers.slice(0, 20).join(', '));
  }

  const players = [];
  let skippedLowOvr = 0;
  let skippedMissing = 0;
  const seenIds = new Set();

  for (const row of rows) {
    const id = getInt(row, map.id);
    if (!id || seenIds.has(id)) { skippedMissing++; continue; }

    const overall = getInt(row, map.overall);
    if (overall < MIN_OVR) { skippedLowOvr++; continue; }

    const name = getString(row, map.name);
    if (!name) { skippedMissing++; continue; }

    const position = getPrimaryPosition(getString(row, map.position));
    const clubId = getInt(row, map.clubId);
    const nationalityId = getInt(row, map.nationalityId);

    seenIds.add(id);
    players.push({
      id,
      name,
      overall,
      position,
      pac: getInt(row, map.pace, overall - 5),
      sho: getInt(row, map.shooting, overall - 5),
      pas: getInt(row, map.passing, overall - 5),
      dri: getInt(row, map.dribbling, overall - 5),
      def: getInt(row, map.defending, 50),
      phy: getInt(row, map.physic, overall - 5),
      clubId,
      clubName: getString(row, map.clubName, 'Unknown Club'),
      leagueName: getString(row, map.leagueName, 'Unknown League'),
      nationalityId,
      nationalityName: getString(row, map.nationalityName, 'Unknown'),
      imageUrl: `https://cdn.sofifa.net/players/${id}/26_120.png`,
    });
  }

  // Sort by OVR descending for deterministic output
  players.sort((a, b) => b.overall - a.overall);

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(players, null, 0));

  console.log(`\n✅  Done!`);
  console.log(`    Players included (OVR ≥ ${MIN_OVR}): ${players.length}`);
  console.log(`    Skipped (low OVR):    ${skippedLowOvr}`);
  console.log(`    Skipped (invalid):    ${skippedMissing}`);
  console.log(`    Output:               ${OUTPUT_PATH}`);
  console.log(`    File size:            ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)} KB\n`);
}

main();
