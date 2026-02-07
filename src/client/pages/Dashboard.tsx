import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DueRecurring, dashboardApi, recurringApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';
import AddAccountModal from '../components/AddAccountModal';
import { ApplyRecurringModal } from '../components/Account';
import { DashboardSkeleton } from '../components/Skeleton';
import { useToast } from '../contexts/ToastContext';
import { useSWR } from '../hooks/useSWR';

export default function Dashboard() {
  const { data, loading } = useSWR('/dashboard', () => dashboardApi.get());
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [applyingRecurring, setApplyingRecurring] = useState<DueRecurring | null>(null);
  const toast = useToast();

  const handleApplyRecurring = (recurring: DueRecurring) => {
    setApplyingRecurring(recurring);
  };

  const handleConfirmApply = async (id: number, amount: number) => {
    try {
      await recurringApi.apply(id, undefined, amount);
      setApplyingRecurring(null);
    } catch (err) {
      toast.error('Recurring', err instanceof Error ? err.message : 'Failed to apply recurring transaction');
    }
  };

  const { overdue, dueSoon } = useMemo(() => {
    if (!data) return { overdue: [], dueSoon: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const o: DueRecurring[] = [];
    const d: DueRecurring[] = [];
    for (const r of data.dueRecurring) {
      const due = new Date(r.nextDueDate);
      due.setHours(0, 0, 0, 0);
      (due < today ? o : d).push(r);
    }
    return { overdue: o, dueSoon: d };
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
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
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-orange-400 via-orange-600 to-rose-600 rounded-2xl shadow-2xl shadow-orange-500/30 p-8 text-white">
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
          { label: 'Credit', value: data.byType.credit.total - data.byType.credit.owed, count: data.byType.credit.count, icon: '💳', color: 'text-gray-900' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl shadow-sm border border-gray-100/80 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 p-4">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-200/80 shadow-sm shadow-orange-500/10 rounded-xl flex items-center justify-center">
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

      {/* Overdue Recurring Transactions */}
      {overdue.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-red-200/60 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-200 to-rose-300/80 shadow-sm shadow-red-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800">Overdue Recurring Transactions</h2>
          </div>
          <div className="divide-y divide-red-200/60">
            {overdue.map((recurring) => (
              <div key={recurring.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {recurring.payee || recurring.category || 'Recurring Transaction'}
                  </p>
                  <p className="text-sm text-red-600">
                    {recurring.accountName} • Overdue: {new Date(recurring.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${recurring.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                    {recurring.type === 'inflow' ? '+' : '-'}
                    {formatCurrency(recurring.amount, recurring.currency)}
                  </span>
                  <button
                    onClick={() => handleApplyRecurring(recurring)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 shadow-sm shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due Recurring Transactions */}
      {dueSoon.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-amber-200/60 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-200 to-orange-300/80 shadow-sm shadow-amber-500/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-amber-800">Due Recurring Transactions</h2>
          </div>
          <div className="divide-y divide-amber-200">
            {dueSoon.map((recurring) => (
              <div key={recurring.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {recurring.payee || recurring.category || 'Recurring Transaction'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {recurring.accountName} • Due: {new Date(recurring.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-semibold ${recurring.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                    {recurring.type === 'inflow' ? '+' : '-'}
                    {formatCurrency(recurring.amount, recurring.currency)}
                  </span>
                  <button
                    onClick={() => handleApplyRecurring(recurring)}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-sm shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-200 font-medium"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'inflow' ? 'bg-gradient-to-br from-green-100 to-emerald-200/80 shadow-sm shadow-green-500/10' : 'bg-gradient-to-br from-red-100 to-rose-200/80 shadow-sm shadow-red-500/10'}`}>
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
                        {tx.accountName} • {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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

      <ApplyRecurringModal
        recurring={applyingRecurring}
        currency={applyingRecurring?.currency ?? 'EUR'}
        onConfirm={handleConfirmApply}
        onClose={() => setApplyingRecurring(null)}
      />
    </div>
  );
}
