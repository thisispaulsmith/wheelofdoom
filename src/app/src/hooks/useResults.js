import { useState, useEffect, useCallback } from 'react';
import { fetchResults, saveResult as apiSaveResult } from '../utils/api';

export function useResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchResults();
      setResults(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const saveResult = async (name) => {
    try {
      const result = await apiSaveResult(name);
      await loadResults();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { results, loading, error, saveResult, refresh: loadResults };
}
