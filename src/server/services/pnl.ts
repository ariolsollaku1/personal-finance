import { query } from '../db/schema.js';
import { settingsQueries, accountQueries, Currency } from '../db/queries.js';
import { convertToMainCurrency, roundCurrency } from './currency.js';

export interface MonthlyPnL {
  month: string; // YYYY-MM
  label: string; // "January 2026"
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface TransactionDetail {
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

export interface PnLSummary {
  mainCurrency: Currency;
  months: MonthlyPnL[];
}

export interface PnLDetail {
  month: string;
  label: string;
  mainCurrency: Currency;
  income: number;
  expenses: number;
  net: number;
  transactions: TransactionDetail[];
}

interface RawTransaction {
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
}

/**
 * Format date to YYYY-MM-DD string (handles both Date objects and strings)
 */
function formatDateString(date: Date | string): string {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date).split('T')[0];
}

/**
 * Get monthly P&L summaries
 */
export async function getMonthlySummaries(userId: string): Promise<PnLSummary> {
  const mainCurrency = await settingsQueries.getMainCurrency(userId);
  const accounts = await accountQueries.getAll(userId);
  const accountIds = accounts.map(a => a.id);

  if (accountIds.length === 0) {
    return {
      mainCurrency,
      months: [],
    };
  }

  // Get all transactions with account info, starting from Jan 2026
  const transactions = await query<RawTransaction>(`
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

    const dateStr = formatDateString(tx.date);
    const monthKey = dateStr.substring(0, 7); // YYYY-MM

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { income: 0, expenses: 0, count: 0 });
    }

    const data = monthlyData.get(monthKey)!;
    const amountInMain = convertToMainCurrency(
      Number(tx.amount),
      tx.account_currency as Currency,
      mainCurrency
    );

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
        income: roundCurrency(data.income),
        expenses: roundCurrency(data.expenses),
        net: roundCurrency(data.income - data.expenses),
        transactionCount: data.count,
      });
    }
  }

  return {
    mainCurrency,
    months,
  };
}

/**
 * Get transaction details for a specific month
 */
export async function getMonthDetail(userId: string, month: string): Promise<PnLDetail> {
  const mainCurrency = await settingsQueries.getMainCurrency(userId);

  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Invalid month format. Use YYYY-MM');
  }

  const accounts = await accountQueries.getAll(userId);
  const accountIds = accounts.map(a => a.id);

  const [year, monthNum] = month.split('-').map(Number);
  const monthDate = new Date(year, monthNum - 1, 1);
  const label = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (accountIds.length === 0) {
    return {
      month,
      label,
      mainCurrency,
      income: 0,
      expenses: 0,
      net: 0,
      transactions: [],
    };
  }

  // Get transactions for the month
  const startDate = `${month}-01`;
  const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // Last day of month

  const transactions = await query<RawTransaction>(`
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

    const amountInMain = convertToMainCurrency(
      Number(tx.amount),
      tx.account_currency as Currency,
      mainCurrency
    );

    if (tx.type === 'inflow') {
      totalIncome += amountInMain;
    } else {
      totalExpenses += amountInMain;
    }

    details.push({
      id: tx.id,
      date: formatDateString(tx.date),
      type: tx.type as 'inflow' | 'outflow',
      amount: Number(tx.amount),
      amountInMainCurrency: roundCurrency(amountInMain),
      payee: tx.payee_name,
      category: tx.category_name,
      accountName: tx.account_name,
      accountCurrency: tx.account_currency,
      notes: tx.notes,
    });
  }

  return {
    month,
    label,
    mainCurrency,
    income: roundCurrency(totalIncome),
    expenses: roundCurrency(totalExpenses),
    net: roundCurrency(totalIncome - totalExpenses),
    transactions: details,
  };
}
