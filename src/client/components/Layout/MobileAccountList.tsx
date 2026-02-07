import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Account, accountsApi, Currency } from '../../lib/api';
import { useSWR } from '../../hooks/useSWR';
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

const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
  bank: { label: 'Bank', icon: '🏦', color: 'bg-blue-50 text-blue-600' },
  cash: { label: 'Cash', icon: '💵', color: 'bg-green-50 text-green-600' },
  stock: { label: 'Investments', icon: '📈', color: 'bg-purple-50 text-purple-600' },
  asset: { label: 'Assets', icon: '🏠', color: 'bg-amber-50 text-amber-600' },
  loan: { label: 'Loans', icon: '📋', color: 'bg-rose-50 text-rose-600' },
  credit: { label: 'Credit Cards', icon: '💳', color: 'bg-pink-50 text-pink-600' },
};

function getDisplayBalance(account: Account): { value: string; negative: boolean } {
  if (account.type === 'stock') {
    return { value: formatCompactCurrency(account.costBasis || 0, 'USD'), negative: false };
  }
  if (account.type === 'credit') {
    return { value: formatCompactCurrency(account.balance || 0, account.currency), negative: false };
  }
  return { value: formatCompactCurrency(account.balance || 0, account.currency), negative: (account.balance || 0) < 0 };
}

interface MobileAccountListProps {
  onSelect: () => void;
}

export default function MobileAccountList({ onSelect }: MobileAccountListProps) {
  const { data: accounts } = useSWR('/accounts', () => accountsApi.getAll());
  const [showAddModal, setShowAddModal] = useState(false);

  const allAccounts = accounts ?? [];
  const grouped = allAccounts.reduce<Record<string, Account[]>>((acc, account) => {
    const key = account.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {});

  const typeOrder = ['bank', 'cash', 'stock', 'asset', 'loan', 'credit'];
  const activeTypes = typeOrder.filter(t => grouped[t]?.length);

  return (
    <>
      {/* Header */}
      <div className="px-5 pb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Accounts</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
          </svg>
          Add
        </button>
      </div>

      {/* Account List */}
      <div className="px-4 pb-5">
        {allAccounts.length === 0 && (
          <div className="py-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">No accounts yet</p>
            <p className="text-xs text-gray-400">Tap "Add" to create your first account</p>
          </div>
        )}

        {activeTypes.map((type, groupIdx) => {
          const config = typeConfig[type];
          return (
            <div key={type} className={groupIdx > 0 ? 'mt-4' : ''}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-1 mb-1.5">
                <span className="text-xs">{config.icon}</span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{config.label}</span>
                <span className="text-[11px] text-gray-300 font-medium">{grouped[type].length}</span>
              </div>

              {/* Account rows */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {grouped[type].map((account) => {
                  const bal = getDisplayBalance(account);
                  return (
                    <NavLink
                      key={account.id}
                      to={`/accounts/${account.id}`}
                      onClick={onSelect}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 transition-all duration-150 ${
                          isActive
                            ? 'bg-orange-50'
                            : 'active:bg-gray-50'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'bg-orange-100' : config.color
                          }`}>
                            <span className="text-sm">{config.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm truncate ${isActive ? 'font-semibold text-orange-700' : 'font-medium text-gray-900'}`}>
                                {account.name}
                              </span>
                              {account.is_favorite && (
                                <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${
                            isActive ? 'text-orange-700' : bal.negative ? 'text-red-500' : 'text-gray-900'
                          }`}>
                            {bal.value}
                          </span>
                          <svg className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-orange-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
}
