import { Router, Request, Response } from 'express';
import { getMonthlySummaries, getMonthDetail } from '../services/pnl.js';

const router = Router();

// GET /api/pnl - Get monthly P&L summaries
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getMonthlySummaries(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching P&L:', error);
    res.status(500).json({ error: 'Failed to fetch P&L data' });
  }
});

// GET /api/pnl/:month - Get transaction details for a specific month
router.get('/:month', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { month } = req.params;
    const data = await getMonthDetail(userId, month);
    res.json(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid month format')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error fetching P&L details:', error);
    res.status(500).json({ error: 'Failed to fetch P&L details' });
  }
});

export default router;
