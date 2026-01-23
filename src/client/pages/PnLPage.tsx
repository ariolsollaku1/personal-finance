import { useState, useEffect } from 'react';
import { PnLSummary, PnLMonthDetail, MonthlyPnL, pnlApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';

export default function PnLPage() {
  const [summary, setSummary] = useState<PnLSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetail, setMonthDetail] = useState<PnLMonthDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await pnlApi.getSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthDetail = async (month: string) => {
    try {
      setDetailLoading(true);
      const data = await pnlApi.getMonth(month);
      setMonthDetail(data);
      setSelectedMonth(month);
    } catch (err) {
      console.error('Failed to load month details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedMonth(null);
    setMonthDetail(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading P&L data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  const currency = summary.mainCurrency;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.months.map((month) => (
          <MonthCard
            key={month.month}
            month={month}
            currency={currency}
            onClick={() => loadMonthDetail(month.month)}
          />
        ))}
      </div>

      {summary.months.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          No transactions recorded yet. Add transactions to see your P&L.
        </div>
      )}

      {/* Detail Modal */}
      {selectedMonth && (
        <MonthDetailModal
          detail={monthDetail}
          loading={detailLoading}
          currency={currency}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// Month Card Component
interface MonthCardProps {
  month: MonthlyPnL;
  currency: string;
  onClick: () => void;
}

function MonthCard({ month, currency, onClick }: MonthCardProps) {
  const isPositive = month.net >= 0;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow p-4 text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{month.label}</h3>
        <span className="text-xs text-gray-400">{month.transactionCount} txns</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Income</span>
          <span className="text-sm font-medium text-green-600">
            +{formatCurrency(month.income, currency as 'ALL' | 'EUR' | 'USD')}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Expenses</span>
          <span className="text-sm font-medium text-red-600">
            -{formatCurrency(month.expenses, currency as 'ALL' | 'EUR' | 'USD')}
          </span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Net</span>
            <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(month.net, currency as 'ALL' | 'EUR' | 'USD')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-orange-600 hover:text-orange-800">
        Click to view details
      </div>
    </button>
  );
}

// Month Detail Modal Component
interface MonthDetailModalProps {
  detail: PnLMonthDetail | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
}

function MonthDetailModal({ detail, loading, currency, onClose }: MonthDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {loading ? 'Loading...' : detail?.label || 'Month Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">Loading transactions...</div>
            </div>
          ) : detail ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Income</p>
                  <p className="text-xl font-bold text-green-700">
                    +{formatCurrency(detail.income, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Expenses</p>
                  <p className="text-xl font-bold text-red-700">
                    -{formatCurrency(detail.expenses, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${detail.net >= 0 ? 'bg-orange-50' : 'bg-orange-50'}`}>
                  <p className={`text-sm ${detail.net >= 0 ? 'text-orange-600' : 'text-orange-600'}`}>Net</p>
                  <p className={`text-xl font-bold ${detail.net >= 0 ? 'text-orange-700' : 'text-orange-700'}`}>
                    {detail.net >= 0 ? '+' : ''}{formatCurrency(detail.net, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
              </div>

              {/* Transactions List */}
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Transactions</h3>
              {detail.transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions for this month</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detail.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {tx.payee || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {tx.category || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {tx.accountName}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                            tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'inflow' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.accountCurrency as 'ALL' | 'EUR' | 'USD')}
                            {tx.accountCurrency !== currency && (
                              <span className="text-gray-400 text-xs ml-1">
                                ({formatCurrency(tx.amountInMainCurrency, currency as 'ALL' | 'EUR' | 'USD')})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center py-4">No data available</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
