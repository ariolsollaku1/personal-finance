import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { dashboardApi } from '../../lib/api';

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <TopNavbar onMobileMenuClick={() => setMobileOpen(true)} />

      {/* Main content area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-30 transform lg:hidden transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex h-full">
          <Sidebar collapsed={collapsed} onToggle={handleToggle} />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
