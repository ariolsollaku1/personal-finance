import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Account, accountsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/currency';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    bank: true,
    cash: true,
    stock: true,
    loan: true,
    credit: true,
    asset: true,
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

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
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

        {/* Account Groups */}
        {!collapsed && (
          <div className="mt-6">
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
                          <span className={`text-xs ml-2 flex-shrink-0 ${account.type === 'credit' && (account.initial_balance - (account.balance || 0)) > 0 ? 'text-red-500' : 'text-gray-400'}`} title={account.type === 'stock' ? 'Cost Basis' : account.type === 'credit' ? 'Amount Owed' : 'Balance'}>
                            {account.type === 'stock'
                              ? `$${(account.costBasis || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : account.type === 'credit'
                              ? formatCurrency(account.initial_balance - (account.balance || 0), account.currency)
                              : formatCurrency(account.balance || 0, account.currency)}
                          </span>
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
                    ? ` (Cost: $${(account.costBasis || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                    : account.type === 'credit'
                    ? ` (Owed: ${formatCurrency(account.initial_balance - (account.balance || 0), account.currency)})`
                    : ` (${formatCurrency(account.balance || 0, account.currency)})`}${(account.recurringInflow || 0) > 0 ? ` | ${account.recurringInflow} income` : ''}${(account.recurringOutflow || 0) > 0 ? ` | ${account.recurringOutflow} expense` : ''}`}
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
            className={`flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            {!collapsed && <span className="ml-3">Add Account</span>}
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
