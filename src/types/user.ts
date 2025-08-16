// 📁 src/types/user.ts - Complete User Types with Role Management

import { Timestamp } from 'firebase/firestore';
import type { EmployeeProfile } from './employees';

// ========================================
// ROLE TYPES
// ========================================

export type Role =
  | 'superAdmin'
  | 'admin'
  | 'csmAdmin'
  | 'csmAuditor'
  | 'auditor'
  | 'plantAdmin'
  | 'guest';

// ========================================
// USER ROLE INTERFACE
// ========================================

export interface UserRole {
  uid?: string; // Firebase Auth UID
  empId: string;
  email: string;
  avatar?: string;
  displayName: string | null;
  department?: string;
  passcode?: string; // Only for internal users
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  updatedBy?: string;
  isActive: boolean;
  roles: Role[]; //  array เสมอ

  // Enhanced Permissions Structure
  permissions: {
    csm?: {
      canEvaluate: boolean;
      canApprove: boolean;
      canManageVendors: boolean;
      canViewReports: boolean;
      canExportData: boolean;
      canManageForms: boolean;
    };
    employees?: {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canImport: boolean;
    };
    system?: {
      canManageUsers: boolean;
      canViewLogs: boolean;
      canBackupRestore: boolean;
      canManageSettings: boolean;
    };
  };

  // Geographic/Organizational Scope
  managedCountry?: string[];
  managedZones?: string[];
  managedSites?: string[];
  managedPlants?: string[];
}

// ========================================
// USER PERMISSIONS & APP USER
// ========================================

export interface UserPermissions {
  empId: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  passcode?: string;
  displayName?: string;
}

export interface AppUser {
  uid: string;
  empId: string | null;
  email: string | null;
  displayName: string | null;
  roles: Role[];
  permissions: UserRole['permissions'];
  profile: EmployeeProfile | { displayName: string | null };
  loginType: 'provider' | 'firebase' | 'internal' | null;
}

// ========================================
// AUTH INTERFACES
// ========================================

export interface EmployeeLogin {
  empId: string;
  passcode: string;
}

export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  redirecting?: boolean;
  message?: string;
}

export interface AuthContextType {
  user: AppUser | null;
  currentUser: unknown; // Firebase User object
  empUser: EmployeeProfile | null; // Employee login user
  firebaseLinkedEmpProfile: EmployeeProfile | null; // Firebase linked employee profile
  loginType: 'provider' | 'firebase' | 'internal' | null;
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

// ========================================
// ADDITIONAL INTERFACES
// ========================================

export interface CreateUserRequest {
  email: string;
  name: string;
  roles: Role[];
}

export interface UserProfile extends UserRole {
  preferences: {
    theme: 'light' | 'dark';
    language: 'th' | 'en';
    notifications: boolean;
  };
}

// ========================================
// DEFAULT PERMISSIONS
// ========================================

export const DEFAULT_PERMISSIONS: UserRole['permissions'] = {
  csm: {
    canEvaluate: false,
    canApprove: false,
    canManageVendors: false,
    canViewReports: false,
    canExportData: false,
    canManageForms: false,
  },
  employees: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canImport: false,
  },
  system: {
    canManageUsers: false,
    canViewLogs: false,
    canBackupRestore: false,
    canManageSettings: false,
  },
};

// ========================================
// ROLE PERMISSIONS MAPPING
// ========================================

export const ROLE_PERMISSIONS: Record<Role, UserRole['permissions']> = {
  superAdmin: {
    csm: {
      canEvaluate: true,
      canApprove: true,
      canManageVendors: true,
      canViewReports: true,
      canExportData: true,
      canManageForms: true,
    },
    employees: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canImport: true,
    },
    system: {
      canManageUsers: true,
      canViewLogs: true,
      canBackupRestore: true,
      canManageSettings: true,
    },
  },
  admin: {
    csm: {
      canEvaluate: true,
      canApprove: true,
      canManageVendors: true,
      canViewReports: true,
      canExportData: true,
      canManageForms: true,
    },
    employees: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canImport: true,
    },
    system: {
      canManageUsers: true,
      canViewLogs: true,
      canBackupRestore: false,
      canManageSettings: true,
    },
  },
  csmAdmin: {
    csm: {
      canEvaluate: true,
      canApprove: true,
      canManageVendors: true,
      canViewReports: true,
      canExportData: true,
      canManageForms: true,
    },
    employees: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
    },
    system: {
      canManageUsers: false,
      canViewLogs: false,
      canBackupRestore: false,
      canManageSettings: false,
    },
  },
  csmAuditor: {
    csm: {
      canEvaluate: true,
      canApprove: false,
      canManageVendors: false,
      canViewReports: true,
      canExportData: true,
      canManageForms: false,
    },
    employees: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
    },
    system: {
      canManageUsers: false,
      canViewLogs: false,
      canBackupRestore: false,
      canManageSettings: false,
    },
  },
  auditor: {
    csm: {
      canEvaluate: true,
      canApprove: false,
      canManageVendors: false,
      canViewReports: true,
      canExportData: false,
      canManageForms: false,
    },
    employees: {
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
    },
    system: {
      canManageUsers: false,
      canViewLogs: false,
      canBackupRestore: false,
      canManageSettings: false,
    },
  },
  plantAdmin: {
    csm: {
      canEvaluate: false,
      canApprove: false,
      canManageVendors: false,
      canViewReports: true,
      canExportData: false,
      canManageForms: false,
    },
    employees: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canImport: true,
    },
    system: {
      canManageUsers: false,
      canViewLogs: false,
      canBackupRestore: false,
      canManageSettings: false,
    },
  },
  guest: {
    csm: {
      canEvaluate: false,
      canApprove: false,
      canManageVendors: false,
      canViewReports: false,
      canExportData: false,
      canManageForms: false,
    },
    employees: {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
    },
    system: {
      canManageUsers: false,
      canViewLogs: false,
      canBackupRestore: false,
      canManageSettings: false,
    },
  },
};

