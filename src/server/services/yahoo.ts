/**
 * Yahoo Finance Service
 *
 * Wrapper around yahoo-finance2 library for fetching stock market data.
 * Provides functions for quotes, historical prices, search, and dividends.
 *
 * All functions handle errors gracefully and return null/empty arrays on failure.
 * Includes circuit breaker pattern to prevent cascading failures when Yahoo API is down.
 *
 * @module services/yahoo
 */

import YahooFinance from 'yahoo-finance2';

/** Yahoo Finance client with survey notices suppressed */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Circuit Breaker for Yahoo Finance API
 *
 * Prevents repeated calls to a failing service, allowing it time to recover.
 * States: CLOSED (normal), OPEN (blocking calls), HALF_OPEN (testing recovery)
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  /** Number of failures before opening circuit */
  private readonly failureThreshold = 5;
  /** Time in ms to wait before attempting recovery */
  private readonly resetTimeout = 30000; // 30 seconds

  /**
   * Check if circuit allows requests
   */
  isOpen(): boolean {
    if (this.state === 'CLOSED') return false;

    // Check if enough time has passed to try again
    if (Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.state = 'HALF_OPEN';
      return false;
    }

    return true;
  }

  /**
   * Record a successful call - resets the circuit
   */
  onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  /**
   * Record a failed call - may open the circuit
   */
  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker OPEN: Yahoo Finance API has failed ${this.failures} times`);
    }
  }

  /**
   * Get current circuit state for monitoring
   */
  getState(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
    };
  }
}

/** Global circuit breaker instance for Yahoo Finance */
const circuitBreaker = new CircuitBreaker();

/**
 * Simple TTL Cache for stock quotes
 *
 * Caches quotes for a configurable duration to reduce API calls.
 * During market hours, quotes are cached for 1 minute.
 * Outside market hours, quotes are cached for 5 minutes.
 */
class QuoteCache {
  private cache = new Map<string, { quote: Quote; timestamp: number }>();

  /** Cache TTL during market hours (1 minute) */
  private readonly marketHoursTTL = 60 * 1000;
  /** Cache TTL outside market hours (5 minutes) */
  private readonly offHoursTTL = 5 * 60 * 1000;

  /**
   * Check if US market is likely open (rough approximation)
   * Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
   */
  private isMarketHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();

    // Skip weekends
    if (day === 0 || day === 6) return false;

    // US market hours in UTC: roughly 14:30 - 21:00
    return utcHour >= 14 && utcHour < 21;
  }

  private getTTL(): number {
    return this.isMarketHours() ? this.marketHoursTTL : this.offHoursTTL;
  }

  /**
   * Get cached quote if valid
   */
  get(symbol: string): Quote | null {
    const entry = this.cache.get(symbol.toUpperCase());
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.getTTL()) {
      this.cache.delete(symbol.toUpperCase());
      return null;
    }

    return entry.quote;
  }

  /**
   * Cache a quote
   */
  set(symbol: string, quote: Quote): void {
    this.cache.set(symbol.toUpperCase(), {
      quote,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache stats for monitoring
   */
  getStats(): { size: number; ttl: number; isMarketHours: boolean } {
    return {
      size: this.cache.size,
      ttl: this.getTTL(),
      isMarketHours: this.isMarketHours(),
    };
  }

  /**
   * Clear all cached quotes
   */
  clear(): void {
    this.cache.clear();
  }
}

/** Global quote cache instance */
const quoteCache = new QuoteCache();

/**
 * Stock quote with market data
 */
export interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
}

/**
 * Historical price data point (OHLCV)
 */
export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Adjusted close price (accounts for splits/dividends) */
  adjClose: number;
}

/**
 * Stock search result
 */
export interface SearchResult {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange: string;
  /** EQUITY or ETF */
  quoteType: string;
}

/**
 * Get current quote for a stock symbol.
 *
 * @param symbol - Stock ticker symbol (e.g., 'AAPL', 'MSFT')
 * @returns Quote data or null if symbol not found or error
 *
 * @example
 * ```typescript
 * const quote = await getQuote('AAPL');
 * if (quote) {
 *   console.log(`${quote.shortName}: $${quote.regularMarketPrice}`);
 * }
 * ```
 */
export async function getQuote(symbol: string): Promise<Quote | null> {
  // Check cache first
  const cached = quoteCache.get(symbol);
  if (cached) {
    return cached;
  }

  // Check circuit breaker before making request
  if (circuitBreaker.isOpen()) {
    console.warn(`Circuit breaker OPEN: Skipping Yahoo Finance call for ${symbol}`);
    return null;
  }

  try {
    const result = await yahooFinance.quote(symbol);
    if (!result) return null;

    // Success - reset circuit breaker
    circuitBreaker.onSuccess();

    const quote: Quote = {
      symbol: result.symbol,
      shortName: result.shortName || result.symbol,
      longName: result.longName,
      regularMarketPrice: result.regularMarketPrice || 0,
      regularMarketChange: result.regularMarketChange || 0,
      regularMarketChangePercent: result.regularMarketChangePercent || 0,
      regularMarketPreviousClose: result.regularMarketPreviousClose || 0,
      regularMarketOpen: result.regularMarketOpen,
      regularMarketDayHigh: result.regularMarketDayHigh,
      regularMarketDayLow: result.regularMarketDayLow,
      regularMarketVolume: result.regularMarketVolume,
      marketCap: result.marketCap,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow,
      currency: result.currency,
    };

    // Cache the successful result
    quoteCache.set(symbol, quote);

    return quote;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    circuitBreaker.onFailure();
    return null;
  }
}

/**
 * Get quotes for multiple symbols in parallel.
 *
 * @param symbols - Array of stock ticker symbols
 * @returns Map of symbol -> Quote (symbols with errors are omitted)
 *
 * @example
 * ```typescript
 * const quotes = await getMultipleQuotes(['AAPL', 'MSFT', 'GOOGL']);
 * for (const [symbol, quote] of quotes) {
 *   console.log(`${symbol}: $${quote.regularMarketPrice}`);
 * }
 * ```
 */
export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const quotes = new Map<string, Quote>();

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await getQuote(symbol);
        return { symbol, quote };
      })
    );

    for (const { symbol, quote } of results) {
      if (quote) {
        quotes.set(symbol, quote);
      }
    }
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
  }

  return quotes;
}

/**
 * Get historical price data for a symbol.
 *
 * @param symbol - Stock ticker symbol
 * @param period1 - Start date
 * @param period2 - End date (defaults to today)
 * @param interval - Data interval: '1d' (daily), '1wk' (weekly), '1mo' (monthly)
 * @returns Array of historical prices, empty array on error
 *
 * @example
 * ```typescript
 * const oneYearAgo = new Date();
 * oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
 * const history = await getHistoricalPrices('AAPL', oneYearAgo);
 * ```
 */
export async function getHistoricalPrices(
  symbol: string,
  period1: Date,
  period2: Date = new Date(),
  interval: '1d' | '1wk' | '1mo' = '1d'
): Promise<HistoricalPrice[]> {
  if (circuitBreaker.isOpen()) {
    console.warn(`Circuit breaker OPEN: Skipping historical prices for ${symbol}`);
    return [];
  }

  try {
    const result = await yahooFinance.historical(symbol, {
      period1,
      period2,
      interval,
    });

    circuitBreaker.onSuccess();

    return result.map((item) => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      adjClose: item.adjClose || item.close,
    }));
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    circuitBreaker.onFailure();
    return [];
  }
}

/**
 * Search for stocks by name or symbol.
 *
 * Returns up to 10 results, filtered to EQUITY and ETF types only.
 *
 * @param query - Search query (company name or symbol)
 * @returns Array of search results, empty array on error
 *
 * @example
 * ```typescript
 * const results = await searchStocks('Apple');
 * // [{ symbol: 'AAPL', shortname: 'Apple Inc.', ... }]
 * ```
 */
export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (circuitBreaker.isOpen()) {
    console.warn(`Circuit breaker OPEN: Skipping stock search for "${query}"`);
    return [];
  }

  try {
    const result = await yahooFinance.search(query, { quotesCount: 10 });

    circuitBreaker.onSuccess();

    return (result.quotes || [])
      .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q: any) => ({
        symbol: q.symbol,
        shortname: q.shortname || q.symbol,
        longname: q.longname,
        exchange: q.exchange || '',
        quoteType: q.quoteType || 'EQUITY',
      }));
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    circuitBreaker.onFailure();
    return [];
  }
}

/**
 * Get dividend payment history for a symbol.
 *
 * Returns dividend payments from the last 5 years.
 *
 * @param symbol - Stock ticker symbol
 * @returns Array of dividend payments with dates, empty array on error
 *
 * @example
 * ```typescript
 * const dividends = await getDividendHistory('AAPL');
 * for (const div of dividends) {
 *   console.log(`${div.date}: $${div.dividends}`);
 * }
 * ```
 */
export async function getDividendHistory(symbol: string): Promise<{ date: Date; dividends: number }[]> {
  if (circuitBreaker.isOpen()) {
    console.warn(`Circuit breaker OPEN: Skipping dividend history for ${symbol}`);
    return [];
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years

    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      events: 'dividends',
    });

    circuitBreaker.onSuccess();

    return result.map((item: any) => ({
      date: item.date,
      dividends: item.dividends || 0,
    })).filter((item: any) => item.dividends > 0);
  } catch (error) {
    console.error(`Error fetching dividend history for ${symbol}:`, error);
    circuitBreaker.onFailure();
    return [];
  }
}

/**
 * Get current circuit breaker state for monitoring.
 * Useful for health checks and debugging.
 */
export function getCircuitBreakerState(): { state: string; failures: number; lastFailure: number } {
  return circuitBreaker.getState();
}

/**
 * Get quote cache statistics for monitoring.
 * Useful for debugging and performance analysis.
 */
export function getQuoteCacheStats(): { size: number; ttl: number; isMarketHours: boolean } {
  return quoteCache.getStats();
}

/**
 * Clear the quote cache.
 * Useful for forcing fresh data or during testing.
 */
export function clearQuoteCache(): void {
  quoteCache.clear();
}
