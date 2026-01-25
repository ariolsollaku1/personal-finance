/**
 * Dashboard Service
 *
 * Aggregates all financial data for the main dashboard view including:
 * - Total net worth across all accounts
 * - Stock portfolio with live prices
 * - Account summaries by type
 * - Due recurring transactions
 * - Recent transaction history
 *
 * Uses batch queries to efficiently fetch all data in minimal database calls.
 *
 * @module services/dashboard
 */

import {
  holdingsQueries,
  recurringQueries,
  settingsQueries,
  batchQueries,
  Currency,
  Holding,
  RecurringTransaction,
  TransactionType,
} from '../db/queries.js';
import { getMultipleQuotes } from './yahoo.js';
import { convertToMainCurrency, getExchangeRates, ExchangeRates } from './currency.js';
import { getAggregatedPortfolio, PortfolioSummary } from './portfolio.js';

/**
 * Summary information for a single account
 */
export interface AccountSummary {
  id: number;
  name: string;
  type: string;
  currency: Currency;
  balance: number;
  balanceInMainCurrency: number;
}

/**
 * Aggregated totals for an account type
 */
export interface TypeSummary {
  /** Number of accounts of this type */
  count: number;
  /** Total balance in main currency */
  total: number;
  /** Amount owed (for credit cards only) */
  owed?: number;
}

/**
 * Recent transaction for dashboard display
 */
export interface RecentTransaction {
  id: number;
  accountId: number;
  accountName: string;
  type: string;
  amount: number;
  currency: Currency;
  date: string;
  payee: string | null;
  category: string | null;
}

/**
 * Recurring transaction that is due (today or earlier)
 */
export interface DueRecurring {
  id: number;
  accountId: number;
  accountName: string;
  type: string;
  amount: number;
  currency: Currency;
  payee: string | null;
  category: string | null;
  frequency: string;
  nextDueDate: string;
}

/**
 * Complete dashboard data structure
 *
 * Contains all information needed to render the main dashboard view.
 */
export interface DashboardData {
  /** User's main currency setting */
  mainCurrency: Currency;
  /** Total net worth across all accounts in main currency */
  totalNetWorth: number;
  /** Totals grouped by account type */
  byType: {
    bank: TypeSummary;
    cash: TypeSummary;
    stock: TypeSummary;
    loan: TypeSummary;
    credit: TypeSummary & { owed: number };
    asset: TypeSummary;
  };
  /** Aggregated stock portfolio with live prices */
  stockPortfolio: PortfolioSummary;
  /** All accounts with balances */
  accounts: AccountSummary[];
  /** Recurring transactions due today or earlier */
  dueRecurring: DueRecurring[];
  /** Last 10 transactions across all accounts */
  recentTransactions: RecentTransaction[];
  /** Current exchange rates */
  exchangeRates: ExchangeRates;
}

