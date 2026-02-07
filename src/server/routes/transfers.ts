import { Router, Request, Response } from 'express';
import { accountQueries, transferQueries } from '../db/queries.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';
import {
  validateParams,
  validateBody,
  idParamSchema,
  createTransferSchema,
  CreateTransferInput,
} from '../validation/index.js';

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
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
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
router.post('/', validateBody(createTransferSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { fromAccountId, toAccountId, fromAmount, toAmount, date, notes } = req.body as CreateTransferInput;

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

    // If currencies are the same, toAmount defaults to fromAmount
    // If different currencies, toAmount must be provided
    let finalToAmount: number;
    if (fromAccount.currency === toAccount.currency) {
      finalToAmount = toAmount || fromAmount;
    } else if (!toAmount) {
      return badRequest(res, 'toAmount is required for cross-currency transfers');
    } else {
      finalToAmount = toAmount;
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
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
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
