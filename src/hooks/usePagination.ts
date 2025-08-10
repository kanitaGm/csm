// 📁 src/hooks/usePagination.ts 
import { useState, useMemo } from 'react';

export const usePagination = <T>(data: T[], itemsPerPage: number = 12) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  return {
    paginatedData,
    currentPage,
    totalPages,
    setCurrentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};