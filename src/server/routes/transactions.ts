import { Router } from 'express';
import { transactionQueries } from '../db/queries.js';

const router = Router();

// GET /api/transactions - List all transactions
router.get('/', async (req, res) => {
  try {
    const { symbol } = req.query;

    if (symbol) {
      const transactions = await transactionQueries.getBySymbol(symbol as string);
      return res.json(transactions);
    }

    const transactions = await transactionQueries.getAll();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions - Record a transaction (standalone, doesn't affect holdings)
router.post('/', async (req, res) => {
  try {
    const { symbol, type, shares, price, fees = 0, date } = req.body;

    if (!symbol || !type || !shares || !price || !date) {
      return res.status(400).json({
        error: 'Symbol, type, shares, price, and date are required',
      });
    }

    if (type !== 'buy' && type !== 'sell') {
      return res.status(400).json({ error: 'Type must be "buy" or "sell"' });
    }

    const id = await transactionQueries.create(
      symbol.toUpperCase(),
      type,
      shares,
      price,
      fees,
      date
    );

    res.status(201).json({ id, symbol: symbol.toUpperCase(), type, shares, price, fees, date });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// DELETE /api/transactions/:id - Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await transactionQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
