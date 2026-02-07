import { Router, Request, Response } from 'express';
import { dividendQueries, holdingsQueries, transactionQueries, accountTransactionQueries, accountQueries, settingsQueries } from '../db/queries.js';
import { getDividendHistory } from '../services/yahoo.js';
import { sendSuccess, badRequest, notFound, internalError } from '../utils/response.js';
import {
  validateParams,
  validateBody,
  idParamSchema,
  accountIdParamSchema,
  createDividendSchema,
  setTaxRateSchema,
  CreateDividendInput,
} from '../validation/index.js';

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
router.get('/account/:accountId', validateParams(accountIdParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = (req.params as any).accountId as number;
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
router.post('/', validateBody(createDividendSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { symbol, amountPerShare, sharesHeld, exDate, payDate, accountId } = req.body as CreateDividendInput;

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
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = (req.params as any).id as number;
    await dividendQueries.delete(userId, id);
    sendSuccess(res, { deleted: true });
  } catch (error) {
    console.error('Error deleting dividend:', error);
    internalError(res, 'Failed to delete dividend');
  }
});

// PUT /api/dividends/tax-rate - Update dividend tax rate
router.put('/tax-rate', validateBody(setTaxRateSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { rate } = req.body as { rate: number };

    await settingsQueries.set(userId, 'dividend_tax_rate', rate.toString());
    sendSuccess(res, { rate });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    internalError(res, 'Failed to update tax rate');
  }
});

// POST /api/dividends/check/:accountId - Check and auto-record dividends for an account
router.post('/check/:accountId', validateParams(accountIdParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accountId = (req.params as any).accountId as number;

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
      existingDividends.map(d => `${d.symbol}-${new Date(d.ex_date).toISOString().split('T')[0]}`)
    );

    for (const holding of holdings) {
      // Skip closed positions (0 shares) — no future dividends
      if (Number(holding.shares) <= 0) continue;

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
        // Sort chronologically and replay transactions up to and including ex-date
        let sharesHeldOnExDate = 0;
        const sortedTransactions = [...stockTransactions].sort(
          (a, b) => a.date.localeCompare(b.date) || a.id - b.id
        );
        for (const tx of sortedTransactions) {
          const txDate = new Date(tx.date).toISOString().split('T')[0];
          if (txDate > exDate) break;
          if (tx.type === 'buy') {
            sharesHeldOnExDate += Number(tx.shares);
          } else if (tx.type === 'sell') {
            sharesHeldOnExDate -= Number(tx.shares);
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

        // Estimate payment date (typically ~2 weeks after ex-date)
        const payDate = new Date(dividend.date);
        payDate.setDate(payDate.getDate() + 15);
        const payDateStr = payDate.toISOString().split('T')[0];

        // Create dividend record (returns null if duplicate)
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

        // Skip if duplicate (already exists in DB)
        if (dividendId === null) continue;

        dividendsCreated++;
        existingDividendKeys.add(dividendKey);

        newDividends.push({
          id: dividendId,
          symbol: holding.symbol,
          exDate,
          payDate: payDateStr,
          sharesHeld: sharesHeldOnExDate,
          grossAmount,
          netAmount,
        });
      }
    }

    // Process existing dividends whose payment date has passed but no account transaction yet
    const unpaidDue = await dividendQueries.getUnpaidDue(accountId);
    for (const div of unpaidDue) {
      if (!div.pay_date) continue;
      const payDateStr = new Date(div.pay_date).toISOString().split('T')[0];
      const netAmount = Number(div.net_amount);
      const sharesHeld = Number(div.shares_held);
      const divTaxRate = Number(div.tax_rate);
      const amountPerShare = sharesHeld > 0 ? Number(div.amount) / sharesHeld : 0;

      await accountTransactionQueries.create(
        userId,
        accountId,
        'inflow',
        netAmount,
        payDateStr,
        null,
        null,
        `Dividend: ${div.symbol} ($${amountPerShare.toFixed(4)}/share x ${sharesHeld} shares, ${(divTaxRate * 100).toFixed(0)}% tax)`
      );
      await dividendQueries.markTransactionCreated(div.id);
      transactionsCreated++;
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
