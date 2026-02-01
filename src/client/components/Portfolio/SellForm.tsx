import { useState } from 'react';
import { holdingsApi } from '../../lib/api';

interface SellFormProps {
  symbol: string;
  maxShares: number;
  currentPrice: number;
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SellForm({ symbol, maxShares, currentPrice, accountId, onSuccess, onCancel }: SellFormProps) {
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const shareCount = parseFloat(shares);
    if (shareCount > maxShares) {
      setError(`Cannot sell more than ${maxShares} shares`);
      return;
    }

    setLoading(true);
    try {
      await holdingsApi.sell(symbol, {
        shares: shareCount,
        price: parseFloat(price),
        fees: fees ? parseFloat(fees) : 0,
        date,
        accountId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell shares');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="text-md font-semibold mb-3">Sell {symbol}</h4>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shares (max: {maxShares})
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            step="any"
            min="0"
            max={maxShares}
            required
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            step="any"
            min="0"
            required
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fees</label>
          <input
            type="number"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            step="any"
            min="0"
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !shares || !price}
            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {loading ? 'Selling...' : 'Sell'}
          </button>
        </div>
      </form>
    </div>
  );
}
