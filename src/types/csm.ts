// ========================================
// 🔧 src/types/csm.ts - เรียบง่าย ใช้งานได้จริง
// ========================================

import { Timestamp } from 'firebase/firestore'

// ========================================
// BASIC TYPES
// ========================================

export type AssessmentStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'submitted'
  | 'approved'
  | 'rejected'

export type CSMVendorCategory = 
  | '1-ADMINISTRATION' 
  | '2-SERVICES' 
  | '3-MANUFACTURING' 
  | '4-LOGISTICS'

export type CSMRiskLevel = 'Low' | 'Moderate' | 'High'

// ========================================
// CSM VENDOR INTERFACE (รวมทุกอย่างในที่เดียว)
// ========================================

export interface CSMVendor {
  id?: string
  companyId: string
  vdCode: string
  vdName: string
  name: string                    
  category: CSMVendorCategory
  riskLevel: CSMRiskLevel
  freqAss: string
  isActive: boolean
  workingArea?: string[]
  lastAssessmentDate?: string
  currentAssessment?: CSMAssessment
  createdAt?: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
  createdBy: string
  lastUpdatedBy: string
}

// ========================================
// CSM FORM INTERFACE
// ========================================

export interface CSMFormField {
  id?: string
  ckItem: string
  ckType: 'M' | 'P' | string
  ckQuestion: string
  ckRequirement: string
  ckDetail?: string
  fScore?: string
  tScore?: string
  required?: boolean
  allowAttach?: boolean
  type: 'text' | string
}

export interface CSMFormDoc {
  id?: string
  formCode: string
  formTitle: string
  formDescription?: string
  isActive: boolean
  applicableTo: string[]
  fields: CSMFormField[]
  createdAt: Timestamp | Date | string
  updatedAt: Timestamp | Date | string
  createdBy: string
}

// ========================================
// CSM ASSESSMENT INTERFACE (รวมทุกอย่าง)
// ========================================

export interface CSMAuditor {
  name: string
  email: string
}

export interface CSMAuditee extends CSMAuditor {
  position?: string
}

export interface CSMAssessmentAnswer {
  ckItem: string
  ckType: 'M' | 'P' | string
  ckQuestion?: string
  comment: string
  score?: string
  tScore?: string
  action?: string
  files: string[]
  isFinish?: boolean
}

export interface CSMAssessment {
  id?: string
  companyId: string
  vdCode: string
  vdName: string
  docReference?: string
  formCode: string
  formVersion: string
  answers: CSMAssessmentAnswer[]
  auditor: CSMAuditor
  auditee?: CSMAuditee
  assessor?: string
  vdCategory?: string
  vdRefDoc?: string
  vdWorkingArea?: string
  riskLevel?: string
  
  // Scores (รวมทุกประเภท)
  totalScore?: string
  maxScore?: string
  avgScore?: string
  finalScore?: string
  
  // Status and Progress (รวมไว้)
  status?: AssessmentStatus
  progress?: {
    totalQuestions: number
    answeredQuestions: number
    confirmedQuestions: number
    percentage: number
  }
  
  // Flags
  isActive: boolean
  isFinish?: boolean
  isApproved?: boolean
  
  // Timestamps (รวมทุกอย่าง)
  createdAt: Timestamp | Date | string
  updatedAt?: Timestamp | Date | string
  lastModified?: Timestamp | Date | string
  finishedAt?: Timestamp | Date | string
  submittedAt?: Timestamp | Date | string
  approvedAt?: Timestamp | Date | string
  
  // Users
  approvedBy?: string
}

// ========================================
// CSM ASSESSMENT SUMMARY (รวมทุกอย่าง)
// ========================================

export interface CSMAssessmentSummary {
  id?: string
  vdCode: string
  lastAssessmentId: string
  lastAssessmentDate: Date
  
  // Scores (รวมทุกประเภทไว้)
  totalScore: number
  maxScore: number
  avgScore: number
  overallScore: number        // เพิ่มให้ครบ
  
