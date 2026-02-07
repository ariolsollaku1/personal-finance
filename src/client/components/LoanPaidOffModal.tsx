import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { Account, accountsApi } from '../lib/api';

interface LoanPaidOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanAccount: Account;
  onArchive: () => void;
}

export default function LoanPaidOffModal({
  isOpen,
  onClose,
  loanAccount,
  onArchive,
}: LoanPaidOffModalProps) {
  const [archiving, setArchiving] = useState(false);

  const { shouldRender, isVisible } = useBottomSheet(isOpen);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await accountsApi.archive(loanAccount.id);
      onArchive();
      onClose();
    } catch (err) {
      console.error('Failed to archive account:', err);
      setArchiving(false);
    }
  };

  const handleKeepActive = () => {
    onClose();
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 !mt-0 bg-black/40 backdrop-blur-md flex items-end lg:items-center lg:justify-center z-50 lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget && !archiving) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-gray-200/50 w-full lg:max-w-md max-h-[90vh] overflow-hidden transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Celebration Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Congratulations!
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-2">
            You've completely paid off
          </p>
          <p className="text-xl font-semibold text-gray-900 mb-6">
            {loanAccount.name}
          </p>

          {/* Decorative confetti effect */}
          <div className="relative h-8 mb-6">
            <span className="absolute left-1/4 text-2xl animate-bounce" style={{ animationDelay: '0ms' }}>
              🎉
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 text-2xl animate-bounce" style={{ animationDelay: '150ms' }}>
              🎊
            </span>
            <span className="absolute right-1/4 text-2xl animate-bounce" style={{ animationDelay: '300ms' }}>
              🎉
            </span>
          </div>

          {/* Archive prompt */}
          <p className="text-sm text-gray-500 mb-6">
            Would you like to archive this account to keep your sidebar clean?
            You can always restore it later from Settings.
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse lg:flex-row gap-3">
            <button
              type="button"
              onClick={handleKeepActive}
              disabled={archiving}
              className="w-full lg:flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Keep Active
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="w-full lg:flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 flex items-center justify-center gap-2"
            >
              {archiving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {archiving ? 'Archiving...' : 'Archive Account'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
