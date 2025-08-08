// ========================================================================
// ไฟล์: src/types/index.ts - แก้ไขและปรับปรุง Types
// กำหนด Type และ Interface ทั้งหมดที่ใช้ในโปรเจกต์
// ========================================================================
import { Timestamp } from 'firebase/firestore';
//import type { DateInput } from '../components/utils/dateUtils'; 

export type Role = 'superadmin' | 'admin' | 'plantAdmin' | 'guest';

//  BaseEmployeeData - เพิ่ม email field ที่จำเป็น
export interface BaseEmployeeData {
  id: string; // Firestore Document ID
  empId: string;
  email?: string; //  จำเป็นสำหรับการค้นหา
  idCard?: string; // ประจำตัวประชาชน  
  prefix?: string;  
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string; // local name  
  position?: string;
  profileImageUrl?: string | null; 
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string | Date | null;   
  startDate?: string | Date | null; 
  cardExpiryDate?: string |Date | null; 
  company?: string;
  companyId?: string;
  plantId?: string| null; 
  employeeType?: 'employee' | 'contractor' | 'transporter' | 'driver' | 'pending';    
  status: 'active' | 'inactive' | 'terminated' | 'pending' | 'blacklist';
  createdAt: Timestamp | Date | string; 
  updatedAt?: Timestamp | Date | string; 
}

//  EmployeeFormState - ปรับให้สอดคล้องกับ BaseEmployeeData
export interface EmployeeFormState extends Partial<BaseEmployeeData> {
  //email: string;
  level?: string; 
  nickname?: string;  
  department?: string;
  siteId?: string; 
  zoneId?: string;
  countryId?: string;
  startDate?: string | Date;
  lastUpdateBy?: string;
  searchKeywords?: string[];
}

// EmployeeProfile - ปรับให้ realistic มากขึ้น
export interface EmployeeProfile extends BaseEmployeeData {
  id: string; // Firestore document ID
  email: string; // ✅ ทำให้ required
  searchKeywords: string[]; // **สำคัญมาก** สำหรับการค้นหา
  createdAt: Timestamp | Date | string; // ✅ ทำให้ required
  updatedAt: Timestamp | Date | string; // ✅ ทำให้ required
  [key: string]: unknown; // ✅ เก็บไว้สำหรับ flexibility
}

export interface OptionType {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  options: OptionType[];
  value: OptionType | null; 
  onChange: (option: OptionType | null) => void; 
  placeholder?: string;
}

// TrainingRecord
export interface TrainingRecord {
  id: string; // Firestore Document ID
  empId: string;
  courseId?: string;
  courseName?: string;  
  trainingDate?: Timestamp | Date | string | null; 
  expiryDate?: Timestamp | Date | string | null; 
  status: 'lifetime' | 'expired' | 'active' | 'pending';
  files?: File[];
  evidenceText?: string;
  updatedAt?: Timestamp | Date | string; 
  updatedBy?: string;
  createdAt: Timestamp | Date | string;
  [key: string]: unknown; // ✅ เก็บไว้สำหรับ flexibility
}

export interface TrainingSummary {
  total: number;
  active: number;
  expired: number;
  uniqueCourses: string[];
}

export interface UserRole {
  uid?: string; // Firebase Auth UID
  empId: string;
  email: string;
  role: Role;
  displayName: string | null;  
  passcode?: string; // Only for internal users
  isActive: boolean;
  managedCountry?: string[];
  managedZones?: string[];
  managedSites?: string[];
  managedPlants?: string[];  
  createdAt?: Date | Timestamp; 
  updatedAt?: Date | Timestamp;
}

export interface UserPermissions {
    empId: string;
    email: string;
    role: Role;
    isActive: boolean;
    passcode?: string; // สำหรับ Internal Login
    displayName?: string;
}

//  AppUser - ปรับให้สอดคล้องกับการใช้งานจริง
export interface AppUser {
  uid: string; // Firebase Auth UID
  empId: string | null; // Employee ID 
  email: string | null;
  displayName: string | null;
  role: string | null; 
  profile: EmployeeProfile | { displayName: string | null }; 
  //managedCountry?: string | string[]; // ✅ แก้ไข: อาจจะเป็น array
  //managedZones?: string[];
  //managedSites?: string[];
  //managedPlants?: string[];  
  //empUser: string | null;
  //firebaseLinkedEmpProfile: string | null;
  loginType: 'provider' | 'firebase' |'internal' | null;
}

