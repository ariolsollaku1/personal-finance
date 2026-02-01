import { useState } from 'react';
import { TaxSummary, dividendsApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface TaxSummaryCardProps {
  taxSummary: TaxSummary | null;
  onUpdate: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function TaxSummaryCard({ taxSummary, onUpdate }: TaxSummaryCardProps) {
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if (!taxSummary) {
    return null;
  }

  const handleSaveRate = async () => {
    const rate = parseFloat(newRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast.warning('Tax', 'Please enter a valid percentage between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      await dividendsApi.setTaxRate(rate);
      setEditingRate(false);
      onUpdate();
    } catch (error) {
      toast.error('Tax', error instanceof Error ? error.message : 'Failed to update tax rate');
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentYearSummary = taxSummary.summary.find((s) => s.year === currentYear.toString());

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Tax Summary (Albanian Dividend Tax)</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Current Rate:</span>
          {editingRate ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                placeholder="8"
              />
              <span className="text-sm">%</span>
              <button
                onClick={handleSaveRate}
                disabled={saving}
                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingRate(false)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNewRate((taxSummary.currentTaxRate * 100).toString());
                setEditingRate(true);
              }}
              className="px-2 py-1 bg-gray-100 rounded text-sm font-medium hover:bg-gray-200"
            >
              {formatPercent(taxSummary.currentTaxRate)}
            </button>
          )}
        </div>
      </div>

      {currentYearSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">{currentYear} Gross Dividends</p>
            <p className="text-xl font-bold">{formatCurrency(currentYearSummary.total_gross)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{currentYear} Tax Withheld</p>
            <p className="text-xl font-bold text-red-600">
              -{formatCurrency(currentYearSummary.total_tax)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{currentYear} Net Dividends</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(currentYearSummary.total_net)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{currentYear} Payments</p>
            <p className="text-xl font-bold">{currentYearSummary.dividend_count}</p>
          </div>
        </div>
      )}

      {taxSummary.summary.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Yearly Summary</h4>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Year
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Gross
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Tax
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Net
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {taxSummary.summary.map((year) => (
                <tr key={year.year}>
                  <td className="px-4 py-2 text-sm font-medium">{year.year}</td>
                  <td className="px-4 py-2 text-sm text-right">{formatCurrency(year.total_gross)}</td>
                  <td className="px-4 py-2 text-sm text-right text-red-600">
                    -{formatCurrency(year.total_tax)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">
                    {formatCurrency(year.total_net)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">{year.dividend_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">
          No dividend payments recorded yet.
        </p>
      )}
    </div>
  );
}
