import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardData, dashboardApi, recurringApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import AddAccountModal from '../components/AddAccountModal';
import { DashboardSkeleton } from '../components/Skeleton';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await dashboardApi.get();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecurring = async (id: number) => {
    try {
      await recurringApi.apply(id);
      loadDashboard();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply recurring transaction');
    }
  };

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your financial overview</p>
        </div>
        <button
          onClick={() => setShowAddAccount(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-orange-100 font-medium">Total Net Worth</span>
        </div>
        <div className="text-4xl font-bold">
          {formatCurrency(data.totalNetWorth, data.mainCurrency)}
        </div>
        <p className="text-orange-200 mt-2 text-sm">
          Across all accounts in {data.mainCurrency}
        </p>
      </div>

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Bank', value: data.byType.bank.total, count: data.byType.bank.count, icon: '🏦', color: 'text-gray-900' },
          { label: 'Cash', value: data.byType.cash.total, count: data.byType.cash.count, icon: '💵', color: 'text-gray-900' },
          { label: 'Stocks', value: data.byType.stock.total, count: data.byType.stock.count, icon: '📈', color: 'text-gray-900' },
          { label: 'Assets', value: data.byType.asset.total, count: data.byType.asset.count, icon: '🏠', color: 'text-gray-900' },
          { label: 'Loans', value: data.byType.loan.total, count: data.byType.loan.count, icon: '📋', color: 'text-red-600', negative: true },
          { label: 'Credit', value: data.byType.credit.owed, count: data.byType.credit.count, icon: '💳', color: data.byType.credit.owed > 0 ? 'text-red-600' : 'text-gray-900', negative: data.byType.credit.owed > 0 },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs text-gray-400">{item.count}</span>
            </div>
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-lg font-semibold ${item.color}`}>
              {item.negative && item.value > 0 && '-'}
              {formatCurrency(Math.abs(item.value), data.mainCurrency)}
            </p>
          </div>
        ))}
      </div>

      {/* Stock Portfolio Summary */}
      {data.stockPortfolio.holdingsCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stock Portfolio</h2>
              <p className="text-sm text-gray-500">{data.stockPortfolio.holdingsCount} holdings across {data.byType.stock.count} accounts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Market Value</p>
              <p className="text-xl font-semibold text-gray-900">
                ${data.stockPortfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Cost Basis</p>
              <p className="text-xl font-semibold text-gray-900">
                ${data.stockPortfolio.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Gain/Loss</p>
              <p className={`text-xl font-semibold ${data.stockPortfolio.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.stockPortfolio.totalGain >= 0 ? '+' : ''}
                ${data.stockPortfolio.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-1 font-normal">
                  ({data.stockPortfolio.totalGainPercent >= 0 ? '+' : ''}{data.stockPortfolio.totalGainPercent.toFixed(2)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Day Change</p>
              <p className={`text-xl font-semibold ${data.stockPortfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.stockPortfolio.dayChange >= 0 ? '+' : ''}
                ${data.stockPortfolio.dayChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-1 font-normal">
                  ({data.stockPortfolio.dayChangePercent >= 0 ? '+' : ''}{data.stockPortfolio.dayChangePercent.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Due Recurring Transactions */}
      {data.dueRecurring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-amber-800">Due Recurring Transactions</h2>
          </div>
          <div className="divide-y divide-amber-200">
            {data.dueRecurring.map((recurring) => (
              <div key={recurring.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {recurring.payee || recurring.category || 'Recurring Transaction'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {recurring.accountName} • Due: {new Date(recurring.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${recurring.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                    {recurring.type === 'inflow' ? '+' : '-'}
                    {formatCurrency(recurring.amount, recurring.currency)}
                  </span>
                  <button
                    onClick={() => handleApplyRecurring(recurring.id)}
                    className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all duration-200 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts List & Recent Activity - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Accounts</h2>
            <button onClick={() => setShowAddAccount(true)} className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors">
              + Add Account
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.accounts.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No accounts yet</p>
                <button onClick={() => setShowAddAccount(true)} className="text-orange-600 hover:text-orange-500 text-sm font-medium">
                  Create your first account
                </button>
              </div>
            ) : (
              data.accounts.map((account) => (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">
                      {account.type === 'bank' ? '🏦' : account.type === 'cash' ? '💵' : account.type === 'stock' ? '📈' : account.type === 'asset' ? '🏠' : account.type === 'loan' ? '📋' : '💳'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{account.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{account.type}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    {account.currency !== data.mainCurrency && (
                      <p className="text-xs text-gray-400">
                        {formatCurrency(account.balanceInMainCurrency, data.mainCurrency)}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentTransactions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No recent transactions</p>
              </div>
            ) : (
              data.recentTransactions.map((tx) => (
                <div key={`${tx.accountId}-${tx.id}`} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'inflow' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <svg className={`w-5 h-5 ${tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {tx.type === 'inflow' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        )}
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {tx.payee || tx.category || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tx.accountName} • {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'inflow' ? '+' : '-'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      <AddAccountModal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} />
    </div>
  );
}
