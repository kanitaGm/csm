// src/types/user.ts  ** type for user access only
import { Timestamp } from 'firebase/firestore';

export type Role = 'superadmin' | 'admin' | 'plantAdmin' | 'csmAdmin' | 'guest';

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
export interface EmployeeProfile extends BaseEmployeeData {
  id: string; // Firestore document ID
  email: string; // ✅ ทำให้ required
  searchKeywords: string[]; // **สำคัญมาก** สำหรับการค้นหา
  createdAt: Timestamp | Date | string; // ✅ ทำให้ required
  updatedAt: Timestamp | Date | string; // ✅ ทำให้ required
  [key: string]: unknown; // ✅ เก็บไว้สำหรับ flexibility
}

// User
export interface UserRole {
  uid?: string; // Firebase Auth UID
  empId: string;
  email: string;  
  avatar?: string;  
  displayName: string | null;  
  department?: string;
  passcode?: string; // Only for internal users  
  createdAt?: Timestamp | Date | string ; 
  updatedAt?: Timestamp | Date | string ; 
  updatedBy?: string;
  isActive: boolean;
  role: Role;
  managedCountry?: string[];
  managedZones?: string[];
  managedSites?: string[];
  managedPlants?: string[];  
}

export interface UserProfile extends UserRole {
  preferences: {
    theme: 'light' | 'dark';
    language: 'th' | 'en';
    notifications: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole['role'];
}

export interface UserPermissions {
    empId: string;
    email: string;
    role: Role;
    isActive: boolean;
    passcode?: string; 
    displayName?: string;
}

/////  AppUser  ///////
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
};

//  LoginResult
export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  redirecting?: boolean; // ใช้สำหรับการเปลี่ยนเส้นทางหลังจากล็อกอินสำเร็จ
  message?: string; 
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