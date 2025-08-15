// 📁 src/components/ui/SkeletonLoader.tsx - Fixed Props Interface
import React from 'react';

export interface SkeletonLoaderProps {
  rows?: number;  // เปลี่ยนจาก lines
  height?: string | number;
  className?: string;
  animate?: boolean;
}

// src/components/ui/SkeletonLoader.tsx
export const CardSkeleton: React.FC = () => (
  <div className="p-6 bg-white border border-gray-200 animate-pulse rounded-xl">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div className="flex-1">
        <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded"></div>
        <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="mb-4 space-y-2">
      <div className="w-full h-3 bg-gray-200 rounded"></div>
      <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  rows = 3,
  height = '1rem',
  className = '',
  animate = true
}) => {
  const skeletonClass = `
    bg-gray-200 rounded
    ${animate ? 'animate-pulse' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={skeletonClass}
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;