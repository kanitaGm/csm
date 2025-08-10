// src/types/user.ts  ** type for user access only
import { Timestamp } from 'firebase/firestore';
import type { EmployeeProfile } from './employees';

export type Role = 'superadmin' | 'admin' | 'plantAdmin' | 'csmAdmin' | 'guest';

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