import { Router, Request, Response } from 'express';
import { settingsQueries } from '../db/queries.js';
import { getDashboardData } from '../services/dashboard.js';
import { getExchangeRates } from '../services/currency.js';
import {
  validateBody,
  setCurrencySchema,
  setSidebarCollapsedSchema,
} from '../validation/index.js';

const router = Router();

// GET /api/dashboard - Aggregated dashboard data
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const data = await getDashboardData(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/settings/currency - Get main currency setting
router.get('/settings/currency', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const mainCurrency = await settingsQueries.getMainCurrency(userId);
    const exchangeRates = await getExchangeRates();
    res.json({ mainCurrency, exchangeRates });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    res.status(500).json({ error: 'Failed to fetch currency settings' });
  }
});

// PUT /api/settings/currency - Update main currency
router.put('/settings/currency', validateBody(setCurrencySchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { currency } = req.body;

    await settingsQueries.set(userId, 'main_currency', currency);
    res.json({ mainCurrency: currency });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    res.status(500).json({ error: 'Failed to update currency settings' });
  }
});

// GET /api/settings/sidebar - Get sidebar collapsed state
router.get('/settings/sidebar', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const collapsed = await settingsQueries.getSidebarCollapsed(userId);
    res.json({ collapsed });
  } catch (error) {
    console.error('Error fetching sidebar settings:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar settings' });
  }
});

// PUT /api/settings/sidebar - Update sidebar collapsed state
router.put('/settings/sidebar', validateBody(setSidebarCollapsedSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { collapsed } = req.body;

    await settingsQueries.set(userId, 'sidebar_collapsed', collapsed ? '1' : '0');
    res.json({ collapsed });
  } catch (error) {
    console.error('Error updating sidebar settings:', error);
    res.status(500).json({ error: 'Failed to update sidebar settings' });
  }
});

export default router;
