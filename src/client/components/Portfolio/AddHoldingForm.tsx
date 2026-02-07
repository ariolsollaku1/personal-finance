import { useState } from 'react';
import { holdingsApi } from '../../lib/api';
import StockSearch from '../StockSearch';
import BaseModal from '../BaseModal';

interface AddHoldingModalProps {
  isOpen: boolean;
  accountId: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AddHoldingModal({ isOpen, accountId, onSuccess, onClose }: AddHoldingModalProps) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setSymbol('');
    setShares('');
    setPrice('');
    setFees('');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      await holdingsApi.create({
        symbol,
        shares: parseFloat(shares),
        price: parseFloat(price),
        fees: fees ? parseFloat(fees) : 0,
        date,
        accountId,
      });
      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="2xl">
      {/* Header */}
      <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add New Holding</h2>
          <p className="text-sm text-gray-500 mt-0.5">Buy shares of a stock or ETF</p>
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Symbol</label>
            <StockSearch
              value={symbol}
              onChange={setSymbol}
              onSelect={(s) => setSymbol(s)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Shares</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                step="any"
                min="0"
                required
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 focus:shadow-sm focus:shadow-orange-500/10 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price per Share</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="any"
                min="0"
                required
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 focus:shadow-sm focus:shadow-orange-500/10 transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fees (optional)</label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                step="any"
                min="0"
                placeholder="0.00"
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 focus:shadow-sm focus:shadow-orange-500/10 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 focus:shadow-sm focus:shadow-orange-500/10 transition-all duration-200"
              />
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
          onClick={() => handleSubmit()}
          disabled={loading || !symbol || !shares || !price}
          className="w-full lg:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Adding...
            </span>
          ) : (
            'Add Holding'
          )}
        </button>
      </div>
    </BaseModal>
  );
}
