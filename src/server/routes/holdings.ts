import { Router, Request, Response } from 'express';
import { holdingsQueries, transactionQueries, accountTransactionQueries, accountQueries } from '../db/queries.js';
import { getQuote } from '../services/yahoo.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// GET /api/holdings - List all holdings (global - for dashboard aggregation)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const holdings = await holdingsQueries.getAll(userId);
    sendSuccess(res, holdings);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    internalError(res, 'Failed to fetch holdings');
  }
});

// GET /api/holdings/account/:accountId - List holdings for specific account
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.accountId);
    const holdings = await holdingsQueries.getByAccount(userId, accountId);
    sendSuccess(res, holdings);
  } catch (error) {
    console.error('Error fetching holdings:', error);
    internalError(res, 'Failed to fetch holdings');
  }
});

// GET /api/holdings/:symbol - Get specific holding (optionally filtered by account)
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const holding = await holdingsQueries.getBySymbol(userId, req.params.symbol.toUpperCase(), accountId);
    if (!holding) {
      return notFound(res, 'Holding not found');
    }
    sendSuccess(res, holding);
  } catch (error) {
    console.error('Error fetching holding:', error);
    internalError(res, 'Failed to fetch holding');
  }
});

// POST /api/holdings - Add new holding (buy shares) - requires accountId
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, shares, price, fees = 0, date, accountId } = req.body;

    if (!symbol || !shares || !price) {
      return badRequest(res, 'Symbol, shares, and price are required');
    }

    if (!accountId) {
      return badRequest(res, 'accountId is required');
    }

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const upperSymbol = symbol.toUpperCase();

    // Verify symbol exists
    const quote = await getQuote(upperSymbol);
    if (!quote) {
      return badRequest(res, 'Invalid stock symbol');
    }

    // Calculate total cost including fees
    const totalCost = shares * price + (fees || 0);
    const avgCostPerShare = totalCost / shares;

    // Check if holding already exists for this account
    const existingHolding = await holdingsQueries.getBySymbol(userId, upperSymbol, accountId);

    if (existingHolding) {
      // Update existing holding with new average cost
      const totalShares = Number(existingHolding.shares) + shares;
      const totalValue = Number(existingHolding.shares) * Number(existingHolding.avg_cost) + totalCost;
      const newAvgCost = totalValue / totalShares;

      await holdingsQueries.update(userId, existingHolding.id, totalShares, newAvgCost);
    } else {
      // Create new holding for this account
      await holdingsQueries.create(userId, upperSymbol, shares, avgCostPerShare, accountId);
    }

    const txDate = date || new Date().toISOString().split('T')[0];

    // Record stock transaction with accountId
    await transactionQueries.create(
      userId,
      upperSymbol,
      'buy',
      shares,
      price,
      fees || 0,
      txDate,
      accountId
    );

    // Create account transaction (outflow) to reduce cash balance
    await accountTransactionQueries.create(
      userId,
      accountId,
      'outflow',
      totalCost,
      txDate,
      null,
      null,
      `Buy ${shares} ${upperSymbol} @ $${price.toFixed(2)}`
    );

    const updatedHolding = await holdingsQueries.getBySymbol(userId, upperSymbol, accountId);
    sendSuccess(res, updatedHolding, 201);
  } catch (error) {
    console.error('Error adding holding:', error);
    internalError(res, 'Failed to add holding');
  }
});

// DELETE /api/holdings/:id - Remove holding
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    await holdingsQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting holding:', error);
    internalError(res, 'Failed to delete holding');
  }
});

// POST /api/holdings/:symbol/sell - Sell shares (requires accountId in query or body)
router.post('/:symbol/sell', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { shares, price, fees = 0, date, accountId } = req.body;
    const symbol = req.params.symbol.toUpperCase();

    if (!shares || !price) {
      return badRequest(res, 'Shares and price are required');
    }

    if (!accountId) {
      return badRequest(res, 'accountId is required');
    }

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    const holding = await holdingsQueries.getBySymbol(userId, symbol, accountId);
    if (!holding) {
      return notFound(res, 'Holding not found');
    }

    if (shares > Number(holding.shares)) {
      return badRequest(res, 'Cannot sell more shares than owned');
    }

    const txDate = date || new Date().toISOString().split('T')[0];
    const proceeds = shares * price - (fees || 0);

    // Record sell transaction with accountId
    await transactionQueries.create(
      userId,
      symbol,
      'sell',
      shares,
      price,
      fees || 0,
      txDate,
      accountId
    );

    // Create account transaction (inflow) to increase cash balance
    await accountTransactionQueries.create(
      userId,
      accountId,
      'inflow',
      proceeds,
      txDate,
      null,
      null,
      `Sell ${shares} ${symbol} @ $${price.toFixed(2)}`
    );

    const remainingShares = Number(holding.shares) - shares;

    if (remainingShares <= 0) {
      // Remove holding if no shares remain
      await holdingsQueries.delete(userId, holding.id);
      return sendSuccess(res, { holding: null });
    } else {
      // Update holding with remaining shares (avg cost stays the same)
      await holdingsQueries.update(userId, holding.id, remainingShares, Number(holding.avg_cost));
      const updatedHolding = await holdingsQueries.getBySymbol(userId, symbol, accountId);
      return sendSuccess(res, { holding: updatedHolding });
    }
  } catch (error) {
    console.error('Error selling shares:', error);
    internalError(res, 'Failed to sell shares');
  }
});

export default router;
