import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Results } from '../../../src/app/src/components/Results';

describe('Results', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockResults = [
    { selectedName: 'Alice', spunBy: 'user1', spunAt: '2026-01-22T11:58:00Z' },
    { selectedName: 'Bob', spunBy: 'user2', spunAt: '2026-01-22T10:00:00Z' },
    { selectedName: 'Charlie', spunBy: 'anonymous', spunAt: '2026-01-21T12:00:00Z' },
  ];

  it('renders header', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('Recent Results')).toBeInTheDocument();
  });

  it('renders all results', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { container } = render(<Results results={[]} loading={true} />);
    expect(container.querySelector('.skeleton-loader-result')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<Results results={[]} />);
    expect(screen.getByText('No spins yet. Give it a whirl!')).toBeInTheDocument();
  });

  it('formats time as minutes ago', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('2 mins ago')).toBeInTheDocument();
  });

  it('formats time as hours ago', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('formats time as days ago', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });

  it('shows who spun for non-anonymous users', () => {
    render(<Results results={mockResults} />);
    expect(screen.getByText('by user1')).toBeInTheDocument();
    expect(screen.getByText('by user2')).toBeInTheDocument();
  });

  it('does not show who spun for anonymous users', () => {
    render(<Results results={mockResults} />);
    expect(screen.queryByText('by anonymous')).not.toBeInTheDocument();
  });

  it('limits display to 10 results', () => {
    const manyResults = Array.from({ length: 15 }, (_, i) => ({
      selectedName: `Person${i}`,
      spunBy: 'user',
      spunAt: '2026-01-22T11:00:00Z',
    }));
    render(<Results results={manyResults} />);

    expect(screen.getByText('Person0')).toBeInTheDocument();
    expect(screen.getByText('Person9')).toBeInTheDocument();
    expect(screen.queryByText('Person10')).not.toBeInTheDocument();
  });
});
