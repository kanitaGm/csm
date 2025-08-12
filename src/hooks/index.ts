// ไฟล์: src/hooks/index.ts
// ================================
// Re-export existing hooks ที่ไม่ได้แก้ไข
export { useToast } from './useToast';
export { useAuth } from '../contexts/AuthContext';
//export { useApi } from './useApi';
export { useFormValidation } from './useFormValidation';
export { usePagination } from './usePagination';
export { useAccessibility } from './useAccessibility';

// Enhanced CSM-specific hooks (ใหม่/ปรับปรุงแล้ว)
export { useOptimizedScoreCalculation } from './useOptimizedScore';
export { useDebouncedAutoSave } from './useDebouncedAutoSave';
export { useVirtualList } from './useVirtualList';
export { useDebouncedValue } from './useDebouncedValue';
export { useCSMData } from './useCSMData';

// Performance and monitoring hooks (ใหม่)
export { usePerformanceTracking } from '../utils/performanceMonitor';

// Enhanced existing hooks (ปรับปรุงแล้ว)
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useLocalStorage } from './useLocalStorage';

// Performance-related hooks and utilities
export { usePerformanceMonitor } from './usePerformanceMonitor';
export { useOfflineSync } from './useOfflineSync';

// Type exports for better TypeScript integration
/*
export type {
  ScoreCalculation,
  AutoSaveOptions,
  AutoSaveState,
  VirtualListOptions,
  VirtualListResult
} from './types';
 */

// Utility functions that work with hooks
export {
  withPerformanceTracking,
  withSyncPerformanceTracking
} from '../utils/performanceMonitor';

export {
  circuitBreaker,
  CircuitState
} from '../utils/circuitBreaker';

export {
  cacheService
} from '../utils/cacheService';