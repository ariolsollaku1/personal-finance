import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ProjectionData, projectionApi } from '../lib/api';
import { formatCurrency } from '../lib/currency';

export default function ProjectionPage() {
  const [data, setData] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjection();
  }, []);

  const loadProjection = async () => {
    try {
      setLoading(true);
      const projectionData = await projectionApi.get();
      setData(projectionData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projection');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading projections...</div>
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

  const currency = data.mainCurrency;

  // Format large numbers for display
  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  // Custom tooltip formatter
  const tooltipFormatter = (value: number, name: string) => {
    return [formatCurrency(value, currency), name];
  };

  // Combine YTD and future data for continuous chart
  const allData = [...data.ytd, ...data.future];

  // Get current month index in combined data
  const currentMonthIndex = data.ytd.length - 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financial Projections</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Monthly Income</p>
          <p className="text-xl font-semibold text-green-600">
            {formatCurrency(data.summary.monthlyIncome, currency)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Monthly Expenses</p>
          <p className="text-xl font-semibold text-red-600">
            {formatCurrency(data.summary.monthlyExpenses, currency)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Monthly Savings</p>
          <p className={`text-xl font-semibold ${data.summary.monthlySavings >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
            {formatCurrency(data.summary.monthlySavings, currency)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Savings Rate</p>
          <p className={`text-xl font-semibold ${data.summary.savingsRate >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
            {data.summary.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Year-End Projection */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
        <h2 className="text-lg font-semibold mb-2">Year-End Projection</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-orange-100 text-sm">Projected Net Worth (Dec 31)</p>
            <p className="text-3xl font-bold">
              {formatCurrency(data.summary.projectedYearEndNetWorth, currency)}
            </p>
          </div>
          <div>
            <p className="text-orange-100 text-sm">Projected Change (YTD)</p>
            <p className={`text-3xl font-bold ${data.summary.projectedNetWorthChange >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {data.summary.projectedNetWorthChange >= 0 ? '+' : ''}
              {formatCurrency(data.summary.projectedNetWorthChange, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* YTD Net Worth Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Year-To-Date Net Worth</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.ytd}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorNetWorth)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Future 12 Months Projection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Next 12 Months Projection</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.future}>
              <defs>
                <linearGradient id="colorFuture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Projected Net Worth"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorFuture)"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * Projection based on recurring transactions only. Actual results may vary.
        </p>
      </div>

      {/* Asset Breakdown Over Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Asset Composition (YTD)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.ytd}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Area
                type="monotone"
                dataKey="byType.bank"
                name="Bank"
                stackId="1"
                stroke="#f97316"
                fill="#f97316"
              />
              <Area
                type="monotone"
                dataKey="byType.cash"
                name="Cash"
                stackId="1"
                stroke="#22c55e"
                fill="#22c55e"
              />
              <Area
                type="monotone"
                dataKey="byType.stock"
                name="Stocks"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
              />
              <Area
                type="monotone"
                dataKey="byType.asset"
                name="Assets"
                stackId="1"
                stroke="#fb923c"
                fill="#fb923c"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Liquid Assets vs Debt */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Liquid Assets vs Total Debt</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={allData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={formatValue}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <ReferenceLine x={data.ytd[currentMonthIndex]?.label} stroke="#9ca3af" strokeDasharray="3 3" label="Today" />
              <Line
                type="monotone"
                dataKey="liquidAssets"
                name="Liquid Assets"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalDebt"
                name="Total Debt"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Cash Flow */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Cash Flow</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{ name: 'Monthly', income: data.summary.monthlyIncome, expenses: data.summary.monthlyExpenses, savings: data.summary.monthlySavings }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={formatValue} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#22c55e" />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
              <Bar dataKey="savings" name="Net Savings" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recurring Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Income Sources</h2>
          {data.recurringBreakdown.income.length === 0 ? (
            <p className="text-gray-500 text-sm">No recurring income configured</p>
          ) : (
            <div className="space-y-3">
              {data.recurringBreakdown.income.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.frequency}</p>
                  </div>
                  <p className="font-semibold text-green-600">
                    +{formatCurrency(item.monthlyAmount, currency)}
                  </p>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between items-center">
                <p className="font-semibold text-gray-700">Total Monthly Income</p>
                <p className="font-bold text-green-600">
                  {formatCurrency(data.summary.monthlyIncome, currency)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Monthly Expenses</h2>
          {data.recurringBreakdown.expenses.length === 0 ? (
            <p className="text-gray-500 text-sm">No recurring expenses configured</p>
          ) : (
            <div className="space-y-3">
              {data.recurringBreakdown.expenses.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category} - {item.frequency}</p>
                  </div>
                  <p className="font-semibold text-red-600">
                    -{formatCurrency(item.monthlyAmount, currency)}
                  </p>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between items-center">
                <p className="font-semibold text-gray-700">Total Monthly Expenses</p>
                <p className="font-bold text-red-600">
                  {formatCurrency(data.summary.monthlyExpenses, currency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Health Indicators */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Financial Health Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Savings Rate Gauge */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={data.summary.savingsRate >= 20 ? '#22c55e' : data.summary.savingsRate >= 10 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(data.summary.savingsRate / 100) * 352} 352`}
                  strokeLinecap="round"
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <span className="absolute text-2xl font-bold">
                {data.summary.savingsRate.toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Savings Rate</p>
            <p className="text-xs text-gray-400">
              {data.summary.savingsRate >= 20 ? 'Excellent' : data.summary.savingsRate >= 10 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>

          {/* Debt to Income */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                {(() => {
                  const lastMonth = data.ytd[data.ytd.length - 1];
                  const debtToIncome = data.summary.monthlyIncome > 0
                    ? (lastMonth.totalDebt / (data.summary.monthlyIncome * 12)) * 100
                    : 0;
                  const cappedRatio = Math.min(debtToIncome, 100);
                  return (
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={debtToIncome <= 36 ? '#22c55e' : debtToIncome <= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(cappedRatio / 100) * 352} 352`}
                      strokeLinecap="round"
                      transform="rotate(-90 64 64)"
                    />
                  );
                })()}
              </svg>
              <span className="absolute text-2xl font-bold">
                {(() => {
                  const lastMonth = data.ytd[data.ytd.length - 1];
                  const debtToIncome = data.summary.monthlyIncome > 0
                    ? (lastMonth.totalDebt / (data.summary.monthlyIncome * 12)) * 100
                    : 0;
                  return debtToIncome.toFixed(0);
                })()}%
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Debt to Annual Income</p>
            <p className="text-xs text-gray-400">
              {(() => {
                const lastMonth = data.ytd[data.ytd.length - 1];
                const debtToIncome = data.summary.monthlyIncome > 0
                  ? (lastMonth.totalDebt / (data.summary.monthlyIncome * 12)) * 100
                  : 0;
                return debtToIncome <= 36 ? 'Healthy' : debtToIncome <= 50 ? 'Moderate' : 'High';
              })()}
            </p>
          </div>

          {/* Emergency Fund Months */}
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                {(() => {
                  const lastMonth = data.ytd[data.ytd.length - 1];
                  const emergencyMonths = data.summary.monthlyExpenses > 0
                    ? lastMonth.liquidAssets / data.summary.monthlyExpenses
                    : 0;
                  const cappedMonths = Math.min(emergencyMonths, 24);
                  return (
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={emergencyMonths >= 6 ? '#22c55e' : emergencyMonths >= 3 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(cappedMonths / 24) * 352} 352`}
                      strokeLinecap="round"
                      transform="rotate(-90 64 64)"
                    />
                  );
                })()}
              </svg>
              <span className="absolute text-2xl font-bold">
                {(() => {
                  const lastMonth = data.ytd[data.ytd.length - 1];
                  const emergencyMonths = data.summary.monthlyExpenses > 0
                    ? lastMonth.liquidAssets / data.summary.monthlyExpenses
                    : 0;
                  return emergencyMonths.toFixed(0);
                })()}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">Emergency Fund (Months)</p>
            <p className="text-xs text-gray-400">
              {(() => {
                const lastMonth = data.ytd[data.ytd.length - 1];
                const emergencyMonths = data.summary.monthlyExpenses > 0
                  ? lastMonth.liquidAssets / data.summary.monthlyExpenses
                  : 0;
                return emergencyMonths >= 6 ? 'Excellent' : emergencyMonths >= 3 ? 'Adequate' : 'Build More';
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
