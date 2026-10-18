import { useCallback, useEffect, useState } from 'react';

// Charge une URL JSON puis la recharge à intervalle régulier
export function usePolling(url, interval) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, interval);
    return () => clearInterval(id);
  }, [reload, interval]);

  return { data, error, loading, reload };
}
