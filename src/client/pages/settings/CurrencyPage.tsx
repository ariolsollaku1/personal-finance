import { useState, useEffect } from 'react';
import { Currency, dashboardApi } from '../../lib/api';
import { formatCurrency, getCurrencySymbol } from '../../lib/currency';
import { CurrencySkeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';

export default function CurrencyPage() {
  const [mainCurrency, setMainCurrency] = useState<Currency>('EUR');
  const [exchangeRates, setExchangeRates] = useState<Record<Currency, number>>({
    EUR: 1,
    USD: 1.08,
    ALL: 100.0,
    GBP: 0.86,
    CHF: 0.94,
    NOK: 11.5,
    SEK: 11.2,
    DKK: 7.46,
    PLN: 4.35,
    CZK: 25.0,
    HUF: 390.0,
    RON: 4.97,
    BGN: 1.96,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
      toast.error(err instanceof Error ? err.message : 'Failed to save currency setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <CurrencySkeleton />;
  }

  const currencies: { code: Currency; name: string; description: string; flag: string }[] = [
    { code: 'EUR', name: 'Euro', description: 'Official currency of the Eurozone', flag: '🇪🇺' },
    { code: 'USD', name: 'US Dollar', description: 'Official currency of the United States', flag: '🇺🇸' },
    { code: 'GBP', name: 'British Pound', description: 'Official currency of the United Kingdom', flag: '🇬🇧' },
    { code: 'CHF', name: 'Swiss Franc', description: 'Official currency of Switzerland', flag: '🇨🇭' },
    { code: 'NOK', name: 'Norwegian Krone', description: 'Official currency of Norway', flag: '🇳🇴' },
    { code: 'SEK', name: 'Swedish Krona', description: 'Official currency of Sweden', flag: '🇸🇪' },
    { code: 'DKK', name: 'Danish Krone', description: 'Official currency of Denmark', flag: '🇩🇰' },
    { code: 'PLN', name: 'Polish Zloty', description: 'Official currency of Poland', flag: '🇵🇱' },
    { code: 'CZK', name: 'Czech Koruna', description: 'Official currency of Czech Republic', flag: '🇨🇿' },
    { code: 'HUF', name: 'Hungarian Forint', description: 'Official currency of Hungary', flag: '🇭🇺' },
    { code: 'RON', name: 'Romanian Leu', description: 'Official currency of Romania', flag: '🇷🇴' },
    { code: 'BGN', name: 'Bulgarian Lev', description: 'Official currency of Bulgaria', flag: '🇧🇬' },
    { code: 'ALL', name: 'Albanian Lek', description: 'Official currency of Albania', flag: '🇦🇱' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Currency Settings</h1>
            <p className="text-white/80 text-sm mt-0.5">Manage your display currency and view exchange rates</p>
          </div>
        </div>
      </div>

      {/* Main Currency Selection */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Main Currency</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select your main currency for dashboard totals and net worth calculations.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currencies.map((currency) => {
              const isSelected = mainCurrency === currency.code;
              return (
                <button
                  key={currency.code}
                  onClick={() => handleSave(currency.code)}
                  disabled={saving}
                  className={`p-5 rounded-xl border-2 text-left transition-all duration-200 relative ${
                    isSelected
                      ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 ring-2 ring-orange-500/20'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{currency.flag}</span>
                    <div className="text-3xl font-bold text-gray-900">
                      {getCurrencySymbol(currency.code)}
                    </div>
                  </div>
                  <p className={`font-semibold ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                    {currency.code}
                  </p>
                  <p className="text-sm text-gray-600">{currency.name}</p>
                  <p className="text-xs text-gray-400 mt-2">{currency.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exchange Rates */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Exchange Rates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Current exchange rates used for currency conversion (approximate rates for display purposes).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rate (EUR = 1)
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Example Conversion
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currencies.map((currency) => (
                <tr key={currency.code} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{currency.flag}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{currency.code}</span>
                          <span className="text-lg text-gray-400">{getCurrencySymbol(currency.code)}</span>
                        </div>
                        <span className="text-sm text-gray-500">{currency.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono font-semibold text-gray-900">
                      {exchangeRates[currency.code]?.toFixed(2) || '1.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <span className="font-medium text-gray-700">
                        {formatCurrency(100, currency.code)}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(100 / (exchangeRates[currency.code] || 1), 'EUR')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Exchange rates are fetched daily from the European Central Bank via frankfurter.app API.
          </p>
        </div>
      </div>

      {/* Currency Formatting Examples */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Formatting Examples</h2>
          <p className="text-sm text-gray-500 mt-1">Preview how amounts are displayed in each currency.</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">{currency.flag}</span>
                  <span className="font-semibold text-gray-900">{currency.code}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Positive</span>
                    <span className="font-semibold text-green-600">{formatCurrency(1234.56, currency.code)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Negative</span>
                    <span className="font-semibold text-red-600">{formatCurrency(-1234.56, currency.code)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Zero</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(0, currency.code)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
