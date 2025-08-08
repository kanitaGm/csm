// 📁 src/components/ui/ProgressIndicator.tsx (ไฟล์ใหม่)
import React from 'react';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  current, 
  total, 
  showPercentage = true, 
  size = 'md', 
  color = 'blue' 
}) => {
  const percentage = Math.round((current / total) * 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  return (
    <div className="space-y-2">
      {showPercentage && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {current} จาก {total} ข้อ
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {percentage}%
          </span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <motion.div
          className={`bg-${color}-600 ${sizeClasses[size]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};