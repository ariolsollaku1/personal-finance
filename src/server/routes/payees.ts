import { Router, Request, Response } from 'express';
import { payeeQueries } from '../db/queries.js';
import { sendSuccess, badRequest, notFound, conflict, internalError } from '../utils/response.js';

const router = Router();

// GET /api/payees - List all payees
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const payees = await payeeQueries.getAll(userId);
    sendSuccess(res, payees);
  } catch (error) {
    console.error('Error fetching payees:', error);
    internalError(res, 'Failed to fetch payees');
  }
});

// GET /api/payees/search - Search payees (autocomplete)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return sendSuccess(res, []);
    }

    const payees = await payeeQueries.search(userId, q, 10);
    sendSuccess(res, payees);
  } catch (error) {
    console.error('Error searching payees:', error);
    internalError(res, 'Failed to search payees');
  }
});

// POST /api/payees - Create payee
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name } = req.body;

    if (!name) {
      return badRequest(res, 'Name is required');
    }

    // Check if payee already exists
    const existing = await payeeQueries.getByName(userId, name);
    if (existing) {
      return conflict(res, 'Payee already exists');
    }

    const id = await payeeQueries.create(userId, name);
    const payee = await payeeQueries.getById(userId, id as number);

    sendSuccess(res, payee, 201);
  } catch (error) {
    console.error('Error creating payee:', error);
    internalError(res, 'Failed to create payee');
  }
});

// PUT /api/payees/:id - Rename payee
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const { name } = req.body;

    if (!name) {
      return badRequest(res, 'Name is required');
    }

    const payee = await payeeQueries.getById(userId, id);
    if (!payee) {
      return notFound(res, 'Payee not found');
    }

    // Check if new name already exists
    const existing = await payeeQueries.getByName(userId, name);
    if (existing && existing.id !== id) {
      return conflict(res, 'Payee with this name already exists');
    }

    await payeeQueries.update(userId, id, name);
    const updatedPayee = await payeeQueries.getById(userId, id);

    sendSuccess(res, updatedPayee);
  } catch (error) {
    console.error('Error updating payee:', error);
    internalError(res, 'Failed to update payee');
  }
});

// DELETE /api/payees/:id - Delete payee
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    const payee = await payeeQueries.getById(userId, id);

    if (!payee) {
      return notFound(res, 'Payee not found');
    }

    await payeeQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting payee:', error);
    internalError(res, 'Failed to delete payee');
  }
});

// POST /api/payees/merge - Merge duplicate payees
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { sourceId, targetId } = req.body;

    if (!sourceId || !targetId) {
      return badRequest(res, 'sourceId and targetId are required');
    }

    const source = await payeeQueries.getById(userId, sourceId);
    const target = await payeeQueries.getById(userId, targetId);

    if (!source) {
      return notFound(res, 'Source payee not found');
    }

    if (!target) {
      return notFound(res, 'Target payee not found');
    }

    if (sourceId === targetId) {
      return badRequest(res, 'Cannot merge payee with itself');
    }

    await payeeQueries.merge(userId, sourceId, targetId);
    sendSuccess(res, { message: `Merged "${source.name}" into "${target.name}"` });
  } catch (error) {
    console.error('Error merging payees:', error);
    internalError(res, 'Failed to merge payees');
  }
});

export default router;
