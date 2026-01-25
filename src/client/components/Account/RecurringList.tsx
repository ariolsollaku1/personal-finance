import { RecurringTransaction, Currency } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { getRecurringRowStyle } from '../../hooks/useAccountPage';

interface RecurringListProps {
  recurring: RecurringTransaction[];
  currency: Currency;
  onApply: (id: number) => void;
  onEdit: (recurring: RecurringTransaction) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function RecurringList({
  recurring,
  currency,
  onApply,
  onEdit,
  onDelete,
  onAdd,
}: RecurringListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">Recurring Transactions</h2>
        <button
          onClick={onAdd}
          className="text-sm text-orange-600 hover:text-orange-800"
        >
          + Add Recurring
        </button>
      </div>
      {recurring.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">No recurring transactions</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {recurring.map((rec) => (
            <div
              key={rec.id}
              className={`py-2 px-4 flex justify-between items-center ${getRecurringRowStyle(rec.next_due_date)}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={`text-sm font-medium w-20 ${
                    rec.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {rec.type === 'inflow' ? '+' : ''}
                  {formatCurrency(rec.type === 'inflow' ? rec.amount : -rec.amount, currency)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {rec.payee_name || 'No payee'}
                    {rec.category_name && (
                      <span className="text-gray-400 font-normal"> • {rec.category_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {rec.frequency} • Next:{' '}
                    {new Date(rec.next_due_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onApply(rec.id)}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Apply
                </button>
                <button
                  onClick={() => onEdit(rec)}
                  className="text-xs text-orange-600 hover:text-orange-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(rec.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