// AuthContextType - ปรับให้สอดคล้องกับการใช้งาน
export interface AuthContextType {
  user: AppUser | null;
  currentUser: unknown; // Firebase User object
  empUser: EmployeeProfile | null; // Employee login user
  firebaseLinkedEmpProfile: EmployeeProfile | null; // Firebase linked employee profile
  loginType: 'provider' | 'firebase' |'internal' | null; // ✅ เพิ่ม 'internal'
  currentUserClaims: unknown; // Firebase custom claims
  loading: boolean; 
  error: string | null;
  setError: (error: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithInternalCredentials: (empId: string, passcode: string) => Promise<void>;
  signInInternal: (empId: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
}

//  LoginResult
export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  redirecting?: boolean; // ใช้สำหรับการเปลี่ยนเส้นทางหลังจากล็อกอินสำเร็จ
  message?: string; 
}


export interface TrainingCourse {
  id: string;
  courseName: string;
  description?: string;
  duration?: number; // ชั่วโมง
  validityPeriod?: number; // จำนวนวันที่ใช้ได้
  isLifetime: boolean;
  category?: string;
}

// Helper types สำหรับ Collections
export interface Country {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Zone {
  id: string;
  name: string;
  countryId: string;
  isActive: boolean;
}

export interface Site {
  id: string;
  name: string;
  zoneId: string;
  isActive: boolean;
}

export interface Plant {
  id: string;
  name: string;
  siteId: string;
  isActive: boolean;
}

export interface Company {
  companyId: string; // Firestore Document ID
  vdCode: string; // Vendor Code - รหัสบริษัทที่ใช้อ้างอิง
  name: string; // ชื่อบริษัท
  isActive: boolean;
  category: string; // หมวดหมู่บริษัท เช่น structure, admin, service, transporter
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  workingArea?: string[]; // พื้นที่ที่ทำงาน
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}



// ========================================================================
// UI COMPONENT TYPES
// ========================================================================

export interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}
export interface FilterOptions {
  company?: string;
  site?: string;
  employeeType?: string;
  status?: string;
  role?: Role;
}
export interface SearchOptions {
  query: string;
  fields: string[];
  filters: FilterOptions;
}
export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
export interface FilterState {
  search: string;
  status: 'all' | 'active' | 'expired';
  course: string;
}

// Filter options type
export interface CSMFilterOptions {
  search: string;
  category: string;
  assessmentStatus: 'all' | 'completed' | 'in-progress' | 'not-assessed' | 'expired';
  riskLevel: string;
  dateRange: 'all' | 'this-year' | 'last-year' | 'custom';
}

// ========================================================================
// API & DATA TYPES
// ========================================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationOptions;
}
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ========================================================================
// CSV IMPORT TYPES
// ========================================================================
export interface CSVImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}
export interface CSVImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: CSVImportError[];
  duplicates: number;
}
// OptionType - สำหรับ Select Components
export interface OptionType {
  value: string;
  label: string;
}
// SearchableSelectProps - Props สำหรับ Searchable Select
export interface SearchableSelectProps {
  options: OptionType[];
  value: OptionType | null; 
  onChange: (option: OptionType | null) => void; 
  placeholder?: string;
}


// ========================================================================
// MULTI FILE UPLOAD TYPES - สำหรับ MultiInsertFiles Component
// ========================================================================
export interface MultiFileInputProps {
  value?: string[];
  onFilesChange: (urls: string[]) => void;
  maxFiles?: number;
  acceptTypes?: string[];
  vdCode: string;
}


