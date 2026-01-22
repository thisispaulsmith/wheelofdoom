import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSound } from '../../../src/app/src/hooks/useSound';

describe('useSound', () => {
  it('returns sound functions', () => {
    const { result } = renderHook(() => useSound());

    expect(result.current.playTick).toBeInstanceOf(Function);
    expect(result.current.playDrumroll).toBeInstanceOf(Function);
    expect(result.current.stopDrumroll).toBeInstanceOf(Function);
    expect(result.current.playFanfare).toBeInstanceOf(Function);
  });

  it('playTick does not throw', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.playTick()).not.toThrow();
  });

  it('playDrumroll does not throw', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.playDrumroll()).not.toThrow();
  });

  it('stopDrumroll does not throw', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.stopDrumroll()).not.toThrow();
  });

  it('playFanfare does not throw', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.playFanfare()).not.toThrow();
  });

  it('handles AudioContext errors gracefully', () => {
    // Temporarily break AudioContext
    const originalAudioContext = global.AudioContext;
    global.AudioContext = class {
      constructor() {
        throw new Error('AudioContext not supported');
      }
    };

    const { result } = renderHook(() => useSound());

    // Should not throw, just log warning
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => result.current.playTick()).not.toThrow();
    consoleSpy.mockRestore();

    global.AudioContext = originalAudioContext;
  });
});
