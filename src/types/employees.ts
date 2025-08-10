// src/types/employee.ts - Employee Types
import { Timestamp } from 'firebase/firestore';

export type EmployeeType = 'employee' | 'contractor' | 'transporter' | 'driver' | 'pending';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated' | 'pending' | 'blacklist';
export type SortField = 'empId' | 'firstName' | 'lastName' | 'company' | 'department' | 'status' | 'createdAt';
export type SortDirection = 'asc' | 'desc';


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
  department?: string;
}

//  EmployeeFormState - ปรับให้สอดคล้องกับ BaseEmployeeData
export interface EmployeeFormState extends Partial<BaseEmployeeData> {
  //email: string;
  level?: string; 
  nickname?: string;    
  siteId?: string; 
  zoneId?: string;
  countryId?: string;
  startDate?: string | Date;
  lastUpdateBy?: string;
  searchKeywords?: string[];
}

// EmployeeProfile - ปรับให้ realistic มากขึ้น
export interface EmployeeProfile extends EmployeeFormState {
  id: string; // Firestore document ID
  email: string; // ✅ ทำให้ required
  searchKeywords: string[]; // **สำคัญมาก** สำหรับการค้นหา
  createdAt: Timestamp | Date | string; // ✅ ทำให้ required
  updatedAt: Timestamp | Date | string; // ✅ ทำให้ required
  [key: string]: unknown; // ✅ เก็บไว้สำหรับ flexibility
}



export interface EmployeeFilters {
  company?: string;
  employeeType?: string;
  status?: string;
  department?: string;
  level?: string;
  search?: string;
}



export interface DuplicateCheck {
  rowIndex: number;
  empId?: string;
  idCard?: string;
  email?: string;
  duplicateType: 'database' | 'csv';
  duplicateFields: string[];
  existingId?: string;
}

// Form validation
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}


// Performance monitoring
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// File handling
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  minWidth?: number;
  minHeight?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
  };
}