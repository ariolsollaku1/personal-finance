import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'error' | 'success' | 'warning';
}

interface ToastFn {
  error: (title: string, message: string) => void;
  success: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: ToastFn;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((title: string, message: string, type: Toast['type']) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastFn = {
    error: (title: string, message: string) => addToast(title, message, 'error'),
    success: (title: string, message: string) => addToast(title, message, 'success'),
    warning: (title: string, message: string) => addToast(title, message, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function ErrorIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function SuccessIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function TypeIcon({ type, className }: { type: Toast['type']; className?: string }) {
  switch (type) {
    case 'success': return <SuccessIcon className={className} />;
    case 'warning': return <WarningIcon className={className} />;
    default: return <ErrorIcon className={className} />;
  }
}

// ─── Toast Card ─────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<Toast['type'], { border: string; iconBg: string; iconText: string }> = {
  error:   { border: 'border-l-red-500', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  success: { border: 'border-l-green-500', iconBg: 'bg-green-100', iconText: 'text-green-600' },
  warning: { border: 'border-l-amber-500', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
};

function ToastCard({ title, message, type, onClose }: { title: string; message: string; type: Toast['type']; onClose: () => void }) {
  const s = TOAST_STYLES[type];
  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-xl shadow-lg px-4 py-3.5 flex items-start gap-3`}>
      <div className={`w-8 h-8 ${s.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <TypeIcon type={type} className={`w-4 h-4 ${s.iconText}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"><CloseIcon /></button>
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto animate-slide-in">
          <ToastCard title={t.title} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
