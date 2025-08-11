// src/hooks/formHooks.ts - Part 1: Utility Hooks
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormDoc, EnhancedFilterState,PaginationState,FieldValidationResult,FormValidationResult } from '../types';
import { formatDate } from '../utils/dateUtils';
import type { DateInput } from '../utils/dateUtils';

// =================== UTILITY HOOKS ===================
export function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// =================== UTILITY HOOKS (ปรับปรุงใหม่เพื่อแก้ warning) ===================
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  // dependencies ไม่ใช่ parameter ของ hook อีกต่อไป
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ฟังก์ชัน retry ที่ถูกห่อด้วย useCallback
  const retry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [operation]); // Dependency array มีแค่ operation เท่านั้น

  // useEffect ที่ใช้ retry เป็น dependency
  useEffect(() => {
    retry();
  }, [retry]);

  return { data, loading, error, retry };
}


// =================== PAGINATION HOOK ===================
export function usePagination<T>(
  items: T[], 
  itemsPerPage: number = 12
): {
  currentItems: T[];
  pagination: PaginationState;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
} {
  const [currentPage, setCurrentPage] = useState(1);

  const pagination = useMemo<PaginationState>(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage,
      hasPrevPage
    };
  }, [items.length, itemsPerPage, currentPage]);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    const clampedPage = Math.max(1, Math.min(page, pagination.totalPages));
    setCurrentPage(clampedPage);
  }, [pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination.hasNextPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination.hasPrevPage]);

  // Reset to page 1 when items change significantly
  useEffect(() => {
    if (currentPage > pagination.totalPages && pagination.totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, pagination.totalPages]);

  return {
    currentItems,
    pagination,
    goToPage,
    nextPage,
    prevPage
  };
}

// =================== UTILITY FUNCTIONS ===================
export function safeFormatDate(dateValue: unknown): string {
  try {
    if (!dateValue) return 'ไม่ระบุ';
    return formatDate(dateValue as DateInput);
  } catch {
    return 'ไม่ระบุ';
  }
}

export function generateFormCode(title: string): string {
  return title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 20);
}

export function validateFormCode(code: string): { isValid: boolean; error?: string } {
  if (!code.trim()) {
    return { isValid: false, error: 'Form code is required' };
  }
  
  if (!/^[A-Z0-9_-]+$/i.test(code)) {
    return { isValid: false, error: 'Form code must contain only letters, numbers, underscores, and hyphens' };
  }
  
  if (code.length < 2) {
    return { isValid: false, error: 'Form code must be at least 2 characters long' };
  }
  
  if (code.length > 50) {
    return { isValid: false, error: 'Form code must be less than 50 characters' };
  }
  
  return { isValid: true };
}

export function getFormStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    published: 'bg-green-100 text-green-800 border-green-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return statusColors[status] || statusColors.draft;
}

export function getFieldTypeIcon(type: string): string {
  const typeIcons: Record<string, string> = {
    text: '📝',
    textarea: '📄',
    email: '📧',
    phone: '📞',
    number: '🔢',
    date: '📅',
    radio: '🔘',
    checkbox: '☑️',
    select: '📋',
    file: '📎',
    rating: '⭐',
    yesno: '',
    signature: '✍️'
  };
  
  return typeIcons[type] || '❓';
}

