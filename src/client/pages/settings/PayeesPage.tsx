import { useState } from 'react';
import { payeesApi } from '../../lib/api';
import { PayeesSkeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import { useConfirm } from '../../hooks/useConfirm';
import { useSWR } from '../../hooks/useSWR';
import ConfirmModal from '../../components/ConfirmModal';
import AddPayeeModal from '../../components/AddPayeeModal';
import MergePayeesModal from '../../components/MergePayeesModal';

export default function PayeesPage() {
  const { data: payees, loading } = useSWR('/payees', () => payeesApi.getAll());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const handleUpdate = async (id: number) => {
    try {
      await payeesApi.update(id, { name: editName });
      setEditingId(null);
    } catch (err) {
      toast.error('Payee', err instanceof Error ? err.message : 'Failed to update payee');
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm({ title: 'Delete Payee', message: 'Are you sure you want to delete this payee?', confirmLabel: 'Delete', variant: 'danger' })) return;
    try {
      await payeesApi.delete(id);
    } catch (err) {
      toast.error('Payee', err instanceof Error ? err.message : 'Failed to delete payee');
    }
  };

  const allPayees = payees ?? [];

  if (loading) {
    return <PayeesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payees</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage merchants and recipients</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Merge
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Payee
          </button>
        </div>
      </div>

      {/* Payees List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-200/80 shadow-sm shadow-orange-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">All Payees</h2>
              <p className="text-sm text-gray-500">{allPayees.length} payees</p>
            </div>
          </div>
        </div>
        {allPayees.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payees yet</h3>
            <p className="text-gray-500">Payees are automatically created when you add transactions.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allPayees.map((payee) => (
              <div key={payee.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                {editingId === payee.id ? (
                  <div className="flex gap-3 flex-1 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-orange-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(payee.id)}
                      className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-gray-900 font-medium">{payee.name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(payee.id);
                          setEditName(payee.name);
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(payee.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPayeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={() => {}}
      />

      <MergePayeesModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        onMerged={() => {}}
        payees={allPayees}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
