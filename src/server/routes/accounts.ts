import { Router, Request, Response } from 'express';
import { accountQueries, holdingsQueries, batchQueries } from '../db/queries.js';
import { getAccountBalance } from '../services/balance.js';
import {
  validateBody,
  createAccountSchema,
  updateAccountSchema,
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

export default router;
