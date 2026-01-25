import { EditAccountForm } from '../../hooks/useAccountPage';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editAccountData: EditAccountForm;
  setEditAccountData: (data: EditAccountForm) => void;
  isStockAccount: boolean;
}

export default function EditAccountModal({
  isOpen,
  onClose,
  onSubmit,
  editAccountData,
  setEditAccountData,
  isStockAccount,
}: EditAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Account</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editAccountData.name}
              onChange={(e) => setEditAccountData({ ...editAccountData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          {!isStockAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={editAccountData.initialBalance}
                onChange={(e) =>
                  setEditAccountData({
                    ...editAccountData,
                    initialBalance: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
