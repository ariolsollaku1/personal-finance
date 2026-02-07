import { createPortal } from 'react-dom';
import { useBottomSheet } from '../hooks/useBottomSheet';

const MAX_WIDTH_MAP = {
  sm: 'lg:max-w-sm',
  md: 'lg:max-w-md',
  lg: 'lg:max-w-lg',
  '2xl': 'lg:max-w-2xl',
} as const;

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: keyof typeof MAX_WIDTH_MAP;
  children: React.ReactNode;
}

export default function BaseModal({ isOpen, onClose, maxWidth = 'md', children }: BaseModalProps) {
  const { shouldRender, isVisible } = useBottomSheet(isOpen);

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 !mt-0 bg-black/40 backdrop-blur-md flex items-end lg:items-center lg:justify-center z-50 lg:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl shadow-black/20 ring-1 ring-gray-200/50 w-full ${MAX_WIDTH_MAP[maxWidth]} max-h-[90vh] overflow-hidden transition-transform duration-300 lg:transition-none ${isVisible ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
