#!/usr/bin/env node
/**
 * Generates public/sounds/goal.wav — a short celebratory tone (no external deps).
 * Web Audio API decodes WAV; used when synthesized fallback isn't needed.
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'sounds');
const OUT = path.join(OUT_DIR, 'goal.wav');

const SAMPLE_RATE = 22050;
const DURATION = 0.55;
const numSamples = Math.floor(SAMPLE_RATE * DURATION);

function tone(freq, t, attack = 0.02, decay = 0.15) {
  const env =
    t < attack ? t / attack : Math.exp(-(t - attack) / decay);
  return Math.sin(2 * Math.PI * freq * t) * env;
}

const samples = new Float32Array(numSamples);
for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  // Rising "goal" fanfare: three quick notes
  const n1 = t < 0.18 ? tone(440, t, 0.01, 0.08) : 0;
  const n2 = t >= 0.12 && t < 0.32 ? tone(554, t - 0.12, 0.01, 0.1) : 0;
  const n3 = t >= 0.24 ? tone(660, t - 0.24, 0.02, 0.2) : 0;
  const noise = (Math.random() * 2 - 1) * 0.04 * Math.exp(-t * 4);
  samples[i] = Math.max(-1, Math.min(1, n1 * 0.5 + n2 * 0.55 + n3 * 0.6 + noise));
}

// WAV header (16-bit mono PCM)
const dataLen = numSamples * 2;
const buf = Buffer.alloc(44 + dataLen);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + dataLen, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SAMPLE_RATE, 24);
buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(dataLen, 40);

for (let i = 0; i < numSamples; i++) {
  const s = Math.max(-1, Math.min(1, samples[i]));
  buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, buf);
console.log(`Wrote ${OUT} (${buf.length} bytes)`);
