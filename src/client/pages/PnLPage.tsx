import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PnLMonthDetail, MonthlyPnL, pnlApi } from '../lib/api';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { formatCurrency } from '../lib/currency';
import { PnLSkeleton } from '../components/Skeleton';
import { useSWR } from '../hooks/useSWR';

export default function PnLPage() {
  const { data: summary, loading } = useSWR('/pnl', () => pnlApi.getSummary());
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetail, setMonthDetail] = useState<PnLMonthDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    return <PnLSkeleton />;
  }

  if (!summary) return null;

  const currency = summary.mainCurrency;

  // Calculate year totals
  const yearTotals = summary.months.reduce(
    (acc, month) => ({
      income: acc.income + month.income,
      expenses: acc.expenses + month.expenses,
      net: acc.net + month.net,
    }),
    { income: 0, expenses: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profit & Loss</h1>
        <p className="text-gray-500 mt-1">Track your income and expenses by month</p>
      </div>

      {/* Year Summary Card */}
      {summary.months.length > 0 && (
        <div className="bg-gradient-to-br from-orange-400 via-orange-600 to-rose-600 rounded-2xl shadow-2xl shadow-orange-500/30 p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-orange-100 font-medium">Year to Date Summary</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-orange-200 text-sm mb-1">Total Income</p>
              <p className="text-2xl font-bold">
                +{formatCurrency(yearTotals.income, currency as 'ALL' | 'EUR' | 'USD')}
              </p>
            </div>
            <div>
              <p className="text-orange-200 text-sm mb-1">Total Expenses</p>
              <p className="text-2xl font-bold">
                -{formatCurrency(yearTotals.expenses, currency as 'ALL' | 'EUR' | 'USD')}
              </p>
            </div>
            <div>
              <p className="text-orange-200 text-sm mb-1">Net Result</p>
              <p className="text-2xl font-bold">
                {yearTotals.net >= 0 ? '+' : ''}{formatCurrency(yearTotals.net, currency as 'ALL' | 'EUR' | 'USD')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Month Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
          <p className="text-gray-500">Add transactions to see your profit & loss report.</p>
        </div>
      )}

      {/* Detail Modal */}
      <MonthDetailModal
        isOpen={!!selectedMonth}
        detail={monthDetail}
        loading={detailLoading}
        currency={currency}
        onClose={closeModal}
      />
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
      className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-5 text-left hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{month.label}</h3>
          <span className="text-xs text-gray-400">{month.transactionCount} transactions</span>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-gradient-to-br from-green-100 to-emerald-200/80 shadow-sm shadow-green-500/10' : 'bg-gradient-to-br from-red-100 to-rose-200/80 shadow-sm shadow-red-500/10'}`}>
          <svg className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isPositive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            )}
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Income</span>
          <span className="text-sm font-semibold text-green-600">
            +{formatCurrency(month.income, currency as 'ALL' | 'EUR' | 'USD')}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Expenses</span>
          <span className="text-sm font-semibold text-red-600">
            -{formatCurrency(month.expenses, currency as 'ALL' | 'EUR' | 'USD')}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Net</span>
            <span className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(month.net, currency as 'ALL' | 'EUR' | 'USD')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-sm text-orange-600 group-hover:text-orange-500 font-medium">
        <span>View details</span>
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// Month Detail Modal Component
interface MonthDetailModalProps {
  isOpen: boolean;
  detail: PnLMonthDetail | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
}

function MonthDetailModal({ isOpen, detail, loading, currency, onClose }: MonthDetailModalProps) {
  const { shouldRender, isVisible } = useBottomSheet(isOpen);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 !mt-0 bg-black/40 backdrop-blur-md z-50 flex items-end lg:items-center lg:justify-center lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-gray-200/50 w-full lg:max-w-4xl max-h-[90vh] flex flex-col transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {loading ? 'Loading...' : detail?.label || 'Month Details'}
            </h2>
            {detail && !loading && (
              <p className="text-sm text-gray-500">{detail.transactions.length} transactions</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="flex items-center gap-3 text-gray-500">
                <svg className="animate-spin h-5 w-5 text-orange-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading transactions...
              </div>
            </div>
          ) : detail ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 ring-1 ring-green-100/60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Income</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    +{formatCurrency(detail.income, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 ring-1 ring-red-100/60">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                      </svg>
                    </div>
                    <span className="text-sm text-red-600 font-medium">Expenses</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    -{formatCurrency(detail.expenses, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
                <div className={`rounded-xl p-4 ${detail.net >= 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${detail.net >= 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      <svg className={`w-4 h-4 ${detail.net >= 0 ? 'text-orange-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-medium ${detail.net >= 0 ? 'text-orange-600' : 'text-gray-600'}`}>Net</span>
                  </div>
                  <p className={`text-2xl font-bold ${detail.net >= 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                    {detail.net >= 0 ? '+' : ''}{formatCurrency(detail.net, currency as 'ALL' | 'EUR' | 'USD')}
                  </p>
                </div>
              </div>

              {/* Transactions List */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions</h3>
              {detail.transactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No transactions for this month</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Payee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {detail.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {new Date(tx.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {tx.payee || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {tx.category || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {tx.accountName}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                            tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'inflow' ? '+' : '-'}
                            {formatCurrency(tx.amount, tx.accountCurrency as 'ALL' | 'EUR' | 'USD')}
                            {tx.accountCurrency !== currency && tx.amountInMainCurrency != null && (
                              <span className="text-gray-400 text-xs ml-1 font-normal">
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
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
