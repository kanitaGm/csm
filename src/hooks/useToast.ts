// ========================================
// 📁 src/hooks/useToast.ts
// ========================================

import { useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  readonly id: string;
  readonly title?: string;
  readonly message: string;
  readonly type: 'success' | 'error' | 'warning' | 'info';
  readonly duration?: number;
  readonly dismissible?: boolean;
  readonly action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastResult {
  readonly toasts: readonly Toast[];
  readonly addToast: (toast: Omit<Toast, 'id'>) => string;
  readonly removeToast: (id: string) => void;
  readonly clearAllToasts: () => void;
  readonly updateToast: (id: string, updates: Partial<Toast>) => void;
}

export const useToast = (): UseToastResult => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addToast = useCallback((toastData: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toastData.duration ?? 5000;
    
    const toast: Toast = {
      id,
      dismissible: true,
      ...toastData
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss toast after duration
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(id);
      }, duration);
      
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    
    // Clear timeout if exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const clearAllToasts = useCallback((): void => {
    setToasts([]);
    
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>): void => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    updateToast
  };
};