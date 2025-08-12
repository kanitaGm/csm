// ================================
// Complete usePagination Hook
// ไฟล์: src/hooks/usePagination.ts
// ================================

import { useState, useMemo, useCallback } from 'react';

export interface PaginationResult<T> {
  readonly paginatedItems: readonly T[];
  readonly currentPage: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
  readonly goToPage: (page: number) => void;
  readonly nextPage: () => void;
  readonly prevPage: () => void;
  readonly goToFirst: () => void;
  readonly goToLast: () => void;
  readonly itemsPerPage: number;
  readonly totalItems: number;
  readonly startIndex: number;
  readonly endIndex: number;
}

export const usePagination = <T>(
  data: readonly T[], 
  itemsPerPage: number = 12
): PaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  
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

export default usePagination;