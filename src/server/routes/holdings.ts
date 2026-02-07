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

/**
 * Recalculate a holding's shares and avg_cost from all its transactions.
 * Replays buys/sells in date order to derive current state.
 */
async function recalcHolding(userId: string, symbol: string, accountId: number) {
  const txs = await transactionQueries.getBySymbol(userId, symbol, accountId);

  let shares = 0;
  let totalCost = 0;

  // Replay in chronological order (oldest first)
  const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);

  for (const tx of sorted) {
    const txShares = Number(tx.shares);
    const txPrice = Number(tx.price);
    const txFees = Number(tx.fees);
    if (tx.type === 'buy') {
      const buyCost = txShares * txPrice + txFees;
      totalCost += buyCost;
      shares += txShares;
    } else {
      // sell — reduce shares, reduce cost proportionally
      if (shares > 0) {
        const avgCostBefore = totalCost / shares;
        shares -= txShares;
        if (shares <= 0) {
          shares = 0;
          totalCost = 0;
        } else {
          totalCost = shares * avgCostBefore;
        }
      }
    }
  }

  const avgCost = shares > 0 ? totalCost / shares : 0;

  const holding = await holdingsQueries.getBySymbol(userId, symbol, accountId);
  if (holding) {
    await holdingsQueries.update(userId, holding.id, shares, avgCost);
  } else if (shares > 0) {
    await holdingsQueries.create(userId, symbol, shares, avgCost, accountId);
  }
}

// GET /api/holdings/:symbol/transactions - Get stock transactions for a symbol
router.get('/:symbol/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const symbol = req.params.symbol.toUpperCase();
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

    if (!accountId) {
      return badRequest(res, 'accountId query parameter is required');
    }

    const transactions = await transactionQueries.getBySymbol(userId, symbol, accountId);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Error fetching symbol transactions:', error);
    internalError(res, 'Failed to fetch transactions');
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

    const SHARE_EPSILON = 0.0001;
    const heldShares = Number(holding.shares);

    if (shares > heldShares + SHARE_EPSILON) {
      return badRequest(res, 'Cannot sell more shares than owned');
    }

    // Clamp to exact shares if within epsilon (selling "all" shares)
    const sellShares = Math.abs(shares - heldShares) < SHARE_EPSILON ? heldShares : shares;

    const txDate = date || new Date().toISOString().split('T')[0];
    const proceeds = sellShares * price - (fees || 0);

    // Record sell transaction with accountId
    await transactionQueries.create(
      userId,
      symbol,
      'sell',
      sellShares,
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
      `Sell ${sellShares} ${symbol} @ $${price.toFixed(2)}`
    );

    const remainingShares = heldShares - sellShares;

    if (remainingShares < SHARE_EPSILON) {
      // Keep holding with 0 shares for transaction history
      await holdingsQueries.update(userId, holding.id, 0, Number(holding.avg_cost));
      const updatedHolding = await holdingsQueries.getBySymbol(userId, symbol, accountId);
      return sendSuccess(res, { holding: updatedHolding });
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

// PUT /api/holdings/:symbol/transactions/:id - Update a stock transaction
router.put('/:symbol/transactions/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const symbol = req.params.symbol.toUpperCase();
    const txId = parseInt(req.params.id);
    const { shares, price, fees } = req.body;

    // Verify the transaction exists and belongs to this user/symbol
    const existing = await transactionQueries.getById(userId, txId);
    if (!existing) {
      return notFound(res, 'Transaction not found');
    }
    if (existing.symbol !== symbol) {
      return badRequest(res, 'Transaction does not belong to this symbol');
    }

    const updated = await transactionQueries.update(userId, txId, { shares, price, fees });

    // Recalculate the holding from all transactions
    await recalcHolding(userId, symbol, existing.account_id!);

    sendSuccess(res, updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    internalError(res, 'Failed to update transaction');
  }
});

// DELETE /api/holdings/:symbol/transactions/:id - Delete a stock transaction
router.delete('/:symbol/transactions/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const symbol = req.params.symbol.toUpperCase();
    const txId = parseInt(req.params.id);

    // Verify the transaction exists and belongs to this user/symbol
    const existing = await transactionQueries.getById(userId, txId);
    if (!existing) {
      return notFound(res, 'Transaction not found');
    }
    if (existing.symbol !== symbol) {
      return badRequest(res, 'Transaction does not belong to this symbol');
    }

    const accountId = existing.account_id!;
    await transactionQueries.delete(userId, txId);

    // Recalculate the holding from remaining transactions
    await recalcHolding(userId, symbol, accountId);

    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    internalError(res, 'Failed to delete transaction');
  }
});

export default router;
