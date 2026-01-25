import { Router, Request, Response } from 'express';
import { generateProjection } from '../services/projection.js';

const router = Router();

// GET /api/projection - Get projection data
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await generateProjection(userId);
    res.json(data);
  } catch (error) {
    console.error('Error generating projection:', error);
    res.status(500).json({ error: 'Failed to generate projection' });
  }
});

export default router;
