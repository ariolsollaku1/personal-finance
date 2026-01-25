import { Router, Request, Response } from 'express';
import { accountQueries, AccountType, Currency } from '../db/queries.js';
import { getAccountBalance } from '../services/balance.js';
import { getAccountPortfolio } from '../services/portfolio.js';

const router = Router();

// GET /api/accounts - List all accounts with balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accounts = await accountQueries.getAll(userId);

    // Calculate balances for each account using the balance service
    const accountsWithBalances = await Promise.all(accounts.map(async (account) => {
      const balance = await getAccountBalance(userId, account.id);

      if (!balance) {
        return {
          ...account,
          balance: 0,
          recurringInflow: 0,
          recurringOutflow: 0,
        };
      }

      if (account.type === 'stock') {
        return {
          ...account,
          balance: balance.balance,
          costBasis: balance.costBasis,
          recurringInflow: balance.recurringInflow,
          recurringOutflow: balance.recurringOutflow,
        };
      }

      return {
        ...account,
        balance: balance.balance,
        recurringInflow: balance.recurringInflow,
        recurringOutflow: balance.recurringOutflow,
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

    const balance = await getAccountBalance(userId, id);

    if (!balance) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.type === 'stock') {
      return res.json({
        ...account,
        balance: balance.balance,
        costBasis: balance.costBasis,
      });
    }

    res.json({
      ...account,
      balance: balance.balance,
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

    const portfolio = await getAccountPortfolio(userId, id);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json(portfolio);
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
