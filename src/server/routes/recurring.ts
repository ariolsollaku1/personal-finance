import { Router, Request, Response } from 'express';
import {
  accountQueries,
  recurringQueries,
  accountTransactionQueries,
  payeeQueries,
  categoryQueries,
  TransactionType,
  Frequency,
} from '../db/queries.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// Helper function to calculate next due date
function calculateNextDueDate(currentDate: string, frequency: Frequency): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

// GET /api/accounts/:id/recurring - List recurring transactions for an account
router.get('/accounts/:id/recurring', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.id);
    const account = await accountQueries.getById(userId, accountId);

    if (!account) {
      return notFound(res, 'Account not found');
    }

    const recurring = await recurringQueries.getByAccount(userId, accountId);
    sendSuccess(res, recurring);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    internalError(res, 'Failed to fetch recurring transactions');
  }
});

// GET /api/recurring/due - Get all due recurring transactions
router.get('/due', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().split('T')[0];
    const dueRecurring = await recurringQueries.getDue(userId, today);
    sendSuccess(res, dueRecurring);
  } catch (error) {
    console.error('Error fetching due recurring transactions:', error);
    internalError(res, 'Failed to fetch due recurring transactions');
  }
});

// POST /api/accounts/:id/recurring - Create recurring transaction
router.post('/accounts/:id/recurring', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.id);
    const { type, amount, payee, payeeId, category, categoryId, notes, frequency, nextDueDate } = req.body;

    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    if (!type || !amount || !frequency || !nextDueDate) {
      return badRequest(res, 'type, amount, frequency, and nextDueDate are required');
    }

    if (!['inflow', 'outflow'].includes(type)) {
      return badRequest(res, 'Invalid transaction type');
    }

    if (!['weekly', 'biweekly', 'monthly', 'yearly'].includes(frequency)) {
      return badRequest(res, 'Invalid frequency');
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId || null;
    if (!finalPayeeId && payee) {
      finalPayeeId = await payeeQueries.getOrCreate(userId, payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId || null;
    if (!finalCategoryId && category) {
      const categoryType = type === 'inflow' ? 'income' : 'expense';
      finalCategoryId = await categoryQueries.getOrCreate(userId, category, categoryType);
    }

    const id = await recurringQueries.create(
      userId,
      accountId,
      type as TransactionType,
      amount,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes || null,
      frequency as Frequency,
      nextDueDate
    );

    const recurring = await recurringQueries.getById(userId, id as number);
    sendSuccess(res, recurring, 201);
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    internalError(res, 'Failed to create recurring transaction');
  }
});

// PUT /api/recurring/:id - Update recurring transaction
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const { type, amount, payee, payeeId, category, categoryId, notes, frequency, nextDueDate, isActive } = req.body;

    const recurring = await recurringQueries.getById(userId, id);
    if (!recurring) {
      return notFound(res, 'Recurring transaction not found');
    }

    const txType = type || recurring.type;
    if (!['inflow', 'outflow'].includes(txType)) {
      return badRequest(res, 'Invalid transaction type');
    }

    const freq = frequency || recurring.frequency;
    if (!['weekly', 'biweekly', 'monthly', 'yearly'].includes(freq)) {
      return badRequest(res, 'Invalid frequency');
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId !== undefined ? payeeId : recurring.payee_id;
    if (payeeId === undefined && payee) {
      finalPayeeId = await payeeQueries.getOrCreate(userId, payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId !== undefined ? categoryId : recurring.category_id;
    if (categoryId === undefined && category) {
      const categoryType = txType === 'inflow' ? 'income' : 'expense';
      finalCategoryId = await categoryQueries.getOrCreate(userId, category, categoryType);
    }

    await recurringQueries.update(
      userId,
      id,
      txType as TransactionType,
      amount !== undefined ? amount : recurring.amount,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes !== undefined ? notes : recurring.notes,
      freq as Frequency,
      nextDueDate || recurring.next_due_date,
      isActive !== undefined ? isActive : recurring.is_active
    );

    const updatedRecurring = await recurringQueries.getById(userId, id);
    sendSuccess(res, updatedRecurring);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    internalError(res, 'Failed to update recurring transaction');
  }
});

// DELETE /api/recurring/:id - Delete recurring transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const recurring = await recurringQueries.getById(userId, id);

    if (!recurring) {
      return notFound(res, 'Recurring transaction not found');
    }

    await recurringQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    internalError(res, 'Failed to delete recurring transaction');
  }
});

// POST /api/recurring/:id/apply - Apply recurring transaction (create real transaction)
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const { date } = req.body;

    const recurring = await recurringQueries.getById(userId, id);
    if (!recurring) {
      return notFound(res, 'Recurring transaction not found');
    }

    // Use provided date or the next due date
    const transactionDate = date || recurring.next_due_date;

    // Create the actual transaction
    const txId = await accountTransactionQueries.create(
      userId,
      recurring.account_id,
      recurring.type as TransactionType,
      recurring.amount,
      transactionDate,
      recurring.payee_id,
      recurring.category_id,
      recurring.notes
    );

    // Update the next due date
    const nextDueDate = calculateNextDueDate(transactionDate, recurring.frequency as Frequency);
    await recurringQueries.updateNextDueDate(userId, id, nextDueDate);

    const transaction = await accountTransactionQueries.getById(userId, txId as number);
    const updatedRecurring = await recurringQueries.getById(userId, id);

    sendSuccess(res, {
      transaction,
      recurring: updatedRecurring,
      message: `Applied recurring transaction. Next due: ${nextDueDate}`,
    }, 201);
  } catch (error) {
    console.error('Error applying recurring transaction:', error);
    internalError(res, 'Failed to apply recurring transaction');
  }
});

export default router;
