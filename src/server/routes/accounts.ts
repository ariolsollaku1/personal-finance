import { Router, Request, Response } from 'express';
import { accountQueries } from '../db/queries.js';
import { getAccountBalance } from '../services/balance.js';
import { getAccountPortfolio } from '../services/portfolio.js';
import {
  validateBody,
  createAccountSchema,
  updateAccountSchema,
  setFavoriteSchema,
  CreateAccountInput,
  UpdateAccountInput,
} from '../validation/index.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

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

export default router;
