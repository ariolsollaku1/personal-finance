import { Router, Request, Response } from 'express';
import { accountQueries, holdingsQueries, recurringQueries, AccountType, Currency } from '../db/queries.js';
import { getMultipleQuotes } from '../services/yahoo.js';

const router = Router();

// GET /api/accounts - List all accounts with balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accounts = await accountQueries.getAll(userId);

    // Calculate balances for each account
    const accountsWithBalances = await Promise.all(accounts.map(async (account) => {
      const balanceInfo = await accountQueries.getBalance(userId, account.id);
      const cashBalance = balanceInfo?.balance || 0;

      // Get recurring transaction counts
      const recurringCounts = await recurringQueries.getActiveCountsByAccount(userId, account.id);
      const recurringInflow = Number(recurringCounts?.inflow_count) || 0;
      const recurringOutflow = Number(recurringCounts?.outflow_count) || 0;

      if (account.type === 'stock') {
        // For stock accounts, calculate cost basis from holdings
        const holdings = await holdingsQueries.getByAccount(userId, account.id);
        let costBasis = 0;
        for (const holding of holdings) {
          costBasis += Number(holding.shares) * Number(holding.avg_cost);
        }

        return {
          ...account,
          balance: Math.round(cashBalance * 100) / 100,  // Cash balance
          costBasis: Math.round(costBasis * 100) / 100,  // Holdings cost basis
          recurringInflow,
          recurringOutflow,
        };
      }

      return {
        ...account,
        balance: Math.round(cashBalance * 100) / 100,
        recurringInflow,
        recurringOutflow,
      };
    }));

    res.json(accountsWithBalances);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/accounts - Create account
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, currency, initialBalance } = req.body;

    if (!name || !type || !currency) {
      return res.status(400).json({ error: 'Name, type, and currency are required' });
    }

    if (!['stock', 'bank', 'cash', 'loan', 'credit', 'asset'].includes(type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    if (!['EUR', 'USD', 'ALL'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const id = await accountQueries.create(userId, name, type as AccountType, currency as Currency, initialBalance || 0);
    const account = await accountQueries.getById(userId, id as number);

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// GET /api/accounts/:id - Get account with balance
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const balanceInfo = await accountQueries.getBalance(userId, id);
    const cashBalance = balanceInfo?.balance || 0;

    if (account.type === 'stock') {
      const holdings = await holdingsQueries.getByAccount(userId, id);
      let costBasis = 0;
      for (const holding of holdings) {
        costBasis += Number(holding.shares) * Number(holding.avg_cost);
      }

      return res.json({
        ...account,
        balance: Math.round(cashBalance * 100) / 100,  // Cash balance
        costBasis: Math.round(costBasis * 100) / 100,  // Holdings cost basis
      });
    }

    res.json({
      ...account,
      balance: Math.round(cashBalance * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// GET /api/accounts/:id/portfolio - Get stock account portfolio with live prices
router.get('/:id/portfolio', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.type !== 'stock') {
      return res.status(400).json({ error: 'Not a stock account' });
    }

    // Get cash balance
    const balanceInfo = await accountQueries.getBalance(userId, id);
    const cashBalance = balanceInfo?.balance || 0;

    const holdings = await holdingsQueries.getByAccount(userId, id);

    if (holdings.length === 0) {
      return res.json({
        cashBalance: Math.round(cashBalance * 100) / 100,
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        holdings: [],
      });
    }

    const symbols = holdings.map((h) => h.symbol);
    const quotes = await getMultipleQuotes(symbols);

    let totalValue = 0;
    let totalCost = 0;
    let totalDayChange = 0;

    const holdingsWithQuotes = holdings.map((holding) => {
      const quote = quotes.get(holding.symbol);
      const currentPrice = quote?.regularMarketPrice || 0;
      const shares = Number(holding.shares);
      const avgCost = Number(holding.avg_cost);
      const marketValue = shares * currentPrice;
      const costBasis = shares * avgCost;
      const gain = marketValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
      const dayChange = (quote?.regularMarketChange || 0) * shares;
      const dayChangePercent = quote?.regularMarketChangePercent || 0;

      totalValue += marketValue;
      totalCost += costBasis;
      totalDayChange += dayChange;

      return {
        id: holding.id,
        symbol: holding.symbol,
        shares: shares,
        avgCost: avgCost,
        currentPrice,
        marketValue,
        costBasis,
        gain,
        gainPercent,
        dayChange,
        dayChangePercent,
        name: quote?.shortName || holding.symbol,
      };
    });

    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const dayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

    res.json({
      cashBalance: Math.round(cashBalance * 100) / 100,
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      totalGainPercent: Math.round(totalGainPercent * 100) / 100,
      dayChange: Math.round(totalDayChange * 100) / 100,
      dayChangePercent: Math.round(dayChangePercent * 100) / 100,
      holdings: holdingsWithQuotes,
    });
  } catch (error) {
    console.error('Error fetching account portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// PUT /api/accounts/:id - Update account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const { name, currency, initialBalance } = req.body;

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (currency && !['EUR', 'USD', 'ALL'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    await accountQueries.update(
      userId,
      id,
      name || account.name,
      (currency as Currency) || account.currency,
      initialBalance !== undefined ? initialBalance : account.initial_balance
    );

    const updatedAccount = await accountQueries.getById(userId, id);
    res.json(updatedAccount);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /api/accounts/:id - Delete account
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const account = await accountQueries.getById(userId, id);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await accountQueries.delete(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// PUT /api/accounts/:id/favorite - Toggle favorite status
router.put('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const { isFavorite } = req.body;

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await accountQueries.setFavorite(userId, id, isFavorite);
    res.json({ success: true, isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

export default router;
