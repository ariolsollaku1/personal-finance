import {
  accountQueries,
  holdingsQueries,
  Holding,
} from '../db/queries.js';
import { getMultipleQuotes, Quote } from './yahoo.js';
import { roundCurrency } from './currency.js';

export interface HoldingWithQuote {
  id: number;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  name: string;
}

export interface AccountPortfolio {
  cashBalance: number;
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: HoldingWithQuote[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

/**
 * Calculate holding metrics given a holding and its quote
 */
function calculateHoldingMetrics(
  holding: Holding,
  quote: Quote | undefined
): HoldingWithQuote {
  const currentPrice = quote?.regularMarketPrice || 0;
  const shares = Number(holding.shares);
  const avgCost = Number(holding.avg_cost);
  const marketValue = shares * currentPrice;
  const costBasis = shares * avgCost;
  const gain = marketValue - costBasis;
  const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
  const dayChange = (quote?.regularMarketChange || 0) * shares;
  const dayChangePercent = quote?.regularMarketChangePercent || 0;

  return {
    id: holding.id,
    symbol: holding.symbol,
    shares,
    avgCost,
    currentPrice,
    marketValue,
    costBasis,
    gain,
    gainPercent,
    dayChange,
    dayChangePercent,
    name: quote?.shortName || holding.symbol,
  };
}

/**
 * Get portfolio for a specific stock account with live prices
 */
export async function getAccountPortfolio(
  userId: string,
  accountId: number
): Promise<AccountPortfolio | null> {
  const account = await accountQueries.getById(userId, accountId);
  if (!account || account.type !== 'stock') {
    return null;
  }

  // Get cash balance
  const balanceInfo = await accountQueries.getBalance(userId, accountId);
  const cashBalance = balanceInfo?.balance || 0;

  const holdings = await holdingsQueries.getByAccount(userId, accountId);

  if (holdings.length === 0) {
    return {
      cashBalance: roundCurrency(cashBalance),
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdings: [],
    };
  }

  const symbols = holdings.map((h) => h.symbol);
  const quotes = await getMultipleQuotes(symbols);

  let totalValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;

  const holdingsWithQuotes = holdings.map((holding) => {
    const quote = quotes.get(holding.symbol);
    const metrics = calculateHoldingMetrics(holding, quote);

    totalValue += metrics.marketValue;
    totalCost += metrics.costBasis;
    totalDayChange += metrics.dayChange;

    return metrics;
  });

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const dayChangePercent = totalValue > 0 && totalValue !== totalDayChange
    ? (totalDayChange / (totalValue - totalDayChange)) * 100
    : 0;

  return {
    cashBalance: roundCurrency(cashBalance),
    totalValue: roundCurrency(totalValue),
    totalCost: roundCurrency(totalCost),
    totalGain: roundCurrency(totalGain),
    totalGainPercent: roundCurrency(totalGainPercent),
    dayChange: roundCurrency(totalDayChange),
    dayChangePercent: roundCurrency(dayChangePercent),
    holdings: holdingsWithQuotes,
  };
}

/**
 * Get aggregated portfolio across all stock accounts with live prices
 */
export async function getAggregatedPortfolio(
  userId: string
): Promise<PortfolioSummary> {
  const accounts = await accountQueries.getAll(userId);
  const stockAccounts = accounts.filter(a => a.type === 'stock');

  // Collect all holdings across all stock accounts
  const allHoldings: Array<{ symbol: string; shares: number; avg_cost: number; accountId: number }> = [];

  for (const account of stockAccounts) {
    const holdings = await holdingsQueries.getByAccount(userId, account.id);
    for (const holding of holdings) {
      allHoldings.push({
        symbol: holding.symbol,
        shares: Number(holding.shares),
        avg_cost: Number(holding.avg_cost),
        accountId: account.id,
      });
    }
  }

  if (allHoldings.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdingsCount: 0,
    };
  }

  // Get quotes for all unique symbols at once
  const uniqueSymbols = [...new Set(allHoldings.map(h => h.symbol))];
  const quotes = await getMultipleQuotes(uniqueSymbols);

  // Calculate portfolio totals
  let totalValue = 0;
  let totalCost = 0;
  let dayChange = 0;

  for (const holding of allHoldings) {
    const quote = quotes.get(holding.symbol);
    const currentPrice = quote?.regularMarketPrice || holding.avg_cost;
    const marketValue = holding.shares * currentPrice;
    const costBasis = holding.shares * holding.avg_cost;
    const holdingDayChange = (quote?.regularMarketChange || 0) * holding.shares;

    totalValue += marketValue;
    totalCost += costBasis;
    dayChange += holdingDayChange;
  }

  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const dayChangePercent = totalValue > 0 && totalValue !== dayChange
    ? (dayChange / (totalValue - dayChange)) * 100
    : 0;

  return {
    totalValue: roundCurrency(totalValue),
    totalCost: roundCurrency(totalCost),
    totalGain: roundCurrency(totalGain),
    totalGainPercent: roundCurrency(totalGainPercent),
    dayChange: roundCurrency(dayChange),
    dayChangePercent: roundCurrency(dayChangePercent),
    holdingsCount: allHoldings.length,
  };
}

/**
 * Get quotes map for all holdings in stock accounts
 * Useful when caller needs both portfolio metrics and quote data
 */
export async function getPortfolioQuotes(
  userId: string
): Promise<Map<string, Quote>> {
  const accounts = await accountQueries.getAll(userId);
  const stockAccounts = accounts.filter(a => a.type === 'stock');

  const allSymbols: string[] = [];
  for (const account of stockAccounts) {
    const holdings = await holdingsQueries.getByAccount(userId, account.id);
    allSymbols.push(...holdings.map(h => h.symbol));
  }

  const uniqueSymbols = [...new Set(allSymbols)];
  if (uniqueSymbols.length === 0) {
    return new Map();
  }

  return getMultipleQuotes(uniqueSymbols);
}
