import { Router, Request, Response } from 'express';
import { payeeQueries } from '../db/queries.js';

const router = Router();

// GET /api/payees - List all payees
router.get('/', async (_req: Request, res: Response) => {
  try {
    const payees = await payeeQueries.getAll();
    res.json(payees);
  } catch (error) {
    console.error('Error fetching payees:', error);
    res.status(500).json({ error: 'Failed to fetch payees' });
  }
});

// GET /api/payees/search - Search payees (autocomplete)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const payees = await payeeQueries.search(q, 10);
    res.json(payees);
  } catch (error) {
    console.error('Error searching payees:', error);
    res.status(500).json({ error: 'Failed to search payees' });
  }
});

// POST /api/payees - Create payee
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if payee already exists
    const existing = await payeeQueries.getByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Payee already exists', payee: existing });
    }

    const id = await payeeQueries.create(name);
    const payee = await payeeQueries.getById(id as number);

    res.status(201).json(payee);
  } catch (error) {
    console.error('Error creating payee:', error);
    res.status(500).json({ error: 'Failed to create payee' });
  }
});

// PUT /api/payees/:id - Rename payee
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const payee = await payeeQueries.getById(id);
    if (!payee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    // Check if new name already exists
    const existing = await payeeQueries.getByName(name);
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Payee with this name already exists' });
    }

    await payeeQueries.update(id, name);
    const updatedPayee = await payeeQueries.getById(id);

    res.json(updatedPayee);
  } catch (error) {
    console.error('Error updating payee:', error);
    res.status(500).json({ error: 'Failed to update payee' });
  }
});

// DELETE /api/payees/:id - Delete payee
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const payee = await payeeQueries.getById(id);

    if (!payee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    await payeeQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payee:', error);
    res.status(500).json({ error: 'Failed to delete payee' });
  }
});

// POST /api/payees/merge - Merge duplicate payees
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const source = await payeeQueries.getById(sourceId);
    const target = await payeeQueries.getById(targetId);

    if (!source) {
      return res.status(404).json({ error: 'Source payee not found' });
    }

    if (!target) {
      return res.status(404).json({ error: 'Target payee not found' });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ error: 'Cannot merge payee with itself' });
    }

    await payeeQueries.merge(sourceId, targetId);
    res.json({ success: true, message: `Merged "${source.name}" into "${target.name}"` });
  } catch (error) {
    console.error('Error merging payees:', error);
    res.status(500).json({ error: 'Failed to merge payees' });
  }
});

export default router;
