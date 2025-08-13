// 📁 src/components/ui/SkeletonLoader.tsx - Fixed Props Interface
import React from 'react';

export interface SkeletonLoaderProps {
  rows?: number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

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