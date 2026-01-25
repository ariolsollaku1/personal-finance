import { Router, Request, Response } from 'express';
import { getMonthlySummaries, getMonthDetail } from '../services/pnl.js';
import { sendSuccess, badRequest, internalError } from '../utils/response.js';

const router = Router();

// GET /api/pnl - Get monthly P&L summaries
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getMonthlySummaries(userId);
    sendSuccess(res, data);
  } catch (error) {
    console.error('Error fetching P&L:', error);
    internalError(res, 'Failed to fetch P&L data');
  }
});

// GET /api/pnl/:month - Get transaction details for a specific month
router.get('/:month', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { month } = req.params;
    const data = await getMonthDetail(userId, month);
    sendSuccess(res, data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid month format')) {
      return badRequest(res, error.message);
    }
    console.error('Error fetching P&L details:', error);
    internalError(res, 'Failed to fetch P&L details');
  }
});

export default router;
