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
  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    newRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add Recurring Transaction</h2>
        <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md">
              Add
            </button>
          </div>
        </form>
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
  if (!editingRecurring) return null;

  const filteredCategories = categories.filter((c) =>
    editingRecurring.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Recurring Transaction</h2>
        <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
