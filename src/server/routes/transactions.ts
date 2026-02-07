import { Router, Request, Response } from 'express';
import { transactionQueries, accountQueries } from '../db/queries.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';
import {
  validateParams,
  validateBody,
  idParamSchema,
  createStockTransactionSchema,
  CreateStockTransactionInput,
} from '../validation/index.js';

const router = Router();

// GET /api/transactions - List all transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, accountId } = req.query;
    const parsedAccountId = accountId ? parseInt(accountId as string) : undefined;

    if (symbol) {
      const transactions = await transactionQueries.getBySymbol(userId, symbol as string, parsedAccountId);
      return sendSuccess(res, transactions);
    }

    const transactions = await transactionQueries.getAll(userId);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    internalError(res, 'Failed to fetch transactions');
  }
});

// POST /api/transactions - Record a transaction (standalone, doesn't affect holdings)
router.post('/', validateBody(createStockTransactionSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, type, shares, price, fees, date, accountId } = req.body as CreateStockTransactionInput;

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const id = await transactionQueries.create(
      userId,
      symbol,
      type,
      shares,
      price,
      fees,
      date,
      accountId
    );

    sendSuccess(res, { id, symbol, type, shares, price, fees, date, accountId }, 201);
  } catch (error) {
    console.error('Error creating transaction:', error);
    internalError(res, 'Failed to create transaction');
  }
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
    await transactionQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    internalError(res, 'Failed to delete transaction');
  }
});

export default router;
