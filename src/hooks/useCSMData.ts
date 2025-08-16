// ========================================
// 📁 src/hooks/useCSMData.ts
// ========================================

import { useState, useCallback } from 'react';
import type { CSMVendor, CSMAssessment } from '../types/csm';
import { useApi } from './useApi';

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

export const useCSMData = (options: CSMDataOptions = {}): CSMDataResult => {
  const { enableCache = true, refreshInterval, onError } = options;
  
  const [vendors, setVendors] = useState<CSMVendor[]>([]);
  const [assessments, setAssessments] = useState<CSMAssessment[]>([]);

  //  สร้าง options objects แยกเพื่อหลีกเลี่ยง undefined
  const vendorsApiOptions = {
    cacheTime: enableCache ? 5 * 60 * 1000 : 0,
    onSuccess: (data: unknown) => setVendors((data as CSMVendor[]) || []),
    ...(onError && { onError }),
    ...(refreshInterval && {
      enablePolling: true,
      pollingInterval: refreshInterval
    })
  };

  const assessmentsApiOptions = {
    cacheTime: enableCache ? 5 * 60 * 1000 : 0,
    onSuccess: (data: unknown) => setAssessments((data as CSMAssessment[]) || []),
    ...(onError && { onError }),
    ...(refreshInterval && {
      enablePolling: true,
      pollingInterval: refreshInterval
    })
  };

  const vendorsApi = useApi<CSMVendor[]>('/api/csm/vendors', vendorsApiOptions);
  const assessmentsApi = useApi<CSMAssessment[]>('/api/csm/assessments', assessmentsApiOptions);

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([vendorsApi.refetch(), assessmentsApi.refetch()]);
  }, [vendorsApi, assessmentsApi]);

  const addVendor = useCallback(async (vendor: Omit<CSMVendor, 'id'>): Promise<void> => {
    try {
      const response = await fetch('/api/csm/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendor)
      });

      if (!response.ok) {
        throw new Error(`Failed to add vendor: ${response.statusText}`);
      }

      await refresh();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [refresh, onError]);

  const updateVendor = useCallback(async (id: string, updates: Partial<CSMVendor>): Promise<void> => {
    try {
      const response = await fetch(`/api/csm/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update vendor: ${response.statusText}`);
      }

      // Optimistic update
      setVendors(prev => prev.map(vendor => 
        vendor.id === id ? { ...vendor, ...updates } : vendor
      ));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  const deleteVendor = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/csm/vendors/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete vendor: ${response.statusText}`);
      }

      // Optimistic update
      setVendors(prev => prev.filter(vendor => vendor.id !== id));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }, [onError]);

  return {
    vendors,
    assessments,
    loading: vendorsApi.loading || assessmentsApi.loading,
    error: vendorsApi.error || assessmentsApi.error,
    refresh,
    addVendor,
    updateVendor,
    deleteVendor
  };
};