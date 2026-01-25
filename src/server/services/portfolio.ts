/**
 * Portfolio Service
 *
 * Calculates stock portfolio metrics with live market prices from Yahoo Finance.
 * Provides both per-account portfolio details and aggregated portfolio summary.
 *
 * Key calculations:
 * - Market Value: shares × current price
 * - Cost Basis: shares × average cost
 * - Gain/Loss: market value - cost basis
 * - Day Change: price change × shares
 *
 * @module services/portfolio
 */

import {
  accountQueries,
  holdingsQueries,
  Holding,
} from '../db/queries.js';
import { getMultipleQuotes, Quote } from './yahoo.js';
import { roundCurrency } from './currency.js';

/**
 * Stock holding enriched with live quote data and calculated metrics
 */
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

/**
 * Complete portfolio data for a single stock account
 */
export interface AccountPortfolio {
  /** Cash balance in the account (not invested) */
  cashBalance: number;
  /** Total market value of all holdings */
  totalValue: number;
  /** Total cost basis of all holdings */
  totalCost: number;
  /** Total unrealized gain/loss */
  totalGain: number;
  /** Total gain as percentage of cost */
  totalGainPercent: number;
  /** Total change in value today */
  dayChange: number;
  /** Day change as percentage */
  dayChangePercent: number;
  /** Individual holdings with live quotes */
  holdings: HoldingWithQuote[];
}

/**
 * Aggregated portfolio summary across all stock accounts
 */
export interface PortfolioSummary {
  /** Total market value across all holdings */
  totalValue: number;
  /** Total cost basis across all holdings */
  totalCost: number;
  /** Total unrealized gain/loss */
  totalGain: number;
  /** Total gain as percentage */
  totalGainPercent: number;
  /** Total change today */
  dayChange: number;
  /** Day change as percentage */
  dayChangePercent: number;
  /** Number of individual holdings */
  holdingsCount: number;
}

/**
 * Calculate metrics for a single holding given its quote data.
 *
 * @param holding - Database holding record
 * @param quote - Live quote from Yahoo Finance (optional)
 * @returns Holding with all calculated metrics
 *
 * @remarks
 * If quote is unavailable, currentPrice is set to 0 and gains will be negative.
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
 * Get detailed portfolio for a specific stock account.
 *
 * Fetches live prices for all holdings and calculates portfolio metrics.
 * Returns null for non-stock accounts.
 *
 * @param userId - Supabase user UUID
 * @param accountId - Stock account ID
 * @returns Portfolio with holdings and metrics, or null if not a stock account
 *
 * @example
 * ```typescript
 * const portfolio = await getAccountPortfolio(userId, stockAccountId);
 * if (portfolio) {
 *   console.log(`Total Value: $${portfolio.totalValue}`);
 *   console.log(`Day Change: ${portfolio.dayChangePercent}%`);
 * }
 * ```
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
 * Get aggregated portfolio across all stock accounts.
 *
 * Combines holdings from all stock accounts and calculates total portfolio metrics.
 * Used for dashboard display to show overall stock exposure.
 *
 * @param userId - Supabase user UUID
 * @returns Aggregated portfolio summary
 *
 * @remarks
 * Holdings with the same symbol across different accounts are NOT merged -
 * they contribute separately to totals.
 *
 * @example
 * ```typescript
 * const portfolio = await getAggregatedPortfolio(userId);
 * console.log(`Total stocks value: $${portfolio.totalValue}`);
 * console.log(`Holdings: ${portfolio.holdingsCount}`);
 * ```
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
 * Get quotes map for all holdings across all stock accounts.
 *
 * Useful when the caller needs both portfolio metrics and raw quote data
 * for additional calculations or display.
 *
 * @param userId - Supabase user UUID
 * @returns Map of symbol -> Quote for all held symbols
 *
 * @example
 * ```typescript
 * const quotes = await getPortfolioQuotes(userId);
 * const appleQuote = quotes.get('AAPL');
 * if (appleQuote) {
 *   console.log(`AAPL: $${appleQuote.regularMarketPrice}`);
 * }
 * ```
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
