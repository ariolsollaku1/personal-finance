import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RecurringTransaction, DueRecurring, Currency } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { useBottomSheet } from '../../hooks/useBottomSheet';

interface ApplyRecurringModalProps {
  recurring: RecurringTransaction | DueRecurring | null;
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
  const { shouldRender, isVisible } = useBottomSheet(!!recurring);
  const dataRef = useRef(recurring);
  if (recurring) dataRef.current = recurring;

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (recurring) setAmount(recurring.amount.toString());
  }, [recurring]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || !dataRef.current) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onConfirm(dataRef.current.id, parsed));
    } finally {
      setSubmitting(false);
    }
  };

  if (!shouldRender || !dataRef.current) return null;

  const data = dataRef.current;

  return createPortal(
    <div
      className={`fixed inset-0 !mt-0 bg-black/40 backdrop-blur-md flex items-end lg:items-center lg:justify-center z-50 lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-gray-200/50 w-full lg:max-w-sm max-h-[90vh] overflow-hidden transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-6">
        <h2 className="text-lg font-semibold mb-1">Apply Transaction</h2>
        <p className="text-sm text-gray-500 mb-4">{getLabel(data)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              required
              autoFocus={window.matchMedia('(min-width: 1024px)').matches}
            />
            {parseFloat(amount) !== data.amount && (
              <p className="text-xs text-gray-500 mt-1">
                Original: {formatCurrency(data.amount, currency)}
              </p>
            )}
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
              {submitting ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
