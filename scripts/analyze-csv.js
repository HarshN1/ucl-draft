const fs = require('fs');
const path = require('path');

function parseLine(line) {
  const r = [];
  let c = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c);
  return r;
}

const csv = fs.readdirSync(path.join(__dirname, '..', 'data')).find((f) => f.endsWith('.csv'));
const raw = fs.readFileSync(path.join(__dirname, '..', 'data', csv), 'utf8');
const lines = raw.split(/\r?\n/);
const h = parseLine(lines[0]);
const idx = Object.fromEntries(h.map((x, i) => [x, i]));

const tags = new Map();
let iconCount = 0;
const icons = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const r = parseLine(lines[i]);
  const club = r[idx.club_name] || '';
  const tag = r[idx.player_tags] || '';
  if (/icon/i.test(club)) {
    iconCount++;
    icons.push({ name: r[idx.short_name], url: r[idx.player_face_url], id: r[idx.player_id], ovr: r[idx.overall] });
  }
  if (tag) tags.set(tag, (tags.get(tag) || 0) + 1);
}

console.log('icon rows', iconCount);
console.log('icon samples', icons.slice(0, 8));
console.log('top tags', [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
