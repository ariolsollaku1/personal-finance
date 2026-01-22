const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Common Types
export type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
export type Currency = 'EUR' | 'USD' | 'ALL';
export type TransactionType = 'inflow' | 'outflow';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

// Account Types
export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  is_favorite?: number;
  created_at: string;
  balance?: number;
  costBasis?: number; // For stock accounts: total cost basis of all holdings
  recurringInflow?: number; // Count of active recurring inflow transactions
  recurringOutflow?: number; // Count of active recurring outflow transactions
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface Payee {
  id: number;
  name: string;
  created_at: string;
}

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
  payee_name?: string;
  category_name?: string;
  balance?: number;
}

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
  is_active: number;
  created_at: string;
  payee_name?: string;
  category_name?: string;
  account_name?: string;
}

export interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  from_amount: number;
  to_amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  from_account_name?: string;
  to_account_name?: string;
  from_account_currency?: Currency;
  to_account_currency?: Currency;
}

export interface DashboardData {
  mainCurrency: Currency;
  totalNetWorth: number;
  byType: {
    bank: { count: number; total: number };
    cash: { count: number; total: number };
    stock: { count: number; total: number };
    loan: { count: number; total: number };
    credit: { count: number; total: number; owed: number };
    asset: { count: number; total: number };
  };
  stockPortfolio: {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange: number;
    dayChangePercent: number;
    holdingsCount: number;
  };
  accounts: {
    id: number;
    name: string;
    type: string;
    currency: Currency;
    balance: number;
    balanceInMainCurrency: number;
  }[];
  dueRecurring: {
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
  }[];
  recentTransactions: {
    id: number;
    accountId: number;
    accountName: string;
    type: string;
    amount: number;
    currency: Currency;
    date: string;
    payee: string | null;
    category: string | null;
  }[];
  exchangeRates: Record<Currency, number>;
}

