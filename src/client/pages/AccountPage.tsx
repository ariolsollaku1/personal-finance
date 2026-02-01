import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';
import {
  accountsApi,
  accountTransactionsApi,
  recurringApi,
  RecurringTransaction,
} from '../lib/api';
import {
  useAccountPage,
  useAccountModals,
  useDividendCheck,
  useNewRecurringForm,
} from '../hooks/useAccountPage';
import {
  AccountHeader,
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
import DividendList from '../components/Dividends/DividendList';
import TaxSummary from '../components/Dividends/TaxSummary';
import AddTransactionModal from '../components/AddTransactionModal';
import { AccountSkeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';

type StockTab = 'holdings' | 'dividends' | 'transactions';

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountId = parseInt(id || '0');

  // Get initial tab from URL
  const getInitialTab = (): StockTab => {
    const tab = searchParams.get('tab');
    if (tab === 'dividends' || tab === 'transactions' || tab === 'holdings') {
      return tab;
    }
    return 'holdings';
  };

  const [stockTab, setStockTab] = useState<StockTab>(getInitialTab);
  const [applyingRecurring, setApplyingRecurring] = useState<RecurringTransaction | null>(null);

  // Custom hooks for state management
  const toast = useToast();
  const accountState = useAccountPage(accountId);
  const modals = useAccountModals();
  const dividendCheck = useDividendCheck(accountId, accountState.refreshData);
  const recurringForm = useNewRecurringForm();

  const {
    account,
    transactions,
    recurring,
    categories,
    payees,
    loading,
    error,
    refreshing,
    portfolio,
    dividends,
    taxSummary,
    lastUpdated,
    editAccountData,
    setEditAccountData,
    refreshData,
    refreshPortfolio,
    isStockAccount,
  } = accountState;

  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  // Tab change handler
  const handleTabChange = (tab: StockTab) => {
    setStockTab(tab);
    if (tab === 'holdings') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Event handlers
  const handleDeleteTransaction = async (txId: number) => {
    if (!await confirm({ title: 'Delete Transaction', message: 'Are you sure you want to delete this transaction?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await accountTransactionsApi.delete(accountId, txId);
      refreshData();
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
      refreshData();
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to add recurring transaction');
    }
  };

  const handleApplyRecurring = (recurringId: number) => {
    const item = recurring.find((r) => r.id === recurringId);
    if (item) setApplyingRecurring(item);
  };

  const handleConfirmApply = async (id: number, amount: number) => {
    try {
      await recurringApi.apply(id, undefined, amount);
      setApplyingRecurring(null);
      refreshData();
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to apply recurring transaction');
    }
  };

  const handleDeleteRecurring = async (recurringId: number) => {
    if (!await confirm({ title: 'Delete Recurring', message: 'Are you sure you want to delete this recurring transaction?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await recurringApi.delete(recurringId);
      refreshData();
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
      refreshData();
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
      refreshData();
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to update recurring transaction');
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountsApi.update(accountId, editAccountData);
      modals.setShowEditAccount(false);
      refreshData();
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

  // Loading and error states
  if (loading) {
    return <AccountSkeleton />;
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Account not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <AccountHeader
        account={account}
        portfolio={portfolio}
        onEdit={() => modals.setShowEditAccount(true)}
        onDelete={handleDeleteAccount}
      />

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
            refreshing={refreshing}
            onRefresh={() => refreshPortfolio(true)}
          />

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
                    refreshData();
                  }}
                  onCancel={() => modals.setShowAddHolding(false)}
                />
              )}

              <HoldingsList holdings={portfolio.holdings} accountId={accountId} onUpdate={refreshData} />
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
              <DividendList dividends={dividends} onDelete={refreshData} />
            </div>
          )}

          {/* Transactions Tab (for stock accounts) */}
          {stockTab === 'transactions' && (
            <div className="space-y-6">
              <RecurringList
                recurring={recurring}
                currency={account.currency}
                onApply={handleApplyRecurring}
                onEdit={modals.setEditingRecurring}
                onDelete={handleDeleteRecurring}
                onAdd={() => modals.setShowAddRecurring(true)}
              />
              <TransactionList
                transactions={transactions}
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
            recurring={recurring}
            currency={account.currency}
            onApply={handleApplyRecurring}
            onEdit={modals.setEditingRecurring}
            onDelete={handleDeleteRecurring}
            onAdd={() => modals.setShowAddRecurring(true)}
          />
          <TransactionList
            transactions={transactions}
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
        categories={categories}
        payees={payees}
        isStockAccount={isStockAccount}
      />

      <EditRecurringModal
        editingRecurring={modals.editingRecurring}
        onClose={() => modals.setEditingRecurring(null)}
        onSubmit={handleEditRecurring}
        setEditingRecurring={modals.setEditingRecurring}
        categories={categories}
        payees={payees}
        isStockAccount={isStockAccount}
      />

      <EditTransactionModal
        editingTransaction={modals.editingTransaction}
        onClose={() => modals.setEditingTransaction(null)}
        onSubmit={handleEditTransaction}
        setEditingTransaction={modals.setEditingTransaction}
        categories={categories}
        payees={payees}
        isStockAccount={isStockAccount}
      />

      <AddTransactionModal
        isOpen={modals.showTransactionModal}
        onClose={() => modals.setShowTransactionModal(false)}
        accountId={accountId}
        accountCurrency={account.currency}
        isStockAccount={isStockAccount}
        onSuccess={() => {
          refreshData();
        }}
      />

      <ApplyRecurringModal
        recurring={applyingRecurring}
        currency={account.currency}
        onConfirm={handleConfirmApply}
        onClose={() => setApplyingRecurring(null)}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
