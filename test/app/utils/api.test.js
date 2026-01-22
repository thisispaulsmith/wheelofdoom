import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEntries, addEntry, deleteEntry, fetchResults, saveResult } from '../../../src/app/src/utils/api';

describe('API utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchEntries', () => {
    it('fetches entries successfully', async () => {
      const mockEntries = [{ name: 'Alice' }, { name: 'Bob' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntries),
      });

      const result = await fetchEntries();
      expect(result).toEqual(mockEntries);
      expect(fetch).toHaveBeenCalledWith('/api/entries');
    });

    it('throws error on failure', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      await expect(fetchEntries()).rejects.toThrow('Failed to fetch entries');
    });
  });

  describe('addEntry', () => {
    it('adds entry successfully', async () => {
      const mockEntry = { name: 'Alice', addedBy: 'user1' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntry),
      });

      const result = await addEntry('Alice');
      expect(result).toEqual(mockEntry);
      expect(fetch).toHaveBeenCalledWith('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice' }),
      });
    });

    it('throws error on failure', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      await expect(addEntry('Alice')).rejects.toThrow('Failed to add entry');
    });
  });

  describe('deleteEntry', () => {
    it('deletes entry successfully', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await deleteEntry('Alice');
      expect(fetch).toHaveBeenCalledWith('/api/entries/Alice', {
        method: 'DELETE',
      });
    });

    it('encodes name in URL', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      await deleteEntry('John Doe');
      expect(fetch).toHaveBeenCalledWith('/api/entries/John%20Doe', {
        method: 'DELETE',
      });
    });

    it('does not throw on 404', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(deleteEntry('Alice')).resolves.not.toThrow();
    });

    it('throws error on other failures', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(deleteEntry('Alice')).rejects.toThrow('Failed to delete entry');
    });
  });

  describe('fetchResults', () => {
    it('fetches results successfully', async () => {
      const mockResults = [{ selectedName: 'Alice', spunBy: 'user1' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await fetchResults();
      expect(result).toEqual(mockResults);
      expect(fetch).toHaveBeenCalledWith('/api/results');
    });

    it('throws error on failure', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      await expect(fetchResults()).rejects.toThrow('Failed to fetch results');
    });
  });

  describe('saveResult', () => {
    it('saves result successfully', async () => {
      const mockResult = { selectedName: 'Alice', spunBy: 'user1' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await saveResult('Alice');
      expect(result).toEqual(mockResult);
      expect(fetch).toHaveBeenCalledWith('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice' }),
      });
    });

    it('throws error on failure', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      await expect(saveResult('Alice')).rejects.toThrow('Failed to save result');
    });
  });
});
