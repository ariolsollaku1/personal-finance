import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Account,
  AccountTransaction,
  RecurringTransaction,
  Dividend,
  accountsApi,
  accountTransactionsApi,
  recurringApi,
  categoriesApi,
  payeesApi,
  dividendsApi,
  Category,
  Payee,
  TransactionType,
  Frequency,
  HoldingWithQuote,
  TaxSummary,
} from '../lib/api';

export interface PortfolioData {
  cashBalance: number;
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: HoldingWithQuote[];
}

export interface NewRecurringForm {
  type: TransactionType;
  amount: string;
  payee: string;
  category: string;
  notes: string;
  frequency: Frequency;
  nextDueDate: string;
}

export interface EditAccountForm {
  name: string;
  initialBalance: number;
}

const initialNewRecurring: NewRecurringForm = {
  type: 'outflow',
  amount: '',
  payee: '',
  category: '',
  notes: '',
  frequency: 'monthly',
  nextDueDate: new Date().toISOString().split('T')[0],
};

export function useAccountPage(accountId: number) {
  // Core data state
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Stock account state
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Edit account form
  const [editAccountData, setEditAccountData] = useState<EditAccountForm>({
    name: '',
    initialBalance: 0,
  });

  // Auto-refresh ref
  const refreshIntervalRef = useRef<number | null>(null);

  // Load account data
  const loadAccount = useCallback(async () => {
    try {
      setLoading(true);
      const [accountData, categoriesData, payeesData] = await Promise.all([
        accountsApi.get(accountId),
        categoriesApi.getAll(),
        payeesApi.getAll(),
      ]);

      setAccount(accountData);
      setCategories(categoriesData);
      setPayees(payeesData);
      setEditAccountData({
        name: accountData.name,
        initialBalance: accountData.initial_balance,
      });

      // Load transactions and recurring for all account types
      const [txData, recurringData] = await Promise.all([
        accountTransactionsApi.getByAccount(accountId),
        recurringApi.getByAccount(accountId),
      ]);
      setTransactions(txData);
      setRecurring(recurringData);

      if (accountData.type === 'stock') {
        const [portfolioData, dividendsData, taxSummaryData] = await Promise.all([
          accountsApi.getPortfolio(accountId),
          dividendsApi.getByAccount(accountId),
          dividendsApi.getTaxSummary(undefined, accountId),
        ]);
        setPortfolio(portfolioData);
        setDividends(dividendsData);
        setTaxSummary(taxSummaryData);
        setLastUpdated(new Date());
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Light refresh - only updates data without full loading state
  const refreshData = useCallback(async () => {
    try {
      const [accountData, txData, recurringData] = await Promise.all([
        accountsApi.get(accountId),
        accountTransactionsApi.getByAccount(accountId),
        recurringApi.getByAccount(accountId),
      ]);
      setAccount(accountData);
      setTransactions(txData);
      setRecurring(recurringData);
      setEditAccountData({
        name: accountData.name,
        initialBalance: accountData.initial_balance,
      });

      if (accountData.type === 'stock') {
        const [portfolioData, dividendsData, taxSummaryData] = await Promise.all([
          accountsApi.getPortfolio(accountId),
          dividendsApi.getByAccount(accountId),
          dividendsApi.getTaxSummary(undefined, accountId),
        ]);
        setPortfolio(portfolioData);
        setDividends(dividendsData);
        setTaxSummary(taxSummaryData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, [accountId]);

  // Refresh only portfolio data (for auto-refresh)
  const refreshPortfolio = useCallback(async (isManual = false) => {
    if (!account || account.type !== 'stock') return;

    try {
      if (isManual) setRefreshing(true);
      const portfolioData = await accountsApi.getPortfolio(account.id);
      setPortfolio(portfolioData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh portfolio:', err);
    } finally {
      setRefreshing(false);
    }
  }, [account]);

  // Start/stop auto-refresh interval
  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) return;
    refreshIntervalRef.current = window.setInterval(() => refreshPortfolio(false), 60000);
  }, [refreshPortfolio]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (accountId) {
      loadAccount();
    }
  }, [accountId, loadAccount]);

  // Auto-refresh for stock accounts with visibility handling
  useEffect(() => {
    if (!account || account.type !== 'stock') return;

    startAutoRefresh();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else {
        refreshPortfolio(false);
        startAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopAutoRefresh();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [account, refreshPortfolio, startAutoRefresh, stopAutoRefresh]);

  return {
    // Core data
    account,
    transactions,
    recurring,
    categories,
    payees,

    // Loading states
    loading,
    error,
    refreshing,

    // Stock data
    portfolio,
    dividends,
    taxSummary,
    lastUpdated,

    // Edit form
    editAccountData,
    setEditAccountData,

    // Actions
    refreshData,
    refreshPortfolio,

    // Computed
    isStockAccount: account?.type === 'stock',
  };
}

export function useAccountModals() {
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountTransaction | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  return {
    showAddRecurring,
    setShowAddRecurring,
    showEditAccount,
    setShowEditAccount,
    showAddHolding,
    setShowAddHolding,
    showTransactionModal,
    setShowTransactionModal,
    editingTransaction,
    setEditingTransaction,
    editingRecurring,
    setEditingRecurring,
  };
}

export function useDividendCheck(accountId: number, refreshData: () => Promise<void>) {
  const [checkingDividends, setCheckingDividends] = useState(false);
  const [dividendCheckResult, setDividendCheckResult] = useState<string | null>(null);

  const handleCheckDividends = async () => {
    setCheckingDividends(true);
    setDividendCheckResult(null);
    try {
      const result = await dividendsApi.checkDividends(accountId);
      if (result.dividendsCreated > 0) {
        setDividendCheckResult(
          `Found ${result.dividendsCreated} new dividend(s). ${result.transactionsCreated} transaction(s) created.`
        );
        refreshData();
        window.dispatchEvent(new Event('accounts-changed'));
      } else {
        setDividendCheckResult('No new dividends found.');
      }
    } catch (err) {
      setDividendCheckResult(err instanceof Error ? err.message : 'Failed to check dividends');
    } finally {
      setCheckingDividends(false);
    }
  };

  return {
    checkingDividends,
    dividendCheckResult,
    handleCheckDividends,
  };
}

export function useNewRecurringForm() {
  const [newRecurring, setNewRecurring] = useState<NewRecurringForm>(initialNewRecurring);

  const resetForm = () => setNewRecurring(initialNewRecurring);

  const updateField = <K extends keyof NewRecurringForm>(field: K, value: NewRecurringForm[K]) => {
    setNewRecurring(prev => ({ ...prev, [field]: value }));
  };

  return {
    newRecurring,
    setNewRecurring,
    resetForm,
    updateField,
  };
}

export function getRecurringRowStyle(nextDueDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'bg-red-50 border-l-4 border-red-400';
  } else if (diffDays <= 7) {
    return 'bg-orange-50 border-l-4 border-orange-400';
  }
  return '';
}