// Accounts API
export const accountsApi = {
  getAll: () => fetchApi<Account[]>('/accounts'),
  get: (id: number) => fetchApi<Account>(`/accounts/${id}`),
  getPortfolio: (id: number) => fetchApi<PortfolioSummary>(`/accounts/${id}/portfolio`),
  create: (data: { name: string; type: AccountType; currency: Currency; initialBalance?: number }) =>
    fetchApi<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; currency?: Currency; initialBalance?: number }) =>
    fetchApi<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),
  setFavorite: (id: number, isFavorite: boolean) =>
    fetchApi<{ success: boolean; isFavorite: boolean }>(`/accounts/${id}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite }),
    }),
};

// Account Transactions API
export const accountTransactionsApi = {
  getByAccount: (accountId: number) =>
    fetchApi<AccountTransaction[]>(`/accounts/${accountId}/transactions`),
  create: (
    accountId: number,
    data: {
      type: TransactionType;
      amount: number;
      date: string;
      payee?: string;
      payeeId?: number;
      category?: string;
      categoryId?: number;
      notes?: string;
    }
  ) =>
    fetchApi<AccountTransaction>(`/accounts/${accountId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    accountId: number,
    txId: number,
    data: {
      type?: TransactionType;
      amount?: number;
      date?: string;
      payee?: string;
      payeeId?: number;
      category?: string;
      categoryId?: number;
      notes?: string;
    }
  ) =>
    fetchApi<AccountTransaction>(`/accounts/${accountId}/transactions/${txId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (accountId: number, txId: number) =>
    fetchApi<{ success: boolean }>(`/accounts/${accountId}/transactions/${txId}`, { method: 'DELETE' }),
};

// Categories API
export const categoriesApi = {
  getAll: () => fetchApi<Category[]>('/categories'),
  create: (data: { name: string; type?: 'income' | 'expense' }) =>
    fetchApi<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name: string }) =>
    fetchApi<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
};

// Payees API
export const payeesApi = {
  getAll: () => fetchApi<Payee[]>('/payees'),
  search: (query: string) => fetchApi<Payee[]>(`/payees/search?q=${encodeURIComponent(query)}`),
  create: (data: { name: string }) =>
    fetchApi<Payee>('/payees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name: string }) =>
    fetchApi<Payee>(`/payees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/payees/${id}`, { method: 'DELETE' }),
  merge: (sourceId: number, targetId: number) =>
    fetchApi<{ success: boolean; message: string }>('/payees/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId }),
    }),
};

// Recurring Transactions API
export const recurringApi = {
  getByAccount: (accountId: number) =>
    fetchApi<RecurringTransaction[]>(`/recurring/accounts/${accountId}/recurring`),
  getDue: () => fetchApi<RecurringTransaction[]>('/recurring/due'),
  create: (
    accountId: number,
    data: {
      type: TransactionType;
      amount: number;
      payee?: string;
      payeeId?: number;
      category?: string;
      categoryId?: number;
      notes?: string;
      frequency: Frequency;
      nextDueDate: string;
    }
  ) =>
    fetchApi<RecurringTransaction>(`/recurring/accounts/${accountId}/recurring`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    id: number,
    data: {
      type?: TransactionType;
      amount?: number;
      payee?: string;
      payeeId?: number;
      category?: string;
      categoryId?: number;
      notes?: string;
      frequency?: Frequency;
      nextDueDate?: string;
      isActive?: boolean;
    }
  ) =>
    fetchApi<RecurringTransaction>(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/recurring/${id}`, { method: 'DELETE' }),
  apply: (id: number, date?: string) =>
    fetchApi<{ transaction: AccountTransaction; recurring: RecurringTransaction; message: string }>(
      `/recurring/${id}/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ date }),
      }
    ),
};

// Transfers API
export const transfersApi = {
  getAll: () => fetchApi<Transfer[]>('/transfers'),
  get: (id: number) => fetchApi<Transfer>(`/transfers/${id}`),
  create: (data: {
    fromAccountId: number;
    toAccountId: number;
    fromAmount: number;
    toAmount?: number;
    date: string;
    notes?: string;
  }) =>
    fetchApi<Transfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/transfers/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardApi = {
  get: () => fetchApi<DashboardData>('/dashboard'),
  getCurrencySettings: () =>
    fetchApi<{ mainCurrency: Currency; exchangeRates: Record<Currency, number> }>('/dashboard/settings/currency'),
  setCurrency: (currency: Currency) =>
    fetchApi<{ mainCurrency: Currency }>('/dashboard/settings/currency', {
      method: 'PUT',
      body: JSON.stringify({ currency }),
    }),
  getSidebarCollapsed: () => fetchApi<{ collapsed: boolean }>('/dashboard/settings/sidebar'),
  setSidebarCollapsed: (collapsed: boolean) =>
    fetchApi<{ collapsed: boolean }>('/dashboard/settings/sidebar', {
      method: 'PUT',
      body: JSON.stringify({ collapsed }),
    }),
};

// Portfolio API
export interface HoldingWithQuote {
  id: number;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  name: string;
}

export interface PortfolioSummary {
  cashBalance: number;
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: HoldingWithQuote[];
}

export const portfolioApi = {
  getSummary: () => fetchApi<PortfolioSummary>('/portfolio'),
};

// Holdings API
export interface Holding {
  id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  created_at: string;
}

export const holdingsApi = {
  getAll: () => fetchApi<Holding[]>('/holdings'),
  getByAccount: (accountId: number) => fetchApi<Holding[]>(`/holdings/account/${accountId}`),
  get: (symbol: string, accountId?: number) =>
    fetchApi<Holding>(`/holdings/${symbol}${accountId ? `?accountId=${accountId}` : ''}`),
  create: (data: { symbol: string; shares: number; price: number; fees?: number; date?: string; accountId: number }) =>
    fetchApi<Holding>('/holdings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/holdings/${id}`, { method: 'DELETE' }),
  sell: (symbol: string, data: { shares: number; price: number; fees?: number; date?: string; accountId: number }) =>
    fetchApi<{ success: boolean; holding: Holding | null }>(`/holdings/${symbol}/sell`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Transactions API
export interface Transaction {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  fees: number;
  date: string;
  created_at: string;
}

export const transactionsApi = {
  getAll: (symbol?: string) =>
    fetchApi<Transaction[]>(`/transactions${symbol ? `?symbol=${symbol}` : ''}`),
  create: (data: {
    symbol: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    fees?: number;
    date: string;
  }) =>
    fetchApi<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),
};

// Dividends API
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
  created_at: string;
}

