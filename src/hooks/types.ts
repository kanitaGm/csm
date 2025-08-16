// ========================================
// 📁 src/hooks/types.ts - Simplified Hook Types
// ========================================

import type { FormValidationResult, FieldValidationResult } from '../types/filters';
import type { Score, CSMVendor, CSMAssessment,EmployeeProfile , FormDoc
  } from '../types';

// ========================================
// BASIC UTILITY TYPES
// ========================================

export interface UseDebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((val: T) => T)) => void,
  () => void
];

export type KeyboardShortcutMap = Record<string, (event: KeyboardEvent) => void>;

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: HTMLElement | Document;
}

// ========================================
// PERFORMANCE TYPES
// ========================================

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface UsePerformanceTrackingResult {
  metrics: PerformanceMetrics;
  renderCount: number;
  markRender: () => void;
  markApiCall: (endpoint: string) => void;
  getReport: () => string;
}

// ========================================
// API TYPES
// ========================================

export interface UseApiOptions {
  cacheTime?: number;
  retryAttempts?: number;
  enablePolling?: boolean;
  pollingInterval?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
  lastFetch: Date | null;
}

export interface AutoSaveOptions {
  delay: number;
  onSave: (data: unknown) => Promise<void>;
  onError?: (error: Error) => void;
  maxRetries?: number;
  enabled?: boolean;
}

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  retryCount: number;
  saveData: (data: unknown) => void;
  forceSave: () => Promise<void>;
}

export interface OfflineSyncResult {
  isOnline: boolean;
  pendingActions: unknown[];
  isSyncing: boolean;
  syncErrors: string[];
  lastSync: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  addAction: (action: unknown) => void;
  sync: () => Promise<void>;
  clearSyncErrors: () => void;
}

// ========================================
// UI TYPES
// ========================================

export interface PaginationResult<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export interface VirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualListResult<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  visibleItems: Array<{ item: T; index: number }>;
  scrollToIndex: (index: number) => void;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastResult {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

// ========================================
// FORM TYPES
// ========================================

export type ValidationRule<T> = {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown, allValues: T) => string | null;
  message?: string;
};

export type FormValidationOptions<T> = {
  [K in keyof T]?: ValidationRule<T>;
};

export interface UseFormValidationResult<T> {
  values: T;
  errors: Record<keyof T, string>;
  isValid: boolean;
  isDirty: boolean;
  touchedFields: Set<keyof T>;
  validateField: (field: keyof T, value: unknown) => FieldValidationResult;
  validateForm: () => FormValidationResult;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: keyof T, error: string) => void;
  clearFieldError: (field: keyof T) => void;
  clearErrors: () => void;
  markFieldTouched: (field: keyof T) => void;
  resetForm: () => void;
}

export interface AccessibilityOptions {
  announceErrors?: boolean;
  focusFirstError?: boolean;
  enableKeyboardNav?: boolean;
  trapFocus?: boolean;
}

export interface UseAccessibilityResult {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusFirstError: () => void;
  setupFocusTrap: (containerRef: React.RefObject<HTMLElement>) => void;
  cleanupFocusTrap: () => void;
}

// ========================================
// DOMAIN-SPECIFIC TYPES
// ========================================

export interface ScoreCalculationOptions {
  weights?: Record<string, number>;
  scalingFactor?: number;
  enableCaching?: boolean;
}

export interface UseOptimizedScoreResult {
  calculateScore: (answers: Record<string, unknown>) => Score;
  calculateTotalScore: (scores: Score[]) => number;
  getScoreBreakdown: (answers: Record<string, unknown>) => Record<string, number>;
  isScoreValid: (score: Score) => boolean;
}

export interface CSMDataOptions {
  enableCache?: boolean;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

export interface CSMDataResult {
  vendors: CSMVendor[];
  assessments: CSMAssessment[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addVendor: (vendor: Omit<CSMVendor, 'id'>) => Promise<void>;
  updateVendor: (id: string, updates: Partial<CSMVendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
}

export interface EmployeeDataOptions {
  enableCache?: boolean;
  onError?: (error: Error) => void;
}

export interface EmployeeDataResult {
  employees: EmployeeProfile[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addEmployee: (employee: Omit<EmployeeProfile, 'id'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<EmployeeProfile>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  searchEmployees: (query: string) => EmployeeProfile[];
}

export interface FormDataOptions {
  enableCache?: boolean;
  onError?: (error: Error) => void;
}

export interface FormDataResult {
  forms: FormDoc[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createForm: (form: Omit<FormDoc, 'id'>) => Promise<void>;
  updateForm: (id: string, updates: Partial<FormDoc>) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  duplicateForm: (id: string) => Promise<void>;
  searchForms: (query: string) => FormDoc[];
}