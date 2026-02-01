import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AccountTransaction, Category, Payee } from '../../lib/api';
import { useBottomSheet } from '../../hooks/useBottomSheet';

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
  const { shouldRender, isVisible } = useBottomSheet(!!editingTransaction);
  const dataRef = useRef(editingTransaction);
  if (editingTransaction) dataRef.current = editingTransaction;

  if (!shouldRender || !dataRef.current) return null;

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

  return createPortal(
    <div
      className={`fixed inset-0 !mt-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center z-50 lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full lg:max-w-md max-h-[90vh] overflow-hidden transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-3rem)]">
        <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={tx.type === 'inflow'}
                onChange={() => setEditingTransaction({ ...tx, type: 'inflow' })}
                className="mr-2"
              />
              {isStockAccount ? 'Deposit' : 'Income'}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={tx.type === 'outflow'}
                onChange={() => setEditingTransaction({ ...tx, type: 'outflow' })}
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
              value={tx.amount}
              onChange={(e) =>
                setEditingTransaction({
                  ...tx,
                  amount: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  value={tx.payee_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...tx, payee_name: e.target.value })
                  }
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
                  value={tx.category_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...tx, category_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full lg:flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
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
      </div>
    </div>,
    document.body
  );
}
