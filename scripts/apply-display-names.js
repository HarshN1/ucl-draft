#!/usr/bin/env node
/**
 * Bakes fan-friendly display names into players.json and special-cards.json.
 * Run after generate / fetch-specials: npm run apply-names
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

function displayName(player) {
  const id = player.basePlayerId ?? player.id;
  if (BY_ID[id]) return BY_ID[id];
  if (BY_ID[player.id]) return BY_ID[player.id];
  if (BY_EXACT[player.name]) return BY_EXACT[player.name];
  return player.name;
}

function applyFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`skip (missing): ${path.relative(ROOT, filePath)}`);
    return { updated: 0, total: 0 };
  }
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let updated = 0;
  for (const p of rows) {
    const next = displayName(p);
    if (next !== p.name) {
      p.name = next;
      updated++;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(rows));
  return { updated, total: rows.length };
}

function main() {
  const players = applyFile(PLAYERS_PATH);
  const specials = applyFile(SPECIALS_PATH);
  console.log(
    `players.json: ${players.updated}/${players.total} renamed · special-cards.json: ${specials.updated}/${specials.total} renamed`
  );
}

main();
