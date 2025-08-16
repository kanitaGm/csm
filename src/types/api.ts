// 📁 src/types/api.ts - Complete API Types

import { Timestamp } from 'firebase/firestore';
import type { Role } from './user';
import type { CSMRiskLevel } from './csm';

// ========================================
// ORGANIZATIONAL HIERARCHY TYPES
// ========================================

export interface Country {
  id: string;
  name: string;
  code: string; // ISO country code (TH, US, etc.)
  region?: string;
  timezone?: string;
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Zone {
  id: string;
  name: string;
  countryId: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Site {
  id: string;
  name: string;
  zoneId: string;
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Plant {
  id: string;
  name: string;
  siteId: string;
  type?: 'manufacturing' | 'warehouse' | 'office' | 'research';
  capacity?: number;
  isActive: boolean;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export interface Company {
  id?: string; // Firestore Document ID
  companyId: string; // Unique Company Identifier
  name: string; // ชื่อบริษัท
  type: 'client' | 'contractor' | 'vendor' | 'partner'| 'transportor' | 'internal';
  isActive: boolean;
  
  // Contact Information
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  
  // Business Information
  registrationNumber?: string;
  taxId?: string;
  industry?: string;
  workingArea?: string[]; // พื้นที่ที่ทำงาน
  
  // Relationships
  parentCompanyId?: string;
  subsidiaries?: string[];
  
  // CSM Related
  riskLevel?: CSMRiskLevel;
  lastAssessmentDate?: Timestamp | Date | string;
  nextAssessmentDue?: Timestamp | Date | string;
  
  // System Fields
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  createdBy?: string;
  updatedBy?: string;
}

// ========================================
// API RESPONSE PATTERNS
// ========================================

/**
 * Basic API Response Structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string | Date;
  
  // Optional metadata
  meta?: {
    version?: string;
    requestId?: string;
    executionTime?: number;
    fromCache?: boolean;
  };
}

/**
 * API Response with Pagination
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    
    // Cursor-based pagination (for large datasets)
    nextCursor?: string;
    prevCursor?: string;
  };
  
  // Aggregated data
  aggregations?: Record<string, unknown>;
}

/**
 * API Response for List with Filters
 */
export interface FilteredApiResponse<T> extends PaginatedApiResponse<T> {
  filters: {
    applied: Record<string, unknown>;
    available: Record<string, unknown[]>;
  };
  
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
    available: string[];
  };
}

// ========================================
// AUTHENTICATION API TYPES
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    ipAddress?: string;
  };
}

export interface LoginResponse {
  user: {
    id: string;
    empId?: string;
    email: string;
    name: string;
    displayName?: string;
    roles: Role[]; // ✅ ใช้ Role[] แทน string[]
    avatar?: string;
    preferences?: {
      theme: 'light' | 'dark';
      language: 'th' | 'en';
    };
  };
  
  // Tokens
  token: string;
  refreshToken: string;
  expiresIn: number;
  
  // Session info
  sessionId?: string;
  lastLoginAt?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  displayName?: string;
  department?: string;
  empId?: string;
  invitationCode?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
  };
}

export interface LogoutRequest {
  sessionId?: string;
  allDevices?: boolean;
}

// ========================================
// EMPLOYEE API TYPES
// ========================================

export interface EmployeeApiResponse {
  id: string;
  empId: string;
  email?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    position?: string;
    department?: string;
    avatar?: string;
  };
  
  employment: {
    status: 'active' | 'inactive' | 'terminated' | 'pending';
    type: 'employee' | 'contractor' | 'transporter' | 'driver';
    startDate?: string;
    company?: string;
    location?: {
      countryId?: string;
      zoneId?: string;
      siteId?: string;
      plantId?: string;
    };
  };
  
  system: {
    createdAt: string;
    updatedAt: string;
    lastSeenAt?: string;
  };
}

export interface EmployeeSearchRequest {
  query?: string;
  filters?: {
    company?: string;
    status?: string;
    employeeType?: string;
    department?: string;
    location?: {
      countryId?: string;
      zoneId?: string;
      siteId?: string;
      plantId?: string;
    };
  };
  
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  pagination?: {
    page: number;
    limit: number;
    cursor?: string;
  };
}

// ========================================
// CSM API TYPES
// ========================================

export interface CSMAssessmentApiResponse {
  id: string;
  vendorId: string;
  formId: string;
  
  assessment: {
    status: 'draft' | 'in-progress' | 'completed' | 'expired';
    score?: number;
    maxScore?: number;
    percentage?: number;
    riskLevel?: CSMRiskLevel;
  };
  
