import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntryList } from '../../../src/app/src/components/EntryList';

describe('EntryList', () => {
  const mockEntries = [
    { name: 'Alice', addedBy: 'user1' },
    { name: 'Bob', addedBy: 'user2' },
  ];

  it('renders entry count', () => {
    render(<EntryList entries={mockEntries} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders all entries', () => {
    render(<EntryList entries={mockEntries} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { container } = render(<EntryList entries={[]} loading={true} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(container.querySelector('.skeleton-loader-entry')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<EntryList entries={[]} onAdd={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No entries yet. Add some names!')).toBeInTheDocument();
  });

  it('calls onAdd when form is submitted', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={mockEntries} onAdd={onAdd} onDelete={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter a name...');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Charlie' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('Charlie');
    });
  });

  it('clears input after successful add', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={mockEntries} onAdd={onAdd} onDelete={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter a name...');
    fireEvent.change(input, { target: { value: 'Charlie' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does not call onAdd with empty input', () => {
    const onAdd = vi.fn();
    render(<EntryList entries={mockEntries} onAdd={onAdd} onDelete={vi.fn()} />);

    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={mockEntries} onAdd={vi.fn()} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByTitle('Remove');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('Alice');
    });
  });

  it('trims whitespace from input', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<EntryList entries={mockEntries} onAdd={onAdd} onDelete={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter a name...');
    fireEvent.change(input, { target: { value: '  Charlie  ' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('Charlie');
    });
  });
});
