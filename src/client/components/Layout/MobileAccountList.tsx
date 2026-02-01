import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Account, accountsApi, Currency } from '../../lib/api';
import AddAccountModal from '../AddAccountModal';

function formatCompactCurrency(amount: number, currency: Currency): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  let formatted: string;
  if (absAmount >= 1_000_000) {
    const millions = absAmount / 1_000_000;
    formatted = millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    const thousands = absAmount / 1_000;
    formatted = thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  } else {
    formatted = absAmount.toFixed(0);
  }

  const symbols: Record<Currency, string> = {
    EUR: ' €', USD: '$', ALL: ' L', GBP: '£', CHF: ' Fr.',
    NOK: ' kr', SEK: ' kr', DKK: ' kr', PLN: ' zł',
    CZK: ' Kč', HUF: ' Ft', RON: ' lei', BGN: ' лв',
  };
  if (currency === 'USD' || currency === 'GBP') {
    return `${sign}${symbols[currency]}${formatted}`;
  }
  return `${sign}${formatted}${symbols[currency]}`;
}

const typeLabels: Record<string, string> = {
  bank: 'Bank', cash: 'Cash', stock: 'Stock', asset: 'Asset', loan: 'Loan', credit: 'Credit',
};

const typeIcons: Record<string, string> = {
  bank: '🏦', cash: '💵', stock: '📈', asset: '🏠', loan: '📋', credit: '💳',
};

interface MobileAccountListProps {
  onSelect: () => void;
}

export default function MobileAccountList({ onSelect }: MobileAccountListProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    const handleChanged = () => {
      accountsApi.getAll().then(setAccounts).catch(() => {});
    };
    window.addEventListener('accounts-changed', handleChanged);
    return () => window.removeEventListener('accounts-changed', handleChanged);
  }, []);

  // Group accounts by type, preserving order
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  const typeOrder = ['bank', 'cash', 'stock', 'asset', 'loan', 'credit'];

  return (
    <>
      <div className="px-4 pb-4">
        {typeOrder.filter(t => grouped[t]?.length).map((type) => (
          <div key={type} className="mb-3">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <span>{typeIcons[type]}</span>
              {typeLabels[type]}
            </div>
            <div className="space-y-0.5">
              {grouped[type].map((account) => (
                <NavLink
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  onClick={onSelect}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base flex-shrink-0">{typeIcons[account.type]}</span>
                    <span className="truncate text-sm">{account.name}</span>
                    {account.is_favorite && (
                      <span className="text-yellow-500 text-xs flex-shrink-0">⭐</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium flex-shrink-0 ml-3 ${
                    account.type === 'credit' && (account.initial_balance - (account.balance || 0)) > 0
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}>
                    {account.type === 'stock'
                      ? formatCompactCurrency(account.costBasis || 0, 'USD')
                      : account.type === 'credit'
                      ? formatCompactCurrency(account.initial_balance - (account.balance || 0), account.currency)
                      : formatCompactCurrency(account.balance || 0, account.currency)}
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">No accounts yet</div>
        )}

        {/* Add Account Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center w-full mt-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] transition-all duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Account
        </button>
      </div>

      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
}
