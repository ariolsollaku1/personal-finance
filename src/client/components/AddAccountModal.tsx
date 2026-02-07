import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi, AccountType, Currency } from '../lib/api';
import BaseModal from './BaseModal';

const accountTypeInfo = {
  bank: { icon: '🏦', label: 'Bank Account', shortLabel: 'Bank', description: 'Checking, savings, or other bank accounts' },
  cash: { icon: '💵', label: 'Cash Account', shortLabel: 'Cash', description: 'Physical cash or wallet tracking' },
  stock: { icon: '📈', label: 'Stock Account', shortLabel: 'Stock', description: 'Investment portfolios (USD only)' },
  asset: { icon: '🏠', label: 'Asset', shortLabel: 'Asset', description: 'Real estate, vehicles, or valuables' },
  loan: { icon: '📋', label: 'Loan Account', shortLabel: 'Loan', description: 'Debts and loans you owe' },
  credit: { icon: '💳', label: 'Credit Card', shortLabel: 'Credit', description: 'Credit cards - enter the credit limit' },
};

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as AccountType,
    currency: 'EUR' as Currency,
    initialBalance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const account = await accountsApi.create(formData);
      onClose();
      // Reset form
      setFormData({ name: '', type: 'bank', currency: 'ALL', initialBalance: 0 });
      // Navigate to the new account
      navigate(`/accounts/${account.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setFormData({ name: '', type: 'bank', currency: 'ALL', initialBalance: 0 });
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="2xl">
      {/* Header */}
        <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create a new account to track your finances</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Account Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Account Type
              </label>

              {/* Mobile: horizontal scroll mini cards */}
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-6 px-6 lg:hidden">
                {(Object.keys(accountTypeInfo) as AccountType[]).map((type) => {
                  const info = accountTypeInfo[type];
                  const isSelected = formData.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          type,
                          currency: type === 'stock' ? 'USD' : formData.currency,
                        });
                      }}
                      className={`flex flex-col items-center justify-center w-[calc((100%-1rem)/3)] min-w-[calc((100%-1rem)/3)] py-3 rounded-xl border-2 transition-all duration-200 flex-shrink-0 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl mb-1">{info.icon}</span>
                      <span className={`text-xs font-medium ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                        {info.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Mobile: selected type description */}
              <p className="text-xs text-gray-500 mt-2 lg:hidden">
                {accountTypeInfo[formData.type].description}
              </p>

              {/* Desktop: grid cards */}
              <div className="hidden lg:grid grid-cols-3 gap-3">
                {(Object.keys(accountTypeInfo) as AccountType[]).map((type) => {
                  const info = accountTypeInfo[type];
                  const isSelected = formData.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          type,
                          currency: type === 'stock' ? 'USD' : formData.currency,
                        });
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{info.icon}</span>
                      <p className={`font-medium text-sm ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                        {info.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 focus:shadow-sm focus:shadow-orange-500/10 transition-all duration-200"
                  placeholder="e.g., Main Checking"
                  required
                  autoFocus={window.matchMedia('(min-width: 1024px)').matches}
                />
              </div>

              {/* Mobile: combined currency prefix + balance input */}
              <div className="sm:hidden">
                <label htmlFor="balance-mobile" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {formData.type === 'credit' ? 'Credit Limit' : formData.type === 'asset' ? 'Current Value' : 'Initial Balance'}
                </label>
                <div className="flex rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent transition-all duration-200 overflow-hidden">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                    disabled={formData.type === 'stock'}
                    className="appearance-none pl-3 pr-1 py-3 bg-gray-50 border-r border-gray-300 text-gray-700 text-sm font-medium focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="NOK">NOK</option>
                    <option value="SEK">SEK</option>
                    <option value="DKK">DKK</option>
                    <option value="PLN">PLN</option>
                    <option value="CZK">CZK</option>
                    <option value="HUF">HUF</option>
                    <option value="RON">RON</option>
                    <option value="BGN">BGN</option>
                    <option value="ALL">ALL</option>
                  </select>
                  <input
                    id="balance-mobile"
                    type="number"
                    step="0.01"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="flex-1 min-w-0 px-3 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                {formData.type === 'stock' && (
                  <p className="text-xs text-gray-500 mt-1.5">Stock accounts use USD</p>
                )}
              </div>

              {/* Desktop: separate currency + balance fields */}
              <div className="hidden sm:grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                    className="appearance-none w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={formData.type === 'stock'}
                  >
                    <option value="EUR">EUR - Euro</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="NOK">NOK - Norwegian Krone</option>
                    <option value="SEK">SEK - Swedish Krona</option>
                    <option value="DKK">DKK - Danish Krone</option>
                    <option value="PLN">PLN - Polish Zloty</option>
                    <option value="CZK">CZK - Czech Koruna</option>
                    <option value="HUF">HUF - Hungarian Forint</option>
                    <option value="RON">RON - Romanian Leu</option>
                    <option value="BGN">BGN - Bulgarian Lev</option>
                    <option value="ALL">ALL - Albanian Lek</option>
                  </select>
                  {formData.type === 'stock' && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Stock accounts use USD
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {formData.type === 'credit' ? 'Credit Limit' : formData.type === 'asset' ? 'Current Value' : 'Initial Balance'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : 'L'}
                    </span>
                    <input
                      id="balance"
                      type="number"
                      step="0.01"
                      value={formData.initialBalance}
                      onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse lg:flex-row gap-3 lg:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full lg:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            className="w-full lg:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
    </BaseModal>
  );
}
