// src/hooks/useVirtualList.ts - Minimal Version (Hook Only)
import { useState, useMemo, useCallback } from 'react';

interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

interface VirtualListResult<T> {
  visibleItems: VirtualItem<T>[];
  containerStyle: React.CSSProperties;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const useVirtualList = <T>(
  items: T[],
  options: VirtualListOptions
): VirtualListResult<T> => {
  const {
    itemHeight,
    containerHeight,
    overscan = 5
  } = options;

  const [scrollTop, setScrollTop] = useState(0);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.length * itemHeight;
  }, [items.length, itemHeight]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    // Apply overscan
    const overscanStart = Math.max(0, start - overscan);
    const overscanEnd = Math.min(items.length - 1, end + overscan);

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Generate visible items with positioning
  const visibleItems = useMemo((): VirtualItem<T>[] => {
    const visible: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      visible.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
          minHeight: itemHeight
        }
      });
    }

    return visible;
  }, [items, startIndex, endIndex, itemHeight]);

  // Container style for proper scrolling
  const containerStyle: React.CSSProperties = useMemo(() => ({
    height: containerHeight,
    overflow: 'auto',
    position: 'relative'
  }), [containerHeight]);

  // Scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (index < 0 || index >= items.length) {
      return;
    }

    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [items.length, itemHeight]);

  return {
    visibleItems,
    containerStyle,
    totalHeight,
    scrollToIndex,
    handleScroll
  };
};

// ✅ Simple pagination hook (no virtual scrolling)
export const usePagination = <T>(items: T[], itemsPerPage: number = 25) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage
  };
};

// ✅ Example usage types
export interface VirtualListComponentProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}