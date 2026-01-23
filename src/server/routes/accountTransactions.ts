import { Router, Request, Response } from 'express';
import {
  accountQueries,
  accountTransactionQueries,
  payeeQueries,
  categoryQueries,
  TransactionType,
} from '../db/queries.js';

const router = Router();

// GET /api/accounts/:id/transactions - List transactions for an account
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const account = await accountQueries.getById(accountId);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactions = await accountTransactionQueries.getByAccount(accountId);

    // Calculate running balance
    let runningBalance = Number(account.initial_balance);
    const transactionsWithBalance = [...transactions].reverse().map((tx) => {
      if (tx.type === 'inflow') {
        runningBalance += Number(tx.amount);
      } else {
        runningBalance -= Number(tx.amount);
      }
      return { ...tx, balance: runningBalance };
    }).reverse();

    res.json(transactionsWithBalance);
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/accounts/:id/transactions - Create transaction
router.post('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    const { type, amount, date, payee, payeeId, category, categoryId, notes } = req.body;

    const account = await accountQueries.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!type || !amount || !date) {
      return res.status(400).json({ error: 'type, amount, and date are required' });
    }

    if (!['inflow', 'outflow'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId || null;
    if (!finalPayeeId && payee) {
      finalPayeeId = await payeeQueries.getOrCreate(payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId || null;
    if (!finalCategoryId && category) {
      const categoryType = type === 'inflow' ? 'income' : 'expense';
      finalCategoryId = await categoryQueries.getOrCreate(category, categoryType);
    }

    const id = await accountTransactionQueries.create(
      accountId,
      type as TransactionType,
      amount,
      date,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes || null
    );

    const transaction = await accountTransactionQueries.getById(id as number);
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating account transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/accounts/:accountId/transactions/:txId - Update transaction
router.put('/:accountId/transactions/:txId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const txId = parseInt(req.params.txId);
    const { type, amount, date, payee, payeeId, category, categoryId, notes } = req.body;

    const account = await accountQueries.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transaction = await accountTransactionQueries.getById(txId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.account_id !== accountId) {
      return res.status(400).json({ error: 'Transaction does not belong to this account' });
    }

    if (transaction.transfer_id) {
      return res.status(400).json({ error: 'Cannot edit transfer transactions directly. Delete the transfer instead.' });
    }

    const txType = type || transaction.type;
    if (!['inflow', 'outflow'].includes(txType)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId !== undefined ? payeeId : transaction.payee_id;
    if (payeeId === undefined && payee) {
      finalPayeeId = await payeeQueries.getOrCreate(payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId !== undefined ? categoryId : transaction.category_id;
    if (categoryId === undefined && category) {
      const categoryType = txType === 'inflow' ? 'income' : 'expense';
      finalCategoryId = await categoryQueries.getOrCreate(category, categoryType);
    }

    await accountTransactionQueries.update(
      txId,
      txType as TransactionType,
      amount !== undefined ? amount : transaction.amount,
      date || transaction.date,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes !== undefined ? notes : transaction.notes
    );

    const updatedTransaction = await accountTransactionQueries.getById(txId);
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating account transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/accounts/:accountId/transactions/:txId - Delete transaction
router.delete('/:accountId/transactions/:txId', async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const txId = parseInt(req.params.txId);

    const account = await accountQueries.getById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transaction = await accountTransactionQueries.getById(txId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.account_id !== accountId) {
      return res.status(400).json({ error: 'Transaction does not belong to this account' });
    }

    if (transaction.transfer_id) {
      return res.status(400).json({ error: 'Cannot delete transfer transactions directly. Delete the transfer instead.' });
    }

    await accountTransactionQueries.delete(txId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