  vendor: {
    name: string;
    type: string;
    industry?: string;
  };
  
  schedule: {
    dueDate?: string;
    completedAt?: string;
    nextAssessmentDue?: string;
  };
  
  system: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastModifiedBy?: string;
  };
}

export interface CSMVendorSearchRequest {
  query?: string;
  filters?: {
    riskLevel?: string;
    industry?: string;
    assessmentStatus?: string;
    dueDate?: {
      from?: string;
      to?: string;
    };
  };
  
  sorting?: {
    field: 'name' | 'riskLevel' | 'lastAssessment' | 'nextDue';
    direction: 'asc' | 'desc';
  };
  
  pagination?: {
    page: number;
    limit: number;
  };
}

// ========================================
// FORM API TYPES
// ========================================

export interface FormApiResponse {
  id: string;
  code: string;
  title: string;
  version: string;
  
  metadata: {
    category: string;
    status: 'draft' | 'published' | 'archived';
    isActive: boolean;
    applicableTo?: string[];
  };
  
  structure: {
    fieldCount: number;
    hasScoring: boolean;
    hasFileUpload: boolean;
    estimatedTime?: number; // minutes
  };
  
  statistics?: {
    totalSubmissions: number;
    averageScore?: number;
    completionRate?: number;
  };
  
  system: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    publishedAt?: string;
  };
}

// ========================================
// UI STATE TYPES
// ========================================

export interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
  
  // Extended states
  isRefreshing?: boolean;
  lastUpdated?: string;
  retryCount?: number;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// ========================================
// VALIDATION TYPES
// ========================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  
  // Field-level validation
  fieldErrors?: Record<string, string[]>;
  
  // Additional context
  validatedAt?: string;
  validator?: string;
}

export interface BulkValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: Array<{
    index: number;
    isValid: boolean;
    errors: string[];
    data?: Record<string, unknown>;
  }>;
}

// ========================================
// SEARCH & FILTER TYPES
// ========================================

export interface SearchRequest {
  query: string;
  searchIn?: string[]; // fields to search in
  
  filters?: Record<string, unknown>;
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  
  pagination?: {
    page: number;
    limit: number;
    offset?: number;
  };
  
  options?: {
    exactMatch?: boolean;
    caseSensitive?: boolean;
    includeInactive?: boolean;
  };
}

export interface SearchResponse<T> extends PaginatedApiResponse<T> {
  searchInfo: {
    query: string;
    totalMatches: number;
    searchTime: number;
    suggestions?: string[];
  };
  
  highlights?: Record<string, string[]>;
}

// ========================================
// EXPORT TYPES
// ========================================

export interface ExportRequest {
  type: 'csv' | 'excel' | 'pdf' | 'json';
  data: {
    source: string; // collection or endpoint
    filters?: Record<string, unknown>;
    fields?: string[];
  };
  
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    timezone?: string;
    template?: string;
  };
  
  delivery?: {
    method: 'download' | 'email';
    email?: string;
    expiresIn?: number; // hours
  };
}

export interface ExportResponse {
  success: boolean;
  exportId: string;
  status: 'processing' | 'completed' | 'failed';
  
  result?: {
    downloadUrl?: string;
    fileName: string;
    fileSize: number;
    recordCount: number;
    expiresAt: string;
  };
  
  progress?: {
    percentage: number;
    currentStep: string;
    estimatedTimeRemaining?: number; // seconds
  };
  
  error?: string;
}

// ========================================
// SYSTEM HEALTH & MONITORING
// ========================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastChecked: string;
  }>;
  
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    database: {
      connections: number;
      avgResponseTime: number;
    };
  };
}

export interface MetricsResponse {
  metrics: Array<{
    name: string;
    value: number;
    unit?: string;
    timestamp: string;
    tags?: Record<string, string>;
  }>;
  
  timeRange: {
    start: string;
    end: string;
    interval: string;
  };
}

// ========================================
// WEBHOOK & NOTIFICATION TYPES
// ========================================

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  
  source: {
    service: string;
    version: string;
    environment: string;
  };
  
  signature?: string;
}

export interface NotificationRequest {
  type: 'email' | 'sms' | 'push' | 'in-app';
  recipients: string[];
  
  content: {
    title: string;
    message: string;
    actionUrl?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
  
  scheduling?: {
    sendAt?: string;
    timezone?: string;
  };
  
  tracking?: {
    trackOpens?: boolean;
    trackClicks?: boolean;
  };
}