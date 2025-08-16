// ================================
// 🔧 src/hooks/index.ts
// Centralized Hooks Export with ESLint Strict Compliance
// ================================

// ================================
// CORE PERFORMANCE HOOKS
// ================================

export { 
  usePerformanceTracking,
  withPerformanceTracking,
  withAsyncPerformanceTracking,
  performanceMonitor,
  memoryMonitor,
  measurePageLoad,
  measureInteraction,
  trackResourceLoading
} from '../utils/performanceMonitor'

// ================================
// CSM-SPECIFIC HOOKS
// ================================

export { useOptimizedScoreCalculation } from './useOptimizedScore'
export { useDebouncedAutoSave } from './useDebouncedAutoSave'
export { useCSMData } from './useCSMData'

// ================================
// UI & INTERACTION HOOKS
// ================================

export { usePagination } from './usePagination'
export { useDebounce } from './useDebounce'
export { useDebouncedValue } from './useDebouncedValue'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'
export { useLocalStorage } from './useLocalStorage'
export { useVirtualList } from './useVirtualList'

// ================================
// FORM & VALIDATION HOOKS
// ================================

export { useFormValidation } from './useFormValidation'
export { useAccessibility } from './useAccessibility'

// ================================
// NETWORK & API HOOKS
// ================================

export { useOfflineSync } from './useOfflineSync'
//export { useApi } from './useApi'

// ================================
// CONTEXT HOOKS
// ================================

export { useAuth } from '../contexts/AuthContext'
export { useToast } from '../components/design'

export type {
  // Performance Types
  PerformanceEntry,
  PerformanceStats,
  MemoryUsage,
  MemoryReading,
  TimingResult,
  PerformanceMetrics,
  UsePerformanceTrackingResult,
  WithPerformanceTrackingOptions
} from '../utils/performanceMonitor'

export type {
  // Pagination Types  
  PaginationResult
} from './usePagination'

export type {
  // Virtual List Types
  VirtualListOptions,
  VirtualListResult
} from './useVirtualList'

export type {
  // Auto Save Types
  AutoSaveOptions,
  AutoSaveState
} from './useDebouncedAutoSave'


// ================================
// UTILITY EXPORTS
// ================================

export {
  // Circuit Breaker
  circuitBreaker,
  CircuitState
} from '../utils/circuitBreaker'

export {
  // Cache Service
  cacheService
} from '../utils/cacheService'


// ================================
// HOOK COMBINATIONS & COMPOSERS
// ================================

/**
 * Combined hook for CSM vendor management with performance tracking
 */
export const useCSMVendorManagement = () => {
  const csmData = useCSMData({
    enableCache: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('CSM data error:', error)
    }
  })

  const { renderCount } = usePerformanceTracking('CSMVendorManagement')
  
  const autoSave = useDebouncedAutoSave({
    delay: 2000,
    onSave: async (data: unknown) => {
      // Implementation would depend on the specific data structure
      console.log('Auto-saving CSM data:', data)
    },
    onError: (error) => {
      console.error('Auto-save error:', error)
    }
  })

  return {
    ...csmData,
    renderCount,
    autoSave: autoSave.saveData,
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved
  }
}

/**
 * Combined hook for form management with validation and auto-save
 */
export const useEnhancedForm = <T extends Record<string, unknown>>(
  initialValues: T,
  validationRules: ValidationRules,
  autoSaveOptions?: Partial<AutoSaveOptions>
) => {
  const formValidation = useFormValidation(initialValues, validationRules)
  
  const autoSave = useDebouncedAutoSave({
    delay: 1000,
    onSave: async (data: unknown) => {
      // Auto-save implementation
      console.log('Auto-saving form:', data)
    },
    ...autoSaveOptions
  })

  const accessibility = useAccessibility({
    announceErrors: true,
    focusFirstError: true
  })

  // Auto-save when form values change
  React.useEffect(() => {
    if (formValidation.isValid && Object.keys(formValidation.values).length > 0) {
      autoSave.saveData(formValidation.values)
    }
  }, [formValidation.values, formValidation.isValid, autoSave])

  return {
    ...formValidation,
    autoSave: autoSave.saveData,
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved,
    accessibility
  }
}

/**
 * Combined hook for data tables with pagination, search, and virtual scrolling
 */
export const useDataTable = <T extends { id: string }>(
  data: readonly T[],
  options: {
    readonly pageSize?: number
    readonly enableVirtualScrolling?: boolean
    readonly itemHeight?: number
    readonly searchFields?: ReadonlyArray<keyof T>
  } = {}
) => {
  const {
    pageSize = 20,
    enableVirtualScrolling = false,
    itemHeight = 60,
    searchFields = []
  } = options

  const [searchTerm, setSearchTerm] = React.useState<string>('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Filter data based on search
  const filteredData = React.useMemo((): readonly T[] => {
    if (!debouncedSearchTerm || searchFields.length === 0) {
      return data
    }

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field]
        return typeof value === 'string' && 
               value.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      })
    )
  }, [data, debouncedSearchTerm, searchFields])

  const pagination = usePagination(filteredData, pageSize)
  
  const virtualList = useVirtualList(filteredData, {
    itemHeight,
    containerHeight: 400,
    overscan: 5
  })

  const { renderCount } = usePerformanceTracking('DataTable')

  return {
    // Data
    data: enableVirtualScrolling ? filteredData : pagination.paginatedData,
    filteredData,
    totalItems: filteredData.length,
    
    // Search
    searchTerm,
    setSearchTerm,
    
    // Pagination (for non-virtual mode)
    ...pagination,
    
    // Virtual scrolling (for virtual mode)
    virtualList: enableVirtualScrolling ? virtualList : null,
    
    // Performance
    renderCount,
    
    // Options
    enableVirtualScrolling,
    pageSize
  }
}

