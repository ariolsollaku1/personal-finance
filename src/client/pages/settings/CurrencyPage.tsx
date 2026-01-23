import { useState, useEffect } from 'react';
import { Currency, dashboardApi } from '../../lib/api';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency';

export default function CurrencyPage() {
  const [mainCurrency, setMainCurrency] = useState<Currency>('ALL');
  const [exchangeRates, setExchangeRates] = useState<Record<Currency, number>>({
    ALL: 1,
    EUR: 102.5,
    USD: 95.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getCurrencySettings();
      setMainCurrency(data.mainCurrency);
      setExchangeRates(data.exchangeRates);
    } catch (err) {
      console.error('Failed to load currency settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (currency: Currency) => {
    try {
      setSaving(true);
      await dashboardApi.setCurrency(currency);
      setMainCurrency(currency);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save currency setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const currencies: { code: Currency; name: string; description: string }[] = [
    { code: 'ALL', name: 'Albanian Lek', description: 'The official currency of Albania' },
    { code: 'EUR', name: 'Euro', description: 'Official currency of the Eurozone' },
    { code: 'USD', name: 'US Dollar', description: 'Official currency of the United States' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Currency Settings</h1>

      {/* Main Currency Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Main Currency</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select your main currency for dashboard totals and net worth calculations.
          Account balances will be converted to this currency for the overview.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currencies.map((currency) => (
            <button
              key={currency.code}
              onClick={() => handleSave(currency.code)}
              disabled={saving}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                mainCurrency === currency.code
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {getCurrencySymbol(currency.code)}
                </span>
                {mainCurrency === currency.code && (
                  <span className="text-xs text-orange-600 font-medium">Selected</span>
                )}
              </div>
              <p className="font-medium text-gray-900 mt-2">{currency.code}</p>
              <p className="text-sm text-gray-500">{currency.name}</p>
              <p className="text-xs text-gray-400 mt-1">{currency.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Exchange Rates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Exchange Rates</h2>
        <p className="text-sm text-gray-500 mb-4">
          Current exchange rates used for currency conversion. These are approximate rates
          for display purposes only.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Currency
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Rate to ALL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Example
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currencies.map((currency) => (
                <tr key={currency.code}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getCurrencySymbol(currency.code)}</span>
                      <span className="text-gray-900">{currency.code}</span>
                      <span className="text-sm text-gray-500">({currency.name})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {currency.code === 'ALL' ? '1.00' : exchangeRates[currency.code].toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {formatCurrency(100, currency.code)} ={' '}
                    {formatCurrency(100 * exchangeRates[currency.code], 'ALL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Note: Exchange rates are hardcoded approximations. In a production app, these would be
          fetched from a live exchange rate API.
        </p>
      </div>

      {/* Currency Formatting */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Currency Formatting</h2>
        <p className="text-sm text-gray-500 mb-4">Examples of how amounts are displayed:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currencies.map((currency) => (
            <div key={currency.code} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">{currency.code}</p>
              <div className="space-y-1">
                <p className="text-green-600">{formatCurrency(1234.56, currency.code)}</p>
                <p className="text-red-600">{formatCurrency(-1234.56, currency.code)}</p>
                <p className="text-gray-900">{formatCurrency(0, currency.code)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
