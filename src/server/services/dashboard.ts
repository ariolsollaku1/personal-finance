import {
  holdingsQueries,
  recurringQueries,
  settingsQueries,
  batchQueries,
  Currency,
  Holding,
} from '../db/queries.js';
import { getMultipleQuotes } from './yahoo.js';
import { convertToMainCurrency, getExchangeRates, ExchangeRates } from './currency.js';
import { getAggregatedPortfolio, PortfolioSummary } from './portfolio.js';

export interface AccountSummary {
  id: number;
  name: string;
  type: string;
  currency: Currency;
  balance: number;
  balanceInMainCurrency: number;
}

export interface TypeSummary {
  count: number;
  total: number;
  owed?: number; // For credit cards
}

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

export interface DashboardData {
  mainCurrency: Currency;
  totalNetWorth: number;
  byType: {
    bank: TypeSummary;
    cash: TypeSummary;
    stock: TypeSummary;
    loan: TypeSummary;
    credit: TypeSummary & { owed: number };
    asset: TypeSummary;
  };
  stockPortfolio: PortfolioSummary;
  accounts: AccountSummary[];
  dueRecurring: DueRecurring[];
  recentTransactions: RecentTransaction[];
  exchangeRates: ExchangeRates;
}

/**
 * Get aggregated dashboard data using batch queries (no N+1)
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
  const uniqueSymbols = [...new Set(allHoldings.map(h => h.symbol))];
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
  const dueRecurring: DueRecurring[] = dueRecurringRaw.map((r) => ({
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
  const recentTransactions: RecentTransaction[] = recentTxRaw.map((tx) => ({
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
