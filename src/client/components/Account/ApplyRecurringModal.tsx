import { useState } from 'react';
import { RecurringTransaction, DueRecurring, Currency } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';

interface ApplyRecurringModalProps {
  recurring: RecurringTransaction | DueRecurring;
  currency: Currency;
  onConfirm: (id: number, amount: number) => void;
  onClose: () => void;
}

function getLabel(r: RecurringTransaction | DueRecurring): string {
  if ('payee_name' in r) return r.payee_name || r.category_name || 'Recurring Transaction';
  return (r as DueRecurring).payee || (r as DueRecurring).category || 'Recurring Transaction';
}

export default function ApplyRecurringModal({
  recurring,
  currency,
  onConfirm,
  onClose,
}: ApplyRecurringModalProps) {
  const [amount, setAmount] = useState(recurring.amount.toString());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onConfirm(recurring.id, parsed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-1">Apply Transaction</h2>
        <p className="text-sm text-gray-500 mb-4">{getLabel(recurring)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              autoFocus
            />
            {parseFloat(amount) !== recurring.amount && (
              <p className="text-xs text-gray-500 mt-1">
                Original: {formatCurrency(recurring.amount, currency)}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {submitting ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
