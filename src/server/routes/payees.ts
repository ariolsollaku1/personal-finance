import { Router, Request, Response } from 'express';
import { payeeQueries } from '../db/queries.js';

const router = Router();

// GET /api/payees - List all payees
router.get('/', (_req: Request, res: Response) => {
  try {
    const payees = payeeQueries.getAll();
    res.json(payees);
  } catch (error) {
    console.error('Error fetching payees:', error);
    res.status(500).json({ error: 'Failed to fetch payees' });
  }
});

// GET /api/payees/search - Search payees (autocomplete)
router.get('/search', (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const payees = payeeQueries.search(q, 10);
    res.json(payees);
  } catch (error) {
    console.error('Error searching payees:', error);
    res.status(500).json({ error: 'Failed to search payees' });
  }
});

// POST /api/payees - Create payee
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if payee already exists
    const existing = payeeQueries.getByName(name);
    if (existing) {
      return res.status(409).json({ error: 'Payee already exists', payee: existing });
    }

    const id = payeeQueries.create(name);
    const payee = payeeQueries.getById(id as number);

    res.status(201).json(payee);
  } catch (error) {
    console.error('Error creating payee:', error);
    res.status(500).json({ error: 'Failed to create payee' });
  }
});

// PUT /api/payees/:id - Rename payee
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const payee = payeeQueries.getById(id);
    if (!payee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    // Check if new name already exists
    const existing = payeeQueries.getByName(name);
    if (existing && existing.id !== id) {
      return res.status(409).json({ error: 'Payee with this name already exists' });
    }

    payeeQueries.update(id, name);
    const updatedPayee = payeeQueries.getById(id);

    res.json(updatedPayee);
  } catch (error) {
    console.error('Error updating payee:', error);
    res.status(500).json({ error: 'Failed to update payee' });
  }
});

// DELETE /api/payees/:id - Delete payee
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const payee = payeeQueries.getById(id);

    if (!payee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    payeeQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payee:', error);
    res.status(500).json({ error: 'Failed to delete payee' });
  }
});

// POST /api/payees/merge - Merge duplicate payees
router.post('/merge', (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const source = payeeQueries.getById(sourceId);
    const target = payeeQueries.getById(targetId);

    if (!source) {
      return res.status(404).json({ error: 'Source payee not found' });
    }

    if (!target) {
      return res.status(404).json({ error: 'Target payee not found' });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ error: 'Cannot merge payee with itself' });
    }

    payeeQueries.merge(sourceId, targetId);
    res.json({ success: true, message: `Merged "${source.name}" into "${target.name}"` });
  } catch (error) {
    console.error('Error merging payees:', error);
    res.status(500).json({ error: 'Failed to merge payees' });
  }
});

export default router;
