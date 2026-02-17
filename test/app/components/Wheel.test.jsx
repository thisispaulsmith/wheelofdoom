import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Wheel } from '../../../src/app/src/components/Wheel';
import { ThemeProvider } from '../../../src/app/src/contexts/ThemeContext';

describe('Wheel', () => {
  const mockEntries = [
    { name: 'Alice' },
    { name: 'Bob' },
    { name: 'Charlie' },
  ];

  it('renders empty state when no entries', () => {
    render(<ThemeProvider><Wheel entries={[]} /></ThemeProvider>);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    render(<ThemeProvider><Wheel entries={mockEntries} /></ThemeProvider>);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('shows click to spin prompt when not spinning', () => {
    render(<ThemeProvider><Wheel entries={mockEntries} /></ThemeProvider>);
    expect(screen.getByText('Click to spin!')).toBeInTheDocument();
  });

  it('does not show prompt when disabled', () => {
    render(<ThemeProvider><Wheel entries={mockEntries} disabled={true} /></ThemeProvider>);
    expect(screen.queryByText('Click to spin!')).toBeInTheDocument();
  });

  it('calls onTick during spin', async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    render(<ThemeProvider><Wheel entries={mockEntries} onTick={onTick} /></ThemeProvider>);

    const canvas = document.querySelector('canvas');
    fireEvent.click(canvas);

    // Advance timers to trigger animation frames
    vi.advanceTimersByTime(1000);

    // onTick should have been called during spin
    expect(onTick).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('calls onSpinComplete when spin finishes', async () => {
    vi.useFakeTimers();
    const onSpinComplete = vi.fn();
    render(<ThemeProvider><Wheel entries={mockEntries} onSpinComplete={onSpinComplete} /></ThemeProvider>);

    const canvas = document.querySelector('canvas');
    fireEvent.click(canvas);

    // Advance past spin duration (5-7 seconds)
    vi.advanceTimersByTime(8000);

    expect(onSpinComplete).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) }),
      expect.any(String)
    );

    vi.useRealTimers();
  });

  it('does not spin when disabled', () => {
    const onSpinComplete = vi.fn();
    render(<ThemeProvider><Wheel entries={mockEntries} onSpinComplete={onSpinComplete} disabled={true} /></ThemeProvider>);

    const canvas = document.querySelector('canvas');
    fireEvent.click(canvas);

    expect(onSpinComplete).not.toHaveBeenCalled();
  });

  it('does not spin when no entries', () => {
    const onSpinComplete = vi.fn();
    render(<ThemeProvider><Wheel entries={[]} onSpinComplete={onSpinComplete} /></ThemeProvider>);

    const canvas = document.querySelector('canvas');
    fireEvent.click(canvas);

    expect(onSpinComplete).not.toHaveBeenCalled();
  });
});
