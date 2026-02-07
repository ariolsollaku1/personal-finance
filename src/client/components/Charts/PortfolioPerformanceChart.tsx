import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { accountsApi, PerformanceData, PerformanceEvent } from '../../lib/api';

interface PortfolioPerformanceChartProps {
  accountId: number;
}

const periods = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'ytd', label: 'YTD' },
];

interface ChartDataPoint {
  date: string;
  portfolio: number;
  benchmark: number | null;
  eventMarker?: number;
  events?: PerformanceEvent[];
}

// Custom marker shapes for events
function EventMarkerShape({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartDataPoint }) {
  if (!cx || !cy || !payload?.events?.length) return null;

  const events = payload.events;
  const types = new Set(events.map(e => e.type));

  // Pick the most prominent marker: if mixed, show a combined indicator
  // Priority: buy (green up triangle), sell (red down triangle), dividend (blue diamond)
  if (types.has('buy') && types.has('sell')) {
    // Mixed buy+sell: show orange circle
    return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />;
  }
  if (types.has('buy')) {
    // Green upward triangle
    return (
      <polygon
        points={`${cx},${cy - 6} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`}
        fill="#16a34a"
        stroke="#fff"
        strokeWidth={1.5}
      />
    );
  }
  if (types.has('sell')) {
    // Red downward triangle
    return (
      <polygon
        points={`${cx - 5},${cy - 4} ${cx + 5},${cy - 4} ${cx},${cy + 6}`}
        fill="#dc2626"
        stroke="#fff"
        strokeWidth={1.5}
      />
    );
  }
  if (types.has('dividend')) {
    // Blue diamond
    return (
      <polygon
        points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}`}
        fill="#2563eb"
        stroke="#fff"
        strokeWidth={1.5}
      />
    );
  }
  return null;
}

// Custom tooltip that shows event details when hovering event markers
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; payload: ChartDataPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload;
  const portfolioEntry = payload.find(p => p.dataKey === 'portfolio');
  const benchmarkEntry = payload.find(p => p.dataKey === 'benchmark');
  const events = dataPoint?.events;

  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      fontSize: '13px',
      padding: '8px 12px',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#374151' }}>{label}</p>
      {portfolioEntry && portfolioEntry.value != null && (
        <p style={{ margin: '2px 0', color: '#f97316' }}>
          Portfolio: {portfolioEntry.value >= 0 ? '+' : ''}{portfolioEntry.value.toFixed(2)}%
        </p>
      )}
      {benchmarkEntry && benchmarkEntry.value != null && (
        <p style={{ margin: '2px 0', color: '#9ca3af' }}>
          S&P 500: {benchmarkEntry.value >= 0 ? '+' : ''}{benchmarkEntry.value.toFixed(2)}%
        </p>
      )}
      {events && events.length > 0 && (
        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '6px', paddingTop: '6px' }}>
          {events.map((evt, i) => (
            <p key={i} style={{ margin: '2px 0', fontSize: '12px', color: evt.type === 'buy' ? '#16a34a' : evt.type === 'sell' ? '#dc2626' : '#2563eb' }}>
              {evt.type === 'buy' && `Buy ${evt.shares} ${evt.symbol} @ $${evt.price?.toFixed(2)}`}
              {evt.type === 'sell' && `Sell ${evt.shares} ${evt.symbol} @ $${evt.price?.toFixed(2)}`}
              {evt.type === 'dividend' && `Dividend ${evt.symbol}: $${evt.amount?.toFixed(2)}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioPerformanceChart({ accountId }: PortfolioPerformanceChartProps) {
  const [period, setPeriod] = useState('1y');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    accountsApi.getPerformance(accountId, period)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load performance data');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [accountId, period]);

  // Build a map of events by formatted date for matching
  const buildEventMap = useCallback(() => {
    if (!data?.events?.length || !data.portfolio.length) return new Map<string, PerformanceEvent[]>();

    const eventsByRawDate = new Map<string, PerformanceEvent[]>();
    for (const evt of data.events) {
      const existing = eventsByRawDate.get(evt.date) || [];
      existing.push(evt);
      eventsByRawDate.set(evt.date, existing);
    }

    // Map raw dates to formatted dates (same format used in chartData)
    const eventsByFormattedDate = new Map<string, PerformanceEvent[]>();
    for (const point of data.portfolio) {
      const formatted = new Date(point.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        ...(period === '1y' || period === '6m' || period === 'ytd' ? { year: '2-digit' as const } : {}),
      });
      const evts = eventsByRawDate.get(point.date);
      if (evts) {
        const existing = eventsByFormattedDate.get(formatted) || [];
        eventsByFormattedDate.set(formatted, [...existing, ...evts]);
      }
    }
    return eventsByFormattedDate;
  }, [data, period]);

  // Merge portfolio and benchmark into a single chart data array
  const chartData: ChartDataPoint[] = data && data.portfolio.length > 0
    ? (() => {
        const eventMap = buildEventMap();
        return data.portfolio.map((point, i) => {
          const formatted = new Date(point.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            ...(period === '1y' || period === '6m' || period === 'ytd' ? { year: '2-digit' as const } : {}),
          });
          const events = eventMap.get(formatted);
          return {
            date: formatted,
            portfolio: point.changePercent,
            benchmark: data.benchmark[i]?.changePercent ?? null,
            ...(events ? { eventMarker: point.changePercent, events } : {}),
          };
        });
      })()
    : [];

  const portfolioChange = data && data.portfolio.length > 0
    ? data.portfolio[data.portfolio.length - 1].changePercent
    : 0;
  const benchmarkChange = data && data.benchmark.length > 0
    ? data.benchmark[data.benchmark.length - 1].changePercent
    : 0;

  const isEmpty = data && data.portfolio.length === 0;
  const hasEvents = chartData.some(d => d.events);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Performance vs S&P 500</h3>
        <div className="flex space-x-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                period === p.value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-2 text-gray-500">Loading performance data...</span>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-500">{error}</div>
      ) : isEmpty ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">No performance data available</p>
        </div>
      ) : (
        <>
          {/* Performance summary */}
          <div className="flex gap-6 mb-4">
            <div>
              <span className="text-sm text-gray-500">Portfolio</span>
              <span className={`ml-2 text-lg font-bold ${portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">S&P 500</span>
              <span className={`ml-2 text-lg font-bold ${benchmarkChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {benchmarkChange >= 0 ? '+' : ''}{benchmarkChange.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Event legend */}
          {hasEvents && (
            <div className="flex gap-4 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg width="10" height="10"><polygon points="5,1 1,9 9,9" fill="#16a34a" /></svg>
                Buy
              </span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10"><polygon points="1,1 9,1 5,9" fill="#dc2626" /></svg>
                Sell
              </span>
              <span className="flex items-center gap-1">
                <svg width="10" height="10"><polygon points="5,1 9,5 5,9 1,5" fill="#2563eb" /></svg>
                Dividend
              </span>
            </div>
          )}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => {
                    if (value === 'portfolio') return 'Portfolio';
                    if (value === 'benchmark') return 'S&P 500';
                    return value;
                  }}
                  payload={[
                    { value: 'Portfolio', type: 'line', color: '#f97316' },
                    { value: 'S&P 500', type: 'line', color: '#9ca3af' },
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="portfolio"
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  dot={false}
                  name="benchmark"
                  strokeDasharray="4 4"
                />
                {hasEvents && (
                  <Scatter
                    dataKey="eventMarker"
                    shape={<EventMarkerShape />}
                    legendType="none"
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
