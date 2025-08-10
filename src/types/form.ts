// src/types/forms.ts - Core Types
import type { DateInput } from '../utils/dateUtils';

// =================== BASIC TYPES ===================
export type FormStatus = 'draft' | 'published' | 'archived' | 'suspended';
export type FormCategory = 'inspection' | 'assessment' | 'survey' | 'application' | 'audit' | 'report' | 'other';
export type ViewMode = 'grid' | 'list' | 'table';
export type SortOrder = 'asc' | 'desc';
export type SortBy = 'title' | 'code' | 'updated' | 'created' | 'submissions';

export type FieldType = 
  | 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'password'
  | 'number' | 'decimal' | 'currency' | 'percentage'
  | 'date' | 'datetime' | 'time'
  | 'radio' | 'checkbox' | 'select' | 'multiselect'
  | 'file' | 'image' | 'signature'
  | 'rating' | 'scale' | 'yesno' | 'score'
  | 'heading' | 'paragraph' | 'divider' | 'html';

// =================== UTILITY INTERFACES ===================
export interface OptionType {
  value: string;
  label: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: DateInput;
  uploadedBy: string;
  thumbnail?: string;
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'phone' | 'url' | 'custom';
  value?: number | string;
  message?: string;
  customValidator?: string;
}

export interface PaginationOptions {
  page?: number;          // หน้าปัจจุบัน (เริ่มต้นที่ 1)
  limit?: number;         // จำนวนรายการต่อหน้า
  offset?: number;        // จำนวนรายการที่จะข้าม
  size?: number;          // ขนาดของแต่ละหน้า (เหมือน limit)
  direction?: 'forward' | 'backward';
  cursor?: string; 
}

// =================== FORM FIELD ===================
export interface FormField {
  id: string;
  ckItem: string;
  type: FieldType;
  ckType: string;
  ckQuestion: string;
  ckRequirement?: string;
  ckChoice?:string;
  placeholder?: string;
  helpText?: string;
  fScore?: string;
  maxScore?: number;
  required?: boolean;
  validationRules?: ValidationRule[];
  allowAttach?: boolean;
  attachmentConfig?: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  };
  order: number;
  section?: string;
  width?: 'full' | 'half' | 'third' | 'quarter';
  isVisible?: boolean;
  createdAt: DateInput;
  updatedAt: DateInput;
  createdBy: string;
  notes?: string;
}

// =================== FORM SETTINGS ===================
export interface FormSettings {
  allowMultipleSubmissions?: boolean;
  maxSubmissions?: number;
  requireAuthentication?: boolean;
  saveAsDraft?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  showProgressBar?: boolean;
  showFieldNumbers?: boolean;
  theme?: 'default' | 'minimal' | 'corporate' | 'colorful';
  customCSS?: string;
  enableNotifications?: boolean;
  notifyOnSubmission?: boolean;
  notificationEmails?: string[];
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  showValidationSummary?: boolean;
  enableAnalytics?: boolean;
  trackingCode?: string;
  customScript?: string;
  expiryDate?: DateInput;
  responseLimit?: number;
  startDate?: DateInput;
  enableCaptcha?: boolean;
  ipRestrictions?: string[];
  deviceRestrictions?: ('desktop' | 'tablet' | 'mobile')[];
}

// =================== FORM ANALYTICS ===================
export interface FormAnalytics {
  viewCount: number;
  submitCount: number;
  draftCount: number;
  abandonmentCount: number;
  averageCompletionTime?: number;
  averageFieldTime?: Record<string, number>;
  conversionRate?: number;
  fieldAnalytics?: Record<string, {
    skipCount: number;
    errorCount: number;
    averageTime: number;
    validationErrors: string[];
  }>;
  dailyStats?: Record<string, { views: number; submissions: number }>;
  hourlyPattern?: number[];
  deviceBreakdown?: { desktop: number; tablet: number; mobile: number };
  browserBreakdown?: Record<string, number>;
  locationBreakdown?: Record<string, number>;
  lastCalculated: DateInput;
}

// =================== MAIN FORM DOCUMENT ===================
export interface FormDoc {
  id?: string;
  formCode: string;
  formTitle: string;
  formDescription?: string;
  version: string;
  isActive: boolean;
  status: FormStatus;
  isPublic?: boolean;
  applicableTo: string[];
  category: FormCategory;
  tags: string[];
  fields: FormField[];
  allowedRoles: string[];
  allowedDepartments: string[];
  allowAttach?: boolean;
  attachmentConfig?: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
    storageLocation?: string;
  };
  settings: FormSettings;
  analytics?: FormAnalytics;
  createdAt: DateInput;
  updatedAt: DateInput;
  createdBy: string;
  lastModifiedBy?: string;
  publishedAt?: DateInput;
  publishedBy?: string;
  archivedAt?: DateInput;
  archivedBy?: string;
  webhookUrl?: string;
  apiEndpoint?: string;
  parentFormId?: string;
  versionHistory?: {
    version: string;
    changes: string;
    modifiedAt: DateInput;
    modifiedBy: string;
  }[];
  exportFormats?: ('excel' | 'pdf' | 'csv' | 'json')[];
  backupSettings?: {
    autoBackup: boolean;
    backupInterval: number;
    retentionPeriod: number;
  };
}

