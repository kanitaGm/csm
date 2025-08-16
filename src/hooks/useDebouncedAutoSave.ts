// ========================================
// 📁 src/hooks/useDebouncedAutoSave.ts
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutoSaveOptions {
  readonly delay: number;
  readonly onSave: (data: unknown) => Promise<void>;
  readonly onError?: (error: Error) => void;
  readonly maxRetries?: number;
  readonly enabled?: boolean;
}

export interface AutoSaveState {
  readonly isSaving: boolean;
  readonly lastSaved: Date | null;
  readonly error: Error | null;
  readonly retryCount: number;
  readonly saveData: (data: unknown) => void;
  readonly forceSave: () => Promise<void>;
}

export const useDebouncedAutoSave = (options: AutoSaveOptions): AutoSaveState => {
  const {
    delay,
    onSave,
    onError,
    maxRetries = 3,
    enabled = true
  } = options;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<unknown>(null);
  const isComponentMountedRef = useRef<boolean>(true);

  const performSave = useCallback(async (data: unknown, attempt = 0): Promise<void> => {
    if (!enabled || !isComponentMountedRef.current) return;

    try {
      setIsSaving(true);
      setError(null);
      
      await onSave(data);
      
      if (isComponentMountedRef.current) {
        setLastSaved(new Date());
        setRetryCount(0);
        pendingDataRef.current = null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Auto-save failed');
      
      if (attempt < maxRetries) {
        // Exponential backoff retry
        const retryDelay = Math.pow(2, attempt) * 1000;
        setTimeout(() => {
          if (isComponentMountedRef.current) {
            setRetryCount(attempt + 1);
            void performSave(data, attempt + 1);
          }
        }, retryDelay);
      } else {
        if (isComponentMountedRef.current) {
          setError(error);
          setRetryCount(0);
          onError?.(error);
        }
      }
    } finally {
      if (isComponentMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [enabled, onSave, maxRetries, onError]);

  const saveData = useCallback((data: unknown): void => {
    if (!enabled) return;

    pendingDataRef.current = data;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current !== null && isComponentMountedRef.current) {
        void performSave(pendingDataRef.current);
      }
    }, delay);
  }, [enabled, delay, performSave]);

  const forceSave = useCallback(async (): Promise<void> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingDataRef.current !== null) {
      await performSave(pendingDataRef.current);
    }
  }, [performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
    retryCount,
    saveData,
    forceSave
  };
};