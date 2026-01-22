import '@testing-library/jest-dom';

// Mock Web Audio API
class MockAudioContext {
  constructor() {
    this.state = 'running';
  }
  resume() {
    return Promise.resolve();
  }
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { value: 0 },
      type: 'sine',
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: {
        value: 0,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
  }
  get currentTime() {
    return 0;
  }
  get destination() {
    return {};
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock Canvas 2D context
class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
  }
  clearRect() {}
  beginPath() {}
  moveTo() {}
  arc() {}
  closePath() {}
  fill() {}
  stroke() {}
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  fillText() {}
  lineTo() {}
  set fillStyle(v) {}
  set strokeStyle(v) {}
  set lineWidth(v) {}
  set textAlign(v) {}
  set font(v) {}
}

// Mock HTMLCanvasElement.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    return new MockCanvasRenderingContext2D(this);
  }
  return originalGetContext?.call(this, contextType);
};

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock requestAnimationFrame
let rafId = 0;
global.requestAnimationFrame = (callback) => {
  rafId++;
  setTimeout(() => callback(Date.now()), 16);
  return rafId;
};

global.cancelAnimationFrame = (id) => {
  // No-op for tests
};
