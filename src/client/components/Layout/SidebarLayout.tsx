import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
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
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden bg-white shadow-sm h-16 flex items-center px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-6 h-6 text-gray-600"
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
          <span className="ml-4 font-semibold text-gray-900">Finance Manager</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