/**
 * Get aggregated dashboard data for a user.
 *
 * Fetches all dashboard data using parallel batch queries for optimal performance:
 * 1. User settings (main currency)
 * 2. All accounts with transaction totals
 * 3. All holdings for stock valuation
 * 4. Stock portfolio with live prices
 * 5. Due recurring transactions
 * 6. Recent transactions
 * 7. Exchange rates
 *
 * Net worth calculation by account type:
 * - Bank/Cash/Stock: Balance adds to net worth
 * - Asset: Initial value adds to net worth
 * - Loan: Balance subtracts from net worth
 * - Credit: Amount owed (limit - available) subtracts
 *
 * @param userId - Supabase user UUID
 * @returns Complete dashboard data including net worth, portfolio, and transactions
 * @throws Error if database queries fail
 *
 * @example
 * ```typescript
 * const dashboard = await getDashboardData(userId);
 * console.log(`Net Worth: ${dashboard.totalNetWorth} ${dashboard.mainCurrency}`);
 * console.log(`Due payments: ${dashboard.dueRecurring.length}`);
 * ```
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  // Fetch all data in parallel using batch queries
  const [
    mainCurrency,
    accountsWithBalances,
    allHoldings,
    stockPortfolio,
    dueRecurringRaw,
    recentTxRaw,
    exchangeRates,
  ] = await Promise.all([
    settingsQueries.getMainCurrency(userId),
    batchQueries.getAllAccountsWithBalances(userId),
    holdingsQueries.getAll(userId),
    getAggregatedPortfolio(userId),
    recurringQueries.getDue(userId, new Date().toISOString().split('T')[0]),
    batchQueries.getRecentTransactions(userId, 10),
    getExchangeRates(),
  ]);

  // Group holdings by account_id
  const holdingsByAccount = new Map<number, Holding[]>();
  for (const holding of allHoldings) {
    const accountId = holding.account_id!;
    if (!holdingsByAccount.has(accountId)) {
      holdingsByAccount.set(accountId, []);
    }
    holdingsByAccount.get(accountId)!.push(holding);
  }

  // Get unique symbols for live quotes
  const uniqueSymbols: string[] = [...new Set(allHoldings.map((h: Holding) => h.symbol))];
  const quotes = uniqueSymbols.length > 0 ? await getMultipleQuotes(uniqueSymbols) : new Map();

  let totalNetWorth = 0;
  const accountSummaries: AccountSummary[] = [];

  const byType = {
    bank: { count: 0, total: 0 },
    cash: { count: 0, total: 0 },
    stock: { count: 0, total: 0 },
    loan: { count: 0, total: 0 },
    credit: { count: 0, total: 0, owed: 0 },
    asset: { count: 0, total: 0 },
  };

  // Calculate balance for each account
  for (const account of accountsWithBalances) {
    // Base balance from initial + transactions
    let balance = Number(account.initial_balance) + Number(account.transaction_total);

    if (account.type === 'stock') {
      // For stock accounts, calculate total value from holdings + cash balance
      const holdings = holdingsByAccount.get(account.id) || [];
      let stockValue = 0;
      for (const holding of holdings) {
        const quote = quotes.get(holding.symbol);
        if (quote) {
          stockValue += Number(holding.shares) * quote.regularMarketPrice;
        } else {
          stockValue += Number(holding.shares) * Number(holding.avg_cost);
        }
      }
      // Cash balance is already in transaction_total, so add stock value
      balance = stockValue + balance;
    }

    const balanceInMainCurrency = convertToMainCurrency(balance, account.currency, mainCurrency);

    accountSummaries.push({
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance,
      balanceInMainCurrency,
    });

    // Calculate net worth contribution based on account type
    if (account.type === 'loan') {
      totalNetWorth -= balanceInMainCurrency;
      byType.loan.count++;
      byType.loan.total += balanceInMainCurrency;
    } else if (account.type === 'credit') {
      const limitInMainCurrency = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
      const amountOwed = limitInMainCurrency - balanceInMainCurrency;
      totalNetWorth -= amountOwed;
      byType.credit.count++;
      byType.credit.total += limitInMainCurrency;
      byType.credit.owed += amountOwed;
    } else if (account.type === 'asset') {
      const assetValue = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
      totalNetWorth += assetValue;
      byType.asset.count++;
      byType.asset.total += assetValue;
    } else {
      totalNetWorth += balanceInMainCurrency;
      byType[account.type as keyof typeof byType].count++;
      (byType[account.type as keyof typeof byType] as { count: number; total: number }).total += balanceInMainCurrency;
    }
  }

  // Transform due recurring transactions
  type DueRecurringRow = RecurringTransaction & { account_name: string; account_currency: Currency };
  const dueRecurring: DueRecurring[] = dueRecurringRaw.map((r: DueRecurringRow) => ({
    id: r.id,
    accountId: r.account_id,
    accountName: r.account_name,
    type: r.type,
    amount: Number(r.amount),
    currency: r.account_currency,
    payee: r.payee_name || null,
    category: r.category_name || null,
    frequency: r.frequency,
    nextDueDate: r.next_due_date,
  }));

  // Transform recent transactions (already fetched with batch query)
  type RecentTxRow = {
    id: number;
    account_id: number;
    account_name: string;
    account_currency: Currency;
    type: TransactionType;
    amount: number;
    date: string;
    payee_name: string | null;
    category_name: string | null;
  };
  const recentTransactions: RecentTransaction[] = recentTxRaw.map((tx: RecentTxRow) => ({
    id: tx.id,
    accountId: tx.account_id,
    accountName: tx.account_name,
    type: tx.type,
    amount: Number(tx.amount),
    currency: tx.account_currency,
    date: tx.date,
    payee: tx.payee_name,
    category: tx.category_name,
  }));

  return {
    mainCurrency,
    totalNetWorth,
    byType,
    stockPortfolio,
    accounts: accountSummaries,
    dueRecurring,
    recentTransactions,
    exchangeRates,
  };
}