// =================== FORM FILTER HOOK ===================
export function useFormFilter(
  forms: FormDoc[], 
  filter: EnhancedFilterState, 
  searchTerm: string
): FormDoc[] {
  return useMemo(() => {
    let filtered = forms.filter(form => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          form.formTitle.toLowerCase().includes(searchLower) ||
          form.formCode.toLowerCase().includes(searchLower) ||
          form.formDescription?.toLowerCase().includes(searchLower) ||
          form.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          form.createdBy.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filter.status !== 'all') {
        if (filter.status === 'active' && !form.isActive) return false;
        if (filter.status === 'inactive' && form.isActive) return false;
        if (filter.status !== 'active' && filter.status !== 'inactive' && form.status !== filter.status) return false;
      }

      // Category filter
      if (filter.category !== 'all' && form.category !== filter.category) return false;

      // Applicable to filter
      if (filter.applicableTo !== 'all' && !form.applicableTo.includes(filter.applicableTo)) return false;

      // Has attachments filter
      if (filter.hasAttachments !== 'all') {
        const hasAttachments = form.allowAttach || 
          form.fields.some(field => field.allowAttach);
        if (filter.hasAttachments === 'yes' && !hasAttachments) return false;
        if (filter.hasAttachments === 'no' && hasAttachments) return false;
      }

      // Created by filter
      if (filter.createdBy !== 'all' && form.createdBy !== filter.createdBy) return false;

      // Tags filter
      if (filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => form.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Date range filter
      if (filter.dateRange !== 'all') {
        const now = new Date();
        const formDate = new Date(form.updatedAt as string);
        
        // แก้ไข Lexical declaration in case block
        const oneDay = 24 * 60 * 60 * 1000;
        const weekAgo = new Date(now.getTime() - 7 * oneDay);
        const monthAgo = new Date(now.getTime() - 30 * oneDay);
        const yearAgo = new Date(now.getTime() - 365 * oneDay);
        
        switch (filter.dateRange) {
          case 'today':
            if (formDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            if (formDate < weekAgo) return false;
            break;
          case 'month':
            if (formDate < monthAgo) return false;
            break;
          case 'year':
            if (formDate < yearAgo) return false;
            break;
        }
      }

      return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (filter.sortBy) {
        case 'title':
          aValue = a.formTitle.toLowerCase();
          bValue = b.formTitle.toLowerCase();
          break;
        case 'code':
          aValue = a.formCode.toLowerCase();
          bValue = b.formCode.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt as string).getTime();
          bValue = new Date(b.createdAt as string).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt as string).getTime();
          bValue = new Date(b.updatedAt as string).getTime();
          break;
        case 'submissions':
          aValue = a.analytics?.submitCount || 0;
          bValue = b.analytics?.submitCount || 0;
          break;
        default:
          return 0;
      }

      if (filter.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [forms, searchTerm, filter]);
}

// =================== FORM SUGGESTIONS HOOK ===================
export function useFormSuggestions(forms: FormDoc[]): string[] {
  return useMemo(() => {
    const suggestions = new Set<string>();
    forms.forEach(form => {
      suggestions.add(form.formTitle);
      suggestions.add(form.formCode);
      form.tags.forEach(tag => suggestions.add(tag));
      if (form.createdBy) {
        suggestions.add(form.createdBy);
        // Extract username from email
        const username = form.createdBy.split('@')[0];
        if (username) suggestions.add(username);
      }
    });
    return Array.from(suggestions).slice(0, 20); // Limit suggestions
  }, [forms]);
}

// =================== FORM VALIDATION HOOK ===================
export function useFormValidation(form: Partial<FormDoc>): FormValidationResult {
  return useMemo(() => {
    const fieldResults: Record<string, FieldValidationResult> = {};
    const generalErrors: string[] = [];
    let overallValid = true;

    // Validate form metadata
    if (!form.formCode?.trim()) {
      generalErrors.push('Form code is required');
      overallValid = false;
    }

    if (!form.formTitle?.trim()) {
      generalErrors.push('Form title is required');
      overallValid = false;
    }

    if (form.formCode && !/^[A-Z0-9_-]+$/i.test(form.formCode)) {
      generalErrors.push('Form code must contain only letters, numbers, underscores, and hyphens');
      overallValid = false;
    }

    // Validate fields
    if (form.fields) {
      form.fields.forEach((field, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!field.ckQuestion?.trim()) {
          errors.push('Question is required');
        }

        if (field.fScore && (isNaN(Number(field.fScore)) || Number(field.fScore) <= 0)) {
          errors.push('Score must be a positive number');
        }

        if (field.type === 'email' && field.validationRules) {
          const hasEmailValidation = field.validationRules.some(rule => rule.type === 'email');
          if (!hasEmailValidation) {
            warnings.push('Email field should have email validation');
          }
        }

        if (field.required && !field.validationRules?.some(rule => rule.type === 'required')) {
          warnings.push('Required field should have required validation rule');
        }

        const isFieldValid = errors.length === 0;
        fieldResults[field.id || index.toString()] = {
          isValid: isFieldValid,
          errors,
          warnings
        };

        if (!isFieldValid) {
          overallValid = false;
        }
      });
    }

    // Calculate scores
    const totalFields = form.fields?.length || 0;
    const validFields = Object.values(fieldResults).filter(result => result.isValid).length;
    const accessibilityScore = totalFields > 0 ? (validFields / totalFields) * 100 : 0;

    const hasDescriptions = form.fields?.filter(field => field.helpText).length || 0;
    const usabilityScore = totalFields > 0 ? (hasDescriptions / totalFields) * 100 : 0;

    const performanceScore = Math.max(0, 100 - (totalFields * 2)); // Penalty for too many fields
    const overallScore = (accessibilityScore + usabilityScore + performanceScore) / 3;

    //  สร้าง errors object จาก fieldResults และ generalErrors
    const errors: Record<string, string> = {};
    
    // เพิ่ม general errors
    generalErrors.forEach((error, index) => {
      errors[`general_${index}`] = error;
    });
    
    // เพิ่ม field errors
    Object.entries(fieldResults).forEach(([fieldId, result]) => {
      if (result.errors.length > 0) {
        errors[fieldId] = result.errors.join(', ');
      }
    });

    return {
      isValid: overallValid,
      fieldResults,
      generalErrors,
      errors, //  เพิ่ม property นี้
      score: {
        accessibility: Math.round(accessibilityScore),
        usability: Math.round(usabilityScore),
        performance: Math.round(performanceScore),
        overall: Math.round(overallScore)
      }
    };
  }, [form]);
}

// =================== FORM STATS HOOK ===================
export function useFormStats(forms: FormDoc[]): {
  total: number;
  active: number;
  published: number;
  totalSubmissions: number;
  avgConversion: string;
  recentlyUpdated: number;
  withAttachments: number;
} {
  return useMemo(() => {
    const total = forms.length;
    const active = forms.filter(f => f.isActive).length;
    const published = forms.filter(f => f.status === 'published').length;
    const totalSubmissions = forms.reduce((sum, f) => sum + (f.analytics?.submitCount || 0), 0);
    const avgConversion = total > 0 
      ? (forms.reduce((sum, f) => sum + (f.analytics?.conversionRate || 0), 0) / total).toFixed(1)
      : '0.0';

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyUpdated = forms.filter(f => 
      new Date(f.updatedAt as string) > weekAgo
    ).length;

    const withAttachments = forms.filter(f => 
      f.allowAttach || f.fields.some(field => field.allowAttach)
    ).length;

    return {
      total,
      active,
      published,
      totalSubmissions,
      avgConversion,
      recentlyUpdated,
      withAttachments
    };
  }, [forms]);
}

// =================== FORM SCORE CALCULATION ===================
export function calculateFormScore(form: FormDoc): number {
  const analytics = form.analytics;
  if (!analytics) return 0;
  
  const submissionScore = Math.min((analytics.submitCount / 100) * 30, 30);
  const conversionScore = (analytics.conversionRate || 0) * 0.4;
  const completionScore = analytics.averageCompletionTime ? 
    Math.max(30 - (analytics.averageCompletionTime / 60), 0) : 0;
  
  return Math.round(submissionScore + conversionScore + completionScore);
}