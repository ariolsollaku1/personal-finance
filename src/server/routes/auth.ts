import { Router, Request, Response } from 'express';
import { initializeNewUser, isUserInitialized } from '../services/userSetup.js';

const router = Router();

// POST /api/auth/init - Initialize a new user with default data
router.post('/init', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await initializeNewUser(userId);
    res.json(result);
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ error: 'Failed to initialize user' });
  }
});

// GET /api/auth/status - Check if user is initialized
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const initialized = await isUserInitialized(userId);
    res.json({ initialized, userId });
  } catch (error) {
    console.error('Error checking user status:', error);
    res.status(500).json({ error: 'Failed to check user status' });
  }
});

export default router;
