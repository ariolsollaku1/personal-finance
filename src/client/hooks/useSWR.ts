import { useState, useEffect, useRef, useCallback } from 'react';
import { getCache, setCache } from '../lib/apiCache';

interface SWRResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>
): SWRResult<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(() => {
    if (!key) return null;
    return getCache<T>(key);
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (!key) return false;
    return getCache(key) === null;
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(
    (k: string, isRevalidation = false) => {
      // Use refreshing (not loading) when we already have data in React state,
      // even if localStorage cache was cleared by invalidateCache()
      const hasCached = isRevalidation || getCache(k) !== null;
      if (hasCached) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let cancelled = false;

      fetcherRef
        .current()
        .then((result) => {
          if (cancelled) return;
          setData(result);
          setCache(k, result);
        })
        .catch(() => {
          // keep stale data on error
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
          setRefreshing(false);
        });

      return () => {
        cancelled = true;
      };
    },
    [] // fetcherRef is stable
  );

  // Main effect: run on key change
  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Sync read from cache for new key
    const cached = getCache<T>(key);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setData(null);
    }

    return fetch(key);
  }, [key, fetch]);

  // Listen for cache invalidation events
  useEffect(() => {
    if (!key) return;

    const handler = (e: Event) => {
      const { prefixes } = (e as CustomEvent<{ prefixes: string[] }>).detail;
      if (prefixes.some((p) => key.startsWith(p))) {
        // Pass isRevalidation=true so we use refreshing (not loading/skeleton)
        // since we still have data in React state even though localStorage was cleared
        fetch(key, true);
      }
    };

    window.addEventListener('cache:invalidated', handler);
    return () => window.removeEventListener('cache:invalidated', handler);
  }, [key, fetch]);

  const refresh = useCallback(() => {
    if (key) fetch(key);
  }, [key, fetch]);

  return { data, loading, refreshing, refresh };
}
