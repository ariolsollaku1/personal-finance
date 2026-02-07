import { Router, Request, Response } from 'express';
import { accountQueries, holdingsQueries, transactionQueries, dividendQueries, batchQueries } from '../db/queries.js';
import { getAccountBalance } from '../services/balance.js';
import { getAccountPortfolio } from '../services/portfolio.js';
import { getHistoricalPrices } from '../services/yahoo.js';
import {
  validateBody,
  createAccountSchema,
  updateAccountSchema,
  setFavoriteSchema,
  CreateAccountInput,
  UpdateAccountInput,
} from '../validation/index.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';
import { roundCurrency } from '../services/currency.js';

const router = Router();

// GET /api/accounts - List all accounts with balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Batch fetch all data in 3 queries (instead of N+1 per account)
    const [accountsWithBalances, allHoldings, allRecurringCounts] = await Promise.all([
      batchQueries.getAllAccountsWithBalances(userId),
      holdingsQueries.getAll(userId),
      batchQueries.getAllRecurringCounts(userId),
    ]);

    // Group holdings by account_id
    const holdingsByAccount = new Map<number, typeof allHoldings>();
    for (const holding of allHoldings) {
      const accountId = holding.account_id!;
      if (!holdingsByAccount.has(accountId)) {
        holdingsByAccount.set(accountId, []);
      }
      holdingsByAccount.get(accountId)!.push(holding);
    }

    // Group recurring counts by account_id
    const recurringByAccount = new Map<number, (typeof allRecurringCounts)[0]>();
    for (const recurring of allRecurringCounts) {
      recurringByAccount.set(recurring.account_id, recurring);
    }

    // Build results in-memory
    const results = accountsWithBalances.map((account) => {
      const recurring = recurringByAccount.get(account.id);
      const recurringInflow = recurring?.inflow_count || 0;
      const recurringOutflow = recurring?.outflow_count || 0;
      const balance = Number(account.initial_balance) + Number(account.transaction_total);

      if (account.type === 'stock') {
        const holdings = holdingsByAccount.get(account.id) || [];
        let costBasis = 0;
        for (const holding of holdings) {
          costBasis += Number(holding.shares) * Number(holding.avg_cost);
        }

        return {
          ...account,
          balance: roundCurrency(balance),
          costBasis: roundCurrency(costBasis),
          recurringInflow,
          recurringOutflow,
        };
      }

      return {
        ...account,
        balance: roundCurrency(balance),
        recurringInflow,
        recurringOutflow,
      };
    });

    sendSuccess(res, results);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    internalError(res, 'Failed to fetch accounts');
  }
});

// POST /api/accounts - Create account
router.post('/', validateBody(createAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, currency, initialBalance } = req.body as CreateAccountInput;

    const id = await accountQueries.create(userId, name, type, currency, initialBalance);
    const account = await accountQueries.getById(userId, id as number);

    sendSuccess(res, account, 201);
  } catch (error) {
    console.error('Error creating account:', error);
    internalError(res, 'Failed to create account');
  }
});

// GET /api/accounts/archived - List archived accounts (must be before /:id)
router.get('/archived', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accounts = await accountQueries.getArchived(userId);
    sendSuccess(res, accounts);
  } catch (error) {
    console.error('Error fetching archived accounts:', error);
    internalError(res, 'Failed to fetch archived accounts');
  }
});

// GET /api/accounts/:id - Get account with balance
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return notFound(res, 'Account not found');
    }

    const balance = await getAccountBalance(userId, id);

    if (!balance) {
      return notFound(res, 'Account not found');
    }

    if (account.type === 'stock') {
      return sendSuccess(res, {
        ...account,
        balance: balance.balance,
        costBasis: balance.costBasis,
      });
    }

    sendSuccess(res, {
      ...account,
      balance: balance.balance,
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    internalError(res, 'Failed to fetch account');
  }
});

// GET /api/accounts/:id/portfolio - Get stock account portfolio with live prices
router.get('/:id/portfolio', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return notFound(res, 'Account not found');
    }

    if (account.type !== 'stock') {
      return badRequest(res, 'Not a stock account');
    }

    const portfolio = await getAccountPortfolio(userId, id);

    if (!portfolio) {
      return notFound(res, 'Portfolio not found');
    }

    sendSuccess(res, portfolio);
  } catch (error) {
    console.error('Error fetching account portfolio:', error);
    internalError(res, 'Failed to fetch portfolio');
  }
});

