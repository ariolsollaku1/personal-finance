import { useState } from 'react';
import { transactionsApi } from '../../lib/api';
import StockSearch from '../StockSearch';

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await transactionsApi.create({
        symbol,
        type,
        shares: parseFloat(shares),
        price: parseFloat(price),
        fees: fees ? parseFloat(fees) : 0,
        date,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Add Transaction</h3>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'buy' | 'sell')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shares</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              step="any"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price per Share</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="any"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
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
            disabled={loading || !symbol || !shares || !price}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}
