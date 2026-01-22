import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange: string;
  quoteType: string;
}

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