/**
 * Combined hook for API operations with offline support and caching
 */
export const useEnhancedApi = <T>(
  endpoint: string,
  options: {
    readonly enableOfflineSync?: boolean
    readonly cacheKey?: string
    readonly refreshInterval?: number
  } = {}
) => {
  const api = useApi<T>(endpoint, {
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    ...options
  })

  const offlineSync = useOfflineSync({
    key: options.cacheKey ?? endpoint,
    syncInterval: options.refreshInterval ?? 30000,
    onSync: async () => {
      await api.refetch()
    },
    enabled: options.enableOfflineSync ?? true
  })

  return {
    ...api,
    isOnline: offlineSync.isOnline,
    syncStatus: offlineSync.syncStatus,
    lastSync: offlineSync.lastSync,
    manualSync: offlineSync.sync
  }
}

// ================================
// DEVELOPMENT UTILITIES
// ================================

/**
 * Hook for development debugging and performance monitoring
 * Only active in development mode
 */
export const useDevTools = (componentName: string) => {
  const { renderCount, metrics } = usePerformanceTracking(componentName)
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 DevTools: ${componentName}`)
      console.log('Render count:', renderCount)
      console.log('Performance metrics:', metrics)
      console.groupEnd()
    }
  }, [componentName, renderCount, metrics])

  const logEvent = React.useCallback((event: string, data?: unknown): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${componentName}:`, event, data)
    }
  }, [componentName])

  const measureOperation = React.useCallback(<TResult>(
    operationName: string,
    operation: () => TResult
  ): TResult => {
    if (process.env.NODE_ENV === 'development') {
      return performanceMonitor.measureSync(`${componentName}-${operationName}`, operation)
    }
    return operation()
  }, [componentName])

  return {
    renderCount,
    metrics,
    logEvent,
    measureOperation,
    isEnabled: process.env.NODE_ENV === 'development'
  }
}

/**
 * Hook for tracking component lifecycle and debugging
 */
export const useLifecycleLogger = (componentName: string) => {
  const mountTimeRef = React.useRef<number>(Date.now())
  const renderCountRef = React.useRef<number>(0)

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🟢 ${componentName} mounted`)
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        const lifetime = Date.now() - mountTimeRef.current
        console.log(`🔴 ${componentName} unmounted after ${lifetime}ms, ${renderCountRef.current} renders`)
      }
    }
  }, [componentName])

  React.useEffect(() => {
    renderCountRef.current += 1
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} render #${renderCountRef.current}`)
    }
  })

  return {
    mountTime: mountTimeRef.current,
    renderCount: renderCountRef.current
  }
}

// ================================
// ERROR BOUNDARY HOOKS
// ================================

/**
 * Hook for error handling with automatic reporting
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)
  const { addToast } = useToast()

  const handleError = React.useCallback((error: Error, context?: string): void => {
    console.error('Error occurred:', error, { context })
    
    // Report to performance monitor
    performanceMonitor.measureSync('error-handler', () => 0, {
      errorMessage: error.message,
      errorStack: error.stack,
      context
    })

    // Show user-friendly toast
    addToast({
      title: 'เกิดข้อผิดพลาด',
      message: 'ระบบพบปัญหา กรุณาลองใหม่อีกครั้ง',
      type: 'error'
    })

    setError(error)
  }, [addToast])

  const clearError = React.useCallback((): void => {
    setError(null)
  }, [])

  // Auto-clear error after 10 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 10000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null
  }
}

// ================================
// EXPERIMENTAL HOOKS
// ================================

/**
 * Experimental hook for real-time collaboration features
 * @experimental This hook is still in development
 */
export const useRealTimeCollaboration = (documentId: string) => {
  const [collaborators, setCollaborators] = React.useState<readonly string[]>([])
  const [isConnected, setIsConnected] = React.useState<boolean>(false)

  // This would integrate with a real-time service like Socket.IO
  React.useEffect(() => {
    // Placeholder implementation
    console.log('Initializing real-time collaboration for:', documentId)
    
    // Simulate connection
    const timer = setTimeout(() => {
      setIsConnected(true)
      setCollaborators(['user1', 'user2'])
    }, 1000)

    return () => {
      clearTimeout(timer)
      setIsConnected(false)
      setCollaborators([])
    }
  }, [documentId])

  const broadcastChange = React.useCallback((change: unknown): void => {
    if (isConnected) {
      console.log('Broadcasting change:', change)
      // Implementation would send change to other collaborators
    }
  }, [isConnected])

  return {
    collaborators,
    isConnected,
    broadcastChange
  }
}

// ================================
// IMPORTS FOR TYPE SAFETY
// ================================

import React from 'react'
import type { ValidationRules } from './useFormValidation'
import type { AutoSaveOptions } from './useDebouncedAutoSave'

// ================================
// DEFAULT EXPORT
// ================================

export default {
  // Core hooks
  usePerformanceTracking,
  useCSMVendorManagement,
  useEnhancedForm,
  useDataTable,
  useEnhancedApi,
  
  // Development utilities
  useDevTools,
  useLifecycleLogger,
  useErrorHandler,
  
  // Experimental
  useRealTimeCollaboration
} as const