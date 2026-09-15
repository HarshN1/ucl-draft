#!/usr/bin/env node
/**
 * Verifies legend SoFIFA face URLs and writes src/data/legendSofifaIds.verified.json
 * Run: node scripts/verify-legend-faces.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const LEGENDS_TS = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'legends.ts'), 'utf8');
const IDS_TS = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'legendSofifaIds.ts'), 'utf8');

const names = [...LEGENDS_TS.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
const idMap = {};
for (const m of IDS_TS.matchAll(/'([^']+)': (\d+)/g)) idMap[m[1]] = Number(m[2]);

function faceUrl(id) {
  const folder = Math.floor(id / 1000);
  const file = String(id % 1000).padStart(3, '0');
  return `https://cdn.sofifa.net/players/${folder}/${file}/26_120.png`;
}

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { Referer: 'https://sofifa.com/' }, timeout: 8000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

(async () => {
  const verified = {};
  for (const name of names) {
    const id = idMap[name];
    if (!id) { console.log('MISSING ID', name); continue; }
    const ok = await head(faceUrl(id));
    if (ok) verified[name] = id;
    else console.log('FAIL', name, id);
  }
  const out = path.join(__dirname, '..', 'src', 'data', 'legendSofifaIds.verified.json');
  fs.writeFileSync(out, JSON.stringify(verified, null, 2));
  console.log(`Verified ${Object.keys(verified).length}/${names.length} → ${out}`);
})();
