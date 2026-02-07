import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHistoricalPrices } from '../../hooks/useQuotes';
import { Currency } from '../../lib/api';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency';

interface PerformanceChartProps {
  symbol: string;
  currency?: Currency;
}

const periods = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

export default function PerformanceChart({ symbol, currency = 'EUR' }: PerformanceChartProps) {
  const [period, setPeriod] = useState('1y');
  const { history, loading, error } = useHistoricalPrices(symbol, period);

  const chartData = history.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: period === '5y' ? '2-digit' : undefined,
    }),
    price: item.close,
  }));

  const minPrice = Math.min(...history.map((h) => h.close));
  const maxPrice = Math.max(...history.map((h) => h.close));
  const priceChange = history.length > 1 ? history[history.length - 1].close - history[0].close : 0;
  const priceChangePercent =
    history.length > 1 ? (priceChange / history[0].close) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price History</h3>
        <div className="flex space-x-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-sm rounded ${
                period === p.value
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Loading chart...
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-500">{error}</div>
      ) : history.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <>
          <div className="mb-4">
            <span className={`text-2xl font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}
              {formatCurrency(priceChange, currency)} ({priceChangePercent.toFixed(2)}%)
            </span>
            <span className="text-sm text-gray-500 ml-2">over {period}</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice * 0.95, maxPrice * 1.05]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => `${getCurrencySymbol(currency)}${value.toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, currency), 'Price']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={priceChange >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
