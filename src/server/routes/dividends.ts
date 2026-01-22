import { Router } from 'express';
import { dividendQueries, holdingsQueries } from '../db/queries.js';
import { calculateDividendTax, getCurrentTaxRate, setTaxRate } from '../services/tax.js';

const router = Router();

// GET /api/dividends - List all dividends (with optional filters)
router.get('/', (req, res) => {
  try {
    const { symbol, year, accountId } = req.query;
    const parsedAccountId = accountId ? parseInt(accountId as string) : undefined;

    if (year) {
      const dividends = dividendQueries.getByYear(parseInt(year as string), parsedAccountId);
      return res.json(dividends);
    }

    if (symbol) {
      const dividends = dividendQueries.getBySymbol(symbol as string, parsedAccountId);
      return res.json(dividends);
    }

    if (parsedAccountId) {
      const dividends = dividendQueries.getByAccount(parsedAccountId);
      return res.json(dividends);
    }

    const dividends = dividendQueries.getAll();
    res.json(dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    res.status(500).json({ error: 'Failed to fetch dividends' });
  }
});

// GET /api/dividends/account/:accountId - List dividends for specific account
router.get('/account/:accountId', (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId);
    const dividends = dividendQueries.getByAccount(accountId);
    res.json(dividends);
  } catch (error) {
    console.error('Error fetching dividends:', error);
    res.status(500).json({ error: 'Failed to fetch dividends' });
  }
});

// GET /api/dividends/tax - Get tax summary (with optional accountId filter)
router.get('/tax', (req, res) => {
  try {
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const summary = dividendQueries.getTaxSummary(undefined, accountId);
    const currentTaxRate = getCurrentTaxRate();

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
router.post('/', (req, res) => {
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
      const holding = holdingsQueries.getBySymbol(symbol.toUpperCase(), accountId);
      if (holding) {
        shares = holding.shares;
      } else {
        return res.status(400).json({
          error: 'Shares held is required when no holding exists for this symbol in this account',
        });
      }
    }

    // Calculate tax
    const taxCalc = calculateDividendTax(amountPerShare, shares);

    const id = dividendQueries.create(
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
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = dividendQueries.delete(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dividend not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dividend:', error);
    res.status(500).json({ error: 'Failed to delete dividend' });
  }
});

// PUT /api/dividends/tax-rate - Update dividend tax rate
router.put('/tax-rate', (req, res) => {
  try {
    const { rate } = req.body;

    if (rate === undefined || rate < 0 || rate > 1) {
      return res.status(400).json({
        error: 'Rate is required and must be between 0 and 1',
      });
    }

    setTaxRate(rate);
    res.json({ success: true, rate });
  } catch (error) {
    console.error('Error updating tax rate:', error);
    res.status(500).json({ error: 'Failed to update tax rate' });
  }
});

export default router;
