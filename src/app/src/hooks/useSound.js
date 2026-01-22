import { useRef, useCallback } from 'react';

// Web Audio API context (shared across all sounds)
let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Generate a short tick/click sound
function createTick() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = 1200;
  oscillator.type = 'square';

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

// Generate a drumroll sound (rapid repeating hits)
function createDrumroll(durationSeconds = 5) {
  const ctx = getAudioContext();
  const endTime = ctx.currentTime + durationSeconds;

  const intervals = [];
  let time = ctx.currentTime;
  let interval = 0.1; // Start slow

  while (time < endTime) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Low frequency rumble
    oscillator.frequency.value = 80 + Math.random() * 40;
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(0.2, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    oscillator.start(time);
    oscillator.stop(time + 0.08);

    intervals.push({ oscillator, gainNode });

    // Speed up over time for building tension
    interval = Math.max(0.03, interval * 0.95);
    time += interval;
  }

  return intervals;
}

// Generate a fanfare/celebration sound
function createFanfare() {
  const ctx = getAudioContext();

  // Triumphant chord progression
  const notes = [
    { freq: 523.25, start: 0, duration: 0.15 },     // C5
    { freq: 659.25, start: 0.1, duration: 0.15 },   // E5
    { freq: 783.99, start: 0.2, duration: 0.15 },   // G5
    { freq: 1046.50, start: 0.3, duration: 0.4 },   // C6 (hold)
    { freq: 783.99, start: 0.3, duration: 0.4 },    // G5 (harmony)
    { freq: 659.25, start: 0.3, duration: 0.4 },    // E5 (harmony)
  ];

  notes.forEach(note => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = note.freq;
    oscillator.type = 'sine';

    const startTime = ctx.currentTime + note.start;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
    gainNode.gain.setValueAtTime(0.3, startTime + note.duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
  });

  // Add a little sparkle
  for (let i = 0; i < 5; i++) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 2000 + Math.random() * 2000;
    oscillator.type = 'sine';

    const startTime = ctx.currentTime + 0.4 + i * 0.08;
    gainNode.gain.setValueAtTime(0.1, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  }
}

export function useSound() {
  const drumrollRef = useRef(null);

  const playTick = useCallback(() => {
    try {
      createTick();
    } catch (e) {
      console.warn('Could not play tick sound:', e);
    }
  }, []);

  const playDrumroll = useCallback(() => {
    try {
      drumrollRef.current = createDrumroll(7);
    } catch (e) {
      console.warn('Could not play drumroll:', e);
    }
  }, []);

  const stopDrumroll = useCallback(() => {
    // Drumroll auto-stops, but we can clear the reference
    drumrollRef.current = null;
  }, []);

  const playFanfare = useCallback(() => {
    try {
      createFanfare();
    } catch (e) {
      console.warn('Could not play fanfare:', e);
    }
  }, []);

  return { playTick, playDrumroll, stopDrumroll, playFanfare };
}
