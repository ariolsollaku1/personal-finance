import {
  recurringQueries,
  settingsQueries,
  holdingsQueries,
  batchQueries,
  Currency,
  Holding,
} from '../db/queries.js';
import { convertToMainCurrency } from './currency.js';

export interface MonthlyData {
  month: string; // YYYY-MM
  label: string; // "Jan 2026"
  netWorth: number;
  liquidAssets: number;
  investments: number;
  assets: number;
  totalDebt: number;
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number;
  byType: {
    bank: number;
    cash: number;
    stock: number;
    asset: number;
    loan: number;
    credit: number;
  };
}

export interface RecurringItem {
  name: string;
  amount: number;
  frequency: string;
  monthlyAmount: number;
  category?: string;
}

export interface ProjectionSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  projectedYearEndNetWorth: number;
  projectedNetWorthChange: number;
}

export interface ProjectionData {
  mainCurrency: Currency;
  currentMonth: string;
  ytd: MonthlyData[];
  future: MonthlyData[];
  summary: ProjectionSummary;
  recurringBreakdown: {
    income: RecurringItem[];
    expenses: (RecurringItem & { category: string })[];
  };
}

/**
 * Convert frequency to monthly multiplier
 */
export function getMonthlyMultiplier(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 4.33;
    case 'biweekly': return 2.17;
    case 'monthly': return 1;
    case 'yearly': return 1 / 12;
    default: return 1;
  }
}

/**
 * Get monthly recurring totals for a user (using batch query)
 */
export async function getMonthlyRecurringTotals(
  userId: string,
  mainCurrency: Currency
): Promise<{ income: number; expenses: number }> {
  // Use the batch query that gets all recurring with account info
  const allRecurring = await recurringQueries.getAll(userId);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const rec of allRecurring) {
    if (!rec.is_active) continue;

    const monthlyAmount = Number(rec.amount) * getMonthlyMultiplier(rec.frequency);
    const monthlyAmountInMain = convertToMainCurrency(monthlyAmount, rec.account_currency, mainCurrency);

    if (rec.type === 'inflow') {
      monthlyIncome += monthlyAmountInMain;
    } else {
      monthlyExpenses += monthlyAmountInMain;
    }
  }

  return { income: monthlyIncome, expenses: monthlyExpenses };
}

/**
 * Generate financial projection data using batch queries (no N+1)
 */
