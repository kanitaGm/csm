// ================================
// Updated Hooks Index with All Exports
// ไฟล์: src/hooks/index.ts
// ================================
// Core CSM-specific hooks
export { useCSMData } from './useCSMData';
export { useDebouncedValue } from './useDebouncedValue';
export { useVirtualList } from './useVirtualList';

// Enhanced CSM-specific hooks (ใหม่/ปรับปรุงแล้ว)
export { useOptimizedScoreCalculation } from './useOptimizedScore';
export { useDebouncedAutoSave } from './useDebouncedAutoSave';


// UI และ Interaction hooks
export { usePagination } from './usePagination';
export { useDebounce } from './useDebounce';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useLocalStorage } from './useLocalStorage';

// Performance and monitoring hooks
export { usePerformanceTracking } from '../utils/performanceMonitor';
export { useOfflineSync } from './useOfflineSync';

// Re-export existing hooks (backward compatibility)
export { useToast } from './useToast';
export { useAuth } from '../contexts/AuthContext';
//export { useApi } from './useApi';
export { useFormValidation } from './useFormValidation';
export { useAccessibility } from './useAccessibility';

// Type exports for better TypeScript integration
export type {
  //ScoreCalculation,
  //AutoSaveOptions,
  //AutoSaveState,
  //VirtualListOptions,
  //VirtualListResult,
  //PaginationResult
} from './useOptimizedScore';

// เพิ่ม type exports สำหรับ pagination
export type { PaginationResult } from './usePagination';

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

