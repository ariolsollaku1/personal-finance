import { useState } from 'react';
import { accountsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useSWR } from '../../hooks/useSWR';
import ConfirmModal from '../../components/ConfirmModal';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: '\u{1F3E6}',
  cash: '\u{1F4B5}',
  stock: '\u{1F4C8}',
  asset: '\u{1F3E0}',
  loan: '\u{1F4CB}',
  credit: '\u{1F4B3}',
};

export default function ArchivedAccountsPage() {
  const { data: accounts, loading } = useSWR('/accounts/archived', () => accountsApi.getArchived());
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      await accountsApi.unarchive(id);
      toast.success('Account', 'Account restored successfully');
    } catch (err) {
      toast.error('Account', err instanceof Error ? err.message : 'Failed to restore account');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm({
      title: 'Delete Account Permanently',
      message: 'Are you sure you want to permanently delete this account? This action cannot be undone and all transactions will be lost.',
      confirmLabel: 'Delete Forever',
      variant: 'danger'
    })) return;

    try {
      await accountsApi.delete(id);
      toast.success('Account', 'Account deleted permanently');
    } catch (err) {
      toast.error('Account', err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const formatArchivedDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const allAccounts = accounts ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Archived Accounts</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Hidden from the sidebar and dashboard. Restore them at any time.
        </p>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
        {allAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No archived accounts</h3>
            <p className="text-gray-500 text-sm">
              Accounts that you archive will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allAccounts.map((account) => (
              <div key={account.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg">{ACCOUNT_ICONS[account.type] || '\u{1F4B0}'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{account.name}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
                        {account.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Archived {formatArchivedDate(account.archived_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-500">
                    {formatCurrency(account.balance || account.initial_balance, account.currency)}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRestore(account.id)}
                      disabled={restoringId === account.id}
                      className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Restore account"
                    >
                      {restoringId === account.id ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        'Restore'
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete permanently"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