export interface TaxSummaryYear {
  year: string;
  total_gross: number;
  total_tax: number;
  total_net: number;
  dividend_count: number;
}

export interface TaxSummary {
  currentTaxRate: number;
  summary: TaxSummaryYear[];
}

export const dividendsApi = {
  getAll: (symbol?: string, year?: number, accountId?: number) => {
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    if (year) params.set('year', year.toString());
    if (accountId) params.set('accountId', accountId.toString());
    const query = params.toString();
    return fetchApi<Dividend[]>(`/dividends${query ? `?${query}` : ''}`);
  },
  getByAccount: (accountId: number) => fetchApi<Dividend[]>(`/dividends/account/${accountId}`),
  create: (data: {
    symbol: string;
    amountPerShare: number;
    sharesHeld?: number;
    exDate: string;
    payDate?: string;
    accountId: number;
  }) =>
    fetchApi<Dividend>('/dividends', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/dividends/${id}`, { method: 'DELETE' }),
  getTaxSummary: (year?: number, accountId?: number) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year.toString());
    if (accountId) params.set('accountId', accountId.toString());
    const query = params.toString();
    return fetchApi<TaxSummary>(`/dividends/tax${query ? `?${query}` : ''}`);
  },
  setTaxRate: (rate: number) =>
    fetchApi<{ success: boolean; rate: number }>('/dividends/tax-rate', {
      method: 'PUT',
      body: JSON.stringify({ rate }),
    }),
  checkDividends: (accountId: number) =>
    fetchApi<{
      message: string;
      dividendsFound: number;
      dividendsCreated: number;
      transactionsCreated: number;
      newDividends: Array<{
        id: number;
        symbol: string;
        exDate: string;
        payDate: string;
        sharesHeld: number;
        grossAmount: number;
        netAmount: number;
        transactionCreated: boolean;
      }>;
    }>(`/dividends/check/${accountId}`, { method: 'POST' }),
};

// Projection Types
export interface MonthlyProjectionData {
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

export interface ProjectionData {
  mainCurrency: Currency;
  currentMonth: string;
  ytd: MonthlyProjectionData[];
  future: MonthlyProjectionData[];
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

// Projection API
export const projectionApi = {
  get: () => fetchApi<ProjectionData>('/projection'),
};

// P&L Types
export interface MonthlyPnL {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export interface PnLSummary {
  mainCurrency: Currency;
  months: MonthlyPnL[];
}

export interface PnLTransactionDetail {
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

export interface PnLMonthDetail {
  month: string;
  label: string;
  mainCurrency: Currency;
  income: number;
  expenses: number;
  net: number;
  transactions: PnLTransactionDetail[];
}

// P&L API
export const pnlApi = {
  getSummary: () => fetchApi<PnLSummary>('/pnl'),
  getMonth: (month: string) => fetchApi<PnLMonthDetail>(`/pnl/${month}`),
};

// Quotes API
export interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  currency?: string;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange: string;
  quoteType: string;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export const quotesApi = {
  get: (symbol: string) => fetchApi<Quote>(`/quotes/${symbol}`),
  search: (query: string) => fetchApi<SearchResult[]>(`/quotes/search?q=${encodeURIComponent(query)}`),
  getHistory: (symbol: string, period = '1y', interval = '1d') =>
    fetchApi<HistoricalPrice[]>(`/quotes/${symbol}/history?period=${period}&interval=${interval}`),
};