export async function generateProjection(userId: string): Promise<ProjectionData> {
  // Fetch all data in parallel using batch queries
  const [mainCurrency, accountsWithBalances, allRecurring, allHoldings] = await Promise.all([
    settingsQueries.getMainCurrency(userId),
    batchQueries.getAllAccountsWithBalances(userId),
    recurringQueries.getAll(userId), // Already returns with account_currency
    holdingsQueries.getAll(userId),
  ]);

  // Group holdings by account_id
  const holdingsByAccount = new Map<number, Holding[]>();
  for (const holding of allHoldings) {
    const accountId = holding.account_id!;
    if (!holdingsByAccount.has(accountId)) {
      holdingsByAccount.set(accountId, []);
    }
    holdingsByAccount.get(accountId)!.push(holding);
  }

  // Calculate monthly income and expenses from recurring transactions
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const incomeBreakdown: RecurringItem[] = [];
  const expenseBreakdown: (RecurringItem & { category: string })[] = [];

  for (const rec of allRecurring) {
    if (!rec.is_active) continue;

    const monthlyAmount = Number(rec.amount) * getMonthlyMultiplier(rec.frequency);
    const monthlyAmountInMain = convertToMainCurrency(monthlyAmount, rec.account_currency, mainCurrency);

    if (rec.type === 'inflow') {
      monthlyIncome += monthlyAmountInMain;
      incomeBreakdown.push({
        name: rec.payee_name || 'Unknown',
        amount: Number(rec.amount),
        frequency: rec.frequency,
        monthlyAmount: monthlyAmountInMain,
      });
    } else {
      monthlyExpenses += monthlyAmountInMain;
      expenseBreakdown.push({
        name: rec.payee_name || 'Unknown',
        amount: Number(rec.amount),
        frequency: rec.frequency,
        monthlyAmount: monthlyAmountInMain,
        category: rec.category_name || 'Uncategorized',
      });
    }
  }

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Calculate current balances by type
  const currentByType = {
    bank: 0,
    cash: 0,
    stock: 0,
    asset: 0,
    loan: 0,
    credit: 0,
  };

  let currentNetWorth = 0;
  let currentLiquidAssets = 0;
  let currentInvestments = 0;
  let currentAssets = 0;
  let currentTotalDebt = 0;

  for (const account of accountsWithBalances) {
    // Calculate balance from initial + transaction_total
    const balance = Number(account.initial_balance) + Number(account.transaction_total);
    const balanceInMain = convertToMainCurrency(balance, account.currency, mainCurrency);

    const accountType = account.type as keyof typeof currentByType;

    if (account.type === 'bank' || account.type === 'cash') {
      currentByType[accountType] = (currentByType[accountType] || 0) + balanceInMain;
      currentLiquidAssets += balanceInMain;
      currentNetWorth += balanceInMain;
    } else if (account.type === 'stock') {
      // For stock accounts, calculate cost basis from holdings (already fetched)
      const holdings = holdingsByAccount.get(account.id) || [];
      let costBasis = 0;
      for (const holding of holdings) {
        costBasis += Number(holding.shares) * Number(holding.avg_cost);
      }
      const costInMain = convertToMainCurrency(costBasis, account.currency, mainCurrency);
      currentInvestments += costInMain;
      currentNetWorth += costInMain;
      currentByType.stock += costInMain;
    } else if (account.type === 'asset') {
      const assetValue = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
      currentAssets += assetValue;
      currentNetWorth += assetValue;
      currentByType.asset += assetValue;
    } else if (account.type === 'loan') {
      currentByType.loan = (currentByType.loan || 0) + balanceInMain;
      currentTotalDebt += balanceInMain;
      currentNetWorth -= balanceInMain;
    } else if (account.type === 'credit') {
      const limitInMain = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
      const amountOwed = limitInMain - balanceInMain;
      currentByType.credit = (currentByType.credit || 0) + amountOwed;
      currentTotalDebt += amountOwed;
      currentNetWorth -= amountOwed;
    }
  }

  // Generate month labels and data
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();

  const formatMonth = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Generate YTD data (from January to current month)
  const ytdData: MonthlyData[] = [];
  for (let m = 0; m <= currentMonthNum; m++) {
    const monthDate = new Date(currentYear, m, 1);
    const monthsFromCurrent = currentMonthNum - m;
    const projectedChange = monthsFromCurrent * monthlySavings;

    ytdData.push({
      month: formatMonthKey(monthDate),
      label: formatMonth(monthDate),
      netWorth: currentNetWorth - projectedChange,
      liquidAssets: currentLiquidAssets - projectedChange,
      investments: currentInvestments,
      assets: currentAssets,
      totalDebt: currentTotalDebt,
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netCashFlow: monthlySavings,
      savingsRate: savingsRate,
      byType: {
        bank: currentByType.bank - projectedChange,
        cash: currentByType.cash,
        stock: currentByType.stock,
        asset: currentByType.asset,
        loan: currentByType.loan,
        credit: currentByType.credit,
      },
    });
  }

  // Generate future 12 months data
  const futureData: MonthlyData[] = [];
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(currentYear, currentMonthNum + m + 1, 1);
    const monthsFromNow = m + 1;
    const projectedChange = monthsFromNow * monthlySavings;

    futureData.push({
      month: formatMonthKey(monthDate),
      label: formatMonth(monthDate),
      netWorth: currentNetWorth + projectedChange,
      liquidAssets: currentLiquidAssets + projectedChange,
      investments: currentInvestments,
      assets: currentAssets,
      totalDebt: currentTotalDebt,
      income: monthlyIncome,
      expenses: monthlyExpenses,
      netCashFlow: monthlySavings,
      savingsRate: savingsRate,
      byType: {
        bank: currentByType.bank + projectedChange,
        cash: currentByType.cash,
        stock: currentByType.stock,
        asset: currentByType.asset,
        loan: currentByType.loan,
        credit: currentByType.credit,
      },
    });
  }

  // Calculate year-end projection
  const monthsToYearEnd = 12 - currentMonthNum - 1;
  const projectedYearEndNetWorth = currentNetWorth + (monthsToYearEnd * monthlySavings);

  return {
    mainCurrency,
    currentMonth: formatMonthKey(now),
    ytd: ytdData,
    future: futureData,
    summary: {
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      savingsRate,
      projectedYearEndNetWorth,
      projectedNetWorthChange: projectedYearEndNetWorth - (ytdData[0]?.netWorth || currentNetWorth),
    },
    recurringBreakdown: {
      income: incomeBreakdown.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
      expenses: expenseBreakdown.sort((a, b) => b.monthlyAmount - a.monthlyAmount),
    },
  };
}
