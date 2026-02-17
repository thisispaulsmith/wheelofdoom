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

// Generate a short tick/click sound with variable pitch based on speed
function createTick(speed = 1.0) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Frequency varies with speed: slower = lower pitch (400Hz), faster = higher pitch (2000Hz)
  const frequency = 400 + (speed * 1600);
  oscillator.frequency.value = frequency;
  oscillator.type = 'square';

  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

// Generate countdown beep sound
function createCountdownBeep(beepNumber) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Higher pitched beeps: 1500Hz, 1700Hz, 1900Hz (increasing tension)
  const frequency = 1500 + (beepNumber * 200);
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);
}

// Generate heartbeat sound
function createHeartbeat() {
  const ctx = getAudioContext();

  const playBeat = (time) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 60; // Deep bass
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    oscillator.start(time);
    oscillator.stop(time + 0.2);
  };

  // Two beats (ba-dum) repeating every 1.2 seconds
  const beatInterval = 1.2;
  const totalBeats = 8; // ~10 seconds worth

  for (let i = 0; i < totalBeats; i++) {
    const time = ctx.currentTime + (i * beatInterval);
    playBeat(time); // First beat
    playBeat(time + 0.3); // Second beat (ba-dum)
  }
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
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gainNode.gain.setValueAtTime(0.15, startTime + note.duration - 0.05);
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
    gainNode.gain.setValueAtTime(0.05, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  }
}

export function useSound() {
  const drumrollRef = useRef(null);

  const playTick = useCallback((speed = 1.0) => {
    try {
      createTick(speed);
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

  const playCountdownBeep = useCallback((beepNumber) => {
    try {
      createCountdownBeep(beepNumber);
    } catch (e) {
      console.warn('Could not play countdown beep:', e);
    }
  }, []);

  const playHeartbeat = useCallback(() => {
    try {
      createHeartbeat();
    } catch (e) {
      console.warn('Could not play heartbeat:', e);
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    // Heartbeat stops naturally after scheduled beats complete
    // No explicit stop needed due to scheduled oscillators
  }, []);

  return { playTick, playDrumroll, stopDrumroll, playFanfare, playCountdownBeep, playHeartbeat, stopHeartbeat };
}
