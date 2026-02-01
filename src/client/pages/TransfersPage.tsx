import { useState, useEffect } from 'react';
import { Transfer, Account, transfersApi, accountsApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import { TransfersSkeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [newTransfer, setNewTransfer] = useState({
    fromAccountId: '',
    toAccountId: '',
    fromAmount: '',
    toAmount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersData, accountsData] = await Promise.all([
        transfersApi.getAll(),
        accountsApi.getAll(),
      ]);
      setTransfers(transfersData);
      setAccounts(accountsData.filter((a) => a.type !== 'stock')); // Only bank/cash accounts
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fromAccount = accounts.find((a) => a.id === parseInt(newTransfer.fromAccountId));
      const toAccount = accounts.find((a) => a.id === parseInt(newTransfer.toAccountId));

      await transfersApi.create({
        fromAccountId: parseInt(newTransfer.fromAccountId),
        toAccountId: parseInt(newTransfer.toAccountId),
        fromAmount: parseFloat(newTransfer.fromAmount),
        toAmount:
          fromAccount?.currency === toAccount?.currency
            ? undefined
            : parseFloat(newTransfer.toAmount || newTransfer.fromAmount),
        date: newTransfer.date,
        notes: newTransfer.notes || undefined,
      });

      setShowAddForm(false);
      setNewTransfer({
        fromAccountId: '',
        toAccountId: '',
        fromAmount: '',
        toAmount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (err) {
      toast.error('Transfer', err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransfer = async (id: number) => {
    if (!await confirm({ title: 'Delete Transfer', message: 'Delete this transfer? This will remove both linked transactions.', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await transfersApi.delete(id);
      loadData();
    } catch (err) {
      toast.error('Transfer', err instanceof Error ? err.message : 'Failed to delete transfer');
    }
  };

  const fromAccount = accounts.find((a) => a.id === parseInt(newTransfer.fromAccountId));
  const toAccount = accounts.find((a) => a.id === parseInt(newTransfer.toAccountId));
  const needsToAmount = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  if (loading) {
    return <TransfersSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {showAddForm ? 'Cancel' : 'New Transfer'}
        </button>
      </div>

      {accounts.length < 2 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          You need at least 2 bank or cash accounts to create transfers.
        </div>
      )}

      {showAddForm && accounts.length >= 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">New Transfer</h2>
          <form onSubmit={handleAddTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Account
                </label>
                <select
                  value={newTransfer.fromAccountId}
                  onChange={(e) => setNewTransfer({ ...newTransfer, fromAccountId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select account</option>
                  {accounts
                    .filter((a) => a.id.toString() !== newTransfer.toAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Account
                </label>
                <select
                  value={newTransfer.toAccountId}
                  onChange={(e) => setNewTransfer({ ...newTransfer, toAccountId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select account</option>
                  {accounts
                    .filter((a) => a.id.toString() !== newTransfer.fromAccountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount {fromAccount && `(${fromAccount.currency})`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransfer.fromAmount}
                  onChange={(e) => setNewTransfer({ ...newTransfer, fromAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              {needsToAmount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Amount ({toAccount?.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransfer.toAmount}
                    onChange={(e) => setNewTransfer({ ...newTransfer, toAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    required
                    placeholder="Amount in destination currency"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newTransfer.date}
                  onChange={(e) => setNewTransfer({ ...newTransfer, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div className={needsToAmount ? '' : 'col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-all duration-200"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {submitting ? 'Creating...' : 'Create Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">Transfer History</h2>
        </div>
        {transfers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No transfers yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{transfer.from_account_name}</p>
                    <p className="text-sm text-red-600">
                      -{formatCurrency(transfer.from_amount, transfer.from_account_currency!)}
                    </p>
                  </div>
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{transfer.to_account_name}</p>
                    <p className="text-sm text-green-600">
                      +{formatCurrency(transfer.to_amount, transfer.to_account_currency!)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{transfer.date}</p>
                    {transfer.notes && (
                      <p className="text-xs text-gray-400">{transfer.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTransfer(transfer.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
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
