// ========================================
// 🔧 src/types/forms.ts - แยกชัดเจน เหมาะสมกับระบบ
// ========================================

import { Timestamp } from 'firebase/firestore'

// ========================================
// BASIC FORM TYPES (ใช้กับฟอร์มทั่วไป)
// ========================================

export type FormStatus = 'draft' | 'published' | 'archived' | 'suspended'
export type FormCategory = 'inspection' | 'assessment' | 'survey' | 'application' | 'audit' | 'report' | 'other'
export type ViewMode = 'grid' | 'list' | 'table'
export type SortOrder = 'asc' | 'desc'
export type SortBy = 'title' | 'code' | 'updated' | 'created' | 'submissions'

export type FieldType = 
  | 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'password'
  | 'number' | 'decimal' | 'currency' | 'percentage'
  | 'date' | 'datetime' | 'time'
  | 'radio' | 'checkbox' | 'select' | 'multiselect'
  | 'file' | 'image' | 'signature'
  | 'rating' | 'scale' | 'yesno' | 'score'
  | 'heading' | 'paragraph' | 'divider' | 'html'

// ========================================
// UTILITY INTERFACES
// ========================================

export interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export type Score = 'n/a' | '0' | '1' | '2' | '3' | '4' | '5' | ''

export interface ScoreOption {
  value: Score
  label: string
  description: string
  color: string
}

export interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string | Date | Timestamp
  uploadedBy: string
  thumbnail?: string
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'phone' | 'url' | 'custom'
  value?: number | string
  message?: string
  customValidator?: string
}

// ========================================
// FORM FIELD (เวอร์ชันเรียบง่าย)
// ========================================

export interface FormField {
  id: string
  ckItem: string
  type: FieldType
  ckType: string
  ckQuestion: string
  ckRequirement?: string
  ckChoice?: string
  placeholder?: string
  helpText?: string
  fScore?: string
  maxScore?: number
  required?: boolean
  validationRules?: ValidationRule[]
  allowAttach?: boolean
  attachmentConfig?: {
    maxFiles?: number
    maxSize?: number
    allowedTypes?: string[]
    required?: boolean
  }
  order: number
  section?: string
  width?: 'full' | 'half' | 'third' | 'quarter'
  isVisible?: boolean
  createdAt: string | Date | Timestamp
  updatedAt: string | Date | Timestamp
  createdBy: string
  notes?: string
}

// ========================================
// FORM SETTINGS (เฉพาะที่จำเป็น)
// ========================================

export interface FormSettings {
  allowMultipleSubmissions?: boolean
  maxSubmissions?: number
  requireAuthentication?: boolean
  saveAsDraft?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  showProgressBar?: boolean
  showFieldNumbers?: boolean
  theme?: 'default' | 'minimal' | 'corporate' | 'colorful'
  enableNotifications?: boolean
  notifyOnSubmission?: boolean
  notificationEmails?: string[]
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
  expiryDate?: string | Date | Timestamp
  responseLimit?: number
  startDate?: string | Date | Timestamp
  enableCaptcha?: boolean
}

// ========================================
// FORM ANALYTICS (เบื้องต้น)
// ========================================

export interface FormAnalytics {
  viewCount: number
  submitCount: number
  draftCount: number
  abandonmentCount: number
  averageCompletionTime?: number
  conversionRate?: number
  lastCalculated: string | Date | Timestamp
}

// ========================================
// MAIN FORM DOCUMENT (รวมเฉพาะที่จำเป็น)
// ========================================

export interface FormDoc {
  id?: string
  formCode: string
  formTitle: string
  formDescription?: string
  version: string
  isActive: boolean
  status: FormStatus
  isPublic?: boolean
  applicableTo: string[]
  category: FormCategory
  tags: string[]
  fields: FormField[]
  allowedRoles: string[]
  allowedDepartments: string[]
  allowAttach?: boolean
  attachmentConfig?: {
    maxFiles?: number
    maxSize?: number
    allowedTypes?: string[]
    storageLocation?: string
  }
  settings: FormSettings
  analytics?: FormAnalytics
  createdAt: string | Date | Timestamp
  updatedAt: string | Date | Timestamp
  createdBy: string
  lastModifiedBy?: string
  publishedAt?: string | Date | Timestamp
  publishedBy?: string
  archivedAt?: string | Date | Timestamp
  archivedBy?: string
  webhookUrl?: string
  apiEndpoint?: string
  parentFormId?: string
  exportFormats?: ('excel' | 'pdf' | 'csv' | 'json')[]
}

// ========================================
// PAGINATION (เรียบง่าย)
// ========================================

export interface PaginationState {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
  size?: number
  direction?: 'forward' | 'backward'
  cursor?: string
}

// ========================================
// FORM SUBMISSION (เบื้องต้น)
// ========================================

export interface FormSubmission {
  id?: string
  formId: string
  formCode: string
  formVersion: string
  
  // ข้อมูลการส่ง
  answers: Record<string, unknown>
  attachments?: Record<string, FileAttachment[]>
  
  // ข้อมูลผู้ส่ง
  submittedAt: string | Date | Timestamp
  submittedBy: string
  submitterInfo?: {
    name?: string
    email?: string
    department?: string
    roles?: string[]
    ipAddress?: string
    userAgent?: string
    deviceType?: 'desktop' | 'tablet' | 'mobile'
  }
  
  // สถานะการส่ง
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'processing'
  submissionType: 'manual' | 'auto' | 'imported' | 'migrated'
  