// =================== PAGINATION ===================
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// src/types/forms.ts - เพิ่ม types ที่ขาดหายไป
// =================== SERVICE & QUERY TYPES ===================

export interface FormServiceConfig {
  cacheTimeout: number;           // เวลา cache หมดอายุ (ms)
  batchSize: number;             // ขนาด batch สำหรับการประมวลผล
  retryAttempts: number;         // จำนวนครั้งที่ลองใหม่เมื่อเกิดข้อผิดพลาด
  enableOffline: boolean;        // รองรับการทำงาน offline
  apiTimeout: number;            // เวลา timeout สำหรับ API calls (ms)
  enableDebug: boolean;          // เปิด debug mode
  maxCacheSize: number;          // ขนาดสูงสุดของ cache (MB)
  compressionEnabled: boolean;   // เปิดใช้การบีบอัดข้อมูล
}

export interface FormQueryOptions {
  limit?: number;                        // จำนวนผลลัพธ์ต่อหน้า
  offset?: number;                       // เริ่มต้นจากรายการที่
  sortBy?: SortBy;                       // เรียงตาม field ไหน
  sortOrder?: SortOrder;                 // เรียงแบบ asc หรือ desc
  filters?: Partial<FormFilterState>;   // ตัวกรองข้อมูล
  includeAnalytics?: boolean;            // รวมข้อมูล analytics หรือไม่
  includeArchived?: boolean;             // รวมข้อมูลที่เก็บถาวรหรือไม่
  includeDrafts?: boolean;               // รวมข้อมูลร่างหรือไม่
  dateRange?: {                          // ช่วงวันที่
    start?: DateInput;
    end?: DateInput;
  };
  searchFields?: string[];               // field ที่ต้องการค้นหา
  cacheKey?: string;                     // key สำหรับ cache
  forceRefresh?: boolean;                // บังคับ refresh ข้อมูล
}

// =================== FORM SUBMISSION TYPES ===================

export interface FormSubmission {
  id?: string;                           // ID ของ submission
  formId: string;                        // ID ของแบบฟอร์ม
  formCode: string;                      // รหัสแบบฟอร์ม
  formVersion: string;                   // เวอร์ชันของแบบฟอร์ม
  
  // ข้อมูลการส่ง
  answers: Record<string, unknown>;      // คำตอบทั้งหมด { fieldId: value }
  attachments?: Record<string, FileAttachment[]>; // ไฟล์แนบ { fieldId: files[] }
  
  // ข้อมูลผู้ส่ง
  submittedAt: DateInput;                // วันเวลาที่ส่ง
  submittedBy: string;                   // ผู้ส่ง (email หรือ ID)
  submitterInfo?: {                      // ข้อมูลเพิ่มเติมของผู้ส่ง
    name?: string;
    email?: string;
    department?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    sessionId?: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile';
    browserInfo?: {
      name: string;
      version: string;
    };
  };
  
  // สถานะการส่ง
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'processing';
  submissionType: 'manual' | 'auto' | 'imported' | 'migrated';
  
  // การให้คะแนน (ถ้ามี)
  scoring?: {
    totalScore?: number;                 // คะแนนรวม
    maxScore?: number;                   // คะแนนเต็ม
    percentage?: number;                 // เปอร์เซ็นต์
    grade?: string;                      // เกรด (A, B, C, etc.)
    autoCalculated?: boolean;            // คำนวณอัตโนมัติหรือไม่
    manualAdjustments?: {                // การปรับคะแนนด้วยตนเอง
      fieldId: string;
      originalScore: number;
      adjustedScore: number;
      reason: string;
      adjustedBy: string;
      adjustedAt: DateInput;
    }[];
  };
  
  // การตรวจสอบและอนุมัติ
  review?: {
    reviewedAt?: DateInput;              // วันที่ตรวจสอบ
    reviewedBy?: string;                 // ผู้ตรวจสอบ
    reviewComments?: string;             // ความเห็นของผู้ตรวจสอบ
    reviewScore?: number;                // คะแนนจากผู้ตรวจสอบ
    reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision';
    reviewHistory?: {                    // ประวัติการตรวจสอบ
      date: DateInput;
      reviewer: string;
      action: string;
      comments: string;
    }[];
  };
  
