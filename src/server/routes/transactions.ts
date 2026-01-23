import { Router, Request, Response } from 'express';
import { transactionQueries, accountQueries } from '../db/queries.js';

const router = Router();

// GET /api/transactions - List all transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, accountId } = req.query;
    const parsedAccountId = accountId ? parseInt(accountId as string) : undefined;

    if (symbol) {
      const transactions = await transactionQueries.getBySymbol(userId, symbol as string, parsedAccountId);
      return res.json(transactions);
    }

    const transactions = await transactionQueries.getAll(userId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions - Record a transaction (standalone, doesn't affect holdings)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, type, shares, price, fees = 0, date, accountId } = req.body;

    if (!symbol || !type || !shares || !price || !date) {
      return res.status(400).json({
        error: 'Symbol, type, shares, price, and date are required',
      });
    }

    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (type !== 'buy' && type !== 'sell') {
      return res.status(400).json({ error: 'Type must be "buy" or "sell"' });
    }

    const id = await transactionQueries.create(
      userId,
      symbol.toUpperCase(),
      type,
      shares,
      price,
      fees,
      date,
      accountId
    );

    res.status(201).json({ id, symbol: symbol.toUpperCase(), type, shares, price, fees, date, accountId });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    await transactionQueries.delete(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