// ========================================
// PERMISSION MANAGER CLASS
// ========================================

export class PermissionManager {
  /**
   * รวม permissions จากหลาย role
   */
  static combinePermissions(roles: Role[]): UserRole['permissions'] {
    const combined = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) as UserRole['permissions'];
    
    roles.forEach((role) => {
      const rolePermissions = ROLE_PERMISSIONS[role];
      if (rolePermissions) {
        // Merge CSM permissions
        Object.assign(combined.csm!, rolePermissions.csm || {});
        // Merge Employee permissions
        Object.assign(combined.employees!, rolePermissions.employees || {});
        // Merge System permissions
        Object.assign(combined.system!, rolePermissions.system || {});
      }
    });
    
    return combined;
  }

  /**
   * ตรวจสอบ permission เฉพาะ
   */
  static hasPermission(
    userRoles: Role[], 
    module: keyof UserRole['permissions'], 
    action: string
  ): boolean {
    const permissions = this.combinePermissions(userRoles);
    const modulePermissions = permissions[module];
    return modulePermissions ? (modulePermissions as any)[action] === true : false;
  }

  /**
   * ตรวจสอบ role hierarchy (สำคัญสำหรับ ProtectedRoute)
   */
  static checkRoleHierarchy(userRoles: Role[], requiredRole: Role | Role[]): boolean {
    const roleHierarchy = new Map<Role, number>([
      ['guest', 0],
      ['plantAdmin', 2],
      ['auditor', 3],
      ['csmAuditor', 4],
      ['csmAdmin', 5],
      ['admin', 6],
      ['superAdmin', 10],
    ]);

    const userMaxLevel = Math.max(...userRoles.map((r) => roleHierarchy.get(r) || 0));

    if (Array.isArray(requiredRole)) {
      return requiredRole.some((r) => userMaxLevel >= (roleHierarchy.get(r) || 0));
    }

    return userMaxLevel >= (roleHierarchy.get(requiredRole) || 0);
  }

  /**
   * หา role ที่สูงที่สุด
   */
  static getHighestRole(roles: Role[]): Role {
    const hierarchy: Role[] = ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'];
    
    for (const role of hierarchy) {
      if (roles.includes(role)) return role;
    }
    
    return 'guest';
  }

  /**
   * แปลง roles เป็นข้อความแสดงผล
   */
  static formatRolesForDisplay(roles: Role[]): string {
    const roleLabels = new Map<Role, string>([
      ['superAdmin', 'ผู้ดูแลระบบสูงสุด'],
      ['admin', 'ผู้ดูแลระบบ'],
      ['csmAdmin', 'ผู้ดูแลระบบ CSM'],
      ['csmAuditor', 'ผู้ตรวจสอบ CSM'],
      ['auditor', 'ผู้ตรวจสอบ'],
      ['plantAdmin', 'ผู้ดูแลโรงงาน'],
      ['guest', 'ผู้เข้าชม'],
    ]);

    return roles.map((r) => roleLabels.get(r) || r).join(', ');
  }

  /**
   * ตรวจสอบว่า role นั้นมีระดับสูงกว่าที่กำหนดหรือไม่
   */
  static hasMinimumRole(userRoles: Role[], minimumRole: Role): boolean {
    return this.checkRoleHierarchy(userRoles, minimumRole);
  }

  /**
   * รับ role ทั้งหมดที่สามารถเข้าถึงได้
   */
  static getAccessibleRoles(userRoles: Role[]): Role[] {
    const hierarchy = new Map<Role, number>([
      ['guest', 0],
      ['plantAdmin', 2],
      ['auditor', 3],
      ['csmAuditor', 4],
      ['csmAdmin', 5],
      ['admin', 6],
      ['superAdmin', 10],
    ]);

    const userMaxLevel = Math.max(...userRoles.map((r) => hierarchy.get(r) || 0));
    
    return Array.from(hierarchy.entries())
      .filter(([, level]) => level <= userMaxLevel)
      .map(([role]) => role);
  }
}

// ========================================
// ROLE MIGRATION HELPER
// ========================================

