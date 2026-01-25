import { Router, Request, Response } from 'express';
import { dividendQueries, holdingsQueries, transactionQueries, accountTransactionQueries, accountQueries, settingsQueries } from '../db/queries.js';
import { getDividendHistory } from '../services/yahoo.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';

const router = Router();

// GET /api/dividends - List all dividends (with optional filters)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, year, accountId } = req.query;
    const parsedAccountId = accountId ? parseInt(accountId as string) : undefined;

    if (year) {
      const dividends = await dividendQueries.getByYear(userId, parseInt(year as string), parsedAccountId);
      return sendSuccess(res, dividends);
    }

    if (symbol) {
      const dividends = await dividendQueries.getBySymbol(userId, symbol as string, parsedAccountId);
      return sendSuccess(res, dividends);
    }

    if (parsedAccountId) {
      const dividends = await dividendQueries.getByAccount(userId, parsedAccountId);
      return sendSuccess(res, dividends);
    }

    const dividends = await dividendQueries.getAll(userId);
    sendSuccess(res, dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    internalError(res, 'Failed to fetch dividends');
  }
});

// GET /api/dividends/account/:accountId - List dividends for specific account
router.get('/account/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.accountId);
    const dividends = await dividendQueries.getByAccount(userId, accountId);
    sendSuccess(res, dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    internalError(res, 'Failed to fetch dividends');
  }
});

// GET /api/dividends/tax - Get tax summary (with optional accountId filter)
router.get('/tax', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const summary = await dividendQueries.getTaxSummary(userId, undefined, accountId);
    const currentTaxRate = await settingsQueries.getDividendTaxRate(userId);

    sendSuccess(res, {
      currentTaxRate,
      summary,
    });
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    internalError(res, 'Failed to fetch tax summary');
  }
});

// POST /api/dividends - Record a dividend payment (requires accountId)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, amountPerShare, sharesHeld, exDate, payDate, accountId } = req.body;

    if (!symbol || !amountPerShare || !exDate) {
      return badRequest(res, 'Symbol, amountPerShare, and exDate are required');
    }

    if (!accountId) {
      return badRequest(res, 'accountId is required');
    }

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    // If sharesHeld not provided, try to get from current holdings for this account
    let shares = sharesHeld;
    if (!shares) {
      const holding = await holdingsQueries.getBySymbol(userId, symbol.toUpperCase(), accountId);
      if (holding) {
        shares = Number(holding.shares);
      } else {
        return badRequest(res, 'Shares held is required when no holding exists for this symbol in this account');
      }
    }

    // Calculate tax
    const taxRate = await settingsQueries.getDividendTaxRate(userId);
    const grossAmount = amountPerShare * shares;
    const taxAmount = grossAmount * taxRate;
    const netAmount = grossAmount - taxAmount;

    const id = await dividendQueries.create(
      userId,
      symbol.toUpperCase(),
      grossAmount,
      shares,
      exDate,
      payDate || null,
      taxRate,
      taxAmount,
      netAmount,
      accountId
    );

    sendSuccess(res, {
      id,
      symbol: symbol.toUpperCase(),
      amount: grossAmount,
      shares_held: shares,
      ex_date: exDate,
      pay_date: payDate || null,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      net_amount: netAmount,
      account_id: accountId,
    }, 201);
  } catch (error) {
    console.error('Error creating dividend:', error);
    internalError(res, 'Failed to create dividend');
  }
});

// DELETE /api/dividends/:id - Delete a dividend record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = parseInt(req.params.id);
    await dividendQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting dividend:', error);
    internalError(res, 'Failed to delete dividend');
  }
});

// PUT /api/dividends/tax-rate - Update dividend tax rate
router.put('/tax-rate', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { rate } = req.body;

    if (rate === undefined || rate < 0 || rate > 1) {
      return badRequest(res, 'Rate is required and must be between 0 and 1');
    }

    await settingsQueries.set(userId, 'dividend_tax_rate', rate.toString());
    sendSuccess(res, { rate });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    internalError(res, 'Failed to update tax rate');
  }
});

