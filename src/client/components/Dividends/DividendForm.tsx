import { useState } from 'react';
import { dividendsApi } from '../../lib/api';
import StockSearch from '../StockSearch';

interface DividendFormProps {
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DividendForm({ accountId, onSuccess, onCancel }: DividendFormProps) {
  const [symbol, setSymbol] = useState('');
  const [amountPerShare, setAmountPerShare] = useState('');
  const [sharesHeld, setSharesHeld] = useState('');
  const [exDate, setExDate] = useState(new Date().toISOString().split('T')[0]);
  const [payDate, setPayDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await dividendsApi.create({
        symbol,
        amountPerShare: parseFloat(amountPerShare),
        sharesHeld: sharesHeld ? parseFloat(sharesHeld) : undefined,
        exDate,
        payDate: payDate || undefined,
        accountId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dividend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Add Dividend Payment</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <StockSearch
              value={symbol}
              onChange={setSymbol}
              onSelect={(s) => setSymbol(s)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount per Share ($)
            </label>
            <input
              type="number"
              value={amountPerShare}
              onChange={(e) => setAmountPerShare(e.target.value)}
              step="any"
              min="0"
              required
              placeholder="0.25"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shares Held (optional)
            </label>
            <input
              type="number"
              value={sharesHeld}
              onChange={(e) => setSharesHeld(e.target.value)}
              step="any"
              min="0"
              placeholder="Auto-detect from holdings"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use current holding
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ex-Dividend Date</label>
            <input
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Date (optional)
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-700">
          <strong>Albanian Dividend Tax (8%)</strong> will be automatically calculated and applied.
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !symbol || !amountPerShare}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {loading ? 'Adding...' : 'Add Dividend'}
          </button>
        </div>
      </form>
    </div>
  );
}
