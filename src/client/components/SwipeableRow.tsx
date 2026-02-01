import { useRef, useCallback, useEffect, ReactNode } from 'react';

interface SwipeAction {
  label: string;
  onClick: () => void;
  color: string;
}

interface SwipeableRowProps {
  actions: SwipeAction[];
  children: ReactNode;
}

const ACTION_WIDTH = 72;

export default function SwipeableRow({ actions, children }: SwipeableRowProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  const swipingRef = useRef(false);
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const totalWidth = actions.length * ACTION_WIDTH;

  const setTransform = useCallback((x: number, animate: boolean) => {
    if (!contentRef.current) return;
    contentRef.current.style.transition = animate ? 'transform 0.3s ease-out' : 'none';
    contentRef.current.style.transform = `translateX(${x}px)`;
    currentOffsetRef.current = x;
  }, []);

  const close = useCallback(() => {
    setTransform(0, true);
    isOpenRef.current = false;
  }, [setTransform]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    swipingRef.current = false;
    lockedRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    if (!lockedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockedRef.current = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (lockedRef.current === 'vertical') return;

    e.preventDefault();
    swipingRef.current = true;

    const base = isOpenRef.current ? -totalWidth : 0;
    let next = base + dx;
    if (next > 0) next *= 0.3;
    if (next < -totalWidth) next = -totalWidth + (next + totalWidth) * 0.3;
    setTransform(next, false);
  }, [totalWidth, setTransform]);

  const handleTouchEnd = useCallback(() => {
    lockedRef.current = null;
    if (!swipingRef.current) {
      if (isOpenRef.current) close();
      return;
    }
    const shouldOpen = currentOffsetRef.current < -totalWidth / 3;
    if (shouldOpen) {
      setTransform(-totalWidth, true);
      isOpenRef.current = true;
    } else {
      close();
    }
  }, [totalWidth, setTransform, close]);

  useEffect(() => {
    const el = contentRef.current;
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

  return (
    <div className="relative overflow-hidden lg:overflow-visible">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-stretch lg:hidden"
        style={{ width: `${totalWidth}px` }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => { action.onClick(); close(); }}
            className={`flex-1 flex items-center justify-center text-xs font-semibold text-white ${action.color}`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div ref={contentRef} className="relative bg-white">
        {children}
      </div>
    </div>
  );
}
