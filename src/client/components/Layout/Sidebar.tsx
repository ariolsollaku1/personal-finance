import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Account, accountsApi, Currency } from '../../lib/api';

// Compact currency formatter for sidebar (e.g., 494k L, 1.5M €)
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

  const symbols: Record<Currency, string> = { ALL: ' L', EUR: ' €', USD: '$' };
  if (currency === 'USD') {
    return `${sign}${symbols.USD}${formatted}`;
  }
  return `${sign}${formatted}${symbols[currency]}`;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    favorites: true,
    bank: false,
    cash: false,
    stock: false,
    loan: false,
    credit: false,
    asset: false,
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Reload accounts on route change (e.g., after creating/deleting an account)
  useEffect(() => {
    loadAccounts();
  }, [location.pathname]);

  // Listen for account changes (edit, delete) that don't change the route
  useEffect(() => {
    const handleAccountsChanged = () => loadAccounts();
    window.addEventListener('accounts-changed', handleAccountsChanged);
    return () => window.removeEventListener('accounts-changed', handleAccountsChanged);
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await accountsApi.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const favoriteAccounts = accounts.filter((a) => a.is_favorite === 1);
  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const stockAccounts = accounts.filter((a) => a.type === 'stock');
  const loanAccounts = accounts.filter((a) => a.type === 'loan');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const assetAccounts = accounts.filter((a) => a.type === 'asset');

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
      loadAccounts();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {!collapsed && <span className="ml-3 font-semibold text-gray-900">Finance Manager</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Dashboard Link */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {!collapsed && <span className="ml-3">Dashboard</span>}
        </NavLink>

        {/* Projection Link */}
        <NavLink
          to="/projection"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {!collapsed && <span className="ml-3">Projection</span>}
        </NavLink>

        {/* P&L Link */}
        <NavLink
          to="/pnl"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          {!collapsed && <span className="ml-3">P&L</span>}
        </NavLink>

        {/* Favorites Section */}
        {!collapsed && (
          <div className="mt-4">
            <button
              onClick={() => toggleGroup('favorites')}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50"
            >
              <span className="flex items-center">
                <span className="mr-2">⭐</span>
                Favorites
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
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
              <div className="mt-1">
                {favoriteAccounts.length === 0 ? (
                  <p className="px-4 py-2 text-sm text-gray-400 italic">No favorites</p>
                ) : (
                  favoriteAccounts.map((account) => (
                    <NavLink
                      key={account.id}
                      to={`/accounts/${account.id}`}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      <div className="flex items-center min-w-0">
                        <span className="mr-2 text-xs">{getAccountIcon(account.type)}</span>
                        <span className="truncate">{account.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs flex-shrink-0 ${account.type === 'credit' && (account.initial_balance - (account.balance || 0)) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {account.type === 'stock'
                            ? formatCompactCurrency(account.costBasis || 0, 'USD')
                            : account.type === 'credit'
                            ? formatCompactCurrency(account.initial_balance - (account.balance || 0), account.currency)
                            : formatCompactCurrency(account.balance || 0, account.currency)}
                        </span>
                        <button
                          onClick={(e) => handleToggleFavorite(e, account)}
                          className="p-0.5 hover:bg-gray-200 rounded text-yellow-500"
                          title="Remove from favorites"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      </div>
                    </NavLink>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Account Groups */}
        {!collapsed && (
          <div className="mt-4">
            {accountGroups.map((group) => (
              <div key={group.key} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50"
                >
                  <span className="flex items-center">
                    <span className="mr-2">{group.icon}</span>
                    {group.label}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
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
                  <div className="mt-1">
                    {group.accounts.length === 0 ? (
                      <p className="px-4 py-2 text-sm text-gray-400 italic">No accounts</p>
                    ) : (
                      group.accounts.map((account) => (
                        <NavLink
                          key={account.id}
                          to={`/accounts/${account.id}`}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`
                          }
                        >
                          <div className="flex items-center min-w-0">
                            <span className="truncate">{account.name}</span>
                            {(account.recurringInflow || 0) > 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full" title={`${account.recurringInflow} recurring income`}>
                                {account.recurringInflow}
                              </span>
                            )}
                            {(account.recurringOutflow || 0) > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full" title={`${account.recurringOutflow} recurring expense`}>
                                {account.recurringOutflow}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs flex-shrink-0 ${account.type === 'credit' && (account.initial_balance - (account.balance || 0)) > 0 ? 'text-red-500' : 'text-gray-400'}`} title={account.type === 'stock' ? 'Cost Basis' : account.type === 'credit' ? 'Amount Owed' : 'Balance'}>
                              {account.type === 'stock'
                                ? formatCompactCurrency(account.costBasis || 0, 'USD')
                                : account.type === 'credit'
                                ? formatCompactCurrency(account.initial_balance - (account.balance || 0), account.currency)
                                : formatCompactCurrency(account.balance || 0, account.currency)}
                            </span>
                            <button
                              onClick={(e) => handleToggleFavorite(e, account)}
                              className={`p-0.5 hover:bg-gray-200 rounded ${account.is_favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}`}
                              title={account.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <svg className="w-3.5 h-3.5" fill={account.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          </div>
                        </NavLink>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Collapsed view - just icons */}
        {collapsed && (
          <div className="mt-4 space-y-2">
            {accountGroups.map((group) =>
              group.accounts.map((account) => (
                <NavLink
                  key={account.id}
                  to={`/accounts/${account.id}`}
                  className={({ isActive }) =>
                    `flex items-center justify-center px-4 py-2 mx-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                  title={`${account.name}${account.type === 'stock'
                    ? ` (Cost: ${formatCompactCurrency(account.costBasis || 0, 'USD')})`
                    : account.type === 'credit'
                    ? ` (Owed: ${formatCompactCurrency(account.initial_balance - (account.balance || 0), account.currency)})`
                    : ` (${formatCompactCurrency(account.balance || 0, account.currency)})`}${(account.recurringInflow || 0) > 0 ? ` | ${account.recurringInflow} income` : ''}${(account.recurringOutflow || 0) > 0 ? ` | ${account.recurringOutflow} expense` : ''}`}
                >
                  <span>{group.icon}</span>
                </NavLink>
              ))
            )}
          </div>
        )}

        {/* Add Account Button */}
        <div className="mt-4 px-2">
          <button
            onClick={() => navigate('/accounts/new')}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {!collapsed && <span className="ml-2">Add Account</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Settings Section */}
        {!collapsed && (
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </div>
        )}

        <NavLink
          to="/settings/categories"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          {!collapsed && <span className="ml-3">Categories</span>}
        </NavLink>

        <NavLink
          to="/settings/payees"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          {!collapsed && <span className="ml-3">Payees</span>}
        </NavLink>

        <NavLink
          to="/settings/currency"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {!collapsed && <span className="ml-3">Currency</span>}
        </NavLink>

        <NavLink
          to="/transfers"
          className={({ isActive }) =>
            `flex items-center px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          {!collapsed && <span className="ml-3">Transfers</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
