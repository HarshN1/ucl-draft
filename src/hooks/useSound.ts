'use client';

import { useRef, useCallback } from 'react';

let audioCtx: AudioContext | null = null;
let goalBuffer: AudioBuffer | null = null;
let loadingGoal = false;

async function loadGoalSound() {
  if (goalBuffer || loadingGoal) return;
  loadingGoal = true;
  try {
    for (const url of ['/sounds/goal.wav', '/sounds/goal.mp3']) {
      const response = await fetch(url);
      if (!response.ok) continue;
      const arrayBuffer = await response.arrayBuffer();
      if (audioCtx) {
        goalBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        break;
      }
    }
  } catch {
    // Falls back to synthesized goal in playGoal
  } finally {
    loadingGoal = false;
  }
}

/** Synthesized crowd-style goal sting when no audio file is loaded. */
function playSynthGoal(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [440, 554, 660];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = now + i * 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function useSound() {
  const initialized = useRef(false);

  const initAudio = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      loadGoalSound();
    } catch {
      // Web Audio not available
    }
  }, []);

  const playGoal = useCallback(() => {
    if (!audioCtx) return;
    try {
      if (goalBuffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = goalBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
      } else {
        playSynthGoal(audioCtx);
      }
    } catch {
      // Ignore playback errors
    }
  }, []);

  const playTone = useCallback((freq: number, duration = 0.15) => {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignore
    }
  }, []);

  const playClick = useCallback(() => playTone(880, 0.08), [playTone]);

  const playPick = useCallback(() => {
    playTone(660, 0.1);
    setTimeout(() => playTone(880, 0.1), 80);
  }, [playTone]);

  return { initAudio, playGoal, playClick, playPick };
}
