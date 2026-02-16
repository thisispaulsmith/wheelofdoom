import { useState, useEffect, useCallback } from 'react';
import { fetchUserInfo } from '../utils/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUserInfo();
      setUser(data);
      setError(null);
    } catch (err) {
      // Graceful fallback to anonymous for local dev
      setUser({ userDetails: 'anonymous', userRoles: [] });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return { user, loading, error };
}
