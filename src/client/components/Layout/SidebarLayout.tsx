import { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import BottomTabBar from './BottomTabBar';
import MoreMenu from './MoreMenu';
import MobileAccountList from './MobileAccountList';
import { dashboardApi } from '../../lib/api';

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  // Close mobile panels on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Load sidebar state from server
    dashboardApi.getSidebarCollapsed().then((data) => {
      setCollapsed(data.collapsed);
    }).catch(() => {
      // Use localStorage as fallback
      const stored = localStorage.getItem('sidebar_collapsed');
      if (stored) setCollapsed(stored === 'true');
    });
  }, []);

  const handleToggle = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    // Save to server
    dashboardApi.setSidebarCollapsed(newCollapsed).catch(() => {
      // Fallback to localStorage
      localStorage.setItem('sidebar_collapsed', String(newCollapsed));
    });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <TopNavbar />

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile accounts bottom sheet overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile accounts bottom sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-30 lg:hidden transition-transform duration-300 ${
            mobileOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-white rounded-t-2xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="overflow-y-auto flex-1">
              <MobileAccountList onSelect={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex h-full">
          <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar
        onAccountsClick={() => {
          setMoreOpen(false);
          setMobileOpen(!mobileOpen);
        }}
        onMoreClick={() => {
          setMobileOpen(false);
          setMoreOpen(!moreOpen);
        }}
        onTabClick={() => {
          setMobileOpen(false);
          setMoreOpen(false);
        }}
        isAccountsOpen={mobileOpen}
        isMoreOpen={moreOpen}
      />

      {/* More menu */}
      <MoreMenu isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
