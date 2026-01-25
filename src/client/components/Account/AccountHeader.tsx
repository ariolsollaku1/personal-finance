import { Account } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { PortfolioData } from '../../hooks/useAccountPage';

interface AccountHeaderProps {
  account: Account;
  portfolio: PortfolioData | null;
  onEdit: () => void;
  onDelete: () => void;
}

const ACCOUNT_ICONS: Record<string, string> = {
  bank: '🏦',
  cash: '💵',
  stock: '📈',
  asset: '🏠',
  loan: '📋',
  credit: '💳',
};

export default function AccountHeader({ account, portfolio, onEdit, onDelete }: AccountHeaderProps) {
  const isStockAccount = account.type === 'stock';
  const icon = ACCOUNT_ICONS[account.type] || '💰';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 capitalize">{account.type} Account</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {isStockAccount && portfolio
              ? `$${portfolio.totalValue.toFixed(2)}`
              : formatCurrency(account.balance || 0, account.currency)}
          </p>
          <p className="text-sm text-gray-500">Current {isStockAccount ? 'Value' : 'Balance'}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onEdit} className="text-sm text-orange-600 hover:text-orange-800">
          Edit Account
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={onDelete} className="text-sm text-red-600 hover:text-red-800">
          Delete Account
        </button>
      </div>
    </div>
  );
}
