import { Router } from 'express';
import { getQuote, getHistoricalPrices, searchStocks } from '../services/yahoo.js';

const router = Router();

// GET /api/quotes/search?q= - Search for stocks
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchStocks(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

// GET /api/quotes/:symbol - Get current quote for a symbol
router.get('/:symbol', async (req, res) => {
  try {
    const quote = await getQuote(req.params.symbol.toUpperCase());

    if (!quote) {
      return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// GET /api/quotes/:symbol/history - Get historical prices
router.get('/:symbol/history', async (req, res) => {
  try {
    const { period = '1y', interval = '1d' } = req.query;

    // Calculate period1 based on period string
    const now = new Date();
    let period1 = new Date();

    switch (period) {
      case '1w':
        period1.setDate(now.getDate() - 7);
        break;
      case '1m':
        period1.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        period1.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        period1.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        period1.setFullYear(now.getFullYear() - 1);
        break;
      case '5y':
        period1.setFullYear(now.getFullYear() - 5);
        break;
      default:
        period1.setFullYear(now.getFullYear() - 1);
    }

    const validIntervals: ('1d' | '1wk' | '1mo')[] = ['1d', '1wk', '1mo'];
    const intervalParam = validIntervals.includes(interval as any)
      ? (interval as '1d' | '1wk' | '1mo')
      : '1d';

    const history = await getHistoricalPrices(
      req.params.symbol.toUpperCase(),
      period1,
      now,
      intervalParam
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    res.status(500).json({ error: 'Failed to fetch historical prices' });
  }
});

export default router;
