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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700">
          <strong>Albanian Dividend Tax (8%)</strong> will be automatically calculated and applied.
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !symbol || !amountPerShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Dividend'}
          </button>
        </div>
      </form>
    </div>
  );
}
