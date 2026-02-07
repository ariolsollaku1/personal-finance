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
  EditAccountModal,
  EditTransactionModal,
  AddRecurringModal,
  EditRecurringModal,
  ApplyRecurringModal,
  StockAccountContent,
  BankAccountContent,
} from '../components/Account';
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
    if (newBalance >= 0) {
      setShowPaidOffModal(true);
    }
  };

  const handleLoanArchived = () => {
    setShowPaidOffModal(false);
    toast.success('Account', 'Loan archived successfully');
    navigate('/');
  };

  const sourceAccountsForLoan = useMemo(() => {
    if (!allAccounts) return [];
    return allAccounts.filter(
      (a) => (a.type === 'bank' || a.type === 'cash') && a.id !== accountId && (a.balance || 0) > 0
    );
  }, [allAccounts, accountId]);

  // ── Loading states ──
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

  const contentLoading = txLoading;

  return (
    <div className="space-y-6">
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
          <EditAccountModal
            isOpen={modals.showEditAccount}
            onClose={() => modals.setShowEditAccount(false)}
            onSubmit={handleUpdateAccount}
            editAccountData={editAccountData}
            setEditAccountData={setEditAccountData}
            isStockAccount={isStockAccount}
          />

          {isStockAccount && portfolio && (
            <StockAccountContent
              accountId={accountId}
              currency={account.currency}
              portfolio={portfolio}
              portfolioRefreshing={portfolioRefreshing}
              refreshPortfolio={() => refreshPortfolio()}
              lastUpdated={lastUpdated}
              stockTab={stockTab}
              onTabChange={setStockTab}
              dividends={dividends}
              taxSummary={taxSummary}
              transactions={transactions}
              recurring={recurring}
              categories={categories || []}
              payees={payees || []}
              modals={modals}
              dividendCheck={dividendCheck}
              refreshData={refreshData}
              onApplyRecurring={handleApplyRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {!isStockAccount && (
            <BankAccountContent
              currency={account.currency}
              transactions={transactions}
              recurring={recurring}
              modals={modals}
              onApplyRecurring={handleApplyRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onDeleteTransaction={handleDeleteTransaction}
            />
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
