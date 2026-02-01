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

function useAccountDisplay(account: Account, portfolio: PortfolioData | null) {
  const isStock = account.type === 'stock';
  const icon = ACCOUNT_ICONS[account.type] || '💰';
  const balance = isStock && portfolio
    ? `$${portfolio.totalValue.toFixed(2)}`
    : formatCurrency(account.balance || 0, account.currency);
  const balanceLabel = `Current ${isStock ? 'Value' : 'Balance'}`;
  const typeLabel = `${account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account`;
  return { icon, balance, balanceLabel, typeLabel };
}

function GradientHero({ account, portfolio, onEdit, onDelete }: AccountHeaderProps) {
  const { icon, balance, balanceLabel, typeLabel } = useAccountDisplay(account, portfolio);
  return (
    <div className="bg-gradient-to-br from-orange-400 via-orange-600 to-rose-600 rounded-2xl shadow-2xl shadow-orange-500/30 p-8 text-white">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{account.name}</h1>
            <p className="text-white/70 text-sm mt-0.5">{typeLabel}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-2.5 bg-white/15 hover:bg-red-500/40 backdrop-blur rounded-xl transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-white/60 text-sm font-medium">{balanceLabel}</p>
        <p className="text-4xl font-bold mt-1 tracking-tight">{balance}</p>
      </div>
    </div>
  );
}

function DarkCard({ account, portfolio, onEdit, onDelete }: AccountHeaderProps) {
  const { icon, balance, balanceLabel, typeLabel } = useAccountDisplay(account, portfolio);
  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl shadow-gray-900/50 ring-1 ring-gray-700/50 p-8 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      <div className="relative">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-xl">{icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{account.name}</h1>
              <p className="text-gray-400 text-sm">{typeLabel}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={onEdit} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button onClick={onDelete} className="p-2 bg-white/10 hover:bg-red-500/30 rounded-lg transition-all duration-200">
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-8">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{balanceLabel}</p>
          <p className="text-3xl font-bold mt-1.5 tracking-tight">{balance}</p>
        </div>
      </div>
    </div>
  );
}

export default function AccountHeader(props: AccountHeaderProps) {
  if (props.account.type === 'credit') {
    return <DarkCard {...props} />;
  }
  return <GradientHero {...props} />;
}
