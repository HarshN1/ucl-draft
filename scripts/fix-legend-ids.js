const https = require('https');
const candidates = {
  'David Seaman': [120533, 161693, 190045],
  'Paolo Maldini': [238439, 120533, 1397],
  'Franco Baresi': [120534, 238438, 121939],
  'Fernando Hierro': [161693, 166149, 238380],
  'Laurent Blanc': [161695, 166149, 238381],
  'Marcel Desailly': [120298, 1668, 238382],
  'Javier Zanetti': [45674, 190049, 238383],
  'Ruud Gullit': [1668, 121939, 190046],
  'Dennis Bergkamp': [143001, 238380, 190047],
  'Luís Figo': [4231, 238435, 190048],
};

function head(id) {
  const folder = Math.floor(id / 1000);
  const file = String(id % 1000).padStart(3, '0');
  const url = `https://cdn.sofifa.net/players/${folder}/${file}/26_120.png`;
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', headers: { Referer: 'https://sofifa.com/' }, timeout: 6000 }, (res) => {
      resolve(res.statusCode === 200 ? id : null);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

(async () => {
  for (const [name, ids] of Object.entries(candidates)) {
    for (const id of ids) {
      const ok = await head(id);
      if (ok) { console.log(name, '->', ok); break; }
    }
  }
})();
