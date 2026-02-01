// Import shared types and re-export for convenience
export type {
  AccountType,
  Currency,
  TransactionType,
  Frequency,
  CategoryType,
  AccountWithBalance as Account,
  Category,
  Payee,
  AccountTransaction,
  RecurringTransaction,
  Transfer,
  Holding,
  Dividend,
  DashboardData,
  TypeSummary,
  PortfolioSummary as DashboardPortfolioSummary,
  AccountSummary,
  RecentTransaction,
  DueRecurring,
  ExchangeRates,
  ProjectionData,
  MonthlyData as MonthlyProjectionData,
  RecurringItem,
  ProjectionSummary,
  PnLSummary,
  PnLMonth as MonthlyPnL,
  PnLDetail as PnLMonthDetail,
  PnLTransaction,
} from '../../shared/types';

import type {
  AccountType,
  Currency,
  TransactionType,
  Frequency,
  AccountWithBalance as Account,
  Category,
  Payee,
  AccountTransaction,
  RecurringTransaction,
  Transfer,
  Holding,
  Dividend,
  DashboardData,
  ProjectionData,
  PnLSummary,
  PnLDetail as PnLMonthDetail,
} from '../../shared/types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Cached access token - updated by AuthContext when session changes.
 * This avoids calling supabase.auth.getSession() on every API request.
 */
let cachedAccessToken: string | null = null;

/**
 * Set the cached access token. Called by AuthContext when session changes.
 * @param token - Access token or null when logged out
 */
export function setAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * Get the current cached access token.
 * @returns Cached access token or null
 */
export function getAccessToken(): string | null {
  return cachedAccessToken;
}

// Auth event types for session expiration handling
export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session-expired',
} as const;

/**
 * Dispatches an auth expiration event that can be caught by React components
 * to handle navigation using React Router instead of hard redirects
 */
function dispatchAuthExpired(reason: string) {
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED, { detail: { reason } })
  );
}

/** Sleep for specified milliseconds */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Check if error is retryable (network error or 5xx server error) */
function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  // Server errors (5xx)
  if (status && status >= 500 && status < 600) {
    return true;
  }
  // Rate limited (429) - retry after backoff
  if (status === 429) {
    return true;
  }
  return false;
}

/** Retry configuration */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds max
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Use cached token instead of fetching session on every request
  const token = cachedAccessToken;

  if (!token) {
    // Signal auth expiration - let React components handle navigation
    dispatchAuthExpired('not_authenticated');
    throw new Error('Not authenticated');
  }

  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Wait before retry (exponential backoff)
      if (attempt > 0) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
          RETRY_CONFIG.maxDelay
        );
        console.log(`Retrying ${endpoint} (attempt ${attempt + 1}) after ${delay}ms`);
        await sleep(delay);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options?.headers,
        },
      });

      lastStatus = response.status;

      if (response.status === 401) {
        // Session expired or invalid - don't retry, signal auth expiration
        dispatchAuthExpired('session_expired');
        throw new Error('Session expired');
      }

      // Check for retryable server errors before parsing JSON
      if (response.status >= 500 || response.status === 429) {
        lastError = new Error(`Server error: ${response.status}`);
        if (attempt < RETRY_CONFIG.maxRetries) {
          continue; // Retry
        }
      }

      const json = await response.json().catch(() => ({ error: 'Request failed' }));

      // Handle new envelope format: { success: true/false, data/error }
      if (typeof json === 'object' && json !== null && 'success' in json) {
        if (json.success === false) {
          throw new Error(json.error?.message || 'Request failed');
        }
        if (json.success === true && 'data' in json) {
          return json.data as T;
        }
      }

      // Handle legacy format (raw data or { error: 'message' })
      if (!response.ok) {
        throw new Error(json.error || 'Request failed');
      }

      return json as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry auth errors or client errors
      if (lastError.message === 'Session expired' || lastError.message === 'Not authenticated') {
        throw lastError;
      }

      // Check if error is retryable
      if (!isRetryableError(error, lastStatus) || attempt >= RETRY_CONFIG.maxRetries) {
        throw lastError;
      }
      // Otherwise, continue to retry
    }
  }

  throw lastError || new Error('Request failed after retries');
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

// Pagination types
export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedTransactions {
  transactions: AccountTransaction[];
  pagination: PaginationInfo;
}

// Account Transactions API
export const accountTransactionsApi = {
  getByAccount: (accountId: number) =>
    fetchApi<AccountTransaction[]>(`/accounts/${accountId}/transactions`),
  getByAccountPaginated: (accountId: number, page: number = 1, limit: number = 50) =>
    fetchApi<PaginatedTransactions>(`/accounts/${accountId}/transactions?page=${page}&limit=${limit}`),
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
  apply: (id: number, date?: string, amount?: number) =>
    fetchApi<{ transaction: AccountTransaction; recurring: RecurringTransaction; message: string }>(
      `/recurring/${id}/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ date, amount }),
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

// Holdings API (Holding type imported from shared)
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

// Transactions API (StockTransaction type)
export type { StockTransaction as Transaction } from '../../shared/types';
import type { StockTransaction as Transaction } from '../../shared/types';

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

// Dividends API (Dividend type imported from shared)
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

// Projection API (types imported from shared)
export const projectionApi = {
  get: () => fetchApi<ProjectionData>('/projection'),
};

// P&L API (types imported from shared)
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