  // Questions
  completedQuestions: number
  totalQuestions: number
  
  // Issues
  criticalIssues: number      // เพิ่มให้ครบ
  
  // Risk
  riskLevel: CSMRiskLevel
  
  // Timestamp
  updatedAt: Date
}

// ========================================
// VENDOR CATEGORIES (ใช้แค่อันเดียว)
// ========================================

export interface VendorCategory {
  code: string
  name: string
  description: string
  color: string
  defaultFrequency?: string
}

export interface AssessmentFrequency {
  value: string
  label: string
  description: string
  months: number
}

// ========================================
// CONSTANTS (เอาแค่ที่จำเป็น)
// ========================================

export const CSM_VENDOR_CATEGORIES: VendorCategory[] = [
  { 
    code: '1', 
    name: 'Administration', 
    description: 'งานทั่วไป', 
    color: 'bg-blue-100 text-blue-800' 
  },
  { 
    code: '2', 
    name: 'Service', 
    description: 'งานบริการ', 
    color: 'bg-green-100 text-green-800' 
  },
  { 
    code: '3', 
    name: 'Construction-Maintenance', 
    description: 'งาน construction and maintenance', 
    color: 'bg-yellow-100 text-yellow-800' 
  },
  { 
    code: '4', 
    name: 'Transportation-Logistics', 
    description: 'จัดส่ง', 
    color: 'bg-purple-100 text-purple-800' 
  }
]

export const ASSESSMENT_FREQUENCIES: AssessmentFrequency[] = [
  { value: '6months', label: '6 เดือน', description: 'ประเมินทุก 6 เดือน', months: 6 },
  { value: '1year', label: '1 ปี', description: 'ประเมินทุกปี', months: 12 },
  { value: '2years', label: '2 ปี', description: 'ประเมินทุก 2 ปี', months: 24 },
  { value: '3years', label: '3 ปี', description: 'ประเมินทุก 3 ปี', months: 36 }
]

// ========================================
// UTILITY FUNCTIONS (รวมไว้)
// ========================================

export const getCategoryInfo = (categoryCode: string): VendorCategory | undefined => {
  return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode)
}

export const getFrequencyInfo = (frequencyCode: string): AssessmentFrequency | undefined => {
  return ASSESSMENT_FREQUENCIES.find(freq => freq.value === frequencyCode)
}

export const getCategoryName = (categoryCode: string): string => {
  const category = getCategoryInfo(categoryCode)
  return category ? category.name : categoryCode
}

export const getFrequencyName = (frequencyCode: string): string => {
  const frequency = getFrequencyInfo(frequencyCode)
  return frequency ? frequency.label : frequencyCode
}

// ========================================
// RISK LEVEL UTILITIES
// ========================================

export const getRiskLevelColor = (riskLevel: CSMRiskLevel): string => {
  switch (riskLevel) {
    case 'Low': return 'bg-green-100 text-green-800'
    case 'Moderate': return 'bg-yellow-100 text-yellow-800'
    case 'High': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export const getRiskLevelIcon = (riskLevel: CSMRiskLevel): string => {
  switch (riskLevel) {
    case 'Low': return '🟢'
    case 'Moderate': return '🟡'
    case 'High': return '🔴'
    default: return '⚪'
  }
}

// ========================================
// TYPE ALIASES (สำหรับ backward compatibility)
// ========================================

export type CSMVendorExtended = CSMVendor              // ไม่ต้องสร้างใหม่
export type CSMAssessmentDoc = CSMAssessment           // ไม่ต้องสร้างใหม่  
export type CSMAssessmentSummaryExtended = CSMAssessmentSummary // ไม่ต้องสร้างใหม่

// ========================================
// EXPORT ALL TYPES
// ========================================
/*
export type {
  CSMVendor,
  CSMFormField,
  CSMFormDoc,
  CSMAssessment,
  CSMAssessmentSummary,
  CSMAuditor,
  CSMAuditee,
  CSMAssessmentAnswer,
  VendorCategory,
  AssessmentFrequency
}*/