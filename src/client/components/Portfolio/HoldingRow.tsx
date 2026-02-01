import { useState } from 'react';
import { HoldingWithQuote, holdingsApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import SellForm from './SellForm';

interface HoldingRowProps {
  holding: HoldingWithQuote;
  accountId: number;
  onUpdate: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function HoldingRow({ holding, accountId, onUpdate }: HoldingRowProps) {
  const [showSellForm, setShowSellForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${holding.symbol}?`)) {
      return;
    }

    setDeleting(true);
    try {
      await holdingsApi.delete(holding.id);
      onUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete holding');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="font-medium text-gray-900">{holding.symbol}</div>
          <div className="text-sm text-gray-500">{holding.name}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {holding.shares.toLocaleString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {formatCurrency(holding.avgCost)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {formatCurrency(holding.currentPrice)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
          {formatCurrency(holding.marketValue)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          <div className={holding.gain >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(holding.gain)}
          </div>
          <div className={`text-xs ${holding.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(holding.gainPercent)}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          <div className={holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(holding.dayChange)}
          </div>
          <div className={`text-xs ${holding.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(holding.dayChangePercent)}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
          <button
            onClick={() => setShowSellForm(true)}
            className="text-orange-600 hover:text-orange-800"
          >
            Sell
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </td>
      </tr>
      {showSellForm && (
        <tr>
          <td colSpan={8} className="px-6 py-4 bg-gray-50">
            <SellForm
              symbol={holding.symbol}
              maxShares={holding.shares}
              currentPrice={holding.currentPrice}
              accountId={accountId}
              onSuccess={() => {
                setShowSellForm(false);
                onUpdate();
              }}
              onCancel={() => setShowSellForm(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
