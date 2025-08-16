// ========================================
// 📁 src/hooks/index.ts - Fixed Complete Hooks Export
// ========================================

// ========================================
// BASIC UTILITY HOOKS
// ========================================

export { useDebounce } from './useDebounce';
export { useDebouncedValue } from './useDebouncedValue';
export { useLocalStorage } from './useLocalStorage';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// ========================================
// PERFORMANCE & MONITORING HOOKS
// ========================================

export { usePerformanceMonitor } from './usePerformanceMonitor';

// ========================================
// API & DATA MANAGEMENT HOOKS
// ========================================

export { useApi } from './useApi';
export { useOfflineSync } from './useOfflineSync';
export { useDebouncedAutoSave } from './useDebouncedAutoSave';

// ========================================
// UI & FORM HOOKS
// ========================================

export { usePagination } from './usePagination';
export { useVirtualList } from './useVirtualList';
export { useFormValidation } from './useFormValidation';
export { useAccessibility } from './useAccessibility';
export { useToast } from './useToast';

// ========================================
// DOMAIN-SPECIFIC HOOKS
// ========================================

export { useOptimizedScore } from './useOptimizedScore';
export { useCSMData } from './useCSMData';
export { useEmployeeData } from './useEmployeeData';
export { useFormData } from './useFormData';

// ========================================
// CONTEXT HOOKS (Re-export from contexts)
// ========================================

export { useAuth } from '../contexts/AuthContext';

// ========================================
// TYPE EXPORTS
// ========================================

export type {
  // Basic utility types
  UseDebounceOptions,
  UseLocalStorageReturn,
  KeyboardShortcutMap,
  UseKeyboardShortcutsOptions,
  
  // Performance monitoring types
  PerformanceMetrics,
  UsePerformanceTrackingResult,
  
  // API & data types
  UseApiOptions,
  UseApiResult,
  OfflineSyncResult,
  AutoSaveOptions,
  AutoSaveState,
  
  // UI & form types
  PaginationResult,
  VirtualListOptions,
  VirtualListResult,
  FormValidationOptions,
  UseFormValidationResult,
  AccessibilityOptions,
  UseAccessibilityResult,
  Toast,
  UseToastResult,
  
  // Domain-specific types
  ScoreCalculationOptions,
  UseOptimizedScoreResult,
  CSMDataOptions,
  CSMDataResult,
  EmployeeDataOptions,
  EmployeeDataResult,
  FormDataOptions,
  FormDataResult
} from './types';

// Import types for internal use
import type {
  AutoSaveOptions,
  AccessibilityOptions
} from './types';

// ========================================
// COMPOSITE HOOKS - Import React for hook compositions
// ========================================

import React, { useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';
import { usePagination } from './usePagination';
import { useVirtualList } from './useVirtualList';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { useDebouncedAutoSave } from './useDebouncedAutoSave';
import { useFormValidation } from './useFormValidation';
import { useAccessibility } from './useAccessibility';
import { useApi } from './useApi';
import { useOfflineSync } from './useOfflineSync';
import { useCSMData } from './useCSMData';
import { useEmployeeData } from './useEmployeeData';

/**
 * Enhanced Data Table Hook - Combines search, pagination, and virtual scrolling
 */
export const useDataTable = <T extends { id: string }>(
  data: T[],
  options: {
    pageSize?: number;
    enableVirtualScrolling?: boolean;
    itemHeight?: number;
    searchFields?: Array<keyof T>;
    enableSearch?: boolean;
    enablePerformanceTracking?: boolean;
  } = {}
) => {
  const {
    pageSize = 20,
    enableVirtualScrolling = false,
    itemHeight = 60,
    searchFields = [],
    enableSearch = true,
    enablePerformanceTracking = true
  } = options;

  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Performance tracking
  const { renderCount, markRender } = enablePerformanceTracking 
    ? usePerformanceMonitor('DataTable')
    : { renderCount: 0, markRender: () => {} };

  // Filter data based on search
  const filteredData = useMemo((): T[] => {
    markRender();
    
    if (!enableSearch || !debouncedSearchTerm || searchFields.length === 0) {
      return data;
    }

    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        return typeof value === 'string' && 
               value.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      })
    );
  }, [data, debouncedSearchTerm, searchFields, enableSearch, markRender]);

  // Pagination for non-virtual mode
  const pagination = usePagination(filteredData, pageSize);

  // Virtual list for virtual mode
  const virtualList = useVirtualList({
    items: filteredData,
    itemHeight,
    containerHeight: 400,
    overscan: 5
  });

  const displayData = enableVirtualScrolling ? filteredData : pagination.paginatedItems;

  return {
    // Data
    data: displayData,
    filteredData,
    totalItems: filteredData.length,
    
    // Search
    searchTerm,
    setSearchTerm,
    isSearching: debouncedSearchTerm !== searchTerm,
    
    // Pagination (for non-virtual mode)
    pagination: enableVirtualScrolling ? null : pagination,
    
    // Virtual scrolling (for virtual mode)
    virtualList: enableVirtualScrolling ? virtualList : null,
    
    // Performance
    renderCount,
    
    // Configuration
    options: {
      enableVirtualScrolling,
      enableSearch,
      pageSize,
      itemHeight,
      searchFields
    }
  };
};

