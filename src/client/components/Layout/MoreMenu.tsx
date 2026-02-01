import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../hooks/useBottomSheet';

interface MoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MoreMenu({ isOpen, onClose }: MoreMenuProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/login');
  };

  const { shouldRender, isVisible } = useBottomSheet(isOpen);

  if (!shouldRender) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-4">
          {/* P&L */}
          <NavLink
            to="/pnl"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Profit & Loss
          </NavLink>

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-gray-100" />

          {/* Categories */}
          <NavLink
            to="/settings/categories"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Categories
          </NavLink>

          {/* Payees */}
          <NavLink
            to="/settings/payees"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Payees
          </NavLink>

          {/* Currency */}
          <NavLink
            to="/settings/currency"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Currency
          </NavLink>

          {/* Divider */}
          <div className="my-2 mx-4 border-t border-gray-100" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
