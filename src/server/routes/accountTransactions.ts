import { Router, Request, Response } from 'express';
import {
  accountQueries,
  accountTransactionQueries,
  payeeQueries,
  categoryQueries,
  TransactionType,
} from '../db/queries.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// GET /api/accounts/:id/transactions - List transactions for an account
// Supports pagination with ?page=1&limit=50 (default: all transactions)
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.id);
    const account = await accountQueries.getById(userId, accountId);

    if (!account) {
      return notFound(res, 'Account not found');
    }

    // Check for pagination params
    const pageParam = req.query.page as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    // If pagination params provided, use paginated response
    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10)));
      const offset = (page - 1) * limit;

      // Get total count and paginated transactions in parallel
      const [totalCount, transactions] = await Promise.all([
        accountTransactionQueries.countByAccount(userId, accountId),
        accountTransactionQueries.getByAccountPaginated(userId, accountId, limit, offset),
      ]);

      // Calculate running balance for paginated results
      // Get net sum of older transactions (after current page offset)
      const netAfterOffset = await accountTransactionQueries.getNetSumAfterOffset(
        userId,
        accountId,
        offset + transactions.length
      );

      // Starting balance = initial + net of all older transactions
      let runningBalance = Number(account.initial_balance) + netAfterOffset;

      // Calculate running balance going through the page (oldest to newest on page)
      const transactionsWithBalance = [...transactions].reverse().map((tx) => {
        if (tx.type === 'inflow') {
          runningBalance += Number(tx.amount);
        } else {
          runningBalance -= Number(tx.amount);
        }
        return { ...tx, balance: runningBalance };
      }).reverse();

      const totalPages = Math.ceil(totalCount / limit);

      sendSuccess(res, {
        transactions: transactionsWithBalance,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } else {
      // No pagination - return all transactions (backwards compatible)
      const transactions = await accountTransactionQueries.getByAccount(userId, accountId);

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

      sendSuccess(res, transactionsWithBalance);
    }
  } catch (error) {
    console.error('Error fetching account transactions:', error);
    internalError(res, 'Failed to fetch transactions');
  }
});

// POST /api/accounts/:id/transactions - Create transaction
router.post('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.id);
    const { type, amount, date, payee, payeeId, category, categoryId, notes } = req.body;

    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    if (!type || !amount || !date) {
      return badRequest(res, 'type, amount, and date are required');
    }

    if (!['inflow', 'outflow'].includes(type)) {
      return badRequest(res, 'Invalid transaction type');
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

    const id = await accountTransactionQueries.create(
      userId,
      accountId,
      type as TransactionType,
      amount,
      date,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes || null
    );

    const transaction = await accountTransactionQueries.getById(userId, id as number);
    sendSuccess(res, transaction, 201);
  } catch (error) {
    console.error('Error creating account transaction:', error);
    internalError(res, 'Failed to create transaction');
  }
});

// PUT /api/accounts/:accountId/transactions/:txId - Update transaction
router.put('/:accountId/transactions/:txId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.accountId);
    const txId = parseInt(req.params.txId);
    const { type, amount, date, payee, payeeId, category, categoryId, notes } = req.body;

    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const transaction = await accountTransactionQueries.getById(userId, txId);
    if (!transaction) {
      return notFound(res, 'Transaction not found');
    }

    if (transaction.account_id !== accountId) {
      return badRequest(res, 'Transaction does not belong to this account');
    }

    if (transaction.transfer_id) {
      return badRequest(res, 'Cannot edit transfer transactions directly. Delete the transfer instead.');
    }

    const txType = type || transaction.type;
    if (!['inflow', 'outflow'].includes(txType)) {
      return badRequest(res, 'Invalid transaction type');
    }

    // Handle payee - get or create
    let finalPayeeId = payeeId !== undefined ? payeeId : transaction.payee_id;
    if (payeeId === undefined && payee) {
      finalPayeeId = await payeeQueries.getOrCreate(userId, payee);
    }

    // Handle category - get or create
    let finalCategoryId = categoryId !== undefined ? categoryId : transaction.category_id;
    if (categoryId === undefined && category) {
      const categoryType = txType === 'inflow' ? 'income' : 'expense';
      finalCategoryId = await categoryQueries.getOrCreate(userId, category, categoryType);
    }

    await accountTransactionQueries.update(
      userId,
      txId,
      txType as TransactionType,
      amount !== undefined ? amount : transaction.amount,
      date || transaction.date,
      finalPayeeId as number | null,
      finalCategoryId as number | null,
      notes !== undefined ? notes : transaction.notes
    );

    const updatedTransaction = await accountTransactionQueries.getById(userId, txId);
    sendSuccess(res, updatedTransaction);
  } catch (error) {
    console.error('Error updating account transaction:', error);
    internalError(res, 'Failed to update transaction');
  }
});

// DELETE /api/accounts/:accountId/transactions/:txId - Delete transaction
router.delete('/:accountId/transactions/:txId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.accountId);
    const txId = parseInt(req.params.txId);

    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const transaction = await accountTransactionQueries.getById(userId, txId);
    if (!transaction) {
      return notFound(res, 'Transaction not found');
    }

    if (transaction.account_id !== accountId) {
      return badRequest(res, 'Transaction does not belong to this account');
    }

    if (transaction.transfer_id) {
      return badRequest(res, 'Cannot delete transfer transactions directly. Delete the transfer instead.');
    }

    await accountTransactionQueries.delete(userId, txId);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting account transaction:', error);
    internalError(res, 'Failed to delete transaction');
  }
});

export default router;
