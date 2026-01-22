import { useState, useEffect, useCallback } from 'react';
import { quotesApi, Quote, HistoricalPrice, SearchResult } from '../lib/api';

export function useQuote(symbol: string | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setQuote(null);
      return;
    }

    async function fetchQuote() {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const data = await quotesApi.get(symbol);
        setQuote(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [symbol]);

  return { quote, loading, error };
}

export function useHistoricalPrices(symbol: string | null, period = '1y', interval = '1d') {
  const [history, setHistory] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setHistory([]);
      return;
    }

    async function fetchHistory() {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const data = await quotesApi.getHistory(symbol, period, interval);
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [symbol, period, interval]);

  return { history, loading, error };
}

export function useStockSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await quotesApi.search(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
