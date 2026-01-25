import { Router, Request, Response } from 'express';
import { accountQueries, transferQueries } from '../db/queries.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// GET /api/transfers - List all transfers
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const transfers = await transferQueries.getAll(userId);
    sendSuccess(res, transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    internalError(res, 'Failed to fetch transfers');
  }
});

// GET /api/transfers/:id - Get single transfer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const transfer = await transferQueries.getById(userId, id);

    if (!transfer) {
      return notFound(res, 'Transfer not found');
    }

    sendSuccess(res, transfer);
  } catch (error) {
    console.error('Error fetching transfer:', error);
    internalError(res, 'Failed to fetch transfer');
  }
});

// POST /api/transfers - Create transfer
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { fromAccountId, toAccountId, fromAmount, toAmount, date, notes } = req.body;

    if (!fromAccountId || !toAccountId || !fromAmount || !date) {
      return badRequest(res, 'fromAccountId, toAccountId, fromAmount, and date are required');
    }

    const fromAccount = await accountQueries.getById(userId, fromAccountId);
    const toAccount = await accountQueries.getById(userId, toAccountId);

    if (!fromAccount) {
      return notFound(res, 'Source account not found');
    }

    if (!toAccount) {
      return notFound(res, 'Destination account not found');
    }

    if (fromAccount.type === 'stock' || toAccount.type === 'stock') {
      return badRequest(res, 'Transfers to/from stock accounts are not supported');
    }

    if (fromAccountId === toAccountId) {
      return badRequest(res, 'Cannot transfer to the same account');
    }

    // If currencies are the same, toAmount defaults to fromAmount
    // If different currencies, toAmount must be provided
    let finalToAmount = toAmount;
    if (fromAccount.currency === toAccount.currency) {
      finalToAmount = toAmount || fromAmount;
    } else if (!toAmount) {
      return badRequest(res, 'toAmount is required for cross-currency transfers');
    }

    const id = await transferQueries.create(
      userId,
      fromAccountId,
      toAccountId,
      fromAmount,
      finalToAmount,
      date,
      notes || null
    );

    const transfer = await transferQueries.getById(userId, id as number);
    sendSuccess(res, transfer, 201);
  } catch (error) {
    console.error('Error creating transfer:', error);
    internalError(res, 'Failed to create transfer');
  }
});

// DELETE /api/transfers/:id - Delete transfer (removes both linked transactions)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const transfer = await transferQueries.getById(userId, id);

    if (!transfer) {
      return notFound(res, 'Transfer not found');
    }

    await transferQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    internalError(res, 'Failed to delete transfer');
  }
});

export default router;
