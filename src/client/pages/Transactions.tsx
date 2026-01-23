import { useState, useEffect } from 'react';
import { transactionsApi, Transaction } from '../lib/api';
import TransactionList from '../components/Transactions/TransactionList';
import TransactionForm from '../components/Transactions/TransactionForm';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const data = await transactionsApi.getAll();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Transaction'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <TransactionForm
          onSuccess={() => {
            setShowForm(false);
            fetchTransactions();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <TransactionList transactions={transactions} onDelete={fetchTransactions} />
    </div>
  );
}