// GET /api/accounts/:id/performance - Portfolio performance vs S&P 500
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const period = (req.query.period as string) || '1y';

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }
    if (account.type !== 'stock') {
      return badRequest(res, 'Not a stock account');
    }

    // Get ALL holdings (including closed with shares = 0)
    const holdings = await holdingsQueries.getByAccount(userId, id);
    if (holdings.length === 0) {
      return sendSuccess(res, { portfolio: [], benchmark: [] });
    }

    // Get all stock transactions for this account, sorted chronologically
    const allTransactions = await transactionQueries.getByAccount(userId, id);
    const sortedTxs = [...allTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id
    );

    if (sortedTxs.length === 0) {
      return sendSuccess(res, { portfolio: [], benchmark: [] });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '1d': startDate.setDate(now.getDate() - 5); break;
      case '1w': startDate.setDate(now.getDate() - 10); break;
      case '3m': startDate.setMonth(now.getMonth() - 3); break;
      case '6m': startDate.setMonth(now.getMonth() - 6); break;
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
      case 'ytd': startDate.setMonth(0, 1); break;
      default: startDate.setFullYear(now.getFullYear() - 1);
    }

    // Replay transactions to compute shares held at period start
    // Then track changes within the period
    const startDateStr = startDate.toISOString().split('T')[0];
    const sharesAtStart = new Map<string, number>();

    // Transactions before or on start date → build initial position
    // Transactions after start date → track as changes within the period
    const txsBeforeStart = sortedTxs.filter(tx => tx.date <= startDateStr);
    const txsInPeriod = sortedTxs.filter(tx => tx.date > startDateStr);

    for (const tx of txsBeforeStart) {
      const current = sharesAtStart.get(tx.symbol) || 0;
      if (tx.type === 'buy') {
        sharesAtStart.set(tx.symbol, current + Number(tx.shares));
      } else {
        sharesAtStart.set(tx.symbol, Math.max(0, current - Number(tx.shares)));
      }
    }

    // Collect all symbols that were ever held during the period
    const allSymbols = new Set<string>();
    for (const [symbol, shares] of sharesAtStart) {
      if (shares > 0) allSymbols.add(symbol);
    }
    for (const tx of txsInPeriod) {
      allSymbols.add(tx.symbol);
    }

    if (allSymbols.size === 0) {
      return sendSuccess(res, { portfolio: [], benchmark: [] });
    }

    // Fetch historical prices for all relevant symbols + S&P 500 in parallel
    const symbolList = [...allSymbols];
    const fetchSymbols = [...symbolList, '^GSPC'];

    const priceResults = await Promise.all(
      fetchSymbols.map(symbol => getHistoricalPrices(symbol, startDate, now, '1d'))
    );

    // Build price lookup maps (date string -> close price)
    const priceLookups = new Map<string, Map<string, number>>();
    fetchSymbols.forEach((symbol, i) => {
      const lookup = new Map<string, number>();
      for (const p of priceResults[i]) {
        lookup.set(new Date(p.date).toISOString().split('T')[0], p.close);
      }
      priceLookups.set(symbol, lookup);
    });

    const benchmarkPrices = priceResults[priceResults.length - 1];
    if (benchmarkPrices.length === 0) {
      return sendSuccess(res, { portfolio: [], benchmark: [] });
    }

    // Use benchmark dates as timeline, trimmed for short periods
    let referenceDates = benchmarkPrices.map(p =>
      new Date(p.date).toISOString().split('T')[0]
    );
    if (period === '1d' && referenceDates.length > 2) {
      referenceDates = referenceDates.slice(-2);
    } else if (period === '1w' && referenceDates.length > 7) {
      referenceDates = referenceDates.slice(-7);
    }

    // Time-Weighted Return (TWR) calculation
    // TWR eliminates the effect of cash flows (buys/sells) so portfolio
    // performance can be compared fairly against the S&P 500 benchmark.
    // The period is split into sub-periods at each cash flow. Each sub-period's
    // return is computed, then all are chained: TWR = (1+R1)*(1+R2)*...*(1+Rn) - 1

    const currentShares = new Map<string, number>(sharesAtStart);
    let txIdx = 0;
    let subPeriodStartValue: number | null = null;
    let cumulativeTWR = 1.0;

    // Helper: compute portfolio value with current shares at a given date's prices
    const calcPortfolioValue = (dateStr: string) => {
      let value = 0;
      let hasAnyHolding = false;
      let missingPrice = false;
      for (const [symbol, shares] of currentShares) {
        if (shares <= 0) continue;
        hasAnyHolding = true;
        const price = priceLookups.get(symbol)?.get(dateStr);
        if (price !== undefined) {
          value += shares * price;
        } else {
          missingPrice = true;
          break;
        }
      }
      return { value, hasAnyHolding, missingPrice };
    };

    const portfolioSeries: { date: string; value: number; changePercent: number }[] = [];
    const benchmarkSeries: { date: string; value: number }[] = [];

    for (const dateStr of referenceDates) {
      const benchmarkValue = priceLookups.get('^GSPC')?.get(dateStr);
      if (benchmarkValue === undefined) continue;

      // Collect transactions that fall on or before this date
      const txsToday: typeof txsInPeriod = [];
      while (txIdx < txsInPeriod.length && txsInPeriod[txIdx].date <= dateStr) {
        txsToday.push(txsInPeriod[txIdx]);
        txIdx++;
      }

      if (txsToday.length > 0) {
        // Close current sub-period BEFORE applying transactions
        const pre = calcPortfolioValue(dateStr);
        if (!pre.missingPrice && pre.hasAnyHolding && subPeriodStartValue !== null && subPeriodStartValue > 0) {
          cumulativeTWR *= pre.value / subPeriodStartValue;
        }

        // Apply transactions (cash flow)
        for (const tx of txsToday) {
          const current = currentShares.get(tx.symbol) || 0;
          if (tx.type === 'buy') {
            currentShares.set(tx.symbol, current + Number(tx.shares));
          } else {
            currentShares.set(tx.symbol, Math.max(0, current - Number(tx.shares)));
          }
        }

        // Start new sub-period AFTER transactions
        const post = calcPortfolioValue(dateStr);
        if (!post.missingPrice && post.hasAnyHolding) {
          subPeriodStartValue = post.value;
          portfolioSeries.push({
            date: dateStr,
            value: post.value,
            changePercent: (cumulativeTWR - 1) * 100,
          });
          benchmarkSeries.push({ date: dateStr, value: benchmarkValue });
        }
      } else {
        // No transactions — pure price movement within current sub-period
        const { value, hasAnyHolding, missingPrice } = calcPortfolioValue(dateStr);
        if (!missingPrice && hasAnyHolding) {
          if (subPeriodStartValue === null) {
            subPeriodStartValue = value;
          }
          const currentTWR = subPeriodStartValue > 0
            ? cumulativeTWR * (value / subPeriodStartValue)
            : cumulativeTWR;
          portfolioSeries.push({
            date: dateStr,
            value,
            changePercent: (currentTWR - 1) * 100,
          });
          benchmarkSeries.push({ date: dateStr, value: benchmarkValue });
        }
      }
    }

    // Benchmark uses simple % change (no cash flows to account for)
    const normalizeBenchmark = (series: { date: string; value: number }[]) => {
      if (series.length === 0) return [];
      const firstValue = series[0].value;
      return series.map(point => ({
        date: point.date,
        value: point.value,
        changePercent: firstValue !== 0 ? ((point.value - firstValue) / firstValue) * 100 : 0,
      }));
    };

    // Collect events (buy/sell transactions + dividends) within the rendered period
    const renderedStart = referenceDates[0];
    const renderedEnd = referenceDates[referenceDates.length - 1];
    const events: Array<{ date: string; type: 'buy' | 'sell' | 'dividend'; symbol: string; shares?: number; price?: number; amount?: number }> = [];

    for (const tx of sortedTxs) {
      if (tx.date >= renderedStart && tx.date <= renderedEnd) {
        events.push({
          date: tx.date,
          type: tx.type as 'buy' | 'sell',
          symbol: tx.symbol,
          shares: Number(tx.shares),
          price: Number(tx.price),
        });
      }
    }

    const dividends = await dividendQueries.getByAccount(userId, id);
    for (const div of dividends) {
      if (div.ex_date >= renderedStart && div.ex_date <= renderedEnd) {
        events.push({
          date: div.ex_date,
          type: 'dividend',
          symbol: div.symbol,
          amount: Number(div.net_amount),
        });
      }
    }

    sendSuccess(res, {
      portfolio: portfolioSeries, // TWR already computed per data point
      benchmark: normalizeBenchmark(benchmarkSeries),
      events,
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    internalError(res, 'Failed to fetch performance data');
  }
});

