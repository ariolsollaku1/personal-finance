import { NavLink, useLocation } from 'react-router-dom';

interface BottomTabBarProps {
  onAccountsClick: () => void;
  onMoreClick: () => void;
  onTabClick: () => void;
  isAccountsOpen: boolean;
  isMoreOpen: boolean;
}

export default function BottomTabBar({ onAccountsClick, onMoreClick, onTabClick, isAccountsOpen, isMoreOpen }: BottomTabBarProps) {
  const location = useLocation();
  const isOnAccountPage = /^\/accounts\/\d+/.test(location.pathname);
  const isOnSettingsPage = location.pathname.startsWith('/settings');
  const isAnalyticsActive = location.pathname === '/projection' || location.pathname === '/pnl';
  const panelOpen = isAccountsOpen || isMoreOpen;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {/* Home */}
        <NavLink
          to="/"
          end
          onClick={onTabClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
              isActive && !panelOpen ? 'text-orange-600' : 'text-gray-400'
            }`
          }
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1 font-medium">Home</span>
        </NavLink>

        {/* Accounts */}
        <button
          onClick={onAccountsClick}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
            isAccountsOpen || (!panelOpen && isOnAccountPage) ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Accounts</span>
        </button>

        {/* Transfers */}
        <NavLink
          to="/transfers"
          onClick={onTabClick}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
              isActive && !panelOpen ? 'text-orange-600' : 'text-gray-400'
            }`
          }
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-xs mt-1 font-medium">Transfers</span>
        </NavLink>

        {/* Analytics */}
        <NavLink
          to="/projection"
          onClick={onTabClick}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
            isAnalyticsActive && !panelOpen ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Analytics</span>
        </NavLink>

        {/* More */}
        <button
          onClick={onMoreClick}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
            isMoreOpen || (!panelOpen && isOnSettingsPage) ? 'text-orange-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-xs mt-1 font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
