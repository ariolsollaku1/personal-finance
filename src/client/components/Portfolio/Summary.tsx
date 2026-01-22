import { useState, useEffect } from 'react';
import { PortfolioSummary } from '../../lib/api';

interface SummaryProps {
  portfolio: PortfolioSummary | null;
  lastUpdated?: Date | null;
  refreshing?: boolean;
  onRefresh?: () => void;
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

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function Summary({ portfolio, lastUpdated, refreshing, onRefresh }: SummaryProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Update "time ago" every second
  useEffect(() => {
    if (!lastUpdated) return;

    const updateTimeAgo = () => setTimeAgo(formatTimeAgo(lastUpdated));
    updateTimeAgo();

    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!portfolio) {
    return null;
  }

  const { cashBalance, totalValue, totalCost, totalGain, totalGainPercent, dayChange, dayChangePercent } = portfolio;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header with refresh */}
      {(lastUpdated || onRefresh) && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {lastUpdated && (
              <>
                <span className={`inline-block w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></span>
                <span>Updated {timeAgo}</span>
              </>
            )}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      )}

      {/* Cash Balance */}
      {cashBalance !== undefined && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cash Balance</p>
              <p className={`text-xl font-bold ${cashBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(cashBalance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Account Value</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totalValue + cashBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Total Gain/Loss</p>
          <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalGain)}
          </p>
          <p className={`text-sm ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(totalGainPercent)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Day Change</p>
          <p className={`text-2xl font-bold ${dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(dayChange)}
          </p>
          <p className={`text-sm ${dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(dayChangePercent)}
          </p>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
        Auto-refreshes every 60 seconds
      </div>
    </div>
  );
}
