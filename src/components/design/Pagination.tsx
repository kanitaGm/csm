// ================================
// 13. PAGINATION COMPONENT
// ================================

// src/components/design-system/Pagination.tsx
import React from 'react'
import { cn } from '../../utils/cn'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showPrevNext?: boolean
  showFirstLast?: boolean
  siblingCount?: number
  className?: string
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPrevNext = true,
  showFirstLast = true,
  siblingCount = 1,
  className
}) => {
  const generatePaginationRange = () => {
    const totalPageNumbers = siblingCount + 5 // 5 = firstPage + lastPage + currentPage + 2*dots

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
      return [...leftRange, '...', totalPages]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      )
      return [1, '...', ...rightRange]
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      )
      return [1, '...', ...middleRange, '...', totalPages]
    }

    return []
  }

  const paginationRange = generatePaginationRange()

  if (currentPage === 0 || totalPages < 2) {
    return null
  }

  return (
    <nav className={cn("flex items-center justify-center space-x-1", className)}>
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          className="hidden sm:inline-flex"
        >
          แรก
        </Button>
      )}

      {/* Previous Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden ml-1 sm:inline">ก่อนหน้า</span>
        </Button>
      )}

      {/* Page Numbers */}
      {paginationRange.map((pageNumber, index) => {
        if (pageNumber === '...') {
          return (
            <span key={index} className="px-3 py-2 text-gray-500">
              <MoreHorizontal className="w-4 h-4" />
            </span>
          )
        }

        return (
          <Button
            key={index}
            variant={currentPage === pageNumber ? "primary" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNumber as number)}
          >
            {pageNumber}
          </Button>
        )
      })}

      {/* Next Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="hidden mr-1 sm:inline">ถัดไป</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          className="hidden sm:inline-flex"
        >
          สุดท้าย
        </Button>
      )}
    </nav>
  )
}

export { Pagination }