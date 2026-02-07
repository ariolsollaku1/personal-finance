import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';
import PayLoanModal from '../components/PayLoanModal';
import LoanPaidOffModal from '../components/LoanPaidOffModal';
import {
  Account,
  accountsApi,
  accountTransactionsApi,
  recurringApi,
  categoriesApi,
  payeesApi,
  dividendsApi,
  RecurringTransaction,
} from '../lib/api';
import {
  PortfolioData,
  EditAccountForm,
  useAccountModals,
  useDividendCheck,
  useNewRecurringForm,
} from '../hooks/useAccountPage';
import {
  SwipeableAccountHeader,
  RecurringList,
  TransactionList,
  EditAccountModal,
  EditTransactionModal,
  AddRecurringModal,
  EditRecurringModal,
  ApplyRecurringModal,
} from '../components/Account';
import AddHoldingForm from '../components/Portfolio/AddHoldingForm';
import HoldingsList from '../components/Portfolio/HoldingsList';
import Summary from '../components/Portfolio/Summary';
import PortfolioPerformanceChart from '../components/Charts/PortfolioPerformanceChart';
import DividendList from '../components/Dividends/DividendList';
import TaxSummary from '../components/Dividends/TaxSummary';
import AddTransactionModal from '../components/AddTransactionModal';
import { AccountSkeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useSWR } from '../hooks/useSWR';

type StockTab = 'holdings' | 'dividends' | 'transactions';

const TYPE_ORDER = ['bank', 'cash', 'stock', 'asset', 'loan', 'credit'];

function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const typeA = TYPE_ORDER.indexOf(a.type);
    const typeB = TYPE_ORDER.indexOf(b.type);
    if (typeA !== typeB) return typeA - typeB;
    return a.name.localeCompare(b.name);
  });
}