// PUT /api/accounts/:id - Update account
router.put('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const { name, currency, initialBalance } = req.body as UpdateAccountInput;

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.update(
      userId,
      id,
      name ?? account.name,
      currency ?? account.currency,
      initialBalance ?? account.initial_balance
    );

    const updatedAccount = await accountQueries.getById(userId, id);
    sendSuccess(res, updatedAccount);
  } catch (error) {
    console.error('Error updating account:', error);
    internalError(res, 'Failed to update account');
  }
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    internalError(res, 'Failed to delete account');
  }
});

// PUT /api/accounts/:id/favorite - Toggle favorite status
router.put('/:id/favorite', validateBody(setFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const { isFavorite } = req.body;

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.setFavorite(userId, id, isFavorite);
    sendSuccess(res, { isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    internalError(res, 'Failed to toggle favorite');
  }
});

// PUT /api/accounts/:id/archive - Archive an account
router.put('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.archive(userId, id);
    sendSuccess(res, { archived: true });
  } catch (error) {
    console.error('Error archiving account:', error);
    internalError(res, 'Failed to archive account');
  }
});

// PUT /api/accounts/:id/unarchive - Restore an archived account
router.put('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    // Need to check if account exists (even if archived)
    const accounts = await accountQueries.getArchived(userId);
    const account = accounts.find(a => a.id === id);
    if (!account) {
      return notFound(res, 'Archived account not found');
    }

    await accountQueries.unarchive(userId, id);
    sendSuccess(res, { unarchived: true });
  } catch (error) {
    console.error('Error unarchiving account:', error);
    internalError(res, 'Failed to unarchive account');
  }
});

export default router;
