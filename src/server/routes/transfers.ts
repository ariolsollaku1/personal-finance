import { Router, Request, Response } from 'express';
import { accountQueries, transferQueries } from '../db/queries.js';

const router = Router();

// GET /api/transfers - List all transfers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const transfers = await transferQueries.getAll();
    res.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// GET /api/transfers/:id - Get single transfer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const transfer = await transferQueries.getById(id);

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    console.error('Error fetching transfer:', error);
    res.status(500).json({ error: 'Failed to fetch transfer' });
  }
});

// POST /api/transfers - Create transfer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fromAccountId, toAccountId, fromAmount, toAmount, date, notes } = req.body;

    if (!fromAccountId || !toAccountId || !fromAmount || !date) {
      return res.status(400).json({ error: 'fromAccountId, toAccountId, fromAmount, and date are required' });
    }

    const fromAccount = await accountQueries.getById(fromAccountId);
    const toAccount = await accountQueries.getById(toAccountId);

    if (!fromAccount) {
      return res.status(404).json({ error: 'Source account not found' });
    }

    if (!toAccount) {
      return res.status(404).json({ error: 'Destination account not found' });
    }

    if (fromAccount.type === 'stock' || toAccount.type === 'stock') {
      return res.status(400).json({ error: 'Transfers to/from stock accounts are not supported' });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    // If currencies are the same, toAmount defaults to fromAmount
    // If different currencies, toAmount must be provided
    let finalToAmount = toAmount;
    if (fromAccount.currency === toAccount.currency) {
      finalToAmount = toAmount || fromAmount;
    } else if (!toAmount) {
      return res.status(400).json({ error: 'toAmount is required for cross-currency transfers' });
    }

    const id = await transferQueries.create(
      fromAccountId,
      toAccountId,
      fromAmount,
      finalToAmount,
      date,
      notes || null
    );

    const transfer = await transferQueries.getById(id as number);
    res.status(201).json(transfer);
  } catch (error) {
    console.error('Error creating transfer:', error);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// DELETE /api/transfers/:id - Delete transfer (removes both linked transactions)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const transfer = await transferQueries.getById(id);

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    await transferQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transfer:', error);
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
});

export default router;
