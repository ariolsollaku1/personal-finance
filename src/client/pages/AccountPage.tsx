import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  TaxSummary as TaxSummaryData,
} from '../lib/api';
import { formatCurrency } from '../lib/currency';
import AddHoldingForm from '../components/Portfolio/AddHoldingForm';
import HoldingsList from '../components/Portfolio/HoldingsList';
import Summary from '../components/Portfolio/Summary';
import DividendList from '../components/Dividends/DividendList';
import TaxSummary from '../components/Dividends/TaxSummary';

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountId = parseInt(id || '0');

  // Get initial tab from URL or default to 'holdings'
  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    if (tab === 'dividends' || tab === 'transactions' || tab === 'holdings') {
      return tab;
    }
    return 'holdings';
  };

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stock account state
  const [portfolio, setPortfolio] = useState<{
    cashBalance: number;
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange: number;
    dayChangePercent: number;
    holdings: HoldingWithQuote[];
  } | null>(null);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [taxSummary, setTaxSummary] = useState<TaxSummaryData | null>(null);
  const [stockTab, setStockTab] = useState<'holdings' | 'dividends' | 'transactions'>(getInitialTab);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: 'holdings' | 'dividends' | 'transactions') => {
    setStockTab(tab);
    if (tab === 'holdings') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef<number | null>(null);

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [checkingDividends, setCheckingDividends] = useState(false);
  const [dividendCheckResult, setDividendCheckResult] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<AccountTransaction | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const [newTx, setNewTx] = useState({
    type: 'outflow' as TransactionType,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payee: '',
    category: '',
    notes: '',
  });

  const [newRecurring, setNewRecurring] = useState({
    type: 'outflow' as TransactionType,
    amount: '',
    payee: '',
    category: '',
    notes: '',
    frequency: 'monthly' as Frequency,
    nextDueDate: new Date().toISOString().split('T')[0],
  });

  const [editAccountData, setEditAccountData] = useState({
    name: '',
    initialBalance: 0,
  });

  // Helper function to get row styling for recurring transactions based on due date
  const getRecurringRowStyle = (nextDueDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue - red background
      return 'bg-red-50 border-l-4 border-red-400';
    } else if (diffDays <= 7) {
      // Due within 7 days (including today) - light orange background
      return 'bg-orange-50 border-l-4 border-orange-400';
    }
    return '';
  };

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
  }, [accountId]);

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

  const loadAccount = async () => {
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
        // Also load stock portfolio data, dividends, and tax summary
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
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountTransactionsApi.create(accountId, {
        type: newTx.type,
        amount: parseFloat(newTx.amount),
        date: newTx.date,
        payee: newTx.payee || undefined,
        category: newTx.category || undefined,
        notes: newTx.notes || undefined,
      });
      setShowAddTransaction(false);
      setNewTx({
        type: 'outflow',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payee: '',
        category: '',
        notes: '',
      });
      loadAccount();
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (txId: number) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await accountTransactionsApi.delete(accountId, txId);
      loadAccount();
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const handleCheckDividends = async () => {
    setCheckingDividends(true);
    setDividendCheckResult(null);
    try {
      const result = await dividendsApi.checkDividends(accountId);
      if (result.dividendsCreated > 0) {
        setDividendCheckResult(
          `Found ${result.dividendsCreated} new dividend(s). ${result.transactionsCreated} transaction(s) created.`
        );
        loadAccount();
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

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recurringApi.create(accountId, {
        type: newRecurring.type,
        amount: parseFloat(newRecurring.amount),
        payee: newRecurring.payee || undefined,
        category: newRecurring.category || undefined,
        notes: newRecurring.notes || undefined,
        frequency: newRecurring.frequency,
        nextDueDate: newRecurring.nextDueDate,
      });
      setShowAddRecurring(false);
      setNewRecurring({
        type: 'outflow',
        amount: '',
        payee: '',
        category: '',
        notes: '',
        frequency: 'monthly',
        nextDueDate: new Date().toISOString().split('T')[0],
      });
      loadAccount();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add recurring transaction');
    }
  };

  const handleApplyRecurring = async (recurringId: number) => {
    try {
      await recurringApi.apply(recurringId);
      loadAccount();
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply recurring transaction');
    }
  };

  const handleDeleteRecurring = async (recurringId: number) => {
    if (!confirm('Delete this recurring transaction?')) return;
    try {
      await recurringApi.delete(recurringId);
      loadAccount();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete recurring transaction');
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    try {
      await accountTransactionsApi.update(accountId, editingTransaction.id, {
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        date: editingTransaction.date,
        payee: editingTransaction.payee_name || undefined,
        category: editingTransaction.category_name || undefined,
        notes: editingTransaction.notes || undefined,
      });
      setEditingTransaction(null);
      loadAccount();
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  const handleEditRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecurring) return;
    try {
      await recurringApi.update(editingRecurring.id, {
        type: editingRecurring.type,
        amount: editingRecurring.amount,
        payee: editingRecurring.payee_name || undefined,
        category: editingRecurring.category_name || undefined,
        notes: editingRecurring.notes || undefined,
        frequency: editingRecurring.frequency,
        nextDueDate: editingRecurring.next_due_date,
      });
      setEditingRecurring(null);
      loadAccount();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update recurring transaction');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountsApi.update(accountId, editAccountData);
      setShowEditAccount(false);
      loadAccount();
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('accounts-changed'));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete this account? This cannot be undone.')) return;
    try {
      await accountsApi.delete(accountId);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading account...</div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Account not found'}
      </div>
    );
  }

  const isStockAccount = account.type === 'stock';

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {account.type === 'bank' ? '🏦' : account.type === 'cash' ? '💵' : account.type === 'stock' ? '📈' : account.type === 'asset' ? '🏠' : account.type === 'loan' ? '📋' : '💳'}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1 capitalize">{account.type} Account</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {isStockAccount && portfolio
                ? `$${portfolio.totalValue.toFixed(2)}`
                : formatCurrency(account.balance || 0, account.currency)}
            </p>
            <p className="text-sm text-gray-500">Current {isStockAccount ? 'Value' : 'Balance'}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowEditAccount(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Edit Account
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleDeleteAccount}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Edit Account Modal */}
      {showEditAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Account</h2>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editAccountData.name}
                  onChange={(e) => setEditAccountData({ ...editAccountData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {!isStockAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAccountData.initialBalance}
                    onChange={(e) =>
                      setEditAccountData({
                        ...editAccountData,
                        initialBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditAccount(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Account Content */}
      {isStockAccount && portfolio && (
        <>
          {/* Portfolio Summary */}
          <Summary
            portfolio={portfolio}
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            onRefresh={() => refreshPortfolio(true)}
          />

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabChange('holdings')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  stockTab === 'holdings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Holdings
              </button>
              <button
                onClick={() => handleTabChange('dividends')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  stockTab === 'dividends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dividends
              </button>
              <button
                onClick={() => handleTabChange('transactions')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  stockTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Transactions
              </button>
            </nav>
          </div>

          {/* Holdings Tab */}
          {stockTab === 'holdings' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddHolding(!showAddHolding)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {showAddHolding ? 'Cancel' : 'Add Holding'}
                </button>
              </div>

              {showAddHolding && (
                <AddHoldingForm
                  accountId={accountId}
                  onSuccess={() => {
                    setShowAddHolding(false);
                    loadAccount();
                  }}
                  onCancel={() => setShowAddHolding(false)}
                />
              )}

              <HoldingsList holdings={portfolio.holdings} accountId={accountId} onUpdate={loadAccount} />
            </div>
          )}

          {/* Dividends Tab */}
          {stockTab === 'dividends' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Automatically checks Yahoo Finance for dividends based on your holdings and purchase dates.
                </p>
                <button
                  onClick={handleCheckDividends}
                  disabled={checkingDividends}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {checkingDividends ? 'Checking...' : 'Check Dividends'}
                </button>
              </div>

              {dividendCheckResult && (
                <div className={`p-4 rounded-md ${dividendCheckResult.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {dividendCheckResult}
                </div>
              )}

              <TaxSummary taxSummary={taxSummary} onUpdate={loadAccount} />

              <DividendList dividends={dividends} onDelete={loadAccount} />
            </div>
          )}

          {/* Transactions Tab (for stock accounts) */}
          {stockTab === 'transactions' && (
            <div className="space-y-6">
              {/* Recurring Transactions Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-700">Recurring Transactions</h2>
                  <button
                    onClick={() => setShowAddRecurring(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Recurring
                  </button>
                </div>
                {recurring.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No recurring transactions</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {recurring.map((rec) => (
                      <div key={rec.id} className={`py-2 px-4 flex justify-between items-center ${getRecurringRowStyle(rec.next_due_date)}`}>
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`text-sm font-medium w-20 ${
                              rec.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {rec.type === 'inflow' ? '+' : ''}
                            {formatCurrency(rec.type === 'inflow' ? rec.amount : -rec.amount, account.currency)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {rec.payee_name || 'No payee'}
                              {rec.category_name && (
                                <span className="text-gray-400 font-normal"> • {rec.category_name}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {rec.frequency} • Next: {rec.next_due_date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApplyRecurring(rec.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => setEditingRecurring(rec)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRecurring(rec.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-700">Transactions</h2>
                  <button
                    onClick={() => setShowAddTransaction(!showAddTransaction)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {showAddTransaction ? 'Cancel' : '+ Add Transaction'}
                  </button>
                </div>

                {/* Add Transaction Form */}
                {showAddTransaction && (
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <form onSubmit={handleAddTransaction} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={newTx.type === 'inflow'}
                              onChange={() => setNewTx({ ...newTx, type: 'inflow' })}
                              className="mr-2"
                            />
                            Deposit
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={newTx.type === 'outflow'}
                              onChange={() => setNewTx({ ...newTx, type: 'outflow' })}
                              className="mr-2"
                            />
                            Withdrawal
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newTx.amount}
                            onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={newTx.date}
                            onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={newTx.notes}
                            onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Deposit for stock purchase"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAddTransaction(false)}
                          className="px-4 py-2 border border-gray-300 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md"
                        >
                          Add Transaction
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {transactions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No transactions yet</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="py-2 px-4 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`text-sm font-medium w-20 ${
                              tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {tx.type === 'inflow' ? '+' : '-'}
                            {formatCurrency(tx.amount, account.currency)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {tx.payee_name || tx.category_name || tx.notes || 'Transaction'}
                              {tx.category_name && tx.payee_name && (
                                <span className="text-gray-400 font-normal"> • {tx.category_name}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {tx.date}
                              {tx.notes && !tx.notes.startsWith('Buy ') && !tx.notes.startsWith('Sell ') && ` • ${tx.notes}`}
                              {tx.balance !== undefined && ` • Bal: ${formatCurrency(tx.balance, account.currency)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!tx.transfer_id && !tx.notes?.startsWith('Buy ') && !tx.notes?.startsWith('Sell ') && (
                            <>
                              <button
                                onClick={() => setEditingTransaction(tx)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {(tx.notes?.startsWith('Buy ') || tx.notes?.startsWith('Sell ')) && (
                            <span className="text-xs text-gray-400">Stock Trade</span>
                          )}
                          {tx.transfer_id && (
                            <span className="text-xs text-gray-400">Transfer</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Bank/Cash Account Content */}
      {!isStockAccount && (
        <>
          {/* Recurring Transactions Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">Recurring Transactions</h2>
              <button
                onClick={() => setShowAddRecurring(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Recurring
              </button>
            </div>
            {recurring.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No recurring transactions</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recurring.map((rec) => (
                  <div key={rec.id} className={`py-2 px-4 flex justify-between items-center ${getRecurringRowStyle(rec.next_due_date)}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`text-sm font-medium w-20 ${
                          rec.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {rec.type === 'inflow' ? '+' : ''}
                        {formatCurrency(rec.type === 'inflow' ? rec.amount : -rec.amount, account.currency)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {rec.payee_name || 'No payee'}
                          {rec.category_name && (
                            <span className="text-gray-400 font-normal"> • {rec.category_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {rec.frequency} • Next: {rec.next_due_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApplyRecurring(rec.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => setEditingRecurring(rec)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRecurring(rec.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">Transactions</h2>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Add Transaction
              </button>
            </div>

            {/* Add Transaction Form */}
            {showAddTransaction && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={newTx.type === 'inflow'}
                          onChange={() => setNewTx({ ...newTx, type: 'inflow' })}
                          className="mr-2"
                        />
                        Income
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={newTx.type === 'outflow'}
                          onChange={() => setNewTx({ ...newTx, type: 'outflow' })}
                          className="mr-2"
                        />
                        Expense
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newTx.amount}
                        onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newTx.date}
                        onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                      <input
                        type="text"
                        value={newTx.payee}
                        onChange={(e) => setNewTx({ ...newTx, payee: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        list="payees-tx"
                      />
                      <datalist id="payees-tx">
                        {payees.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={newTx.category}
                        onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter((c) =>
                            newTx.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
                          )
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={newTx.notes}
                        onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddTransaction(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md"
                    >
                      Add Transaction
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Transaction List */}
            {transactions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No transactions yet</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-2 px-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`text-sm font-medium w-20 ${
                          tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'inflow' ? '+' : '-'}
                        {formatCurrency(tx.amount, account.currency)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tx.payee_name || tx.category_name || 'Transaction'}
                          {tx.category_name && tx.payee_name && (
                            <span className="text-gray-400 font-normal"> • {tx.category_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tx.date}
                          {tx.notes && ` • ${tx.notes}`}
                          {tx.balance !== undefined && ` • Bal: ${formatCurrency(tx.balance, account.currency)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!tx.transfer_id && (
                        <>
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {tx.transfer_id && (
                        <span className="text-xs text-gray-400">Transfer</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals - shared between stock and bank/cash accounts */}

      {/* Add Recurring Modal */}
      {showAddRecurring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add Recurring Transaction</h2>
            <form onSubmit={handleAddRecurring} className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newRecurring.type === 'inflow'}
                    onChange={() => setNewRecurring({ ...newRecurring, type: 'inflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Deposit' : 'Income'}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={newRecurring.type === 'outflow'}
                    onChange={() => setNewRecurring({ ...newRecurring, type: 'outflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Withdrawal' : 'Expense'}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newRecurring.amount}
                  onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {!isStockAccount && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                    <input
                      type="text"
                      value={newRecurring.payee}
                      onChange={(e) => setNewRecurring({ ...newRecurring, payee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      list="payees"
                    />
                    <datalist id="payees">
                      {payees.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newRecurring.category}
                      onChange={(e) => setNewRecurring({ ...newRecurring, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter((c) =>
                          newRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
              {isStockAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={newRecurring.notes}
                    onChange={(e) => setNewRecurring({ ...newRecurring, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Monthly deposit"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={newRecurring.frequency}
                  onChange={(e) =>
                    setNewRecurring({ ...newRecurring, frequency: e.target.value as Frequency })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={newRecurring.nextDueDate}
                  onChange={(e) =>
                    setNewRecurring({ ...newRecurring, nextDueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddRecurring(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Recurring Modal */}
      {editingRecurring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Recurring Transaction</h2>
            <form onSubmit={handleEditRecurring} className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={editingRecurring.type === 'inflow'}
                    onChange={() => setEditingRecurring({ ...editingRecurring, type: 'inflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Deposit' : 'Income'}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={editingRecurring.type === 'outflow'}
                    onChange={() => setEditingRecurring({ ...editingRecurring, type: 'outflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Withdrawal' : 'Expense'}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecurring.amount}
                  onChange={(e) => setEditingRecurring({ ...editingRecurring, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {!isStockAccount && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                    <input
                      type="text"
                      value={editingRecurring.payee_name || ''}
                      onChange={(e) => setEditingRecurring({ ...editingRecurring, payee_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      list="payees-edit-rec"
                    />
                    <datalist id="payees-edit-rec">
                      {payees.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={editingRecurring.category_name || ''}
                      onChange={(e) => setEditingRecurring({ ...editingRecurring, category_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter((c) =>
                          editingRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
              {isStockAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={editingRecurring.notes || ''}
                    onChange={(e) => setEditingRecurring({ ...editingRecurring, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={editingRecurring.frequency}
                  onChange={(e) =>
                    setEditingRecurring({ ...editingRecurring, frequency: e.target.value as Frequency })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={editingRecurring.next_due_date}
                  onChange={(e) =>
                    setEditingRecurring({ ...editingRecurring, next_due_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRecurring(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>
            <form onSubmit={handleEditTransaction} className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={editingTransaction.type === 'inflow'}
                    onChange={() => setEditingTransaction({ ...editingTransaction, type: 'inflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Deposit' : 'Income'}
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={editingTransaction.type === 'outflow'}
                    onChange={() => setEditingTransaction({ ...editingTransaction, type: 'outflow' })}
                    className="mr-2"
                  />
                  {isStockAccount ? 'Withdrawal' : 'Expense'}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingTransaction.date}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {!isStockAccount && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                    <input
                      type="text"
                      value={editingTransaction.payee_name || ''}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, payee_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      list="payees-edit-tx"
                    />
                    <datalist id="payees-edit-tx">
                      {payees.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={editingTransaction.category_name || ''}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, category_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter((c) =>
                          editingTransaction.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
                        )
                        .map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingTransaction.notes || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
