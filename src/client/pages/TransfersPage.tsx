import { useState } from 'react';
import { transfersApi, accountsApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import { TransfersSkeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';
import AddTransferModal from '../components/AddTransferModal';
import SwipeableRow from '../components/SwipeableRow';
import ActionDropdown from '../components/ActionDropdown';
import { useSWR } from '../hooks/useSWR';

export default function TransfersPage() {
  const { data: transfers, loading: tLoading } = useSWR('/transfers', () => transfersApi.getAll());
  const { data: allAccounts, loading: aLoading } = useSWR('/accounts', () => accountsApi.getAll());
  const accounts = (allAccounts ?? []).filter((a) => a.type !== 'stock');
  const [showAddForm, setShowAddForm] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const handleDeleteTransfer = async (id: number) => {
    if (!await confirm({ title: 'Delete Transfer', message: 'Delete this transfer? This will remove both linked transactions.', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await transfersApi.delete(id);
    } catch (err) {
      toast.error('Transfer', err instanceof Error ? err.message : 'Failed to delete transfer');
    }
  };

  if (tLoading || aLoading) {
    return <TransfersSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          New Transfer
        </button>
      </div>

      {accounts.length < 2 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          You need at least 2 bank or cash accounts to create transfers.
        </div>
      )}

      {/* Transfers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">Transfer History</h2>
        </div>
        {(transfers ?? []).length === 0 ? (
          <div className="p-6 text-center text-gray-500">No transfers yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(transfers ?? []).map((transfer) => (
              <SwipeableRow
                key={transfer.id}
                actions={[
                  { label: 'Delete', onClick: () => handleDeleteTransfer(transfer.id), color: 'bg-red-500' },
                ]}
              >
                <div className="p-4 flex justify-between items-center hover:bg-gray-50">
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
                      <p className="text-sm text-gray-500">{new Date(transfer.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      {transfer.notes && (
                        <p className="text-xs text-gray-400">{transfer.notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <ActionDropdown
                        actions={[
                          { label: 'Delete', onClick: () => handleDeleteTransfer(transfer.id), variant: 'danger' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </SwipeableRow>
            ))}
          </div>
        )}
      </div>

      <AddTransferModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        accounts={accounts}
        onSuccess={() => {}}
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
