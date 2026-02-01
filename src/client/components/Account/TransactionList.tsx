import { AccountTransaction, Currency } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';

interface TransactionListProps {
  transactions: AccountTransaction[];
  currency: Currency;
  isStockAccount: boolean;
  onEdit: (transaction: AccountTransaction) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function TransactionList({
  transactions,
  currency,
  isStockAccount,
  onEdit,
  onDelete,
  onAdd,
}: TransactionListProps) {
  const isEditable = (tx: AccountTransaction) => {
    if (tx.transfer_id) return false;
    if (isStockAccount && (tx.notes?.startsWith('Buy ') || tx.notes?.startsWith('Sell '))) return false;
    return true;
  };

  const getTransactionLabel = (tx: AccountTransaction) => {
    if (tx.notes?.startsWith('Buy ') || tx.notes?.startsWith('Sell ')) {
      return <span className="text-xs text-gray-400">Stock Trade</span>;
    }
    if (tx.transfer_id) {
      return <span className="text-xs text-gray-400">Transfer</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100/80">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">Transactions</h2>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-500/25 font-medium transition-all duration-200"
        >
          + Add Transaction
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">No transactions yet</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="py-2 px-4 flex justify-between items-center hover:bg-gray-50"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={`text-sm font-medium w-20 ${
                    tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'inflow' ? '+' : '-'}
                  {formatCurrency(tx.amount, currency)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.payee_name || tx.category_name || tx.notes || 'Transaction'}
                    {tx.category_name && tx.payee_name && (
                      <span className="text-gray-400 font-normal"> • {tx.category_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {tx.notes &&
                      !tx.notes.startsWith('Buy ') &&
                      !tx.notes.startsWith('Sell ') &&
                      ` • ${tx.notes}`}
                    {tx.balance !== undefined && ` • Bal: ${formatCurrency(tx.balance, currency)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditable(tx) ? (
                  <>
                    <button
                      onClick={() => onEdit(tx)}
                      className="text-xs text-orange-600 hover:text-orange-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  getTransactionLabel(tx)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
