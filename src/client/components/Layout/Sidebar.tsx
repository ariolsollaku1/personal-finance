import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Account, accountsApi } from '../../lib/api';
import { formatCompactCurrency } from '../../lib/currency';
import { useSWR } from '../../hooks/useSWR';
import AddAccountModal from '../AddAccountModal';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { data: accounts } = useSWR('/accounts', () => accountsApi.getAll());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    favorites: true,
    bank: false,
    cash: false,
    stock: false,
    loan: false,
    credit: false,
    asset: false,
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const allAccounts = accounts ?? [];
  const favoriteAccounts = allAccounts.filter((a) => a.is_favorite);
  const bankAccounts = allAccounts.filter((a) => a.type === 'bank');
  const cashAccounts = allAccounts.filter((a) => a.type === 'cash');
  const stockAccounts = allAccounts.filter((a) => a.type === 'stock');
  const loanAccounts = allAccounts.filter((a) => a.type === 'loan');
  const creditAccounts = allAccounts.filter((a) => a.type === 'credit');
  const assetAccounts = allAccounts.filter((a) => a.type === 'asset');

  const accountGroups = [
    { key: 'bank', label: 'Bank Accounts', accounts: bankAccounts, icon: '🏦' },
    { key: 'cash', label: 'Cash Accounts', accounts: cashAccounts, icon: '💵' },
    { key: 'stock', label: 'Stock Accounts', accounts: stockAccounts, icon: '📈' },
    { key: 'asset', label: 'Assets', accounts: assetAccounts, icon: '🏠' },
    { key: 'loan', label: 'Loan Accounts', accounts: loanAccounts, icon: '📋' },
    { key: 'credit', label: 'Credit Cards', accounts: creditAccounts, icon: '💳' },
  ];

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'bank': return '🏦';
      case 'cash': return '💵';
      case 'stock': return '📈';
      case 'asset': return '🏠';
      case 'loan': return '📋';
      case 'credit': return '💳';
      default: return '💰';
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await accountsApi.setFavorite(account.id, !account.is_favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <>
    <aside
      className={`bg-gradient-to-b from-white to-gray-50/80 border-r border-gray-200/60 flex flex-col h-full transition-all duration-300 shadow-sm ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"}
            />
          </svg>
        </button>
        {!collapsed && (
          <span className="ml-3 font-semibold text-gray-700 text-sm uppercase tracking-wider">Accounts</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Favorites Section - only show if there are favorites */}
        {!collapsed && favoriteAccounts.length > 0 && (
          <div>
            <button
              onClick={() => toggleGroup('favorites')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-orange-500 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">⭐</span>
                Favorites
              </span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedGroups.favorites ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {expandedGroups.favorites && (
              <div className="mt-1 px-2 space-y-1">
                {favoriteAccounts.map((account) => (
                  <NavLink
                    key={account.id}
                    to={`/accounts/${account.id}`}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-200 group ${
                        isActive
                          ? 'bg-orange-100 text-orange-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <div className="flex items-center min-w-0">
                      <span className="mr-2 text-sm">{getAccountIcon(account.type)}</span>
                      <span className="truncate">{account.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium flex-shrink-0 text-gray-400">
                        {account.type === 'stock'
                          ? formatCompactCurrency(account.costBasis || 0, account.currency)
                          : formatCompactCurrency(account.balance || 0, account.currency)}
                      </span>
                      <button
                        onClick={(e) => handleToggleFavorite(e, account)}
                        className="p-1 hover:bg-orange-100 rounded-lg text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from favorites"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Groups - only show groups that have accounts */}
        {!collapsed && (
          <div className={favoriteAccounts.length > 0 ? 'mt-2' : ''}>
            {accountGroups.filter(group => group.accounts.length > 0).map((group) => (
              <div key={group.key} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-orange-500 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{group.icon}</span>
                    {group.label}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expandedGroups[group.key] ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {expandedGroups[group.key] && (
                  <div className="mt-1 px-2 space-y-1">
                    {group.accounts.map((account) => (
                      <NavLink
                        key={account.id}
                        to={`/accounts/${account.id}`}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-200 group ${
                            isActive
                              ? 'bg-orange-100 text-orange-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`
                        }
                      >
                        <div className="flex items-center min-w-0">
                          <span className="truncate">{account.name}</span>
                          {(account.recurringInflow || 0) > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full" title={`${account.recurringInflow} recurring income`}>
                              {account.recurringInflow}
                            </span>
                          )}
                          {(account.recurringOutflow || 0) > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full" title={`${account.recurringOutflow} recurring expense`}>
                              {account.recurringOutflow}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium flex-shrink-0 text-gray-400" title={account.type === 'stock' ? 'Cost Basis' : account.type === 'credit' ? 'Available Credit' : 'Balance'}>
                            {account.type === 'stock'
                              ? formatCompactCurrency(account.costBasis || 0, account.currency)
                              : formatCompactCurrency(account.balance || 0, account.currency)}
                          </span>
                          <button
                            onClick={(e) => handleToggleFavorite(e, account)}
                            className={`p-1 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 ${account.is_favorite ? 'text-yellow-500 hover:bg-yellow-100' : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-100'}`}
                            title={account.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg className="w-3.5 h-3.5" fill={account.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Collapsed view - just icons */}
        {collapsed && (
          <div className="space-y-1 px-2">
            {accountGroups.map((group) =>
              group.accounts.map((account) => (
                <NavLink
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }
                  title={`${account.name}${account.type === 'stock'
                    ? ` (Cost: ${formatCompactCurrency(account.costBasis || 0, account.currency)})`
                    : account.type === 'credit'
                    ? ` (Available: ${formatCompactCurrency(account.balance || 0, account.currency)})`
                    : ` (${formatCompactCurrency(account.balance || 0, account.currency)})`}${(account.recurringInflow || 0) > 0 ? ` | ${account.recurringInflow} income` : ''}${(account.recurringOutflow || 0) > 0 ? ` | ${account.recurringOutflow} expense` : ''}`}
                >
                  <span className="text-lg">{group.icon}</span>
                </NavLink>
              ))
            )}
          </div>
        )}

        {/* Add Account Button */}
        <div className="mt-4 px-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {!collapsed && <span className="ml-2">Add Account</span>}
          </button>
        </div>
      </nav>

      {/* Settings - anchored at bottom */}
      <div className="border-t border-gray-100 px-2 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              isActive
                ? 'bg-orange-100 text-orange-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {!collapsed && <span className="ml-3">Settings</span>}
        </NavLink>
      </div>
    </aside>

    {/* Add Account Modal */}
    <AddAccountModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  );
}
