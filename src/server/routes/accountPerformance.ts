import { Router, Request, Response } from 'express';
import { accountQueries, holdingsQueries, transactionQueries, dividendQueries } from '../db/queries.js';
import { getAccountPortfolio } from '../services/portfolio.js';
import { getHistoricalPrices } from '../services/yahoo.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

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
    const startDateStr = startDate.toISOString().split('T')[0];
    const sharesAtStart = new Map<string, number>();

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
      portfolio: portfolioSeries,
      benchmark: normalizeBenchmark(benchmarkSeries),
      events,
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    internalError(res, 'Failed to fetch performance data');
  }
});

export default router;