export default function SwipeAccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const urlAccountId = parseInt(id || '0');
  const [activeAccountId, setActiveAccountId] = useState(urlAccountId);

  // Sync when URL changes (user clicks sidebar link)
  useEffect(() => { setActiveAccountId(urlAccountId); }, [urlAccountId]);

  const accountId = activeAccountId;

  // ── SWR: All accounts (shared cache with Sidebar) ──
  const { data: allAccounts } = useSWR('/accounts', () => accountsApi.getAll());

  const sortedAccounts = useMemo(() => {
    if (!allAccounts) return [];
    return sortAccounts(allAccounts);
  }, [allAccounts]);

  const activeIndex = sortedAccounts.findIndex(a => a.id === activeAccountId);
  const account = sortedAccounts[activeIndex] || null;
  const isStockAccount = account?.type === 'stock';

  // ── SWR: Per-account data (cached per accountId, instant on revisit) ──
  const { data: transactions, loading: txLoading } = useSWR(
    `/accounts/${accountId}/transactions`,
    () => accountTransactionsApi.getByAccount(accountId)
  );

  const { data: recurring } = useSWR(
    `/recurring/${accountId}`,
    () => recurringApi.getByAccount(accountId)
  );

  // ── SWR: Global data ──
  const { data: categories } = useSWR('/categories', () => categoriesApi.getAll());
  const { data: payees } = useSWR('/payees', () => payeesApi.getAll());

  // ── SWR: Stock-only data (null key = disabled) ──
  const { data: portfolio, refreshing: portfolioRefreshing, refresh: refreshPortfolio } = useSWR(
    isStockAccount ? `/accounts/${accountId}/portfolio` : null,
    () => accountsApi.getPortfolio(accountId) as Promise<PortfolioData>
  );

  const { data: dividends } = useSWR(
    isStockAccount ? `/dividends/${accountId}` : null,
    () => dividendsApi.getByAccount(accountId)
  );

  const { data: taxSummary } = useSWR(
    isStockAccount ? `/dividends/tax/${accountId}` : null,
    () => dividendsApi.getTaxSummary(undefined, accountId)
  );

  // ── Derived state ──
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    if (portfolio) setLastUpdated(new Date());
  }, [portfolio]);

  const [editAccountData, setEditAccountData] = useState<EditAccountForm>({
    name: '',
    initialBalance: 0,
  });
  useEffect(() => {
    if (account) {
      setEditAccountData({ name: account.name, initialBalance: account.initial_balance });
    }
  }, [account?.id, account?.name, account?.initial_balance]);

  // ── Hooks ──
  const [stockTab, setStockTab] = useState<StockTab>('holdings');
  const [applyingRecurring, setApplyingRecurring] = useState<RecurringTransaction | null>(null);
  const [showPayLoanModal, setShowPayLoanModal] = useState(false);
  const [showPaidOffModal, setShowPaidOffModal] = useState(false);
  const toast = useToast();
  const modals = useAccountModals();
  const recurringForm = useNewRecurringForm();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  // refreshData for child components that call it after their own mutations.
  // With SWR + withInvalidation this is mostly a no-op (cache events auto-refetch),
  // but provides the expected callback signature.
  const refreshData = useCallback(async () => {
    // no-op: SWR auto-refetches via cache:invalidated events from withInvalidation
  }, []);

  const dividendCheck = useDividendCheck(accountId, refreshData);

  // Reset stock tab when switching away from a stock account
  useEffect(() => {
    if (account && account.type !== 'stock') {
      setStockTab('holdings');
    }
  }, [account?.id]);

  // Auto-refresh stock portfolio
  useEffect(() => {
    if (!isStockAccount) return;
    const interval = setInterval(() => refreshPortfolio(), 60000);
    const handleVisibility = () => {
      if (!document.hidden) refreshPortfolio();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isStockAccount, accountId, refreshPortfolio]);

  // ── Event handlers ──
  const handleTabChange = (tab: StockTab) => setStockTab(tab);

  const handleDeleteTransaction = async (txId: number) => {
    if (!await confirm({ title: 'Delete Transaction', message: 'Are you sure you want to delete this transaction?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await accountTransactionsApi.delete(accountId, txId);
    } catch (err) {
      toast.error('Transaction', err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recurringApi.create(accountId, {
        type: recurringForm.newRecurring.type,
        amount: parseFloat(recurringForm.newRecurring.amount),
        payee: recurringForm.newRecurring.payee || undefined,
        category: recurringForm.newRecurring.category || undefined,
        notes: recurringForm.newRecurring.notes || undefined,
        frequency: recurringForm.newRecurring.frequency,
        nextDueDate: recurringForm.newRecurring.nextDueDate,
      });
      modals.setShowAddRecurring(false);
      recurringForm.resetForm();
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to add recurring transaction');
    }
  };

  const handleApplyRecurring = (recurringId: number) => {
    const item = (recurring || []).find((r) => r.id === recurringId);
    if (item) setApplyingRecurring(item);
  };

  const handleConfirmApply = async (id: number, amount: number) => {
    try {
      await recurringApi.apply(id, undefined, amount);
      setApplyingRecurring(null);
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to apply recurring transaction');
    }
  };

  const handleDeleteRecurring = async (recurringId: number) => {
    if (!await confirm({ title: 'Delete Recurring', message: 'Are you sure you want to delete this recurring transaction?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await recurringApi.delete(recurringId);
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to delete recurring transaction');
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modals.editingTransaction) return;
    try {
      await accountTransactionsApi.update(accountId, modals.editingTransaction.id, {
        type: modals.editingTransaction.type,
        amount: modals.editingTransaction.amount,
        date: modals.editingTransaction.date,
        payee: modals.editingTransaction.payee_name || undefined,
        category: modals.editingTransaction.category_name || undefined,
        notes: modals.editingTransaction.notes || undefined,
      });
      modals.setEditingTransaction(null);
    } catch (err) {
      toast.error('Transaction', err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  const handleEditRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modals.editingRecurring) return;
    try {
      await recurringApi.update(modals.editingRecurring.id, {
        type: modals.editingRecurring.type,
        amount: modals.editingRecurring.amount,
        payee: modals.editingRecurring.payee_name || undefined,
        category: modals.editingRecurring.category_name || undefined,
        notes: modals.editingRecurring.notes || undefined,
        frequency: modals.editingRecurring.frequency,
        nextDueDate: modals.editingRecurring.next_due_date,
      });
      modals.setEditingRecurring(null);
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to update recurring transaction');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountsApi.update(accountId, editAccountData);
      modals.setShowEditAccount(false);
    } catch (err) {
      toast.error('Account', err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const handleDeleteAccount = async () => {
    if (!await confirm({ title: 'Delete Account', message: 'Are you sure you want to delete this account? This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await accountsApi.delete(accountId);
      navigate('/');
    } catch (err) {
      toast.error('Account', err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleArchiveAccount = async () => {
    if (!await confirm({ title: 'Archive Account', message: `Archive "${account?.name}"? It will be hidden from your accounts list but can be restored from Settings > Archived.`, confirmLabel: 'Archive' })) return;
    try {
      await accountsApi.archive(accountId);
      toast.success('Account', 'Account archived');
      navigate('/');
    } catch (err) {
      toast.error('Account', err instanceof Error ? err.message : 'Failed to archive account');
    }
  };

  // Loan payment handlers
  const handlePayLoanSuccess = (newBalance: number) => {
    setShowPayLoanModal(false);
    // Check if loan is fully paid off (balance >= 0)
    if (newBalance >= 0) {
      setShowPaidOffModal(true);
    }
  };

  const handleLoanArchived = () => {
    setShowPaidOffModal(false);
    toast.success('Account', 'Loan archived successfully');
    navigate('/');
  };

  // Filter source accounts for loan payments (bank/cash only, not the loan itself)
  const sourceAccountsForLoan = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts.filter(
      (a) => (a.type === 'bank' || a.type === 'cash') && a.id !== accountId && (a.balance || 0) > 0
    );
  }, [allAccounts, accountId]);

  // ── Loading states ──
  // No cached accounts at all — first visit ever
  if (!allAccounts) {
    return <AccountSkeleton />;
  }

  if (!account) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Account not found
      </div>
    );
  }

  // Content loading: no cached transactions for this account yet
  const contentLoading = txLoading;

  return (
    <div className="space-y-6">
      {/* Swipeable Account Header */}
      <SwipeableAccountHeader
        accounts={sortedAccounts}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        portfolio={portfolio}
        onEdit={() => modals.setShowEditAccount(true)}
        onDelete={handleDeleteAccount}
        onArchive={handleArchiveAccount}
        onAccountChange={setActiveAccountId}
        onPayLoan={account?.type === 'loan' ? () => setShowPayLoanModal(true) : undefined}
      />

      {contentLoading ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Edit Account Modal */}
          <EditAccountModal
            isOpen={modals.showEditAccount}
            onClose={() => modals.setShowEditAccount(false)}
            onSubmit={handleUpdateAccount}
            editAccountData={editAccountData}
            setEditAccountData={setEditAccountData}
            isStockAccount={isStockAccount}
          />

          {/* Stock Account Content */}
          {isStockAccount && portfolio && (
            <>
              <Summary
                portfolio={portfolio}
                lastUpdated={lastUpdated}
                refreshing={portfolioRefreshing}
                onRefresh={() => refreshPortfolio()}
              />

              <PortfolioPerformanceChart accountId={accountId} />

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {(['holdings', 'dividends', 'transactions'] as StockTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 capitalize ${
                        stockTab === tab
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Holdings Tab */}
              {stockTab === 'holdings' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button
                      onClick={() => modals.setShowAddHolding(!modals.showAddHolding)}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/25 font-medium transition-all duration-200"
                    >
                      {modals.showAddHolding ? 'Cancel' : 'Add Holding'}
                    </button>
                  </div>

                  {modals.showAddHolding && (
                    <AddHoldingForm
                      accountId={accountId}
                      onSuccess={() => {
                        modals.setShowAddHolding(false);
                      }}
                      onCancel={() => modals.setShowAddHolding(false)}
                    />
                  )}

                  <HoldingsList holdings={portfolio.holdings} closedHoldings={portfolio.closedHoldings} accountId={accountId} onUpdate={refreshData} />
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
                      onClick={dividendCheck.handleCheckDividends}
                      disabled={dividendCheck.checkingDividends}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                      {dividendCheck.checkingDividends ? 'Checking...' : 'Check Dividends'}
                    </button>
                  </div>

                  {dividendCheck.dividendCheckResult && (
                    <div
                      className={`p-4 rounded-md ${
                        dividendCheck.dividendCheckResult.includes('Failed')
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {dividendCheck.dividendCheckResult}
                    </div>
                  )}

                  <TaxSummary taxSummary={taxSummary} onUpdate={refreshData} />
                  <DividendList dividends={dividends || []} onDelete={refreshData} />
                </div>
              )}

              {/* Transactions Tab (for stock accounts) */}
              {stockTab === 'transactions' && (
                <div className="space-y-6">
                  <RecurringList
                    recurring={recurring || []}
                    currency={account.currency}
                    onApply={handleApplyRecurring}
                    onEdit={modals.setEditingRecurring}
                    onDelete={handleDeleteRecurring}
                    onAdd={() => modals.setShowAddRecurring(true)}
                  />
                  <TransactionList
                    transactions={transactions || []}
                    currency={account.currency}
                    isStockAccount={true}
                    onEdit={modals.setEditingTransaction}
                    onDelete={handleDeleteTransaction}
                    onAdd={() => modals.setShowTransactionModal(true)}
                  />
                </div>
              )}
            </>
          )}

          {/* Bank/Cash Account Content */}
          {!isStockAccount && (
            <>
              <RecurringList
                recurring={recurring || []}
                currency={account.currency}
                onApply={handleApplyRecurring}
                onEdit={modals.setEditingRecurring}
                onDelete={handleDeleteRecurring}
                onAdd={() => modals.setShowAddRecurring(true)}
              />
              <TransactionList
                transactions={transactions || []}
                currency={account.currency}
                isStockAccount={false}
                onEdit={modals.setEditingTransaction}
                onDelete={handleDeleteTransaction}
                onAdd={() => modals.setShowTransactionModal(true)}
              />
            </>
          )}

          {/* Modals */}
          <AddRecurringModal
            isOpen={modals.showAddRecurring}
            onClose={() => modals.setShowAddRecurring(false)}
            onSubmit={handleAddRecurring}
            newRecurring={recurringForm.newRecurring}
            setNewRecurring={recurringForm.setNewRecurring}
            categories={categories || []}
            payees={payees || []}
            isStockAccount={isStockAccount}
          />

          <EditRecurringModal
            editingRecurring={modals.editingRecurring}
            onClose={() => modals.setEditingRecurring(null)}
            onSubmit={handleEditRecurring}
            setEditingRecurring={modals.setEditingRecurring}
            categories={categories || []}
            payees={payees || []}
            isStockAccount={isStockAccount}
          />

          <EditTransactionModal
            editingTransaction={modals.editingTransaction}
            onClose={() => modals.setEditingTransaction(null)}
            onSubmit={handleEditTransaction}
            setEditingTransaction={modals.setEditingTransaction}
            categories={categories || []}
            payees={payees || []}
            isStockAccount={isStockAccount}
          />

          <AddTransactionModal
            isOpen={modals.showTransactionModal}
            onClose={() => modals.setShowTransactionModal(false)}
            accountId={accountId}
            accountCurrency={account.currency}
            isStockAccount={isStockAccount}
            onSuccess={refreshData}
          />

          <ApplyRecurringModal
            recurring={applyingRecurring}
            currency={account.currency}
            onConfirm={handleConfirmApply}
            onClose={() => setApplyingRecurring(null)}
          />
        </>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Loan Payment Modals */}
      {account && account.type === 'loan' && (
        <>
          <PayLoanModal
            isOpen={showPayLoanModal}
            onClose={() => setShowPayLoanModal(false)}
            loanAccount={account}
            sourceAccounts={sourceAccountsForLoan}
            onSuccess={handlePayLoanSuccess}
          />
          <LoanPaidOffModal
            isOpen={showPaidOffModal}
            onClose={() => setShowPaidOffModal(false)}
            loanAccount={account}
            onArchive={handleLoanArchived}
          />
        </>
      )}
    </div>
  );
}
