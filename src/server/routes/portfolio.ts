import { Router } from 'express';
import { holdingsQueries } from '../db/queries.js';
import { getMultipleQuotes } from '../services/yahoo.js';

const router = Router();

// GET /api/portfolio - Get portfolio summary with live prices
router.get('/', async (_req, res) => {
  try {
    const holdings = await holdingsQueries.getAll();

    if (holdings.length === 0) {
      return res.json({
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        holdings: [],
      });
    }

    const symbols = holdings.map((h) => h.symbol);
    const quotes = await getMultipleQuotes(symbols);

    let totalValue = 0;
    let totalCost = 0;
    let totalDayChange = 0;

    const holdingsWithQuotes = holdings.map((holding) => {
      const quote = quotes.get(holding.symbol);
      const currentPrice = quote?.regularMarketPrice || 0;
      const shares = Number(holding.shares);
      const avgCost = Number(holding.avg_cost);
      const marketValue = shares * currentPrice;
      const costBasis = shares * avgCost;
      const gain = marketValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
      const dayChange = (quote?.regularMarketChange || 0) * shares;
      const dayChangePercent = quote?.regularMarketChangePercent || 0;

      totalValue += marketValue;
      totalCost += costBasis;
      totalDayChange += dayChange;

      return {
        id: holding.id,
        symbol: holding.symbol,
        shares: shares,
        avgCost: avgCost,
        currentPrice,
        marketValue,
        costBasis,
        gain,
        gainPercent,
        dayChange,
        dayChangePercent,
        name: quote?.shortName || holding.symbol,
      };
    });

    const totalGain = totalValue - totalCost;
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    const dayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;

    res.json({
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      totalGainPercent: Math.round(totalGainPercent * 100) / 100,
      dayChange: Math.round(totalDayChange * 100) / 100,
      dayChangePercent: Math.round(dayChangePercent * 100) / 100,
      holdings: holdingsWithQuotes,
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
