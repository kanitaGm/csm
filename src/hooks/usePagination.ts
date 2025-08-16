// ========================================
// 📁 src/hooks/usePagination.ts - แก้ไข Types
// ========================================

import { useState, useMemo, useCallback, useEffect } from 'react';

export interface PaginationResult<T> {
  paginatedItems: T[]; // ✅ เอา readonly ออก
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export const usePagination = <T>(
  data: T[], // ✅ เอา readonly ออก
  itemsPerPage: number = 12
): PaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, data.length);
  
  const paginatedItems = useMemo(() => {
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, startIndex, itemsPerPage]);
  
  const goToPage = useCallback((page: number): void => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  const nextPage = useCallback((): void => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);
  
  const prevPage = useCallback((): void => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);
  
  const goToFirst = useCallback((): void => {
    setCurrentPage(1);
  }, []);
  
  const goToLast = useCallback((): void => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Reset to page 1 when data changes significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  return {
    paginatedItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    itemsPerPage,
    totalItems: data.length,
    startIndex: startIndex + 1, // 1-based for display
    endIndex
  };
};