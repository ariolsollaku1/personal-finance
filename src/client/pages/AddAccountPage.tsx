import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi, AccountType, Currency } from '../lib/api';

const accountTypeInfo = {
  bank: { icon: '🏦', label: 'Bank Account', description: 'Checking, savings, or other bank accounts' },
  cash: { icon: '💵', label: 'Cash Account', description: 'Physical cash or wallet tracking' },
  stock: { icon: '📈', label: 'Stock Account', description: 'Investment portfolios (USD only)' },
  asset: { icon: '🏠', label: 'Asset', description: 'Real estate, vehicles, or valuables' },
  loan: { icon: '📋', label: 'Loan Account', description: 'Debts and loans you owe' },
  credit: { icon: '💳', label: 'Credit Card', description: 'Credit cards - enter the credit limit' },
};

export default function AddAccountPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as AccountType,
    currency: 'ALL' as Currency,
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
      navigate(`/accounts/${account.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Account</h1>
        <p className="text-gray-500 mt-1">Create a new account to track your finances</p>
      </div>

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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Account Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      initialBalance: type === 'stock' ? 0 : formData.initialBalance,
                    });
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{info.icon}</span>
                  <p className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                    {info.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-gray-900">Account Details</h3>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Account Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Main Checking"
              required
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1.5">
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500"
              disabled={formData.type === 'stock'}
            >
              <option value="ALL">ALL - Albanian Lek</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - US Dollar</option>
            </select>
            {formData.type === 'stock' && (
              <p className="text-xs text-gray-500 mt-1.5">
                Stock accounts use USD for tracking market values
              </p>
            )}
          </div>

          {formData.type !== 'stock' && (
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
              <p className="text-xs text-gray-500 mt-1.5">
                {formData.type === 'credit'
                  ? 'The maximum credit limit for this card'
                  : formData.type === 'asset'
                  ? 'The current market value of this asset'
                  : formData.type === 'loan'
                  ? 'The remaining balance on this loan'
                  : 'The starting balance for this account'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
      </form>
    </div>
  );
}
