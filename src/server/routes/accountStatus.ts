import { Router, Request, Response } from 'express';
import { accountQueries } from '../db/queries.js';
import {
  validateBody,
  setFavoriteSchema,
} from '../validation/index.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// PUT /api/accounts/:id/favorite - Toggle favorite status
router.put('/:id/favorite', validateBody(setFavoriteSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const { isFavorite } = req.body;

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.setFavorite(userId, id, isFavorite);
    sendSuccess(res, { isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    internalError(res, 'Failed to toggle favorite');
  }
});

// PUT /api/accounts/:id/archive - Archive an account
router.put('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    const account = await accountQueries.getById(userId, id);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    await accountQueries.archive(userId, id);
    sendSuccess(res, { archived: true });
  } catch (error) {
    console.error('Error archiving account:', error);
    internalError(res, 'Failed to archive account');
  }
});

// PUT /api/accounts/:id/unarchive - Restore an archived account
router.put('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return badRequest(res, 'Invalid account ID');
    }

    // Need to check if account exists (even if archived)
    const accounts = await accountQueries.getArchived(userId);
    const account = accounts.find(a => a.id === id);
    if (!account) {
      return notFound(res, 'Archived account not found');
    }

    await accountQueries.unarchive(userId, id);
    sendSuccess(res, { unarchived: true });
  } catch (error) {
    console.error('Error unarchiving account:', error);
    internalError(res, 'Failed to unarchive account');
  }
});

export default router;
