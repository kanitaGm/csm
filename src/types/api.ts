// src/types/api.ts  ** type for api only
import { Timestamp } from 'firebase/firestore';
import type { PaginationOptions } from './form';

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
  id?: string;  // Firestore Document ID
  companyId: string; // Unique Company Identifier  
  name: string; // ชื่อบริษัท
  type:string;
  isActive: boolean;
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
export interface UIState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationOptions;
  timestamp: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}


export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}