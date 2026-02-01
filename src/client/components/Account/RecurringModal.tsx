import { useState } from 'react';
import { RecurringTransaction, Category, Payee, Frequency } from '../../lib/api';
import { NewRecurringForm } from '../../hooks/useAccountPage';

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newRecurring: NewRecurringForm;
  setNewRecurring: (data: NewRecurringForm) => void;
  categories: Category[];
  payees: Payee[];
  isStockAccount: boolean;
}

export function AddRecurringModal({
  isOpen,
  onClose,
  onSubmit,
  newRecurring,
  setNewRecurring,
  categories,
  payees,
  isStockAccount,
}: AddRecurringModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

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
    newRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center z-50 lg:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full lg:max-w-md max-h-[90vh] overflow-hidden animate-slide-up lg:animate-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-3rem)]">
        <h2 className="text-lg font-semibold mb-4">Add Recurring Transaction</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
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
                  list="payees-add"
                />
                <datalist id="payees-add">
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
                  {filteredCategories.map((c) => (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
            <input
              type="date"
              value={newRecurring.nextDueDate}
              onChange={(e) => setNewRecurring({ ...newRecurring, nextDueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
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
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

interface EditRecurringModalProps {
  editingRecurring: RecurringTransaction | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setEditingRecurring: (data: RecurringTransaction | null) => void;
  categories: Category[];
  payees: Payee[];
  isStockAccount: boolean;
}

export function EditRecurringModal({
  editingRecurring,
  onClose,
  onSubmit,
  setEditingRecurring,
  categories,
  payees,
  isStockAccount,
}: EditRecurringModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!editingRecurring) return null;

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
    editingRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center z-50 lg:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full lg:max-w-md max-h-[90vh] overflow-hidden animate-slide-up lg:animate-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-3rem)]">
        <h2 className="text-lg font-semibold mb-4">Edit Recurring Transaction</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
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
              onChange={(e) =>
                setEditingRecurring({
                  ...editingRecurring,
                  amount: parseFloat(e.target.value) || 0,
                })
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
                  value={editingRecurring.payee_name || ''}
                  onChange={(e) =>
                    setEditingRecurring({ ...editingRecurring, payee_name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditingRecurring({ ...editingRecurring, category_name: e.target.value })
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
          {isStockAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={editingRecurring.notes || ''}
                onChange={(e) =>
                  setEditingRecurring({ ...editingRecurring, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={editingRecurring.frequency}
              onChange={(e) =>
                setEditingRecurring({
                  ...editingRecurring,
                  frequency: e.target.value as Frequency,
                })
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
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
    </div>
  );
}
