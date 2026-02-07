import { useState, useRef } from 'react';
import { AccountTransaction, Category, Payee } from '../../lib/api';
import BaseModal from '../BaseModal';

interface EditTransactionModalProps {
  editingTransaction: AccountTransaction | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setEditingTransaction: (data: AccountTransaction | null) => void;
  categories: Category[];
  payees: Payee[];
  isStockAccount: boolean;
}

export default function EditTransactionModal({
  editingTransaction,
  onClose,
  onSubmit,
  setEditingTransaction,
  categories,
  payees,
  isStockAccount,
}: EditTransactionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const dataRef = useRef(editingTransaction);
  if (editingTransaction) dataRef.current = editingTransaction;

  const tx = editingTransaction || dataRef.current;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit(e));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    tx.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  if (!tx) return null;

  return (
    <BaseModal isOpen={!!editingTransaction} onClose={onClose} maxWidth="md">
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-3rem)]">
        <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={tx.type === 'inflow'}
                onChange={() => setEditingTransaction({ ...tx, type: 'inflow' })}
                className="w-4 h-4 mr-2"
              />
              {isStockAccount ? 'Deposit' : 'Income'}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={tx.type === 'outflow'}
                onChange={() => setEditingTransaction({ ...tx, type: 'outflow' })}
                className="w-4 h-4 mr-2"
              />
              {isStockAccount ? 'Withdrawal' : 'Expense'}
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={tx.amount}
              onChange={(e) =>
                setEditingTransaction({
                  ...tx,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={tx.date}
              onChange={(e) =>
                setEditingTransaction({ ...tx, date: e.target.value })
              }
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>
          {!isStockAccount && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payee</label>
                <input
                  type="text"
                  value={tx.payee_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...tx, payee_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
                  value={tx.category_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...tx, category_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select category</option>
                  {filteredCategories.map((c) => (
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
              value={tx.notes || ''}
              onChange={(e) =>
                setEditingTransaction({ ...tx, notes: e.target.value })
              }
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex flex-col-reverse lg:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full lg:flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full lg:flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}
