import { useState, useEffect, useCallback } from 'react';
import { fetchEntries, addEntry as apiAddEntry, deleteEntry as apiDeleteEntry } from '../utils/api';

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
    try {
      await apiAddEntry(name);
      await loadEntries();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteEntry = async (name) => {
    try {
      await apiDeleteEntry(name);
      await loadEntries();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { entries, loading, error, addEntry, deleteEntry, refresh: loadEntries };
}
