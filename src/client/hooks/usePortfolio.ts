import { useState, useEffect, useCallback, useRef } from 'react';
import { portfolioApi, PortfolioSummary } from '../lib/api';

export function usePortfolio(refreshInterval = 60000) {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchPortfolio = useCallback(async (isManualRefresh = false) => {
    try {
      setError(null);
      if (isManualRefresh) {
        setRefreshing(true);
      }
      const data = await portfolioApi.getSummary();
      setPortfolio(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchPortfolio(true);
  }, [fetchPortfolio]);

  // Start/stop interval based on visibility
  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => fetchPortfolio(false), refreshInterval);
  }, [fetchPortfolio, refreshInterval]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchPortfolio(false);

    // Start auto-refresh
    startInterval();

    // Handle visibility change - pause when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Refresh immediately when tab becomes visible, then restart interval
        fetchPortfolio(false);
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPortfolio, startInterval, stopInterval]);

  return { portfolio, loading, refreshing, error, lastUpdated, refresh };
}
