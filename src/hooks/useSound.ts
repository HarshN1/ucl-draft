'use client';

import { useRef, useCallback } from 'react';

// AudioContext and buffer are module-level to survive re-renders
let audioCtx: AudioContext | null = null;
let goalBuffer: AudioBuffer | null = null;
let loadingGoal = false;

async function loadGoalSound() {
  if (goalBuffer || loadingGoal) return;
  loadingGoal = true;
  try {
    const response = await fetch('/sounds/goal.mp3');
    if (!response.ok) throw new Error('goal.mp3 not found');
    const arrayBuffer = await response.arrayBuffer();
    if (audioCtx) {
      goalBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    }
  } catch {
    // Sound unavailable — game continues silently
  } finally {
    loadingGoal = false;
  }
}

export function useSound() {
  const initialized = useRef(false);

  /**
   * Must be called once from a user gesture handler (e.g. "Start Draft" button).
   * Creates the AudioContext and pre-loads sound assets.
   */
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
    if (!audioCtx || !goalBuffer) return;
    try {
      const source = audioCtx.createBufferSource();
      source.buffer = goalBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
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
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignore
    }
  }, []);

  /** Short UI click beep */
  const playClick = useCallback(() => playTone(880, 0.08), [playTone]);

  /** Card pick chime */
  const playPick = useCallback(() => {
    playTone(660, 0.1);
    setTimeout(() => playTone(880, 0.1), 80);
  }, [playTone]);

  return { initAudio, playGoal, playClick, playPick };
}
