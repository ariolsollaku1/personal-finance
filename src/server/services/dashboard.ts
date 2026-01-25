import {
  accountQueries,
  holdingsQueries,
  accountTransactionQueries,
  recurringQueries,
  settingsQueries,
  Currency,
} from '../db/queries.js';
import { getMultipleQuotes } from './yahoo.js';
import { convertToMainCurrency, getExchangeRates, EXCHANGE_RATES } from './currency.js';
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
  exchangeRates: typeof EXCHANGE_RATES;
}

/**
 * Get aggregated dashboard data
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const mainCurrency = await settingsQueries.getMainCurrency(userId);
  const accounts = await accountQueries.getAll(userId);

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

  // Get aggregated stock portfolio (with live prices)
  const stockPortfolio = await getAggregatedPortfolio(userId);

  // Get quotes for stock value calculations
  const stockAccounts = accounts.filter(a => a.type === 'stock');
  const allStockHoldings: Array<{ symbol: string; shares: number; avg_cost: number; accountId: number }> = [];

  for (const account of stockAccounts) {
    const holdings = await holdingsQueries.getByAccount(userId, account.id);
    for (const holding of holdings) {
      allStockHoldings.push({
        symbol: holding.symbol,
        shares: Number(holding.shares),
        avg_cost: Number(holding.avg_cost),
        accountId: account.id,
      });
    }
  }

  const uniqueSymbols = [...new Set(allStockHoldings.map(h => h.symbol))];
  const quotes = uniqueSymbols.length > 0 ? await getMultipleQuotes(uniqueSymbols) : new Map();

  // Calculate balance for each account
  for (const account of accounts) {
    let balance = Number(account.initial_balance);

    if (account.type === 'stock') {
      // For stock accounts, calculate total value from holdings + cash balance
      const holdings = await holdingsQueries.getByAccount(userId, account.id);
      let stockValue = 0;
      for (const holding of holdings) {
        const quote = quotes.get(holding.symbol);
        if (quote) {
          stockValue += Number(holding.shares) * quote.regularMarketPrice;
        } else {
          stockValue += Number(holding.shares) * Number(holding.avg_cost);
        }
      }
      // Also include cash balance from transactions
      let cashBalance = Number(account.initial_balance);
      const transactions = await accountTransactionQueries.getByAccount(userId, account.id);
      for (const tx of transactions) {
        if (tx.type === 'inflow') {
          cashBalance += Number(tx.amount);
        } else {
          cashBalance -= Number(tx.amount);
        }
      }
      balance = stockValue + cashBalance;
    } else {
      // For bank/cash accounts, calculate from transactions
      const transactions = await accountTransactionQueries.getByAccount(userId, account.id);
      for (const tx of transactions) {
        if (tx.type === 'inflow') {
          balance += Number(tx.amount);
        } else {
          balance -= Number(tx.amount);
        }
      }
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

  // Get due recurring transactions
  const today = new Date().toISOString().split('T')[0];
  const dueRecurringRaw = await recurringQueries.getDue(userId, today);
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

  // Get recent transactions
  const recentTransactions = await getRecentTransactions(userId, accounts, 10);

  return {
    mainCurrency,
    totalNetWorth,
    byType,
    stockPortfolio,
    accounts: accountSummaries,
    dueRecurring,
    recentTransactions,
    exchangeRates: getExchangeRates(),
  };
}

/**
 * Get recent transactions across all accounts
 */
export async function getRecentTransactions(
  userId: string,
  accounts: Awaited<ReturnType<typeof accountQueries.getAll>>,
  limit: number = 10
): Promise<RecentTransaction[]> {
  const recentTransactions: RecentTransaction[] = [];

  for (const account of accounts) {
    if (account.type !== 'stock') {
      const transactions = await accountTransactionQueries.getByAccount(userId, account.id);
      for (const tx of transactions.slice(0, 5)) {
        recentTransactions.push({
          id: tx.id,
          accountId: account.id,
          accountName: account.name,
          type: tx.type,
          amount: Number(tx.amount),
          currency: account.currency,
          date: tx.date,
          payee: tx.payee_name || null,
          category: tx.category_name || null,
        });
      }
    }
  }

  // Sort by date and take top N
  recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return recentTransactions.slice(0, limit);
}