  // การให้คะแนน (ถ้ามี)
  scoring?: {
    totalScore?: number
    maxScore?: number
    percentage?: number
    grade?: string
    autoCalculated?: boolean
  }
  
  // การตรวจสอบและอนุมัติ
  review?: {
    reviewedAt?: string | Date | Timestamp
    reviewedBy?: string
    reviewComments?: string
    reviewScore?: number
    reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  }
  
  // ข้อมูลเพิ่มเติม
  metadata?: {
    source?: string
    importBatch?: string
    externalId?: string
    customFields?: Record<string, unknown>
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    tags?: string[]
  }
}

// ========================================
// FILTER STATE (เบื้องต้น)
// ========================================

export interface FormFilterState {
  search: string
  status: 'all' | FormStatus
  category: 'all' | FormCategory
  isActive: 'all' | 'active' | 'inactive'
  hasAttachments: 'all' | 'yes' | 'no'
  applicableTo: 'all' | string
  createdBy: 'all' | string
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
  tags: string[]
  hasAnalytics: 'all' | 'yes' | 'no'
  submissionCount: {
    min?: number
    max?: number
  }
  lastUpdated: {
    from?: string | Date | Timestamp
    to?: string | Date | Timestamp
  }
}

// ========================================
// API RESPONSE TYPES (เบื้องต้น)
// ========================================

export interface FormListResponse {
  forms: FormDoc[]
  pagination: PaginationState
  totalCount: number
  filters: FormFilterState
  aggregations?: {
    byCategory: Record<FormCategory, number>
    byStatus: Record<FormStatus, number>
    byCreator: Record<string, number>
    totalSubmissions: number
    averageConversionRate: number
  }
  executionTime?: number
  cacheHit?: boolean
}

export interface FormSubmissionResponse {
  submissions: FormSubmission[]
  pagination: PaginationState
  statistics?: {
    totalSubmissions: number
    averageScore: number
    completionRate: number
    averageTime: number
    statusBreakdown: Record<FormSubmission['status'], number>
  }
}

// ========================================
// SERVICE TYPES (เบื้องต้น)
// ========================================

export interface FormServiceConfig {
  cacheTimeout: number
  batchSize: number
  retryAttempts: number
  enableOffline: boolean
  apiTimeout: number
  enableDebug: boolean
  maxCacheSize: number
  compressionEnabled: boolean
}

export interface FormQueryOptions {
  limit?: number
  offset?: number
  sortBy?: SortBy
  sortOrder?: SortOrder
  filters?: Partial<FormFilterState>
  includeAnalytics?: boolean
  includeArchived?: boolean
  includeDrafts?: boolean
  dateRange?: {
    start?: string | Date | Timestamp
    end?: string | Date | Timestamp
  }
  searchFields?: string[]
  cacheKey?: string
  forceRefresh?: boolean
}

// ========================================
// BULK OPERATIONS (เบื้องต้น)
// ========================================

export interface BulkOperationRequest {
  action: 'delete' | 'archive' | 'activate' | 'deactivate' | 'export' | 'duplicate'
  formIds: string[]
  options?: {
    reason?: string
    batchSize?: number
    async?: boolean
    notifyUsers?: boolean
    preserveData?: boolean
  }
}

export interface BulkOperationResponse {
  success: boolean
  processedCount: number
  failedCount: number
  results: {
    formId: string
    success: boolean
    error?: string
  }[]
  jobId?: string
  estimatedTime?: number
}

// ========================================
// EXPORT TYPES (เบื้องต้น)
// ========================================

export interface ExportRequest {
  formIds?: string[]
  format: 'excel' | 'pdf' | 'csv' | 'json' | 'xml'
  includeSubmissions?: boolean
  includeAnalytics?: boolean
  dateRange?: {
    start?: string | Date | Timestamp
    end?: string | Date | Timestamp
  }
  filters?: Partial<FormFilterState>
  options?: {
    fileName?: string
    compression?: boolean
    password?: string
    watermark?: string
    template?: string
  }
}

export interface ExportResponse {
  success: boolean
  downloadUrl?: string
  fileName: string
  fileSize: number
  expiresAt: string | Date | Timestamp
  jobId?: string
  status: 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

// ========================================
// BACKWARD COMPATIBILITY (สำหรับ CSM)
// ========================================

// เพื่อให้ CSM ใช้ได้ โดยไม่ต้องเปลี่ยนโค้ดเดิม
export interface CSMFormField extends FormField {
  // เพิ่มเติมเฉพาะสำหรับ CSM
  tScore?: string
}

export interface CSMFormDoc extends FormDoc {
  // เพิ่มเติมเฉพาะสำหรับ CSM
  // สามารถเพิ่มได้ตามต้องการ
}

// ========================================
// TYPE ALIASES
// ========================================

export type OptionType = SelectOption  // เก่า -> ใหม่

// ========================================
// EXPORT ALL TYPES
// ========================================
/*
export type {
  FormDoc,
  FormField,
  FormSubmission,
  FormSettings,
  FormAnalytics,
  FileAttachment,
  ValidationRule,
  SelectOption,
  ScoreOption,
  PaginationState,
  PaginationOptions,
  FormFilterState,
  FormListResponse,
  FormSubmissionResponse,
  FormServiceConfig,
  FormQueryOptions,
  BulkOperationRequest,
  BulkOperationResponse,
  ExportRequest,
  ExportResponse
}*/