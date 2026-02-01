import { useState, useMemo } from 'react';
import { Dividend, dividendsApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmModal from '../ConfirmModal';

interface DividendListProps {
  dividends: Dividend[];
  onDelete: () => void;
}

type SortColumn = 'ex_date' | 'pay_date' | 'symbol' | 'amount' | 'tax_rate' | 'tax_amount' | 'net_amount';
type SortDirection = 'asc' | 'desc';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function DividendList({ dividends, onDelete }: DividendListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [sortColumn, setSortColumn] = useState<SortColumn>('ex_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleDelete = async (id: number) => {
    if (!await confirm({ title: 'Delete Dividend', message: 'Are you sure you want to delete this dividend?', confirmLabel: 'Delete', variant: 'danger' })) {
      return;
    }

    setDeletingId(id);
    try {
      await dividendsApi.delete(id);
      onDelete();
    } catch (error) {
      toast.error('Dividend', error instanceof Error ? error.message : 'Failed to delete dividend');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedDividends = useMemo(() => {
    return [...dividends].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'ex_date':
          comparison = new Date(a.ex_date).getTime() - new Date(b.ex_date).getTime();
          break;
        case 'pay_date':
          const aDate = a.pay_date ? new Date(a.pay_date).getTime() : 0;
          const bDate = b.pay_date ? new Date(b.pay_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'tax_rate':
          comparison = a.tax_rate - b.tax_rate;
          break;
        case 'tax_amount':
          comparison = a.tax_amount - b.tax_amount;
          break;
        case 'net_amount':
          comparison = a.net_amount - b.net_amount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [dividends, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-orange-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  if (dividends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No dividends recorded yet. Add your first dividend payment to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('ex_date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Ex-Date
                  <SortIcon column="ex_date" />
                </div>
              </th>
              <th
                onClick={() => handleSort('pay_date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Payment Date
                  <SortIcon column="pay_date" />
                </div>
              </th>
              <th
                onClick={() => handleSort('symbol')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center">
                  Symbol
                  <SortIcon column="symbol" />
                </div>
              </th>
              <th
                onClick={() => handleSort('amount')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center justify-end">
                  Gross
                  <SortIcon column="amount" />
                </div>
              </th>
              <th
                onClick={() => handleSort('tax_rate')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center justify-end">
                  Tax Rate
                  <SortIcon column="tax_rate" />
                </div>
              </th>
              <th
                onClick={() => handleSort('tax_amount')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center justify-end">
                  Tax
                  <SortIcon column="tax_amount" />
                </div>
              </th>
              <th
                onClick={() => handleSort('net_amount')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div className="flex items-center justify-end">
                  Net
                  <SortIcon column="net_amount" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDividends.map((div) => (
              <tr key={div.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(div.ex_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {div.pay_date ? formatDate(div.pay_date) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {div.symbol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {formatCurrency(div.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {formatPercent(div.tax_rate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                  -{formatCurrency(div.tax_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                  {formatCurrency(div.net_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleDelete(div.id)}
                    disabled={deletingId === div.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === div.id ? '...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
