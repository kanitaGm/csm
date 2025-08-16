// src/components/design-system/Skeleton.tsx
import React from 'react'
import { cn } from '../../utils/cn'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

// Preset skeleton components
const SkeletonCard = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="w-3/4 h-4" />
    <Skeleton className="w-1/2 h-3" />
    <Skeleton className="w-full h-2" />
    <Skeleton className="w-4/5 h-2" />
  </div>
)

const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-3" />
        </div>
      </div>
    ))}
  </div>
)

const SkeletonTable = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3">
    {/* Table header */}
    <div className="flex space-x-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="flex-1 h-4" />
      ))}
    </div>
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="flex-1 h-3" />
        ))}
      </div>
    ))}
  </div>
)

export { Skeleton, SkeletonCard, SkeletonList, SkeletonTable }