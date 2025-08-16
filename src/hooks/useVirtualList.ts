// ========================================
// 📁 src/hooks/useVirtualList.ts - แก้ไข Types
// ========================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

export interface VirtualListOptions<T> {
  items: T[]; // ✅ เอา readonly ออก
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualListResult<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  visibleItems: Array<{ item: T; index: number }>; // ✅ เอา readonly ออก
  scrollToIndex: (index: number) => void;
}

export const useVirtualList = <T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: VirtualListOptions<T>): VirtualListResult<T> => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    }));
  }, [items, visibleRange]);

  const scrollToIndex = useCallback((index: number): void => {
    const container = containerRef.current;
    if (container && index >= 0 && index < items.length) {
      const scrollPosition = index * itemHeight;
      container.scrollTop = scrollPosition;
    }
  }, [itemHeight, items.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    containerRef,
    visibleItems,
    scrollToIndex
  };
};