  // Workflow และ Approval Chain
  workflow?: {
    currentStep: number;                 // ขั้นตอนปัจจุบัน
    totalSteps: number;                  // ขั้นตอนทั้งหมด
    approvalChain: {
      step: number;
      approver: string;                  // ผู้อนุมัติ
      approverRole: string;              // ตำแหน่งผู้อนุมัติ
      status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'skipped';
      deadline?: DateInput;              // กำหนดเวลาอนุมัติ
      approvedAt?: DateInput;            // วันที่อนุมัติ
      comments?: string;                 // ความเห็น
      isOptional?: boolean;              // อนุมัติเป็นทางเลือกหรือไม่
      delegatedTo?: string;              // มอบหมายให้ใคร (ถ้ามี)
    }[];
  };
  
  // ข้อมูลเพิ่มเติม
  metadata?: {
    source?: string;                     // แหล่งที่มาของข้อมูล
    importBatch?: string;                // กลุ่มการนำเข้า
    migrationId?: string;                // ID การ migrate
    externalId?: string;                 // ID จากระบบภายนอก
    customFields?: Record<string, unknown>; // ข้อมูลเพิ่มเติมที่กำหนดเอง
    flags?: string[];                    // ป้ายกำกับพิเศษ
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];                     // แท็กสำหรับจัดหมวดหมู่
  };
  
  // การติดตาม
  tracking?: {
    startedAt?: DateInput;               // เริ่มกรอกเมื่อไหร่
    timeSpent?: number;                  // เวลาที่ใช้ในการกรอก (วินาที)
    pageViews?: number;                  // จำนวนครั้งที่ดูหน้า
    fieldCompletionOrder?: string[];     // ลำดับการกรอก field
    validationErrors?: {                 // ข้อผิดพลาดในการ validate
      fieldId: string;
      error: string;
      timestamp: DateInput;
    }[];
    saveCount?: number;                  // จำนวนครั้งที่บันทึกแบบร่าง
  };
  
  // การแจ้งเตือน
  notifications?: {
    emailSent?: boolean;                 // ส่งอีเมลแจ้งเตือนแล้วหรือไม่
    smsSent?: boolean;                   // ส่ง SMS แจ้งเตือนแล้วหรือไม่
    lastNotificationAt?: DateInput;      // ครั้งล่าสุดที่แจ้งเตือน
    notificationHistory?: {              // ประวัติการแจ้งเตือน
      type: 'email' | 'sms' | 'push' | 'webhook';
      recipient: string;
      sentAt: DateInput;
      status: 'sent' | 'delivered' | 'failed' | 'bounced';
      message?: string;
    }[];
  };
  
  // ข้อมูลเทคนิค
  technical?: {
    checksum?: string;                   // checksum สำหรับตรวจสอบความถูกต้อง
    version?: number;                    // version ของ submission
    lastModified?: DateInput;            // แก้ไขครั้งล่าสุด
    size?: number;                       // ขนาดข้อมูล (bytes)
    backupLocation?: string;             // ตำแหน่งข้อมูลสำรอง
    encryptionStatus?: 'none' | 'partial' | 'full'; // สถานะการเข้ารหัส
  };
}

// =================== FILTER STATE TYPES ===================

export interface FormFilterState {
  search: string;                        // คำค้นหา
  status: 'all' | FormStatus;            // สถานะฟอร์ม
  category: 'all' | FormCategory;        // หมวดหมู่
  isActive: 'all' | 'active' | 'inactive'; // สถานะการใช้งาน
  hasAttachments: 'all' | 'yes' | 'no';   // มีไฟล์แนบหรือไม่
  applicableTo: 'all' | string;          // ใช้สำหรับ
  createdBy: 'all' | string;             // ผู้สร้าง
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  tags: string[];                        // แท็ก
  hasAnalytics: 'all' | 'yes' | 'no';    // มีข้อมูล analytics หรือไม่
  submissionCount: {                     // จำนวนการส่ง
    min?: number;
    max?: number;
  };
  conversionRate: {                      // อัตราการแปลง
    min?: number;
    max?: number;
  };
  lastUpdated: {                         // วันที่อัปเดตล่าสุด
    from?: DateInput;
    to?: DateInput;
  };
}

// =================== API RESPONSE TYPES ===================

