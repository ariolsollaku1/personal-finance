import { Router, Request, Response } from 'express';
import {
  accountQueries,
  recurringQueries,
  settingsQueries,
  holdingsQueries,
} from '../db/queries.js';

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

interface MonthlyData {
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

interface ProjectionData {
  mainCurrency: string;
  currentMonth: string;
  ytd: MonthlyData[];
  future: MonthlyData[];
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    projectedYearEndNetWorth: number;
    projectedNetWorthChange: number;
  };
  recurringBreakdown: {
    income: Array<{ name: string; amount: number; frequency: string; monthlyAmount: number }>;
    expenses: Array<{ name: string; amount: number; frequency: string; monthlyAmount: number; category: string }>;
  };
}

// Convert frequency to monthly multiplier
function getMonthlyMultiplier(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 4.33;
    case 'biweekly': return 2.17;
    case 'monthly': return 1;
    case 'yearly': return 1 / 12;
    default: return 1;
  }
}

// GET /api/projection - Get projection data
router.get('/', async (_req: Request, res: Response) => {
  try {
    const mainCurrency = await settingsQueries.get('main_currency') || 'ALL';
    const accounts = await accountQueries.getAll();

    // Get all active recurring transactions
    const allRecurring: Array<{
      id: number;
      account_id: number;
      type: string;
      amount: number;
      frequency: string;
      payee_name: string | null | undefined;
      category_name: string | null | undefined;
      account_currency: string;
    }> = [];

    for (const account of accounts) {
      const recurring = await recurringQueries.getByAccount(account.id);
      for (const rec of recurring) {
        if (rec.is_active) {
          allRecurring.push({
            id: rec.id,
            account_id: rec.account_id,
            type: rec.type,
            amount: Number(rec.amount),
            frequency: rec.frequency,
            payee_name: rec.payee_name,
            category_name: rec.category_name,
            account_currency: account.currency,
          });
        }
      }
    }

    // Calculate monthly income and expenses from recurring transactions
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const incomeBreakdown: Array<{ name: string; amount: number; frequency: string; monthlyAmount: number }> = [];
    const expenseBreakdown: Array<{ name: string; amount: number; frequency: string; monthlyAmount: number; category: string }> = [];

    for (const rec of allRecurring) {
      const monthlyAmount = rec.amount * getMonthlyMultiplier(rec.frequency);
      const monthlyAmountInMain = convertToMainCurrency(monthlyAmount, rec.account_currency, mainCurrency);

      if (rec.type === 'inflow') {
        monthlyIncome += monthlyAmountInMain;
        incomeBreakdown.push({
          name: rec.payee_name || 'Unknown',
          amount: rec.amount,
          frequency: rec.frequency,
          monthlyAmount: monthlyAmountInMain,
        });
      } else {
        monthlyExpenses += monthlyAmountInMain;
        expenseBreakdown.push({
          name: rec.payee_name || 'Unknown',
          amount: rec.amount,
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

    for (const account of accounts) {
      // Get the actual balance from the database
      const balanceInfo = await accountQueries.getBalance(account.id);
      const balance = balanceInfo?.balance || 0;
      const balanceInMain = convertToMainCurrency(balance, account.currency, mainCurrency);

      const accountType = account.type as keyof typeof currentByType;

      if (account.type === 'bank' || account.type === 'cash') {
        currentByType[accountType] = (currentByType[accountType] || 0) + balanceInMain;
        currentLiquidAssets += balanceInMain;
        currentNetWorth += balanceInMain;
      } else if (account.type === 'stock') {
        // For stock accounts, calculate cost basis from holdings
        const holdings = await holdingsQueries.getByAccount(account.id);
        let costBasis = 0;
        for (const holding of holdings) {
          costBasis += Number(holding.shares) * Number(holding.avg_cost);
        }
        const costInMain = convertToMainCurrency(costBasis, account.currency, mainCurrency);
        currentInvestments += costInMain;
        currentNetWorth += costInMain;
        currentByType.stock = costInMain;
      } else if (account.type === 'asset') {
        const assetValue = convertToMainCurrency(Number(account.initial_balance), account.currency, mainCurrency);
        currentAssets += assetValue;
        currentNetWorth += assetValue;
        currentByType.asset = assetValue;
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

    // Generate month labels
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

    // Calculate backwards from current month
    for (let m = 0; m <= currentMonthNum; m++) {
      const monthDate = new Date(currentYear, m, 1);
      const monthsFromCurrent = currentMonthNum - m;

      // Project backwards: current - (months * monthly savings)
      const projectedChange = monthsFromCurrent * monthlySavings;

      const monthData: MonthlyData = {
        month: formatMonthKey(monthDate),
        label: formatMonth(monthDate),
        netWorth: currentNetWorth - projectedChange,
        liquidAssets: currentLiquidAssets - projectedChange,
        investments: currentInvestments, // Stocks stay constant in this simple model
        assets: currentAssets, // Real estate stays constant
        totalDebt: currentTotalDebt, // Debt stays constant (mortgage payments reduce this but we simplify)
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
      };

      ytdData.push(monthData);
    }

    // Generate future 12 months data
    const futureData: MonthlyData[] = [];

    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(currentYear, currentMonthNum + m + 1, 1);
      const monthsFromNow = m + 1;

      // Project forwards: current + (months * monthly savings)
      const projectedChange = monthsFromNow * monthlySavings;

      const monthData: MonthlyData = {
        month: formatMonthKey(monthDate),
        label: formatMonth(monthDate),
        netWorth: currentNetWorth + projectedChange,
        liquidAssets: currentLiquidAssets + projectedChange,
        investments: currentInvestments,
        assets: currentAssets,
        totalDebt: currentTotalDebt, // Could reduce this based on mortgage payments
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
      };

      futureData.push(monthData);
    }

    // Calculate year-end projection
    const monthsToYearEnd = 12 - currentMonthNum - 1;
    const projectedYearEndNetWorth = currentNetWorth + (monthsToYearEnd * monthlySavings);

    const response: ProjectionData = {
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

    res.json(response);
  } catch (error) {
    console.error('Error generating projection:', error);
    res.status(500).json({ error: 'Failed to generate projection' });
  }
});

export default router;
