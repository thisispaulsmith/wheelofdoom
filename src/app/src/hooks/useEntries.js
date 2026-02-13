import { useState, useEffect, useCallback } from 'react';
import { fetchEntries, addEntry as apiAddEntry, deleteEntry as apiDeleteEntry } from '../utils/api';
import { trackEvent, trackException } from '../utils/telemetry';

export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchEntries();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addEntry = async (name) => {
    const startTime = Date.now();
    try {
      await apiAddEntry(name);
      await loadEntries();

      trackEvent('EntryAdded', {
        entryName: name,
        duration: Date.now() - startTime,
      });
    } catch (err) {
      setError(err.message);
      trackException(err, 3, { operation: 'addEntry', entryName: name });
      throw err;
    }
  };

  const deleteEntry = async (name) => {
    const startTime = Date.now();
    try {
      await apiDeleteEntry(name);
      await loadEntries();

      trackEvent('EntryDeleted', {
        entryName: name,
        duration: Date.now() - startTime,
      });
    } catch (err) {
      setError(err.message);
      trackException(err, 3, { operation: 'deleteEntry', entryName: name });
      throw err;
    }
  };

  return { entries, loading, error, addEntry, deleteEntry, refresh: loadEntries };
}