// ========================================================================
// CSM FORM TYPES - Updated for Dynamic Forms
// ========================================================================
export interface StdFormField {
  ckItem: string; // รหัสข้อ เช่น "1", "2", "3"
  ckType: string; // 
  ckQuestion: string; // คำถาม
  ckRequirement: string; // เกณฑ์การประเมิน
  ckChoice:string | "Pass" | "NotPass" | "N/A" ;  //รูปแบบคำตอบ
  fScore?: string; // น้ำหนักคะแนน สำหรับคำนวณ (default = "5")
  required?: boolean; // จำเป็นต้องตอบหรือไม่
  allowAttach?: boolean; // อนุญาตให้แนบไฟล์หรือไม่
  updated: Timestamp | Date | string | any; // วันที่อัปเดต
}
export interface StdFormDoc {
  id?: string; // Firestore Document ID
  formCode: string; // รหัสฟอร์ม เช่น "CSMChecklist"
  formTitle: string; // ชื่อแบบฟอร์ม
  isActive: boolean; // เปิดใช้งานหรือไม่
  applicableTo: string[]; // ใช้สำหรับอะไร type ของเเครื่องมือเป็นต้น เช่น ["csm", "safety"]
  updatedAt: Timestamp | Date | string | any;
  createdBy: string; // email หรือ uid ของผู้สร้าง
  fields: StdFormField[]; // รายการคำถาม

}


// for csm
export interface FormField  {
  ckItem: string; // รหัสข้อ เช่น "1", "2", "3"
  ckType: string | "M" | "P"; // M = Mandatory, P = Optional
  ckQuestion: string; // คำถาม
  ckRequirement: string; // เกณฑ์การประเมิน
  fScore?: string; // น้ำหนักคะแนน สำหรับคำนวณ (default = "5")
  required?: boolean; // จำเป็นต้องตอบหรือไม่
  allowAttach?: boolean; // อนุญาตให้แนบไฟล์หรือไม่
}
export interface FormDoc {
  id?: string; // Firestore Document ID
  formCode: string; // รหัสฟอร์ม เช่น "CSMChecklist"
  formTitle: string; // ชื่อแบบฟอร์ม
  isActive: boolean; // เปิดใช้งานหรือไม่
  applicableTo: string[]; // ใช้สำหรับอะไร เช่น ["csm", "safety"]
  updatedAt: Timestamp | Date | string | any;
  createdBy: string; // email หรือ uid ของผู้สร้าง
  fields: FormField[]; // รายการคำถาม
}
// Score types - คะแนนที่สามารถให้ได้
export type Score = 'n/a' | '0' | '1' | '2' | '3' | '4' | '5' ;

// AssessmentAnswer - คำตอบสำหรับแต่ละคำถาม
export interface AssessmentAnswer {
  ckItem: string; // รหัสข้อคำถาม
  ckType: string | "M" | "P"; // ประเภทคำถาม (M/P)
  ckQuestion?: string; // คำถาม (copy มาจาก FormField)
  comment: string; // ความเห็น/หมายเหตุ
  score?: string; // คะแนนที่ให้ (0-5 หรือ n/a)
  tScore?: string; // คะแนนรวมหลังคูณน้ำหนัก (คำนวณอัตโนมัติ)
  action?: string; // สำหรับใช้ในอนาคต
  files: string[]; // URL ไฟล์ที่แนบมา (สูงสุด 2 ไฟล์ต่อข้อ)
  isFinish?: boolean; // ประเมินข้อนี้เสร็จแล้วหรือไม่
}
// CsmAssessment - ข้อมูลการประเมิน (สำหรับสร้างใหม่) แก้ไขให้รองรับ null values สำหรับ optional fields
export interface CsmAssessment {
  id?: string; // Firestore Document ID
  vdCode: string; // รหัสบริษัท (required)
  vdName: string; // ชื่อบริษัท (required)
  vdCategory?: string | null; // หมวดหมู่บริษัท (optional)
  vdRefDoc?: string | null; // เลขที่อ้างอิง (สัญญา, PO) (optional)
  vdWorkingArea?: string | null; // พื้นที่ปฏิบัติงาน (optional)
  riskLevel: 'Low' | 'Moderate' | 'High' | ''; // ระดับความเสี่ยง (required with default)
  assessor?: string | null; // ผู้ประเมิน (optional)
  isActive: boolean; // เป็นการประเมินล่าสุดหรือไม่ (required)
  updateBy: string; // email ผู้อัปเดต (required)
  createdAt: DateInput; // วันที่สร้าง (required) - ใช้ DateInput
  updatedAt: DateInput; // วันที่อัปเดต (required) - ใช้ DateInput
  finalScore?: string | null; // คะแนนรวมทั้งหมด (calculated)
  avgScore?: string | null; // คะแนนเฉลี่ย (calculated)
  answers: AssessmentAnswer[]; // รายการคำตอบ (required)
  isApproved?: boolean; // สำหรับ lock ยืนยันว่าประเมินบริษัทชุดนี้เรียบร้อยแล้วจะแก้ไขไม่ได้ (optional)
}
// AssessmentDoc - ข้อมูลการประเมินที่ดึงจาก Firestore
export interface AssessmentDoc extends CsmAssessment {
  id: string; // Firestore Document ID (required)
}
// CsmAssessmentSummary - สรุปการประเมินล่าสุดของแต่ละบริษัท ปรับปรุง riskLevel type ให้ชัดเจน
export interface CsmAssessmentSummary {
  vdCode: string; // รหัสบริษัท
  vdName: string; // ชื่อบริษัท
  lastAssessmentId: string; // ID ของผลประเมินรอบล่าสุด
  lastAssessmentDate: Date; // วันที่บันทึกล่าสุด - ใช้ Date เท่านั้น (สำหรับ frontend)
  totalScore: number; // คะแนนรวมจากคำตอบรอบล่าสุด
  avgScore: number; // คะแนนเฉลี่ยจากคำตอบรอบล่าสุด
  riskLevel: 'Low' | 'Moderate' | 'High' |  ''; // ระดับความเสี่ยง
  summaryByCategory?: Record<string, unknown>; // สรุปแยกตามหมวด (ถ้ามี)
  updatedAt: Date; // เวลาอัปเดตข้อมูลสรุป - ใช้ Date เท่านั้น (สำหรับ frontend)
}