export interface FormListResponse {
  forms: FormDoc[];                      // รายการฟอร์ม
  pagination: PaginationState;           // ข้อมูล pagination
  totalCount: number;                    // จำนวนทั้งหมด
  filters: FormFilterState;              // ตัวกรองที่ใช้
  aggregations?: {                       // ข้อมูลสถิติ
    byCategory: Record<FormCategory, number>;
    byStatus: Record<FormStatus, number>;
    byCreator: Record<string, number>;
    totalSubmissions: number;
    averageConversionRate: number;
  };
  executionTime?: number;                // เวลาที่ใช้ในการ query (ms)
  cacheHit?: boolean;                    // ข้อมูลมาจาก cache หรือไม่
}

export interface FormSubmissionResponse {
  submissions: FormSubmission[];         // รายการ submission
  pagination: PaginationState;           // ข้อมูล pagination
  statistics?: {                         // สถิติ
    totalSubmissions: number;
    averageScore: number;
    completionRate: number;
    averageTime: number;
    statusBreakdown: Record<FormSubmission['status'], number>;
  };
}

// =================== BULK OPERATION TYPES ===================

export interface BulkOperationRequest {
  action: 'delete' | 'archive' | 'activate' | 'deactivate' | 'export' | 'duplicate';
  formIds: string[];                     // รายการ ID ที่ต้องการดำเนินการ
  options?: {                            // ตัวเลือกเพิ่มเติม
    reason?: string;                     // เหตุผล
    batchSize?: number;                  // ขนาด batch
    async?: boolean;                     // ทำแบบ async หรือไม่
    notifyUsers?: boolean;               // แจ้งเตือนผู้ใช้หรือไม่
    preserveData?: boolean;              // เก็บข้อมูลไว้หรือไม่
  };
}

export interface BulkOperationResponse {
  success: boolean;                      // สำเร็จหรือไม่
  processedCount: number;                // จำนวนที่ประมวลผลแล้ว
  failedCount: number;                   // จำนวนที่ล้มเหลว
  results: {                             // ผลลัพธ์รายตัว
    formId: string;
    success: boolean;
    error?: string;
  }[];
  jobId?: string;                        // ID ของงาน (สำหรับ async)
  estimatedTime?: number;                // เวลาที่คาดว่าจะเสร็จ (วินาที)
}

// =================== EXPORT TYPES ===================

export interface ExportRequest {
  formIds?: string[];                    // ฟอร์มที่ต้องการ export
  format: 'excel' | 'pdf' | 'csv' | 'json' | 'xml';
  includeSubmissions?: boolean;          // รวม submission หรือไม่
  includeAnalytics?: boolean;            // รวม analytics หรือไม่
  dateRange?: {                          // ช่วงวันที่
    start?: DateInput;
    end?: DateInput;
  };
  filters?: Partial<FormFilterState>;    // ตัวกรอง
  options?: {                            // ตัวเลือกการ export
    fileName?: string;                   // ชื่อไฟล์
    compression?: boolean;               // บีบอัดหรือไม่
    password?: string;                   // รหัสผ่านป้องกัน
    watermark?: string;                  // ลายน้ำ
    template?: string;                   // template ที่ใช้
  };
}

export interface ExportResponse {
  success: boolean;                      // สำเร็จหรือไม่
  downloadUrl?: string;                  // URL สำหรับดาวน์โหลด
  fileName: string;                      // ชื่อไฟล์
  fileSize: number;                      // ขนาดไฟล์ (bytes)
  expiresAt: DateInput;                  // หมดอายุเมื่อไหร่
  jobId?: string;                        // ID ของงาน export
  status: 'processing' | 'completed' | 'failed';
  progress?: number;                     // ความคืบหน้า (0-100)
  error?: string;                        // ข้อผิดพลาด (ถ้ามี)
}

// =================== WEBHOOK TYPES ===================

export interface WebhookConfig {
  url: string;                           // URL ที่จะส่ง webhook
  events: ('form.created' | 'form.updated' | 'form.deleted' | 
          'submission.created' | 'submission.updated' | 'submission.approved')[];
  headers?: Record<string, string>;      // Headers เพิ่มเติม
  secret?: string;                       // Secret สำหรับ verification
  retryConfig?: {                        // การลองใหม่
    maxRetries: number;
    retryDelay: number;                  // หน่วงเวลาระหว่างการลองใหม่ (ms)
  };
  isActive: boolean;                     // เปิดใช้งานหรือไม่
}

export interface WebhookPayload {
  event: string;                         // ชื่อ event
  timestamp: DateInput;                  // เวลาที่เกิด event
  data: {                                // ข้อมูล
    form?: FormDoc;
    submission?: FormSubmission;
    changes?: Record<string, unknown>;   // การเปลี่ยนแปลง
  };
  metadata?: {                           // ข้อมูลเพิ่มเติม
    source: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
}

