import { Router } from 'express';
import { dividendQueries, holdingsQueries, transactionQueries, accountTransactionQueries } from '../db/queries.js';
import { calculateDividendTax, getCurrentTaxRate, setTaxRate } from '../services/tax.js';
import { getDividendHistory } from '../services/yahoo.js';

const router = Router();

// GET /api/dividends - List all dividends (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { symbol, year, accountId } = req.query;
    const parsedAccountId = accountId ? parseInt(accountId as string) : undefined;

    if (year) {
      const dividends = await dividendQueries.getByYear(parseInt(year as string), parsedAccountId);
      return res.json(dividends);
    }

    if (symbol) {
      const dividends = await dividendQueries.getBySymbol(symbol as string, parsedAccountId);
      return res.json(dividends);
    }

    if (parsedAccountId) {
      const dividends = await dividendQueries.getByAccount(parsedAccountId);
      return res.json(dividends);
    }

    const dividends = await dividendQueries.getAll();
    res.json(dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    res.status(500).json({ error: 'Failed to fetch dividends' });
  }
});

// GET /api/dividends/account/:accountId - List dividends for specific account
router.get('/account/:accountId', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const dividends = await dividendQueries.getByAccount(accountId);
    res.json(dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    res.status(500).json({ error: 'Failed to fetch dividends' });
  }
});

// GET /api/dividends/tax - Get tax summary (with optional accountId filter)
router.get('/tax', async (req, res) => {
  try {
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const summary = await dividendQueries.getTaxSummary(undefined, accountId);
    const currentTaxRate = await getCurrentTaxRate();

    res.json({
      currentTaxRate,
      summary,
    });
  } catch (error) {
    console.error('Error fetching tax summary:', error);
    res.status(500).json({ error: 'Failed to fetch tax summary' });
  }
});

// POST /api/dividends - Record a dividend payment (requires accountId)
router.post('/', async (req, res) => {
  try {
    const { symbol, amountPerShare, sharesHeld, exDate, payDate, accountId } = req.body;

    if (!symbol || !amountPerShare || !exDate) {
      return res.status(400).json({
        error: 'Symbol, amountPerShare, and exDate are required',
      });
    }

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId is required',
      });
    }

    // If sharesHeld not provided, try to get from current holdings for this account
    let shares = sharesHeld;
    if (!shares) {
      const holding = await holdingsQueries.getBySymbol(symbol.toUpperCase(), accountId);
      if (holding) {
        shares = Number(holding.shares);
      } else {
        return res.status(400).json({
          error: 'Shares held is required when no holding exists for this symbol in this account',
        });
      }
    }

    // Calculate tax
    const taxCalc = await calculateDividendTax(amountPerShare, shares);

    const id = await dividendQueries.create(
      symbol.toUpperCase(),
      taxCalc.grossAmount,
      shares,
      exDate,
      payDate || null,
      taxCalc.taxRate,
      taxCalc.taxAmount,
      taxCalc.netAmount,
      accountId
    );

    res.status(201).json({
      id,
      symbol: symbol.toUpperCase(),
      amount: taxCalc.grossAmount,
      shares_held: shares,
      ex_date: exDate,
      pay_date: payDate || null,
      tax_rate: taxCalc.taxRate,
      tax_amount: taxCalc.taxAmount,
      net_amount: taxCalc.netAmount,
      account_id: accountId,
    });
  } catch (error) {
    console.error('Error creating dividend:', error);
    res.status(500).json({ error: 'Failed to create dividend' });
  }
});

// DELETE /api/dividends/:id - Delete a dividend record
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await dividendQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dividend:', error);
    res.status(500).json({ error: 'Failed to delete dividend' });
  }
});

// PUT /api/dividends/tax-rate - Update dividend tax rate
router.put('/tax-rate', async (req, res) => {
  try {
    const { rate } = req.body;

    if (rate === undefined || rate < 0 || rate > 1) {
      return res.status(400).json({
        error: 'Rate is required and must be between 0 and 1',
      });
    }

    await setTaxRate(rate);
    res.json({ success: true, rate });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

// POST /api/dividends/check/:accountId - Check and auto-record dividends for an account
router.post('/check/:accountId', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);

    // Get all holdings for this account
    const holdings = await holdingsQueries.getByAccount(accountId);

    if (holdings.length === 0) {
      return res.json({ message: 'No holdings found', dividendsFound: 0, dividendsCreated: 0, transactionsCreated: 0 });
    }

    const today = new Date().toISOString().split('T')[0];
    let dividendsFound = 0;
    let dividendsCreated = 0;
    let transactionsCreated = 0;
    const newDividends: any[] = [];

    // Get existing dividends for this account to avoid duplicates
    const existingDividends = await dividendQueries.getByAccount(accountId);
    const existingDividendKeys = new Set(
      existingDividends.map(d => `${d.symbol}-${d.ex_date}`)
    );

    for (const holding of holdings) {
      // Get dividend history from Yahoo Finance
      const dividendHistory = await getDividendHistory(holding.symbol);

      // Get stock transactions for this symbol to determine ownership history
      const stockTransactions = await transactionQueries.getBySymbol(holding.symbol, accountId);

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
        const taxCalc = await calculateDividendTax(dividend.dividends, sharesHeldOnExDate);

        // Estimate payment date (typically 2-4 weeks after ex-date)
        const payDate = new Date(dividend.date);
        payDate.setDate(payDate.getDate() + 30); // Assume ~30 days after ex-date
        const payDateStr = payDate.toISOString().split('T')[0];

        // Create dividend record
        const dividendId = await dividendQueries.create(
          holding.symbol,
          taxCalc.grossAmount,
          sharesHeldOnExDate,
          exDate,
          payDateStr,
          taxCalc.taxRate,
          taxCalc.taxAmount,
          taxCalc.netAmount,
          accountId
        );
        dividendsCreated++;
        existingDividendKeys.add(dividendKey);

        // If payment date has passed, create an account transaction for the net dividend
        if (payDateStr <= today) {
          await accountTransactionQueries.create(
            accountId,
            'inflow',
            taxCalc.netAmount,
            payDateStr,
            null,
            null,
            `Dividend: ${holding.symbol} ($${dividend.dividends.toFixed(4)}/share × ${sharesHeldOnExDate} shares, 30% tax)`
          );
          transactionsCreated++;
        }

        newDividends.push({
          id: dividendId,
          symbol: holding.symbol,
          exDate,
          payDate: payDateStr,
          sharesHeld: sharesHeldOnExDate,
          grossAmount: taxCalc.grossAmount,
          netAmount: taxCalc.netAmount,
          transactionCreated: payDateStr <= today,
        });
      }
    }

    res.json({
      message: `Checked ${holdings.length} holding(s)`,
      dividendsFound,
      dividendsCreated,
      transactionsCreated,
      newDividends,
    });
  } catch (error) {
    console.error('Error checking dividends:', error);
    res.status(500).json({ error: 'Failed to check dividends' });
  }
});

export default router;
