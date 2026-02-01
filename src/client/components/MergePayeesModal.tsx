import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Payee, payeesApi } from '../lib/api';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from './ConfirmModal';

interface MergePayeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerged: () => void;
  payees: Payee[];
}

export default function MergePayeesModal({ isOpen, onClose, onMerged, payees }: MergePayeesModalProps) {
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) {
      toast.warning('Payees', 'Please select both source and target payees');
      return;
    }
    if (mergeSource === mergeTarget) {
      toast.warning('Payees', 'Cannot merge payee with itself');
      return;
    }

    const sourceName = payees.find((p) => p.id === mergeSource)?.name;
    const targetName = payees.find((p) => p.id === mergeTarget)?.name;

    if (!await confirm({
      title: 'Merge Payees',
      message: `Merge "${sourceName}" into "${targetName}"? All transactions will be updated.`,
      confirmLabel: 'Merge',
    })) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await payeesApi.merge(mergeSource, mergeTarget);
      setMergeSource(null);
      setMergeTarget(null);
      onMerged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge payees');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setMergeSource(null);
      setMergeTarget(null);
      onClose();
    }
  };

  const { shouldRender, isVisible } = useBottomSheet(isOpen);

  if (!shouldRender) return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 !mt-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center z-50 lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div
          className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl w-full lg:max-w-lg max-h-[90vh] overflow-hidden transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Drag handle - mobile only */}
          <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 lg:border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Merge Payees</h2>
              <p className="text-sm text-gray-500 mt-0.5">Combine two payees into one</p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Info box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-amber-700">
                The source payee will be deleted and all its transactions reassigned to the target.
              </p>
            </div>

            <div>
              <label htmlFor="merge-source" className="block text-sm font-medium text-gray-700 mb-1.5">
                Source (will be deleted)
              </label>
              <select
                id="merge-source"
                value={mergeSource || ''}
                onChange={(e) => setMergeSource(parseInt(e.target.value) || null)}
                className="appearance-none w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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
              <label htmlFor="merge-target" className="block text-sm font-medium text-gray-700 mb-1.5">
                Target (will keep)
              </label>
              <select
                id="merge-target"
                value={mergeTarget || ''}
                onChange={(e) => setMergeTarget(parseInt(e.target.value) || null)}
                className="appearance-none w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col-reverse lg:flex-row gap-3 lg:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full lg:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={loading || !mergeSource || !mergeTarget}
              className="w-full lg:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Merging...
                </span>
              ) : (
                'Merge Payees'
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>,
    document.body
  );
}
