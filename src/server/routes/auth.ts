import { Router, Request, Response } from 'express';
import { initializeNewUser, isUserInitialized } from '../services/userSetup.js';
import { sendSuccess, unauthorized, internalError } from '../utils/response.js';

const router = Router();

// POST /api/auth/init - Initialize a new user with default data
router.post('/init', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return unauthorized(res, 'Not authenticated');
    }

    const result = await initializeNewUser(userId);
    sendSuccess(res, result);
  } catch (error) {
    console.error('Error initializing user:', error);
    internalError(res, 'Failed to initialize user');
  }
});

// GET /api/auth/status - Check if user is initialized
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return unauthorized(res, 'Not authenticated');
    }

    const initialized = await isUserInitialized(userId);
    sendSuccess(res, { initialized, userId });
  } catch (error) {
    console.error('Error checking user status:', error);
    internalError(res, 'Failed to check user status');
  }
});

export default router;
