import { useState, useEffect, useRef } from 'react';

let openCount = 0;

function lockScroll() {
  openCount++;
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.style.overflow = '';
  }
}

export function useBottomSheet(isOpen: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isLocked = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!isLocked.current) {
        lockScroll();
        isLocked.current = true;
      }
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (isLocked.current) {
          unlockScroll();
          isLocked.current = false;
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (isLocked.current) {
          unlockScroll();
          isLocked.current = false;
        }
      };
    }
  }, [isOpen]);

  // Unlock on unmount if still locked (e.g. component unmounts while open)
  useEffect(() => {
    return () => {
      if (isLocked.current) {
        unlockScroll();
        isLocked.current = false;
      }
    };
  }, []);

  return { shouldRender, isVisible };
}
