// 📁 src/hooks/useCSMData.ts
// Strict TypeScript CSM Data hook - Real data only
import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSMVendor, CSMAssessmentSummary } from '../types/csm';
import { vendorsService, assessmentSummariesService } from '../services/csmService';

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

type UseCSMDataReturn = CSMDataState & CSMDataActions;

export const useCSMData = (companyId?: string): UseCSMDataReturn => {
  const [state, setState] = useState<CSMDataState>({
    vendors: [],
    assessmentSummaries: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const isLoadingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    if (isLoadingRef.current) {
      console.log('🔄 Already loading data, skipping...');
      return;
    }

    isLoadingRef.current = true;
    
    if (!isMountedRef.current) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('📡 Loading CSM data from Firestore...');
      
      const [vendorsData, summariesData] = await Promise.all([
        vendorsService.getAll(),
        assessmentSummariesService.getAll()
      ]);

      if (!isMountedRef.current) return;

      console.log(`✅ Loaded ${vendorsData.length} vendors and ${summariesData.length} summaries`);

      setState(prev => ({
        ...prev,
        vendors: vendorsData,
        assessmentSummaries: summariesData,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));

    } catch (error) {
      console.error('❌ Error loading CSM data:', error);
      
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [companyId]);

  const refreshData = useCallback(async (): Promise<void> => {
    console.log('🔄 Refreshing CSM data...');
    vendorsService.clearCache();
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