// POST /api/dividends/check/:accountId - Check and auto-record dividends for an account
router.post('/check/:accountId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.accountId);

    // Verify account belongs to user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) {
      return notFound(res, 'Account not found');
    }

    // Get all holdings for this account
    const holdings = await holdingsQueries.getByAccount(userId, accountId);

    if (holdings.length === 0) {
      return sendSuccess(res, { message: 'No holdings found', dividendsFound: 0, dividendsCreated: 0, transactionsCreated: 0 });
    }

    const today = new Date().toISOString().split('T')[0];
    const taxRate = await settingsQueries.getDividendTaxRate(userId);
    let dividendsFound = 0;
    let dividendsCreated = 0;
    let transactionsCreated = 0;
    const newDividends: any[] = [];

    // Get existing dividends for this account to avoid duplicates
    const existingDividends = await dividendQueries.getByAccount(userId, accountId);
    const existingDividendKeys = new Set(
      existingDividends.map(d => `${d.symbol}-${d.ex_date}`)
    );

    for (const holding of holdings) {
      // Get dividend history from Yahoo Finance
      const dividendHistory = await getDividendHistory(holding.symbol);

      // Get stock transactions for this symbol to determine ownership history
      const stockTransactions = await transactionQueries.getBySymbol(userId, holding.symbol, accountId);

      for (const dividend of dividendHistory) {
        dividendsFound++;

        const exDate = dividend.date.toISOString().split('T')[0];
        const dividendKey = `${holding.symbol}-${exDate}`;

        // Skip if already recorded
        if (existingDividendKeys.has(dividendKey)) {
          continue;
        }

        // Calculate shares held on ex-dividend date
        // Start from 0 and replay transactions up to and including ex-date
        let sharesHeldOnExDate = 0;
        for (const tx of [...stockTransactions].reverse()) { // oldest first
          if (tx.date <= exDate) {
            if (tx.type === 'buy') {
              sharesHeldOnExDate += Number(tx.shares);
            } else if (tx.type === 'sell') {
              sharesHeldOnExDate -= Number(tx.shares);
            }
          }
        }

        // If user didn't own any shares on ex-date, skip
        if (sharesHeldOnExDate <= 0) {
          continue;
        }

        // Calculate dividend amount and tax
        const grossAmount = dividend.dividends * sharesHeldOnExDate;
        const taxAmount = grossAmount * taxRate;
        const netAmount = grossAmount - taxAmount;

        // Estimate payment date (typically 2-4 weeks after ex-date)
        const payDate = new Date(dividend.date);
        payDate.setDate(payDate.getDate() + 30); // Assume ~30 days after ex-date
        const payDateStr = payDate.toISOString().split('T')[0];

        // Create dividend record
        const dividendId = await dividendQueries.create(
          userId,
          holding.symbol,
          grossAmount,
          sharesHeldOnExDate,
          exDate,
          payDateStr,
          taxRate,
          taxAmount,
          netAmount,
          accountId
        );
        dividendsCreated++;
        existingDividendKeys.add(dividendKey);

        // If payment date has passed, create an account transaction for the net dividend
        if (payDateStr <= today) {
          await accountTransactionQueries.create(
            userId,
            accountId,
            'inflow',
            netAmount,
            payDateStr,
            null,
            null,
            `Dividend: ${holding.symbol} ($${dividend.dividends.toFixed(4)}/share x ${sharesHeldOnExDate} shares, ${(taxRate * 100).toFixed(0)}% tax)`
          );
          transactionsCreated++;
        }

        newDividends.push({
          id: dividendId,
          symbol: holding.symbol,
          exDate,
          payDate: payDateStr,
          sharesHeld: sharesHeldOnExDate,
          grossAmount,
          netAmount,
          transactionCreated: payDateStr <= today,
        });
      }
    }

    sendSuccess(res, {
      message: `Checked ${holdings.length} holding(s)`,
      dividendsFound,
      dividendsCreated,
      transactionsCreated,
      newDividends,
    });
  } catch (error) {
    console.error('Error checking dividends:', error);
    internalError(res, 'Failed to check dividends');
  }
});

export default router;
