// src/hooks/useCSMData.ts (แก้ไข TypeScript Strict)
// ================================

import { useCallback , useState} from 'react';
import type { CSMVendor, CSMAssessmentSummary } from '../types/csm';

interface CSMDataState {
  readonly vendors: readonly CSMVendor[];
  readonly assessmentSummaries: readonly CSMAssessmentSummary[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: Date | null;
}

interface CSMDataActions {
  readonly loadData: () => Promise<void>;
  readonly refreshData: () => Promise<void>;
  readonly clearError: () => void;
  readonly updateVendor: (vendor: CSMVendor) => void;
  readonly updateAssessmentSummary: (summary: CSMAssessmentSummary) => void;
}

export const useCSMData = (companyId?: string): CSMDataState & CSMDataActions => {
  const [state, setState] = useState<CSMDataState>({
    vendors: [],
    assessmentSummaries: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const loadData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { enhancedVendorsService, enhancedAssessmentsService } = await import('../services/enhancedCsmService');

      const [vendorsData, summariesData] = await Promise.all([
        enhancedVendorsService.getAll(),
        companyId ? enhancedAssessmentsService.getSummariesByCompany(companyId) : Promise.resolve([])
      ]);

      setState(prev => ({
        ...prev,
        vendors: vendorsData,
        assessmentSummaries: summariesData,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error loading CSM data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
      }));
    }
  }, [companyId]);

  const refreshData = useCallback(async (): Promise<void> => {
    const { enhancedVendorsService } = await import('../services/enhancedCsmService');
    enhancedVendorsService.clearCache();
    await loadData();
  }, [loadData]);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const updateVendor = useCallback((vendor: CSMVendor): void => {
    setState(prev => ({
      ...prev,
      vendors: prev.vendors.map(v => v.vdCode === vendor.vdCode ? vendor : v)
    }));
  }, []);

  const updateAssessmentSummary = useCallback((summary: CSMAssessmentSummary): void => {
    setState(prev => ({
      ...prev,
      assessmentSummaries: prev.assessmentSummaries.map(s => 
        s.vdCode === summary.vdCode ? summary : s
      )
    }));
  }, []);

  return {
    ...state,
    loadData,
    refreshData,
    clearError,
    updateVendor,
    updateAssessmentSummary
  };
};