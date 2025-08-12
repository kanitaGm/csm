// 📁 src/components/ui/SkeletonLoader.tsx
// Strict TypeScript SkeletonLoader with proper props
import React from 'react';

interface SkeletonLoaderProps {
  readonly lines?: number;
  readonly className?: string;
  readonly animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  lines = 3, 
  className = '', 
  animated = true 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="flex-1">
          <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="w-1/2 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
      </div>
      <SkeletonLoader lines={4} />
    </div>
  </div>
);

export default SkeletonLoader;