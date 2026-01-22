import { useState, useEffect } from 'react';
import { dividendsApi, Dividend, TaxSummary } from '../lib/api';
import DividendList from '../components/Dividends/DividendList';
import TaxSummaryCard from '../components/Dividends/TaxSummary';

export default function Dividends() {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [dividendsData, taxData] = await Promise.all([
        dividendsApi.getAll(),
        dividendsApi.getTaxSummary(),
      ]);
      setDividends(dividendsData);
      setTaxSummary(taxData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading dividends...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dividends</h2>
        <p className="text-sm text-gray-500">Add dividends from within each stock account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <TaxSummaryCard taxSummary={taxSummary} onUpdate={fetchData} />

      <DividendList dividends={dividends} onDelete={fetchData} />
    </div>
  );
}
