import { AccountTransaction, Category, Payee } from '../../lib/api';

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
  if (!editingTransaction) return null;

  const filteredCategories = categories.filter((c) =>
    editingTransaction.type === 'inflow' ? c.type === 'income' : c.type === 'expense'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Transaction</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={editingTransaction.type === 'inflow'}
                onChange={() => setEditingTransaction({ ...editingTransaction, type: 'inflow' })}
                className="mr-2"
              />
              {isStockAccount ? 'Deposit' : 'Income'}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={editingTransaction.type === 'outflow'}
                onChange={() => setEditingTransaction({ ...editingTransaction, type: 'outflow' })}
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
              value={editingTransaction.amount}
              onChange={(e) =>
                setEditingTransaction({
                  ...editingTransaction,
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
              value={editingTransaction.date}
              onChange={(e) =>
                setEditingTransaction({ ...editingTransaction, date: e.target.value })
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
                  value={editingTransaction.payee_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, payee_name: e.target.value })
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
                  value={editingTransaction.category_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, category_name: e.target.value })
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
              value={editingTransaction.notes || ''}
              onChange={(e) =>
                setEditingTransaction({ ...editingTransaction, notes: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
