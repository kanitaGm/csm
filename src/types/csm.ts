import { Timestamp } from 'firebase/firestore';
//import type { Company } from './api';
// 📁 src/types/csm.ts - Fixed Types with Proper Interfaces

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
  lastUpdatedBy: string; // Keeping original typo for compatibility
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
  fScore?: string; // Keeping fScore for compatibility
  tScore?: string; // Add tScore back for compatibility
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

// Keep for backward compatibility
export interface CSMAuditee  {
  name: string;
  email: string;
  phone?: string;
  position: string;
}

// Export both for compatibility
//export { CSMAuditor, CSMAuditee };

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
  finishedAt?: Timestamp | Date | string; // Add finishedAt property
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date | string;
  createdAt: Timestamp | Date | string | unknown;
  updatedAt?: Timestamp | Date | string | unknown;
}

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
