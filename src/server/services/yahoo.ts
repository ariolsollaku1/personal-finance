/**
 * Yahoo Finance Service
 *
 * Wrapper around yahoo-finance2 library for fetching stock market data.
 * Provides functions for quotes, historical prices, search, and dividends.
 *
 * All functions handle errors gracefully and return null/empty arrays on failure.
 *
 * @module services/yahoo
 */

import YahooFinance from 'yahoo-finance2';

/** Yahoo Finance client with survey notices suppressed */
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result) return null;

    return {
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
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
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
  try {
    const result = await yahooFinance.historical(symbol, {
      period1,
      period2,
      interval,
    });

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
  try {
    const result = await yahooFinance.search(query, { quotesCount: 10 });

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
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years

    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      events: 'dividends',
    });

    return result.map((item: any) => ({
      date: item.date,
      dividends: item.dividends || 0,
    })).filter((item: any) => item.dividends > 0);
  } catch (error) {
    console.error(`Error fetching dividend history for ${symbol}:`, error);
    return [];
  }
}
