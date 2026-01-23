import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardData, dashboardApi, recurringApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
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

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Net Worth Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Net Worth</h2>
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(data.totalNetWorth, data.mainCurrency)}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Total across all accounts in {data.mainCurrency}
        </p>
      </div>

      {/* Account Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Bank Accounts</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.byType.bank.total, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">🏦</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.bank.count} account(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Cash Accounts</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.byType.cash.total, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">💵</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.cash.count} account(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Accounts</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.byType.stock.total, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.stock.count} account(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Loan Accounts</p>
              <p className="text-xl font-semibold text-red-600">
                {formatCurrency(data.byType.loan.total, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.loan.count} account(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Credit Cards</p>
              <p className={`text-xl font-semibold ${data.byType.credit.owed > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(data.byType.credit.owed, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">💳</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.credit.count} card(s) • Limit: {formatCurrency(data.byType.credit.total, data.mainCurrency)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Assets</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.byType.asset.total, data.mainCurrency)}
              </p>
            </div>
            <span className="text-2xl">🏠</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{data.byType.asset.count} asset(s)</p>
        </div>
      </div>

      {/* Stock Portfolio Summary */}
      {data.stockPortfolio.holdingsCount > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Stock Portfolio Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Market Value</p>
              <p className="text-xl font-semibold text-gray-900">
                ${data.stockPortfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cost Basis</p>
              <p className="text-xl font-semibold text-gray-900">
                ${data.stockPortfolio.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Gain/Loss</p>
              <p className={`text-xl font-semibold ${data.stockPortfolio.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.stockPortfolio.totalGain >= 0 ? '+' : ''}
                ${data.stockPortfolio.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-1">
                  ({data.stockPortfolio.totalGainPercent >= 0 ? '+' : ''}{data.stockPortfolio.totalGainPercent.toFixed(2)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Day Change</p>
              <p className={`text-xl font-semibold ${data.stockPortfolio.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.stockPortfolio.dayChange >= 0 ? '+' : ''}
                ${data.stockPortfolio.dayChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm ml-1">
                  ({data.stockPortfolio.dayChangePercent >= 0 ? '+' : ''}{data.stockPortfolio.dayChangePercent.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">{data.stockPortfolio.holdingsCount} holding(s) across {data.byType.stock.count} account(s)</p>
        </div>
      )}

      {/* Due Recurring Transactions */}
      {data.dueRecurring.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="p-4 border-b border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-800">Due Recurring Transactions</h2>
          </div>
          <div className="divide-y divide-yellow-200">
            {data.dueRecurring.map((recurring) => (
              <div
                key={recurring.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {recurring.payee || recurring.category || 'Recurring Transaction'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {recurring.accountName} • Due: {recurring.nextDueDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`font-medium ${
                      recurring.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {recurring.type === 'inflow' ? '+' : ''}
                    {formatCurrency(recurring.type === 'inflow' ? recurring.amount : -recurring.amount, recurring.currency)}
                  </span>
                  <button
                    onClick={() => handleApplyRecurring(recurring.id)}
                    className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">All Accounts</h2>
              <Link
                to="/accounts/new"
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                + Add Account
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {data.accounts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No accounts yet.{' '}
                <Link to="/accounts/new" className="text-orange-600 hover:underline">
                  Create your first account
                </Link>
              </div>
            ) : (
              data.accounts.map((account) => (
                <Link
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className="flex items-center justify-between py-2 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base">
                      {account.type === 'bank' ? '🏦' : account.type === 'cash' ? '💵' : account.type === 'stock' ? '📈' : account.type === 'asset' ? '🏠' : account.type === 'loan' ? '📋' : '💳'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {account.name}
                        <span className="text-gray-400 font-normal capitalize"> • {account.type}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </span>
                    {account.currency !== data.mainCurrency && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({formatCurrency(account.balanceInMainCurrency, data.mainCurrency)})
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {data.recentTransactions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No recent transactions
              </div>
            ) : (
              data.recentTransactions.map((tx) => (
                <div
                  key={`${tx.accountId}-${tx.id}`}
                  className="flex items-center justify-between py-2 px-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={`text-sm font-medium w-20 ${
                        tx.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'inflow' ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.payee || tx.category || 'Transaction'}
                        {tx.category && tx.payee && (
                          <span className="text-gray-400 font-normal"> • {tx.category}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tx.accountName} • {tx.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
