import { useState, useEffect } from 'react';
import { Account, transfersApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import BaseModal from './BaseModal';

interface AddTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export default function AddTransferModal({ isOpen, onClose, accounts, onSuccess }: AddTransferModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    fromAccountId: '',
    toAccountId: '',
    fromAmount: '',
    toAmount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fromAccount = accounts.find((a) => a.id === parseInt(newTransfer.fromAccountId));
  const toAccount = accounts.find((a) => a.id === parseInt(newTransfer.toAccountId));
  const needsToAmount = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewTransfer({
        fromAccountId: '',
        toAccountId: '',
        fromAmount: '',
        toAmount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
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
      onClose();
      onSuccess();
    } catch (err) {
      toast.error('Transfer', err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  const isValid = newTransfer.fromAccountId && newTransfer.toAccountId && newTransfer.fromAmount && newTransfer.date && (!needsToAmount || newTransfer.toAmount);

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="2xl">
      {/* Header */}
        <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Transfer</h2>
            <p className="text-sm text-gray-500 mt-0.5">Move money between accounts</p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={newTransfer.date}
                  onChange={(e) => setNewTransfer({ ...newTransfer, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              <div className={needsToAmount ? '' : 'sm:col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <input
                  type="text"
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse lg:flex-row gap-3 lg:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="w-full lg:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={submitting || !isValid}
            className="w-full lg:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Transfer'
            )}
          </button>
        </div>
    </BaseModal>
  );
}
