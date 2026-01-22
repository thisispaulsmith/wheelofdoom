import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WinnerModal } from '../../../src/app/src/components/WinnerModal';

describe('WinnerModal', () => {
  const mockWinner = { name: 'Alice' };
  const mockMessage = 'The Wheel has spoken!';

  it('renders nothing when no winner', () => {
    const { container } = render(<WinnerModal winner={null} message="" onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders winner name', () => {
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders message', () => {
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={vi.fn()} />);
    expect(screen.getByText('The Wheel has spoken!')).toBeInTheDocument();
  });

  it('renders dismiss button', () => {
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={vi.fn()} />);
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onClose when dismiss button clicked', () => {
    const onClose = vi.fn();
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={onClose} />);

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={onClose} />);

    const overlay = document.querySelector('.winner-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when modal content clicked', () => {
    const onClose = vi.fn();
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={onClose} />);

    const modal = document.querySelector('.winner-modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders confetti pieces', () => {
    render(<WinnerModal winner={mockWinner} message={mockMessage} onClose={vi.fn()} />);

    const confettiPieces = document.querySelectorAll('.confetti-piece');
    expect(confettiPieces.length).toBe(50);
  });
});
