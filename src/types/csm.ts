// ========================================
// 🔧 แก้ไข src/types/csm.ts - เพิ่ม properties ที่หายไป
// ========================================
import { Timestamp } from 'firebase/firestore';
import type { DateInput } from '../utils/dateUtils'; // Assuming you have a utility for date handling


export type AssessmentStatus = 
  | 'not-started'    // ยังไม่เริ่ม
  | 'in-progress'    // กำลังประเมิน (มีข้อมูลบางส่วน)
  | 'completed'      // เสร็จสิ้น (ทุกข้อ)
  | 'submitted'      // ส่งแล้ว
  | 'approved'       // อนุมัติแล้ว
  | 'rejected';      // ไม่อนุมัติ

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
  lastUpdatedBy: string;
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
//export type Score = 'n/a' | '0' | '1' | '2' | '3' | '4' | '5' |'';

export interface CSMAuditor {
  name: string;
  email: string;
}


export interface CSMAuditee extends CSMAuditor {
  position?: string;
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

// ✅ อัปเดต CSMAssessment interface ให้ครบถ้วน
export interface CSMAssessment {
  id?: string;
  companyId: string;
  vdCode: string;
  vdName: string;
  docReference?: string;
  formCode: string;
  formVersion: string;  
  answers: CSMAssessmentAnswer[];
  auditor: CSMAuditor;
  auditee?: CSMAuditee;              // ✅ เพิ่ม property นี้
  assessor?: string;
  vdCategory?: string;
  vdRefDoc?: string;
  vdWorkingArea?: string;
  riskLevel?: string;
  totalScore?: string;
  maxScore?: string;
  avgScore?: string;
  finalScore?: string;               // ✅ เพิ่ม property นี้
  isActive: boolean;
  isFinish?: boolean;
  finishedAt?: Timestamp | Date | string;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp | Date | string;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  
  // ✅ เพิ่ม properties ใหม่สำหรับ status tracking
  status?: AssessmentStatus;
  progress?: {
    totalQuestions: number;
    answeredQuestions: number;
    confirmedQuestions: number;
    percentage: number;
  };
  lastModified?: Timestamp | Date | string;
  submittedAt?: Timestamp | Date | string;
}

// ✅ ใช้ alias แทน extending ที่ทำให้เกิดปัญหา
export type CSMAssessmentDoc = CSMAssessment;

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
  riskLevel: 'Low' | 'Medium' | 'High' | 'Moderate' | '';
  updatedAt: Date;
}

// ========================================================================
// VENDOR CATEGORIES AND FREQUENCIES
// ========================================================================
export interface VendorCategory {
  code: string;
  name: string;
  description: string;
  color: string;
  defaultFrequency?: string;
}

// ✅ แก้ไข AssessmentFrequency properties
export interface AssessmentFrequency {
  value: string; // เปลี่ยนจาก code
  label: string; // เปลี่ยนจาก name  
  description: string;
  months: number;
}

export const CSM_VENDOR_CATEGORIES: VendorCategory[] = [
  { code: '1', name: 'Administration', description: 'งานทั่วไป', color: 'bg-blue-100 text-blue-800' },
  { code: '2', name: 'Service', description: 'งานบริการ', color: 'bg-green-100 text-green-800' },
  { code: '3', name: 'Construction-Mantenance', description: 'งาน construction and maintenance', color: 'bg-yellow-100 text-yellow-800' },
  { code: '4', name: 'Transportation-Logistics', description: 'จัดส่ง', color: 'bg-purple-100 text-purple-800' },
];

export const ASSESSMENT_FREQUENCIES: AssessmentFrequency[] = [
  { value: '6months', label: '6 เดือน', description: 'ประเมินทุก 6 เดือน', months: 6 },
  { value: '1year', label: '1 ปี', description: 'ประเมินทุกปี', months: 12 },
  { value: '2years', label: '2 ปี', description: 'ประเมินทุก 2 ปี', months: 24 },
  { value: '3years', label: '3 ปี', description: 'ประเมินทุก 3 ปี', months: 36 }
];

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================
export const getCategoryInfo = (categoryCode: string): VendorCategory | undefined => {
  return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode);
};

export const getFrequencyInfo = (frequencyCode: string): AssessmentFrequency | undefined => {
  return ASSESSMENT_FREQUENCIES.find(freq => freq.value === frequencyCode);
};

export const getCategoryName = (categoryCode: string): string => {
  const category = getCategoryInfo(categoryCode);
  return category ? category.name : categoryCode;
};

export const getFrequencyName = (frequencyCode: string): string => {
  const frequency = getFrequencyInfo(frequencyCode);
  return frequency ? frequency.label : frequencyCode;
};

// ========================================================================
// RISK LEVEL UTILITIES
// ========================================================================
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low': return 'bg-green-100 text-green-800';
    case 'Moderate': return 'bg-yellow-100 text-yellow-800';
    case 'High': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRiskLevelIcon = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'Low': return '🟢';
    case 'Moderate': return '🟡'; 
    case 'High': return '🔴';
    default: return '⚪';
  }
};