// ========================================================================
// COMPONENT PROPS TYPES
// ========================================================================
// Props สำหรับ CSM Components
export interface CSMListPageProps {
  onSelectCompany?: (company: Company) => void;
}

export interface CSMEvaluatePageProps {
  vdCode?: string;
}

export interface QuestionFormProps {
  formFields: FormField[];
  initialAnswers?: AssessmentAnswer[];
  vdCode: string;
  onAnswersChange: (answers: AssessmentAnswer[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export interface AssessmentSummaryProps {
  vdCode: string;
  onViewDetails?: (assessmentId: string) => void;
}

export interface FormListPageProps {
  onEditForm?: (formId: string) => void;
  onCreateForm?: () => void;
}

export interface FormEditorPageProps {
  formId?: string;
  onSave?: (form: FormDoc) => void;
  onCancel?: () => void;
}

// ========================================================================
// DATE UTILITY TYPES
// ========================================================================
export type DateInput = Timestamp | Date | string | null | undefined | { seconds: number; nanoseconds?: number };


// ========================================================================
// EXPORT ALL TYPES
// ========================================================================
// Re-export all types for easy importing
/*
export type {
export type {
  // Employee & User
  BaseEmployeeData,
  EmployeeFormState,
  EmployeeProfile,
  UserRole,
  UserPermissions,
  AppUser,
  AuthContextType,
  LoginResult,
  
  // Training
  TrainingRecord,
  TrainingSummary,
  TrainingCourse,
  
  // Company & Location
  Company,
  Country,
  Zone,
  Site,
  Plant,
  
  // CSM Forms
  FormField,
  FormDoc,
  
  // CSM Assessment
  Score,
  AssessmentAnswer,
  CsmAssessment,
  AssessmentDoc,
  CsmAssessmentSummary,
  
  // UI Components
  OptionType,
  SearchableSelectProps,
  MultiFileInputProps,
  
  // UI State
  UIState,
  FilterOptions,
  SearchOptions,
  PaginationOptions,
  PaginationState,
  FilterState,
  
  // API & Data
  ApiResponse,
  ValidationResult,
  CSVImportError,
  CSVImportResult,
  
  // Component Props
  CSMListPageProps,
  CSMEvaluatePageProps,
  QuestionFormProps,
  AssessmentSummaryProps,
  FormListPageProps,
  FormEditorPageProps,
  
  // Date Utils
  DateInput
};
*/