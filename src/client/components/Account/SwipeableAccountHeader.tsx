import { useRef, useCallback, useEffect } from 'react';
import { Account } from '../../lib/api';
import { PortfolioData } from '../../hooks/useAccountPage';
import AccountHeader from './AccountHeader';

interface SwipeableAccountHeaderProps {
  accounts: Account[];
  activeIndex: number;
  portfolio: PortfolioData | null;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onAccountChange: (id: number) => void;
  onPayLoan?: () => void;
}

export default function SwipeableAccountHeader({
  accounts,
  activeIndex,
  portfolio,
  onEdit,
  onDelete,
  onArchive,
  onAccountChange,
  onPayLoan,
}: SwipeableAccountHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const currentOffsetRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const indexRef = useRef(activeIndex);

  // Keep indexRef in sync with prop
  useEffect(() => {
    indexRef.current = activeIndex;
    // Snap to correct position without animation when prop changes (e.g. sidebar click)
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setTransform(-activeIndex * width, false);
    }
  }, [activeIndex]);

  const setTransform = useCallback((x: number, animate: boolean) => {
    const el = containerRef.current?.querySelector('[data-swipe-track]') as HTMLElement | null;
    if (!el) return;
    el.style.transition = animate ? 'transform 300ms ease-out' : 'none';
    el.style.transform = `translateX(${x}px)`;
    currentOffsetRef.current = x;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isAnimatingRef.current) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    lockedRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isAnimatingRef.current) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (!lockedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedRef.current = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (lockedRef.current === 'vertical') return;

    e.preventDefault();

    const width = containerRef.current?.offsetWidth || 0;
    const base = -indexRef.current * width;
    let next = base + dx;

    // Rubber-band at edges
    if (next > 0) {
      next *= 0.3;
    } else if (next < -(accounts.length - 1) * width) {
      const overshoot = next + (accounts.length - 1) * width;
      next = -(accounts.length - 1) * width + overshoot * 0.3;
    }

    setTransform(next, false);
  }, [accounts.length, setTransform]);

  const handleTouchEnd = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (lockedRef.current !== 'horizontal') {
      lockedRef.current = null;
      return;
    }
    lockedRef.current = null;

    const width = containerRef.current?.offsetWidth || 0;
    if (!width) return;

    const base = -indexRef.current * width;
    const dragDistance = currentOffsetRef.current - base;
    const threshold = width * 0.3;

    let newIndex = indexRef.current;
    if (dragDistance < -threshold && newIndex < accounts.length - 1) {
      newIndex++;
    } else if (dragDistance > threshold && newIndex > 0) {
      newIndex--;
    }

    isAnimatingRef.current = true;
    setTransform(-newIndex * width, true);

    setTimeout(() => {
      isAnimatingRef.current = false;
      if (newIndex !== indexRef.current) {
        indexRef.current = newIndex;
        onAccountChange(accounts[newIndex].id);
      }
    }, 300);
  }, [accounts, setTransform, onAccountChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const current = accounts[activeIndex];
  if (!current) return null;

  // Single account: plain header, no swipe, no dots
  if (accounts.length <= 1) {
    return (
      <AccountHeader
        account={current}
        portfolio={portfolio}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
        onPayLoan={onPayLoan}
      />
    );
  }

  return (
    <div ref={containerRef}>
      <div className="overflow-hidden">
        <div
          data-swipe-track
          className="flex"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {accounts.map((acc, i) => (
            <div key={acc.id} className="w-full flex-shrink-0">
              <AccountHeader
                account={acc}
                portfolio={i === activeIndex ? portfolio : null}
                onEdit={onEdit}
                onDelete={onDelete}
                onArchive={onArchive}
                onPayLoan={i === activeIndex ? onPayLoan : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {accounts.map((acc, i) => (
          <button
            key={acc.id}
            type="button"
            aria-label={acc.name}
            onClick={() => {
              if (i === activeIndex || isAnimatingRef.current) return;
              const width = containerRef.current?.offsetWidth || 0;
              isAnimatingRef.current = true;
              setTransform(-i * width, true);
              setTimeout(() => {
                isAnimatingRef.current = false;
                indexRef.current = i;
                onAccountChange(accounts[i].id);
              }, 300);
            }}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 p-0 border-0 ${
              i === activeIndex ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
