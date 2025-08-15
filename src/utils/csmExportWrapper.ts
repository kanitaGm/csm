// src/utils/csmExportWrapper.ts
import { 
  exportToExcel,
  type ExportResult 
} from './exportUtils';
import type { CSMVendor, CSMAssessmentSummary } from '../types/csm';

export const exportCSMVendors = async (
  vendors: CSMVendor[],
  summaries: CSMAssessmentSummary[] = []
): Promise<ExportResult> => {
  // Transform CSM data to generic format
  const genericData = vendors.map(vendor => {
    const summary = summaries.find(s => s.vdCode === vendor.vdCode);
    return {
      vendorCode: vendor.vdCode,
      vendorName: vendor.vdName,
      category: vendor.category,
      summary: summary ? summary.completedQuestions : 'No summary available', //
      riskLevel: summary ? summary.riskLevel : 'Unknown',
      // ... other fields
    };
  });

  // Use existing exportToExcel function
  return await exportToExcel(genericData, 'CSM_Vendors');
};