import { Account } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';
import { PortfolioData } from '../../hooks/useAccountPage';

interface AccountHeaderProps {
  account: Account;
  portfolio: PortfolioData | null;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onPayLoan?: () => void;
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
  const balanceLabel = isStock ? 'Current Value' : account.type === 'credit' ? 'Available Credit' : 'Current Balance';
  const typeLabel = `${account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account`;
  return { icon, balance, balanceLabel, typeLabel };
}

function GradientHero({ account, portfolio, onEdit, onDelete, onArchive, onPayLoan }: AccountHeaderProps) {
  const { icon, balance, balanceLabel, typeLabel } = useAccountDisplay(account, portfolio);
  const isLoan = account.type === 'loan';
  const hasDebt = isLoan && (account.balance || 0) > 0;

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
          {isLoan && hasDebt && onPayLoan && (
            <button onClick={onPayLoan} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pay
            </button>
          )}
          <button onClick={onEdit} className="p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {onArchive && (
            <button onClick={onArchive} className="p-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl transition-all duration-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          )}
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

function DarkCard({ account, portfolio, onEdit, onDelete, onArchive }: AccountHeaderProps) {
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
            {onArchive && (
              <button onClick={onArchive} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200">
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            )}
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

export type { AccountHeaderProps };
