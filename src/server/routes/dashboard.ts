import { Router, Request, Response } from 'express';
import {
  accountQueries,
  holdingsQueries,
  accountTransactionQueries,
  recurringQueries,
  settingsQueries,
  Currency,
} from '../db/queries.js';
import { getMultipleQuotes } from '../services/yahoo.js';

const router = Router();

// Simple currency conversion rates (in production, these would come from an API)
// Rates are relative to ALL (Albanian Lek)
const EXCHANGE_RATES: Record<Currency, number> = {
  ALL: 1,
  EUR: 102.5, // 1 EUR = 102.5 ALL (approximate)
  USD: 95.0,  // 1 USD = 95 ALL (approximate)
};

function convertToMainCurrency(amount: number, fromCurrency: Currency, mainCurrency: Currency): number {
  if (fromCurrency === mainCurrency) return amount;

  // Convert to ALL first, then to main currency
  const amountInALL = amount * EXCHANGE_RATES[fromCurrency];
  return amountInALL / EXCHANGE_RATES[mainCurrency];
}

// GET /api/dashboard - Aggregated dashboard data
router.get('/', async (_req: Request, res: Response) => {
  try {
    const mainCurrency = await settingsQueries.getMainCurrency();
    const accounts = await accountQueries.getAll();

    let totalNetWorth = 0;
    const accountSummaries: {
      id: number;
      name: string;
      type: string;
      currency: Currency;
      balance: number;
      balanceInMainCurrency: number;
    }[] = [];

    const byType = {
      bank: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      stock: { count: 0, total: 0 },
      loan: { count: 0, total: 0 },
      credit: { count: 0, total: 0, owed: 0 },
      asset: { count: 0, total: 0 },
    };

    // Stock portfolio aggregation
    let stockPortfolio = {
      totalValue: 0,
      totalCost: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdingsCount: 0,
    };

    // Collect all stock holdings across all stock accounts
    const allStockHoldings: Array<{ symbol: string; shares: number; avg_cost: number; accountId: number }> = [];
    const stockAccounts = accounts.filter(a => a.type === 'stock');

    for (const account of stockAccounts) {
      const holdings = await holdingsQueries.getByAccount(account.id);
      for (const holding of holdings) {
        allStockHoldings.push({
          symbol: holding.symbol,
          shares: Number(holding.shares),
          avg_cost: Number(holding.avg_cost),
          accountId: account.id,
        });
      }
    }

    // Get quotes for all unique symbols at once
    const uniqueSymbols = [...new Set(allStockHoldings.map(h => h.symbol))];
    const quotes = uniqueSymbols.length > 0 ? await getMultipleQuotes(uniqueSymbols) : new Map();

    // Calculate stock portfolio totals
    for (const holding of allStockHoldings) {
      const quote = quotes.get(holding.symbol);
      const currentPrice = quote?.regularMarketPrice || holding.avg_cost;
      const marketValue = holding.shares * currentPrice;
      const costBasis = holding.shares * holding.avg_cost;
      const dayChange = (quote?.regularMarketChange || 0) * holding.shares;

      stockPortfolio.totalValue += marketValue;
      stockPortfolio.totalCost += costBasis;
      stockPortfolio.dayChange += dayChange;
      stockPortfolio.holdingsCount++;
    }

    stockPortfolio.totalGain = stockPortfolio.totalValue - stockPortfolio.totalCost;
    stockPortfolio.totalGainPercent = stockPortfolio.totalCost > 0
      ? (stockPortfolio.totalGain / stockPortfolio.totalCost) * 100
      : 0;
    stockPortfolio.dayChangePercent = stockPortfolio.totalValue > 0 && stockPortfolio.totalValue !== stockPortfolio.dayChange
      ? (stockPortfolio.dayChange / (stockPortfolio.totalValue - stockPortfolio.dayChange)) * 100
      : 0;

    // Calculate balance for each account
    for (const account of accounts) {
      let balance = Number(account.initial_balance);

      if (account.type === 'stock') {
        // For stock accounts, calculate total value from holdings + cash balance
        const holdings = await holdingsQueries.getByAccount(account.id);
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
        const transactions = await accountTransactionQueries.getByAccount(account.id);
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
        const transactions = await accountTransactionQueries.getByAccount(account.id);
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

      // Loan accounts are liabilities, so they reduce net worth
      // Credit cards: net worth = balance - limit (amount owed is limit - balance)
      // Asset accounts add to net worth (like bank/cash)
      if (account.type === 'loan') {
        totalNetWorth -= balanceInMainCurrency;
        byType.loan.count++;
        byType.loan.total += balanceInMainCurrency;
      } else if (account.type === 'credit') {
        // For credit cards: initial_balance is the limit, balance is available credit
        // Amount owed = limit - balance, net worth contribution = balance - limit (negative when owed)
        const limitInMainCurrency = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
        const amountOwed = limitInMainCurrency - balanceInMainCurrency;
        totalNetWorth -= amountOwed; // Subtract what's owed
        byType.credit.count++;
        byType.credit.total += limitInMainCurrency; // Total credit limit
        byType.credit.owed += amountOwed; // Total amount owed
      } else if (account.type === 'asset') {
        // Asset accounts add to net worth (value stored in initial_balance)
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
    const dueRecurring = await recurringQueries.getDue(today);

    // Get recent transactions (last 10 across all accounts)
    const recentTransactions: {
      id: number;
      accountId: number;
      accountName: string;
      type: string;
      amount: number;
      currency: Currency;
      date: string;
      payee: string | null;
      category: string | null;
    }[] = [];

    for (const account of accounts) {
      if (account.type !== 'stock') {
        const transactions = await accountTransactionQueries.getByAccount(account.id);
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

    // Sort by date and take top 10
    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const topRecentTransactions = recentTransactions.slice(0, 10);

    res.json({
      mainCurrency,
      totalNetWorth,
      byType,
      stockPortfolio: {
        totalValue: Math.round(stockPortfolio.totalValue * 100) / 100,
        totalCost: Math.round(stockPortfolio.totalCost * 100) / 100,
        totalGain: Math.round(stockPortfolio.totalGain * 100) / 100,
        totalGainPercent: Math.round(stockPortfolio.totalGainPercent * 100) / 100,
        dayChange: Math.round(stockPortfolio.dayChange * 100) / 100,
        dayChangePercent: Math.round(stockPortfolio.dayChangePercent * 100) / 100,
        holdingsCount: stockPortfolio.holdingsCount,
      },
      accounts: accountSummaries,
      dueRecurring: dueRecurring.map((r) => ({
        id: r.id,
        accountId: r.account_id,
        accountName: r.account_name,
        type: r.type,
        amount: Number(r.amount),
        currency: r.account_currency,
        payee: r.payee_name,
        category: r.category_name,
        frequency: r.frequency,
        nextDueDate: r.next_due_date,
      })),
      recentTransactions: topRecentTransactions,
      exchangeRates: EXCHANGE_RATES,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/settings/currency - Get main currency setting
router.get('/settings/currency', async (_req: Request, res: Response) => {
  try {
    const mainCurrency = await settingsQueries.getMainCurrency();
    res.json({ mainCurrency, exchangeRates: EXCHANGE_RATES });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    res.status(500).json({ error: 'Failed to fetch currency settings' });
  }
});

// PUT /api/settings/currency - Update main currency
router.put('/settings/currency', async (req: Request, res: Response) => {
  try {
    const { currency } = req.body;

    if (!currency || !['EUR', 'USD', 'ALL'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    await settingsQueries.set('main_currency', currency);
    res.json({ mainCurrency: currency });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    res.status(500).json({ error: 'Failed to update currency settings' });
  }
});

// GET /api/settings/sidebar - Get sidebar collapsed state
router.get('/settings/sidebar', async (_req: Request, res: Response) => {
  try {
    const collapsed = await settingsQueries.getSidebarCollapsed();
    res.json({ collapsed });
  } catch (error) {
    console.error('Error fetching sidebar settings:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar settings' });
  }
});

// PUT /api/settings/sidebar - Update sidebar collapsed state
router.put('/settings/sidebar', async (req: Request, res: Response) => {
  try {
    const { collapsed } = req.body;

    if (typeof collapsed !== 'boolean') {
      return res.status(400).json({ error: 'collapsed must be a boolean' });
    }

    await settingsQueries.set('sidebar_collapsed', collapsed ? '1' : '0');
    res.json({ collapsed });
  } catch (error) {
    console.error('Error updating sidebar settings:', error);
    res.status(500).json({ error: 'Failed to update sidebar settings' });
  }
});

export default router;
