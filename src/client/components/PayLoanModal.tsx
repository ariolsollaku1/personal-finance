import { useState, useEffect } from 'react';
import { Account, transfersApi } from '../lib/api';
import { getCurrencySymbol, formatCurrency } from '../lib/currency';
import BaseModal from './BaseModal';

interface PayLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanAccount: Account;
  sourceAccounts: Account[];
  onSuccess: (newBalance: number) => void;
}

export default function PayLoanModal({
  isOpen,
  onClose,
  loanAccount,
  sourceAccounts,
  onSuccess,
}: PayLoanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sourceAccountId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Calculate remaining balance on the loan (negative = debt owed)
  const loanBalance = loanAccount.balance || 0;
  const remainingDebt = Math.abs(loanBalance);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        sourceAccountId: sourceAccounts.length === 1 ? String(sourceAccounts[0].id) : '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setError(null);
    }
  }, [isOpen, sourceAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      setSubmitting(false);
      return;
    }

    const sourceId = parseInt(formData.sourceAccountId);
    if (isNaN(sourceId)) {
      setError('Please select a source account');
      setSubmitting(false);
      return;
    }

    try {
      // Create transfer from source account to loan account
      await transfersApi.create({
        fromAccountId: sourceId,
        toAccountId: loanAccount.id,
        fromAmount: amount,
        toAmount: amount,
        date: formData.date,
        notes: formData.notes || `Loan payment to ${loanAccount.name}`,
      });

      // Calculate new balance after payment
      const newBalance = loanBalance + amount;

      onSuccess(newBalance);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError(null);
      onClose();
    }
  };

  const handlePayInFull = () => {
    setFormData({ ...formData, amount: remainingDebt.toFixed(2) });
  };

  const selectedAccount = sourceAccounts.find(
    (a) => String(a.id) === formData.sourceAccountId
  );

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="md">
      {/* Header */}
        <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pay Loan</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Make a payment to {loanAccount.name}
            </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loan Info Card */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Remaining Balance</span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(remainingDebt, loanAccount.currency)}
              </span>
            </div>
          </div>

          {/* Source Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pay From
            </label>
            <select
              value={formData.sourceAccountId}
              onChange={(e) => setFormData({ ...formData, sourceAccountId: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              required
            >
              <option value="">Select account</option>
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({formatCurrency(account.balance || 0, account.currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {getCurrencySymbol(selectedAccount?.currency || loanAccount.currency)}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingDebt}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="0.00"
                required
              />
            </div>
            {remainingDebt > 0 && (
              <button
                type="button"
                onClick={handlePayInFull}
                className="mt-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                Pay in Full ({formatCurrency(remainingDebt, loanAccount.currency)})
              </button>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Optional notes"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse lg:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="w-full lg:flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.amount || !formData.sourceAccountId}
              className="w-full lg:flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 flex items-center justify-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {submitting ? 'Processing...' : 'Make Payment'}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}
