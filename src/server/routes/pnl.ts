import { Router, Request, Response } from 'express';
import { query } from '../db/schema.js';
import { settingsQueries, accountQueries } from '../db/queries.js';

const router = Router();

// Exchange rates (simplified - in production would fetch from API)
const EXCHANGE_RATES: Record<string, number> = {
  ALL: 1,
  EUR: 102.5,
  USD: 95,
};

function convertToMainCurrency(amount: number, fromCurrency: string, mainCurrency: string): number {
  if (fromCurrency === mainCurrency) return amount;
  const amountInALL = amount * EXCHANGE_RATES[fromCurrency];
  return amountInALL / EXCHANGE_RATES[mainCurrency];
}

interface MonthlyPnL {
  month: string; // YYYY-MM
  label: string; // "January 2026"
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

interface TransactionDetail {
  id: number;
  date: string;
  type: 'inflow' | 'outflow';
  amount: number;
  amountInMainCurrency: number;
  payee: string | null;
  category: string | null;
  accountName: string;
  accountCurrency: string;
  notes: string | null;
}

// GET /api/pnl - Get monthly P&L summaries
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const mainCurrency = await settingsQueries.getMainCurrency(userId);

    // Get all accounts for this user to filter transactions
    const accounts = await accountQueries.getAll(userId);
    const accountIds = accounts.map(a => a.id);

    if (accountIds.length === 0) {
      return res.json({
        mainCurrency,
        months: [],
      });
    }

    // Get all transactions with account info, starting from Jan 2026
    const transactions = await query<{
      id: number;
      account_id: number;
      type: string;
      amount: number;
      date: string;
      payee_id: number | null;
      category_id: number | null;
      notes: string | null;
      transfer_id: number | null;
      payee_name: string | null;
      category_name: string | null;
      account_name: string;
      account_currency: string;
    }>(`
      SELECT
        at.id,
        at.account_id,
        at.type,
        at.amount,
        at.date,
        at.payee_id,
        at.category_id,
        at.notes,
        at.transfer_id,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        a.currency as account_currency
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      LEFT JOIN accounts a ON at.account_id = a.id
      WHERE at.date >= '2026-01-01' AND at.account_id = ANY($1)
      ORDER BY at.date ASC
    `, [accountIds]);

    // Group by month
    const monthlyData: Map<string, { income: number; expenses: number; count: number }> = new Map();

    for (const tx of transactions) {
      // Skip transfers to avoid double counting
      if (tx.transfer_id) continue;

      const monthKey = tx.date.toString().substring(0, 7); // YYYY-MM

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0, count: 0 });
      }

      const data = monthlyData.get(monthKey)!;
      const amountInMain = convertToMainCurrency(Number(tx.amount), tx.account_currency, mainCurrency);

      if (tx.type === 'inflow') {
        data.income += amountInMain;
      } else {
        data.expenses += amountInMain;
      }
      data.count++;
    }

    // Generate all months from Jan 2026 to current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const months: MonthlyPnL[] = [];
    const startYear = 2026;
    const startMonth = 0; // January

    for (let year = startYear; year <= currentYear; year++) {
      const endMonth = year === currentYear ? currentMonth : 11;
      const startM = year === startYear ? startMonth : 0;

      for (let month = startM; month <= endMonth; month++) {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthDate = new Date(year, month, 1);
        const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const data = monthlyData.get(monthKey) || { income: 0, expenses: 0, count: 0 };

        months.push({
          month: monthKey,
          label,
          income: Math.round(data.income * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          net: Math.round((data.income - data.expenses) * 100) / 100,
          transactionCount: data.count,
        });
      }
    }

    res.json({
      mainCurrency,
      months,
    });
  } catch (error) {
    console.error('Error fetching P&L:', error);
    res.status(500).json({ error: 'Failed to fetch P&L data' });
  }
});

// GET /api/pnl/:month - Get transaction details for a specific month
router.get('/:month', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { month } = req.params; // Format: YYYY-MM
    const mainCurrency = await settingsQueries.getMainCurrency(userId);

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }

    // Get all accounts for this user to filter transactions
    const accounts = await accountQueries.getAll(userId);
    const accountIds = accounts.map(a => a.id);

    if (accountIds.length === 0) {
      const [year, monthNum] = month.split('-').map(Number);
      const monthDate = new Date(year, monthNum - 1, 1);
      const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return res.json({
        month,
        label,
        mainCurrency,
        income: 0,
        expenses: 0,
        net: 0,
        transactions: [],
      });
    }

    // Get transactions for the month
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split('-').map(Number);
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // Last day of month

    const transactions = await query<{
      id: number;
      account_id: number;
      type: string;
      amount: number;
      date: string;
      notes: string | null;
      transfer_id: number | null;
      payee_name: string | null;
      category_name: string | null;
      account_name: string;
      account_currency: string;
    }>(`
      SELECT
        at.id,
        at.account_id,
        at.type,
        at.amount,
        at.date,
        at.notes,
        at.transfer_id,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        a.currency as account_currency
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      LEFT JOIN accounts a ON at.account_id = a.id
      WHERE at.date >= $1 AND at.date <= $2 AND at.account_id = ANY($3)
      ORDER BY at.date DESC, at.id DESC
    `, [startDate, endDate, accountIds]);

    // Calculate totals and format transactions
    let totalIncome = 0;
    let totalExpenses = 0;

    const details: TransactionDetail[] = [];

    for (const tx of transactions) {
      // Skip transfers
      if (tx.transfer_id) continue;

      const amountInMain = convertToMainCurrency(Number(tx.amount), tx.account_currency, mainCurrency);

      if (tx.type === 'inflow') {
        totalIncome += amountInMain;
      } else {
        totalExpenses += amountInMain;
      }

      details.push({
        id: tx.id,
        date: tx.date.toString(),
        type: tx.type as 'inflow' | 'outflow',
        amount: Number(tx.amount),
        amountInMainCurrency: Math.round(amountInMain * 100) / 100,
        payee: tx.payee_name,
        category: tx.category_name,
        accountName: tx.account_name,
        accountCurrency: tx.account_currency,
        notes: tx.notes,
      });
    }

    const monthDate = new Date(year, monthNum - 1, 1);
    const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    res.json({
      month,
      label,
      mainCurrency,
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      transactions: details,
    });
  } catch (error) {
    console.error('Error fetching P&L details:', error);
    res.status(500).json({ error: 'Failed to fetch P&L details' });
  }
});

export default router;
