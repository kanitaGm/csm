// ================================
// Fixed useVirtualList Hook - TypeScript Strict Mode Compatible
// ไฟล์: src/hooks/useVirtualList.ts
// ================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

export interface VirtualListOptions<T> {
  readonly items: readonly T[];
  readonly itemHeight: number;
  readonly containerHeight: number;
  readonly overscan?: number;
}

export interface VirtualListResult<T> {
  readonly containerRef: RefObject<HTMLDivElement | null>; // แก้ไข type ให้รองรับ null
  readonly visibleItems: readonly { readonly item: T; readonly index: number }[];
  readonly scrollToIndex: (index: number) => void;
}

export const useVirtualList = <T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: VirtualListOptions<T>): VirtualListResult<T> => {
  const [scrollTop, setScrollTop] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null); // แก้ไข type ให้รองรับ null

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex } as const;
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    } as const));
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

// ================================
// Enhanced version with additional features
// ================================

export interface EnhancedVirtualListOptions<T> extends VirtualListOptions<T> {
  readonly enableSmoothScrolling?: boolean;
  readonly loadMoreThreshold?: number;
  readonly onLoadMore?: () => void;
  readonly estimatedItemHeight?: number;
  readonly getItemHeight?: (index: number, item: T) => number;
}

export interface EnhancedVirtualListResult<T> extends VirtualListResult<T> {
  readonly isNearBottom: boolean;
  readonly scrollToTop: () => void;
  readonly scrollToBottom: () => void;
  readonly getVisibleRange: () => { startIndex: number; endIndex: number };
}

export const useEnhancedVirtualList = <T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  enableSmoothScrolling = false,
  loadMoreThreshold = 3,
  onLoadMore,
  estimatedItemHeight,
  getItemHeight
}: EnhancedVirtualListOptions<T>): EnhancedVirtualListResult<T> => {
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [isNearBottom, setIsNearBottom] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggeredRef = useRef<boolean>(false);

  // Dynamic item height calculation
  const getEffectiveItemHeight = useCallback((index: number): number => {
    if (getItemHeight && items[index]) {
      return getItemHeight(index, items[index]);
    }
    return estimatedItemHeight || itemHeight;
  }, [getItemHeight, items, estimatedItemHeight, itemHeight]);

  // Calculate total height for dynamic heights
  const totalHeight = useMemo(() => {
    if (!getItemHeight && !estimatedItemHeight) {
      return items.length * itemHeight;
    }
    
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += getEffectiveItemHeight(i);
    }
    return height;
  }, [items.length, itemHeight, getEffectiveItemHeight, getItemHeight, estimatedItemHeight]);

  // Calculate visible range with dynamic heights
  const visibleRange = useMemo(() => {
    if (!getItemHeight && !estimatedItemHeight) {
      // Fixed height calculation
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
      );
      return { startIndex, endIndex };
    }

    // Dynamic height calculation
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const itemHeight = getEffectiveItemHeight(i);
      if (currentHeight + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      currentHeight += itemHeight;
    }

    // Find end index
    currentHeight = 0;
    for (let i = 0; i < items.length; i++) {
      const itemHeight = getEffectiveItemHeight(i);
      currentHeight += itemHeight;
      if (currentHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, items.length, overscan, getEffectiveItemHeight, getItemHeight, estimatedItemHeight, itemHeight]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      item,
      index: visibleRange.startIndex + index
    } as const));
  }, [items, visibleRange]);

  // Enhanced scroll functions
  const scrollToIndex = useCallback((index: number): void => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= items.length) return;

    let scrollPosition = 0;
    
    if (!getItemHeight && !estimatedItemHeight) {
      scrollPosition = index * itemHeight;
    } else {
      for (let i = 0; i < index; i++) {
        scrollPosition += getEffectiveItemHeight(i);
      }
    }

    if (enableSmoothScrolling) {
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    } else {
      container.scrollTop = scrollPosition;
    }
  }, [items.length, itemHeight, getEffectiveItemHeight, enableSmoothScrolling, getItemHeight, estimatedItemHeight]);

  const scrollToTop = useCallback((): void => {
    const container = containerRef.current;
    if (!container) return;

    if (enableSmoothScrolling) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      container.scrollTop = 0;
    }
  }, [enableSmoothScrolling]);

  const scrollToBottom = useCallback((): void => {
    const container = containerRef.current;
    if (!container) return;

    if (enableSmoothScrolling) {
      container.scrollTo({ top: totalHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = totalHeight;
    }
  }, [totalHeight, enableSmoothScrolling]);

  const getVisibleRange = useCallback(() => {
    return visibleRange;
  }, [visibleRange]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const newScrollTop = container.scrollTop;
      setScrollTop(newScrollTop);

      // Check if near bottom for load more
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - (newScrollTop + clientHeight);
      
      const nearBottom = distanceFromBottom < (loadMoreThreshold * itemHeight);
      setIsNearBottom(nearBottom);

      // Trigger load more
      if (nearBottom && !loadMoreTriggeredRef.current && onLoadMore) {
        loadMoreTriggeredRef.current = true;
        onLoadMore();
      } else if (!nearBottom) {
        loadMoreTriggeredRef.current = false;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMoreThreshold, itemHeight, onLoadMore]);

  return {
    containerRef,
    visibleItems,
    scrollToIndex,
    isNearBottom,
    scrollToTop,
    scrollToBottom,
    getVisibleRange
  };
};

export default useVirtualList;