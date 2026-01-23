import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi, AccountType, Currency } from '../lib/api';

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
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Account</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="e.g., Main Checking"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => {
              const newType = e.target.value as AccountType;
              setFormData({
                ...formData,
                type: newType,
                // Default to USD for stock accounts, reset balance to 0
                currency: newType === 'stock' ? 'USD' : formData.currency,
                initialBalance: newType === 'stock' ? 0 : formData.initialBalance,
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="bank">Bank Account</option>
            <option value="cash">Cash Account</option>
            <option value="stock">Stock Account</option>
            <option value="asset">Asset</option>
            <option value="loan">Loan Account</option>
            <option value="credit">Credit Card</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {formData.type === 'bank' && 'For checking, savings, or other bank accounts'}
            {formData.type === 'cash' && 'For physical cash or wallet tracking'}
            {formData.type === 'stock' && 'For stock portfolios and investment accounts (USD only)'}
            {formData.type === 'asset' && 'For real estate, vehicles, or other valuable assets'}
            {formData.type === 'loan' && 'For tracking debts and loans you owe'}
            {formData.type === 'credit' && 'For credit cards - enter the credit limit'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
            disabled={formData.type === 'stock'}
          >
            <option value="ALL">ALL (Albanian Lek)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>
          {formData.type === 'stock' && (
            <p className="text-xs text-gray-500 mt-1">
              Stock accounts use USD for tracking market values
            </p>
          )}
        </div>

        {formData.type !== 'stock' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'credit' ? 'Credit Limit' : formData.type === 'asset' ? 'Current Value' : 'Initial Balance'}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.initialBalance}
              onChange={(e) =>
                setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'credit'
                ? 'The maximum credit limit for this card'
                : formData.type === 'asset'
                ? 'The current market value of this asset'
                : 'The starting balance for this account'}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
