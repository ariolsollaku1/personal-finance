import { useState, useEffect } from 'react';
import { Payee, payeesApi } from '../../lib/api';

export default function PayeesPage() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);

  useEffect(() => {
    loadPayees();
  }, []);

  const loadPayees = async () => {
    try {
      setLoading(true);
      const data = await payeesApi.getAll();
      setPayees(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payees');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payeesApi.create({ name: newPayeeName });
      setNewPayeeName('');
      setShowAddForm(false);
      loadPayees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add payee');
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await payeesApi.update(id, { name: editName });
      setEditingId(null);
      loadPayees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update payee');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payee?')) return;
    try {
      await payeesApi.delete(id);
      loadPayees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete payee');
    }
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) {
      alert('Please select both source and target payees');
      return;
    }
    if (mergeSource === mergeTarget) {
      alert('Cannot merge payee with itself');
      return;
    }

    const sourceName = payees.find((p) => p.id === mergeSource)?.name;
    const targetName = payees.find((p) => p.id === mergeTarget)?.name;

    if (!confirm(`Merge "${sourceName}" into "${targetName}"? All transactions will be updated.`)) {
      return;
    }

    try {
      await payeesApi.merge(mergeSource, mergeTarget);
      setMergeMode(false);
      setMergeSource(null);
      setMergeTarget(null);
      loadPayees();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to merge payees');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading payees...</div>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payees</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMergeMode(!mergeMode);
              setShowAddForm(false);
            }}
            className={`px-4 py-2 rounded-md ${
              mergeMode
                ? 'bg-gray-600 text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {mergeMode ? 'Cancel Merge' : 'Merge Duplicates'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setMergeMode(false);
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            {showAddForm ? 'Cancel' : 'Add Payee'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="text"
              value={newPayeeName}
              onChange={(e) => setNewPayeeName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Payee name"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {mergeMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">Merge Payees</h3>
          <p className="text-sm text-yellow-700 mb-4">
            Select two payees to merge. The source payee will be deleted and all its transactions
            will be reassigned to the target payee.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source (will be deleted)
              </label>
              <select
                value={mergeSource || ''}
                onChange={(e) => setMergeSource(parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select payee</option>
                {payees
                  .filter((p) => p.id !== mergeTarget)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target (will keep)
              </label>
              <select
                value={mergeTarget || ''}
                onChange={(e) => setMergeTarget(parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select payee</option>
                {payees
                  .filter((p) => p.id !== mergeSource)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleMerge}
            disabled={!mergeSource || !mergeTarget}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Merge Payees
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">
            All Payees ({payees.length})
          </h2>
        </div>
        {payees.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No payees yet. Payees are automatically created when you add transactions.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {payees.map((payee) => (
              <div key={payee.id} className="p-4 flex justify-between items-center">
                {editingId === payee.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(payee.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-900">{payee.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(payee.id);
                          setEditName(payee.name);
                        }}
                        className="text-orange-600 hover:text-orange-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(payee.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
