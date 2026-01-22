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
router.get('/accounts/:id/recurring', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = accountQueries.getById(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const recurring = recurringQueries.getByAccount(accountId);
    res.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
});

// GET /api/recurring/due - Get all due recurring transactions
router.get('/due', (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const dueRecurring = recurringQueries.getDue(today);
    res.json(dueRecurring);
  } catch (error) {
    console.error('Error fetching due recurring transactions:', error);
    res.status(500).json({ error: 'Failed to fetch due recurring transactions' });
  }
});

// POST /api/accounts/:id/recurring - Create recurring transaction
router.post('/accounts/:id/recurring', (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const { type, amount, payee, payeeId, category, categoryId, notes, frequency, nextDueDate } = req.body;

    const account = accountQueries.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!type || !amount || !frequency || !nextDueDate) {
      return res.status(400).json({ error: 'type, amount, frequency, and nextDueDate are required' });
    }

    if (!['inflow', 'outflow'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (!['weekly', 'biweekly', 'monthly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId || null;
    if (!finalPayeeId && payee) {
      finalPayeeId = payeeQueries.getOrCreate(payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId || null;
    if (!finalCategoryId && category) {
      const categoryType = type === 'inflow' ? 'income' : 'expense';
      finalCategoryId = categoryQueries.getOrCreate(category, categoryType);
    }

    const id = recurringQueries.create(
      accountId,
      type as TransactionType,
      amount,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes || null,
      frequency as Frequency,
      nextDueDate
    );

    const recurring = recurringQueries.getById(id as number);
    res.status(201).json(recurring);
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    res.status(500).json({ error: 'Failed to create recurring transaction' });
  }
});

// PUT /api/recurring/:id - Update recurring transaction
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { type, amount, payee, payeeId, category, categoryId, notes, frequency, nextDueDate, isActive } = req.body;

    const recurring = recurringQueries.getById(id);
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    const txType = type || recurring.type;
    if (!['inflow', 'outflow'].includes(txType)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const freq = frequency || recurring.frequency;
    if (!['weekly', 'biweekly', 'monthly', 'yearly'].includes(freq)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId !== undefined ? payeeId : recurring.payee_id;
    if (payeeId === undefined && payee) {
      finalPayeeId = payeeQueries.getOrCreate(payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId !== undefined ? categoryId : recurring.category_id;
    if (categoryId === undefined && category) {
      const categoryType = txType === 'inflow' ? 'income' : 'expense';
      finalCategoryId = categoryQueries.getOrCreate(category, categoryType);
    }

    recurringQueries.update(
      id,
      txType as TransactionType,
      amount !== undefined ? amount : recurring.amount,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes !== undefined ? notes : recurring.notes,
      freq as Frequency,
      nextDueDate || recurring.next_due_date,
      isActive !== undefined ? (isActive ? 1 : 0) : recurring.is_active
    );

    const updatedRecurring = recurringQueries.getById(id);
    res.json(updatedRecurring);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    res.status(500).json({ error: 'Failed to update recurring transaction' });
  }
});

// DELETE /api/recurring/:id - Delete recurring transaction
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const recurring = recurringQueries.getById(id);

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    recurringQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    res.status(500).json({ error: 'Failed to delete recurring transaction' });
  }
});

// POST /api/recurring/:id/apply - Apply recurring transaction (create real transaction)
router.post('/:id/apply', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { date } = req.body;

    const recurring = recurringQueries.getById(id);
    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    // Use provided date or the next due date
    const transactionDate = date || recurring.next_due_date;

    // Create the actual transaction
    const txId = accountTransactionQueries.create(
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
    recurringQueries.updateNextDueDate(id, nextDueDate);

    const transaction = accountTransactionQueries.getById(txId as number);
    const updatedRecurring = recurringQueries.getById(id);

    res.status(201).json({
      transaction,
      recurring: updatedRecurring,
      message: `Applied recurring transaction. Next due: ${nextDueDate}`,
    });
  } catch (error) {
    console.error('Error applying recurring transaction:', error);
    res.status(500).json({ error: 'Failed to apply recurring transaction' });
  }
});

export default router;
