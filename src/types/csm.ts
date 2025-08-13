// 📁 src/types/csm.ts - Complete Fixed Types with All Missing Exports
import { Timestamp } from 'firebase/firestore';

export type DateInput = Timestamp | Date | string | null | undefined | { seconds: number; nanoseconds?: number };

// ========================================================================
// CSM VENDOR TYPES
// ========================================================================
export interface CSMVendor {
  id?: string;
  companyId: string;
  vdCode: string;
  vdName: string;
  freqAss: string;
  isActive: boolean;
  category: string;
  workingArea?: string[];
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  createdBy: string;
  lastUpdatedBy: string; // Add correct version
}

// ========================================================================
// CSM FORM TYPES
// ========================================================================
export interface CSMFormField {
  id?: string;
  ckItem: string;
  ckType: string | "M" | "P";
  ckQuestion: string;
  ckRequirement: string;
  ckDetail?: string;
  fScore?: string;
  tScore?: string;
  required?: boolean;
  allowAttach?: boolean;
  type: string | 'text';
}

export interface CSMFormDoc {
  id?: string;
  formCode: string;
  formTitle: string;
  formDescription?: string;
  isActive: boolean;
  applicableTo: string[];
  fields: CSMFormField[];
  createdAt: DateInput;
  updatedAt: DateInput;
  createdBy: string;
}

// ========================================================================
// CSM ASSESSMENT TYPES
// ========================================================================
export type Score = 'n/a' | '0' | '1' | '2' | '3' | '4' | '5';

export interface CSMAuditor {
  name: string;
  email: string;
  phone?: string;
  position: string;
}

export interface CSMAuditee extends CSMAuditor {
  unknown: unknown;
}

export interface CSMAssessmentAnswer {
  ckItem: string;
  ckType: string | "M" | "P";
  ckQuestion?: string;
  comment: string;
  score?: string;
  tScore?: string;
  action?: string;
  files: string[];
  isFinish?: boolean;
}

export interface CSMAssessment {
  id?: string;
  companyId: string;
  vdCode: string;
  vdName: string;
  formId: string;
  formVersion: string;
  answers: CSMAssessmentAnswer[];
  auditor: CSMAuditor;
  assessor?: string;
  vdCategory?: string;
  vdRefDoc?: string;
  vdWorkingArea?: string;
  riskLevel?: string;
  totalScore?: string;
  maxScore?: string;
  avgScore?: string;
  isActive: boolean;
  isFinish?: boolean;
  finishedAt?: Timestamp | Date | string;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date | string;
  createdAt: Timestamp | Date | string | unknown;
  updatedAt?: Timestamp | Date | string | unknown;
}

// ✅ Add alias for backward compatibility
export interface CSMAssessmentDoc extends CSMAssessment {unknown: unknown;}

// ========================================================================
// CSM ASSESSMENT SUMMARY TYPES
// ========================================================================
export interface CSMAssessmentSummary {
  id?: string;
  vdCode: string;
  lastAssessmentId: string;
  lastAssessmentDate: Date;
  totalScore: number;
  maxScore: number;
  avgScore: number;
  completedQuestions: number;
  totalQuestions: number;
  riskLevel: 'Low' | 'Medium' | 'High' | '';
  updatedAt: Date;
}

// ========================================================================
// COMPANY TYPES
// ========================================================================
export interface Company {
  id?: string;
  name: string;
  code?: string;
  isActive?: boolean;
  createdAt?: DateInput;
  updatedAt?: DateInput;
}

// ========================================================================
// VENDOR CATEGORIES AND FREQUENCIES
// ========================================================================
export interface VendorCategory {
  code: string;
  name: string;
  description: string;
  color: string;
}

export interface AssessmentFrequency {
  code: string;
  name: string;
  description: string;
  months: number;
}

export const CSM_VENDOR_CATEGORIES: VendorCategory[] = [
  { code: '1', name: 'ก่อสร้าง', description: 'บริษัทผู้รับเหมาก่อสร้าง', color: 'bg-blue-100 text-blue-800' },
  { code: '2', name: 'บริการ', description: 'บริษัทให้บริการทั่วไป', color: 'bg-green-100 text-green-800' },
  { code: '3', name: 'ขนส่ง', description: 'บริษัทขนส่งและโลจิสติกส์', color: 'bg-yellow-100 text-yellow-800' },
  { code: '4', name: 'วัสดุ', description: 'ผู้จำหน่ายวัสดุและอุปกรณ์', color: 'bg-purple-100 text-purple-800' },
  { code: '5', name: 'เทคโนโลยี', description: 'บริการเทคโนโลยีและ IT', color: 'bg-indigo-100 text-indigo-800' }
];

export const ASSESSMENT_FREQUENCIES: AssessmentFrequency[] = [
  { code: '6months', name: '6 เดือน', description: 'ประเมินทุก 6 เดือน', months: 6 },
  { code: '1year', name: '1 ปี', description: 'ประเมินทุกปี', months: 12 },
  { code: '2years', name: '2 ปี', description: 'ประเมินทุก 2 ปี', months: 24 },
  { code: '3years', name: '3 ปี', description: 'ประเมินทุก 3 ปี', months: 36 }
];

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================
export const getCategoryInfo = (categoryCode: string): VendorCategory | undefined => {
  return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode);
};

export const getFrequencyInfo = (frequencyCode: string): AssessmentFrequency | undefined => {
  return ASSESSMENT_FREQUENCIES.find(freq => freq.code === frequencyCode);
};

export const getCategoryName = (categoryCode: string): string => {
  const category = getCategoryInfo(categoryCode);
  return category ? category.name : categoryCode;
};

export const getFrequencyName = (frequencyCode: string): string => {
  const frequency = getFrequencyInfo(frequencyCode);
  return frequency ? frequency.name : frequencyCode;
};

// ========================================================================
// RISK LEVEL UTILITIES
// ========================================================================
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low': return 'bg-green-100 text-green-800';
    case 'Medium': return 'bg-yellow-100 text-yellow-800';
    case 'High': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRiskLevelIcon = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low': return '🟢';
    case 'Medium': return '🟡'; 
    case 'High': return '🔴';
    default: return '⚪';
  }
};