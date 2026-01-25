/**
 * Shared type definitions for Personal Finance Manager
 * Used by both frontend and backend to ensure type consistency
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

export type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
export type Currency = 'EUR' | 'USD' | 'ALL' | 'GBP' | 'CHF' | 'NOK' | 'SEK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'RON' | 'BGN';
export type TransactionType = 'inflow' | 'outflow';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type CategoryType = 'income' | 'expense';
export type StockTransactionType = 'buy' | 'sell';

// =============================================================================
// Base Entity Interfaces (database columns)
// =============================================================================

/**
 * Account - Base fields from database
 */
export interface AccountBase {
  id: number;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  is_favorite: boolean;
  created_at: string;
}

/**
 * Account with user_id (server-side)
 */
export interface Account extends AccountBase {
  user_id: string;
}

/**
 * Account with computed fields (API response)
 */
export interface AccountWithBalance extends AccountBase {
  balance?: number;
  costBasis?: number;
  recurringInflow?: number;
  recurringOutflow?: number;
}

/**
 * Category
 */
export interface Category {
  id: number;
  user_id?: string; // Only on server
  name: string;
  type: CategoryType;
  created_at: string;
}

/**
 * Payee
 */
export interface Payee {
  id: number;
  user_id?: string; // Only on server
  name: string;
  created_at: string;
}

/**
 * Account Transaction (bank/cash transactions)
 */
export interface AccountTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  date: string;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  transfer_id: number | null;
  created_at: string;
  // Joined fields (optional)
  payee_name?: string;
  category_name?: string;
  balance?: number; // Running balance (client-side computed)
}

/**
 * Recurring Transaction
 */
export interface RecurringTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  frequency: Frequency;
  next_due_date: string;
  is_active: boolean | number; // boolean on server, may be number from SQLite
  created_at: string;
  // Joined fields (optional)
  payee_name?: string;
  category_name?: string;
  account_name?: string;
  account_currency?: Currency;
}

/**
 * Transfer between accounts
 */
export interface Transfer {
  id: number;
  user_id?: string; // Only on server
  from_account_id: number;
  to_account_id: number;
  from_amount: number;
  to_amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  // Joined fields (optional)
  from_account_name?: string;
  to_account_name?: string;
  from_account_currency?: Currency;
  to_account_currency?: Currency;
}

/**
 * Stock Holding
 */
export interface Holding {
  id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  account_id: number | null;
  created_at: string;
}

/**
 * Stock Transaction (buy/sell)
 */
export interface StockTransaction {
  id: number;
  symbol: string;
  type: StockTransactionType;
  shares: number;
  price: number;
  fees: number;
  date: string;
  account_id: number | null;
  created_at: string;
}

/**
 * Dividend payment
 */
export interface Dividend {
  id: number;
  symbol: string;
  amount: number;
  shares_held: number;
  ex_date: string;
  pay_date: string | null;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  account_id: number | null;
  created_at: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Type summary for dashboard
 */
export interface TypeSummary {
  count: number;
  total: number;
  owed?: number; // For credit cards
}

/**
 * Stock portfolio summary
 */
export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

/**
 * Account summary for dashboard
 */
export interface AccountSummary {
  id: number;
  name: string;
  type: string;
  currency: Currency;
  balance: number;
  balanceInMainCurrency: number;
}

/**
 * Recent transaction for dashboard
 */
export interface RecentTransaction {
  id: number;
  accountId: number;
  accountName: string;
  type: string;
  amount: number;
  currency: Currency;
  date: string;
  payee: string | null;
  category: string | null;
}

/**
 * Due recurring transaction for dashboard
 */
export interface DueRecurring {
  id: number;
  accountId: number;
  accountName: string;
  type: string;
  amount: number;
  currency: Currency;
  payee: string | null;
  category: string | null;
  frequency: string;
  nextDueDate: string;
}

/**
 * Exchange rates record
 */
export type ExchangeRates = Record<Currency, number>;

/**
 * Dashboard data response
 */
export interface DashboardData {
  mainCurrency: Currency;
  totalNetWorth: number;
  byType: {
    bank: TypeSummary;
    cash: TypeSummary;
    stock: TypeSummary;
    loan: TypeSummary;
    credit: TypeSummary & { owed: number };
    asset: TypeSummary;
  };
  stockPortfolio: PortfolioSummary;
  accounts: AccountSummary[];
  dueRecurring: DueRecurring[];
  recentTransactions: RecentTransaction[];
  exchangeRates: ExchangeRates;
}

// =============================================================================
// Projection Types
// =============================================================================

export interface MonthlyData {
  month: string;
  label: string;
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

// =============================================================================
// P&L Types
// =============================================================================

export interface PnLMonth {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface PnLTransaction {
  id: number;
  date: string;
  type: TransactionType;
  amount: number;
  amountInMainCurrency?: number;
  payee: string | null;
  category: string | null;
  accountName: string;
  accountCurrency: Currency | string;
  notes?: string | null;
}

export interface PnLDetail {
  month: string;
  label: string;
  mainCurrency?: Currency;
  income: number;
  expenses: number;
  net: number;
  transactions: PnLTransaction[];
}

export interface PnLSummary {
  mainCurrency: Currency;
  months: PnLMonth[];
}
