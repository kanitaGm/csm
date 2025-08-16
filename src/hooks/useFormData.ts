// ========================================
// 📁 src/hooks/useFormData.ts
// ========================================

import { useState, useCallback } from 'react';
import type { FormDoc } from '../types/forms';
import { useApi } from './useApi';

export interface FormDataOptions {
  readonly enableCache?: boolean;
  readonly onError?: (error: Error) => void;
}

export interface FormDataResult {
  readonly forms: FormDoc[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refresh: () => Promise<void>;
  readonly createForm: (form: Omit<FormDoc, 'id'>) => Promise<void>;
  readonly updateForm: (id: string, updates: Partial<FormDoc>) => Promise<void>;
  readonly deleteForm: (id: string) => Promise<void>;
  readonly duplicateForm: (id: string) => Promise<void>;
  readonly searchForms: (query: string) => FormDoc[];
}

export const useFormData = (options: FormDataOptions = {}): FormDataResult => {
  const { enableCache = true, onError } = options;
  
  const [forms, setForms] = useState<FormDoc[]>([]);

  const apiOptions = {
    cacheTime: enableCache ? 5 * 60 * 1000 : 0,
    onSuccess: (data: unknown) => setForms((data as FormDoc[]) || []),
    ...(onError && { onError }) // เฉพาะเมื่อมีค่า  
  };

  const api = useApi<FormDoc[]>('/api/employees', apiOptions);

  const createForm = useCallback(async (form: Omit<FormDoc, 'id'>): Promise<void> => {
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error(`Failed to create form: ${response.statusText}`);
      }

      await api.refetch();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [api, onError]);

  const updateForm = useCallback(async (id: string, updates: Partial<FormDoc>): Promise<void> => {
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update form: ${response.statusText}`);
      }

      // Optimistic update
      setForms(prev => prev.map(form => 
        form.id === id ? { ...form, ...updates } : form
      ));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  const deleteForm = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/forms/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete form: ${response.statusText}`);
      }

      // Optimistic update
      setForms(prev => prev.filter(form => form.id !== id));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  const duplicateForm = useCallback(async (id: string): Promise<void> => {
    try {
      const formToDuplicate = forms.find(form => form.id === id);
      if (!formToDuplicate) {
        throw new Error('Form not found');
      }

      const duplicatedForm = {
        ...formToDuplicate,
        title: `${formToDuplicate.formTitle} (Copy)`,
        code: `${formToDuplicate.formCode}_COPY_${Date.now()}`,
        isActive: false
      };

      delete (duplicatedForm as any).id;
      await createForm(duplicatedForm);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [forms, createForm, onError]);

  const searchForms = useCallback((query: string): FormDoc[] => {
    if (!query.trim()) return forms;

    const lowercaseQuery = query.toLowerCase();
    return forms.filter(form => 
      form.formTitle?.toLowerCase().includes(lowercaseQuery) ||
      form.formCode?.toLowerCase().includes(lowercaseQuery) ||
      form.formDescription?.toLowerCase().includes(lowercaseQuery) ||
      form.category?.toLowerCase().includes(lowercaseQuery)
    );
  }, [forms]);

  return {
    forms,
    loading: api.loading,
    error: api.error,
    refresh: api.refetch,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
    searchForms
  };
};