// src/hooks/useDebouncedAutoSave.ts (แก้ไข TypeScript Strict)
// ================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutoSaveOptions {
  readonly delay?: number;
  readonly enabled?: boolean;
  readonly onSuccess?: () => void;
  readonly onError?: (error: Error) => void;
}

export interface AutoSaveState {
  readonly isSaving: boolean;
  readonly lastSaved: Date | null;
  readonly error: Error | null;
  readonly hasUnsavedChanges: boolean;
}

interface AutoSaveResult extends AutoSaveState {
  readonly forceSave: () => void;
}

export const useDebouncedAutoSave = <T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
): AutoSaveResult => {
  const {
    delay = 2000,
    enabled = true,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDataRef = useRef<T>(data);
  const savingRef = useRef<boolean>(false);

  const save = useCallback(async (dataToSave: T): Promise<void> => {
    if (savingRef.current) return;

    savingRef.current = true;
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      await saveFunction(dataToSave);
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        error: null
      }));
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Auto-save failed');
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: err
      }));
      onError?.(err);
    } finally {
      savingRef.current = false;
    }
  }, [saveFunction, onSuccess, onError]);

  const forceSave = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    void save(data);
  }, [data, save]);

  useEffect(() => {
    if (!enabled) return;

    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    
    if (hasChanged) {
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
      previousDataRef.current = data;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void save(data);
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return {
    ...state,
    forceSave
  };
};