/**
 * Enhanced Form Hook - Combines validation, auto-save, and accessibility
 */
export const useEnhancedForm = <T extends Record<string, unknown>>(
  initialValues: T,
  options: {
    validationRules?: any;
    autoSaveOptions?: Partial<AutoSaveOptions>;
    accessibilityOptions?: AccessibilityOptions;
  } = {}
) => {
  const {
    validationRules,
    autoSaveOptions,
    accessibilityOptions
  } = options;

  const [values, setValues] = React.useState<T>(initialValues);

  // Form validation
  const validation = useFormValidation(values, validationRules || {});

  // Auto-save functionality
  const autoSave = useDebouncedAutoSave({
    delay: 2000,
    onSave: async (data: unknown) => {
      console.log('Auto-saving form:', data);
    },
    ...autoSaveOptions
  });

  // Accessibility features
  const accessibility = useAccessibility({
    announceErrors: true,
    focusFirstError: true,
    ...accessibilityOptions
  });

  const updateField = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateFields = useCallback((updates: Partial<T>) => {
    setValues(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    validation.clearErrors();
  }, [initialValues, validation]);

  return {
    // Form state
    formValues: values, // ✅ เปลี่ยนชื่อเพื่อไม่ซ้ำกับ validation.values
    updateField,
    updateFields,
    resetFormValues: resetForm, // ✅ เปลี่ยนชื่อเพื่อไม่ซ้ำกับ validation.resetForm
    
    // Validation (spread มาจาก useFormValidation)
    ...validation,
    
    // Auto-save
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved,
    saveNow: () => autoSave.saveData(values),
    
    // Accessibility
    accessibility
  };
};

/**
 * Enhanced API Hook - Combines caching, offline support, and error recovery
 */
export const useEnhancedApi = <T>(
  endpoint: string,
  options: {
    enableOfflineSync?: boolean;
    cacheKey?: string;
    refreshInterval?: number;
    retryAttempts?: number;
    cacheTime?: number;
    enablePolling?: boolean;
    pollingInterval?: number;
  } = {}
) => {
  const {
    enableOfflineSync = false,
    cacheKey,
    refreshInterval = 30000,
    retryAttempts = 3,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    enablePolling = false,
    pollingInterval = 30000
  } = options;

  // API hook
  const api = useApi<T>(endpoint, {
    cacheTime,
    retryAttempts,
    enablePolling,
    pollingInterval
  });

  // Offline sync
  const offlineSync = useOfflineSync({
    key: cacheKey ?? endpoint,
    syncInterval: refreshInterval,
    onSync: async () => {
      await api.refetch();
    },
    enabled: enableOfflineSync
  });

  // Performance tracking
  const { markApiCall } = usePerformanceMonitor('API');

  const enhancedRefetch = useCallback(async () => {
    markApiCall(endpoint);
    return api.refetch();
  }, [api, endpoint, markApiCall]);

  return {
    // API state
    ...api,
    refetch: enhancedRefetch,
    
    // Offline support
    isOnline: offlineSync.isOnline,
    syncStatus: offlineSync.syncStatus,
    lastSync: offlineSync.lastSync,
    manualSync: offlineSync.sync,
    
    // Configuration
    options: {
      enableOfflineSync,
      enablePolling,
      cacheTime,
      retryAttempts
    }
  };
};

/**
 * CSM Management Hook - Specialized for CSM operations
 */
export const useCSMManagement = (options: {
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  enablePerformanceTracking?: boolean;
} = {}) => {
  const {
    enableAutoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    enablePerformanceTracking = true
  } = options;

  // CSM data with proper type handling
  const csmDataOptions = {
    enableCache: true,
    ...(enableAutoRefresh && refreshInterval && { refreshInterval }), // ✅ เงื่อนไขเพื่อหลีกเลี่ยง undefined
    onError: (error: Error) => {
      console.error('CSM data error:', error);
    }
  };

  const csmData = useCSMData(csmDataOptions);

  // Performance tracking
  const performance = enablePerformanceTracking 
    ? usePerformanceMonitor('CSMManagement')
    : null;

  // Auto-save for assessment changes
  const autoSave = useDebouncedAutoSave({
    delay: 2000,
    onSave: async (data: unknown) => {
      console.log('Auto-saving CSM data:', data);
    },
    onError: (error) => {
      console.error('Auto-save error:', error);
    }
  });

  return {
    // CSM data
    ...csmData,
    
    // Auto-save
    saveAssessment: autoSave.saveData,
    isSaving: autoSave.isSaving,
    lastSaved: autoSave.lastSaved,
    
    // Performance
    renderCount: performance?.renderCount ?? 0,
    
    // Configuration
    options: {
      enableAutoRefresh,
      enablePerformanceTracking,
      refreshInterval
    }
  };
};

/**
 * Employee Management Hook - Specialized for employee operations
 */
export const useEmployeeManagement = (options: {
  enableSearch?: boolean;
  searchFields?: string[];
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
} = {}) => {
  const {
    enableSearch = true,
    searchFields = ['firstName', 'lastName', 'email', 'empId'],
    enableFiltering = true,
    enablePagination = true,
    pageSize = 20
  } = options;

  // Employee data
  const employeeData = useEmployeeData({
    enableCache: true,
    onError: (error) => {
      console.error('Employee data error:', error);
    }
  });

  // Data table functionality
  const dataTable = useDataTable(employeeData.employees || [], {
    pageSize,
    searchFields: searchFields as Array<keyof typeof employeeData.employees[0]>,
    enableSearch,
    enablePerformanceTracking: true
  });

  return {
    // Employee data
    ...employeeData,
    
    // Data table
    ...dataTable,
    
    // Configuration
    options: {
      enableSearch,
      enableFiltering,
      enablePagination,
      pageSize,
      searchFields
    }
  };
};

/**
 * Development Hook for Debugging and Performance Monitoring
 */
export const useDevTools = (componentName: string, options: {
  enableLogging?: boolean;
  enablePerformanceTracking?: boolean;
  enableMemoryTracking?: boolean;
} = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    enablePerformanceTracking = true,
    enableMemoryTracking = false
  } = options;

  const { renderCount, metrics } = enablePerformanceTracking 
    ? usePerformanceMonitor(componentName)
    : { renderCount: 0, metrics: {} };

  React.useEffect(() => {
    if (enableLogging) {
      console.group(`🔍 DevTools: ${componentName}`);
      console.log('Render count:', renderCount);
      console.log('Performance metrics:', metrics);
      console.groupEnd();
    }
  }, [componentName, renderCount, metrics, enableLogging]);

  const logEvent = React.useCallback((event: string, data?: unknown) => {
    if (enableLogging) {
      console.log(`[${componentName}] ${event}:`, data);
    }
  }, [componentName, enableLogging]);

  const memoryUsage = React.useMemo(() => {
    if (!enableMemoryTracking) return null;
    
    // Check if performance.memory exists (Chrome-specific)
    const perfMemory = (performance as any).memory;
    if (!perfMemory) return null;
    
    return {
      used: Math.round(perfMemory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(perfMemory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(perfMemory.jsHeapSizeLimit / 1024 / 1024)
    };
  }, [enableMemoryTracking]);

  return {
    renderCount,
    metrics,
    memoryUsage,
    logEvent,
    options: {
      enableLogging,
      enablePerformanceTracking,
      enableMemoryTracking
    }
  };
};

// ========================================
// LEGACY SUPPORT & DEPRECATION WARNINGS
// ========================================

/**
 * @deprecated Use useDataTable instead
 */
export const useAdvancedDataTable = useDataTable;

/**
 * @deprecated Use useEnhancedForm instead
 */
export const useAdvancedForm = useEnhancedForm;

/**
 * @deprecated Use useEnhancedApi instead
 */
export const useAdvancedApi = useEnhancedApi;