export class RoleMigrationHelper {
  /**
   * แปลงข้อมูล role จากรูปแบบต่างๆ เป็น Role[]
   */
  static toArray(input: unknown): Role[] {
    if (Array.isArray(input)) {
      return input.filter((r): r is Role => this.isValidRole(r));
    }
    
    if (typeof input === 'string') {
      if (input.includes(',')) {
        return input
          .split(',')
          .map((r) => r.trim())
          .filter((r): r is Role => this.isValidRole(r));
      }
      return this.isValidRole(input) ? [input] : ['guest'];
    }
    
    return ['guest'];
  }

  /**
   * ตรวจสอบว่าเป็น valid role หรือไม่
   */
  static isValidRole(role: string): role is Role {
    return ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'].includes(role);
  }

  /**
   * แปลง legacy role เป็น modern roles
   */
  static migrateLegacyRole(legacyRole: string): Role[] {
    const migrations: Record<string, Role[]> = {
      'manager': ['plantAdmin'],
      'supervisor': ['auditor'],
      'operator': ['guest'],
      'administrator': ['admin'],
      'superuser': ['superAdmin'],
    };

    return migrations[legacyRole] || ['guest'];
  }
}

// ========================================
// USER ROLE SERVICE
// ========================================

export class UserRoleService {
  /**
   * อัปเดต user roles (จะใช้จริงใน service layer)
   */
  static async updateUserRoles(userId: string, newRoles: Role[]): Promise<void> {
    const validation = RoleValidator.validateRoleCombination(newRoles);
    if (!validation.valid) {
      console.warn('Role validation warnings:', validation.warnings);
    }

    const optimizedRoles = RoleValidator.suggestOptimalRoles(newRoles);
    const permissions = PermissionManager.combinePermissions(optimizedRoles);
    
    const updateData: Partial<UserRole> = {
      roles: optimizedRoles,
      permissions,
      updatedAt: new Date(),
    };

    // TODO: Implement actual database update
    console.log('Updating user roles:', { userId, updateData });
  }

  /**
   * ตรวจสอบสิทธิ์ CSM
   */
  static canAccessCSMEvaluation(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canEvaluate');
  }

  static canManageVendors(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canManageVendors');
  }

  static canApproveAssessments(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canApprove');
  }

  /**
   * ตรวจสอบสิทธิ์ Employee Management
   */
  static canManageEmployees(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'employees', 'canEdit');
  }

  static canImportEmployees(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'employees', 'canImport');
  }

  /**
   * ตรวจสอบสิทธิ์ System
   */
  static canManageUsers(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'system', 'canManageUsers');
  }

  static canViewLogs(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'system', 'canViewLogs');
  }
}

// ========================================
// ROLE VALIDATOR
// ========================================

export class RoleValidator {
  /**
   * ตรวจสอบความถูกต้องของการรวม roles
   */
  static validateRoleCombination(roles: Role[]): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // ตรวจสอบ guest role
    if (roles.includes('guest') && roles.length > 1) {
      warnings.push('Guest role should not be combined with other roles');
    }

    // ตรวจสอบ superAdmin vs admin
    if (roles.includes('superAdmin') && roles.includes('admin')) {
      warnings.push('SuperAdmin role already includes Admin permissions');
    }

    // ตรวจสอบ admin vs lower roles
    if (roles.includes('admin') && roles.includes('csmAuditor')) {
      warnings.push('Admin role already includes CSM Auditor permissions');
    }

    if (roles.includes('admin') && roles.includes('auditor')) {
      warnings.push('Admin role already includes Auditor permissions');
    }

    return { valid: warnings.length === 0, warnings };
  }

  /**
   * แนะนำ roles ที่เหมาะสม
   */
  static suggestOptimalRoles(roles: Role[]): Role[] {
    // ถ้ามี superAdmin ให้ใช้แค่ superAdmin
    if (roles.includes('superAdmin')) {
      return ['superAdmin'];
    }

    // ถ้ามี admin ให้เอา lower roles ออก
    if (roles.includes('admin')) {
      return roles.filter((r) => !['csmAuditor', 'auditor', 'plantAdmin'].includes(r));
    }

    return roles;
  }

  /**
   * ตรวจสอบว่า role transition ถูกต้องหรือไม่
   */
 static validateRoleTransition(currentRoles: Role[], newRoles: Role[]): boolean {
    const currentLevel = Math.max(...currentRoles.map(r => this.getRoleLevel(r)));
    const newLevel = Math.max(...newRoles.map(r => this.getRoleLevel(r)));

    // ป้องกันการ downgrade จาก superAdmin หรือ admin โดยไม่ได้รับอนุญาต
    if (currentLevel >= 6 && newLevel < currentLevel) {
      console.warn(`Role downgrade detected: ${currentLevel} -> ${newLevel}`);
      // ในอนาคตอาจเพิ่ม parameter สำหรับ force downgrade
      return false;
    }

    return newLevel >= 0; // อนุญาตทุก level สำหรับการ upgrade
  }


  private static getRoleLevel(role: Role): number {
    const levels: Record<Role, number> = {
      guest: 0,
      plantAdmin: 2,
      auditor: 3,
      csmAuditor: 4,
      csmAdmin: 5,
      admin: 9,
      superAdmin: 10,
    };
    return levels[role] || 0;
  }
}