import { Router, Request, Response } from 'express';
import { generateProjection } from '../services/projection.js';
import { sendSuccess, internalError } from '../utils/response.js';

const router = Router();

// GET /api/projection - Get projection data
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await generateProjection(userId);
    sendSuccess(res, data);
  } catch (error) {
    console.error('Error generating projection:', error);
    internalError(res, 'Failed to generate projection');
  }
});

export default router;
