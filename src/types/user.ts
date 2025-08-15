// 📁 src/types/user.ts - Roles เป็น Role[] เสมอ

import { Timestamp } from 'firebase/firestore';
import type { EmployeeProfile } from './employees';

export type Role =
  | 'superAdmin'
  | 'admin'
  | 'csmAdmin'
  | 'csmAuditor'
  | 'auditor'
  | 'plantAdmin'
  | 'guest';

// User Role Interface
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
  roles: Role[]; // ✅ array เสมอ

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

// ✅ แก้ไข UserPermissions ให้ใช้ Role[] เท่านั้น
export interface UserPermissions {
  empId: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  passcode?: string;
  displayName?: string;
}

// ✅ แก้ไข AppUser ให้ใช้ Role[] เท่านั้น
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

// Employee Login Interface
export interface EmployeeLogin {
  empId: string;
  passcode: string;
}

// Login Result Interface
export interface LoginResult {
  success: boolean;
  user?: AppUser;
  error?: string;
  redirecting?: boolean;
  message?: string;
}

// Auth Context Type
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

// ✅ Default Permissions
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

// ✅ Role Permissions Mapping
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
      canViewLogs: true,
      canBackupRestore: false,
      canManageSettings: false,
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

// Permission Manager Class
export class PermissionManager {
  static combinePermissions(roles: Role[]): UserRole['permissions'] {
    const combined = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) as UserRole['permissions'];
    roles.forEach((roles) => {
      const rolePermissions = ROLE_PERMISSIONS[roles];
      if (rolePermissions) {
        Object.assign(combined.csm!, rolePermissions.csm || {});
        Object.assign(combined.employees!, rolePermissions.employees || {});
        Object.assign(combined.system!, rolePermissions.system || {});
      }
    });
    return combined;
  }

  static hasPermission(userRoles: Role[], module: keyof UserRole['permissions'], action: string): boolean {
    const permissions = this.combinePermissions(userRoles);
    const modulePermissions = permissions[module];
    return modulePermissions ? (modulePermissions as any)[action] === true : false;
  }

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

  static getHighestRole(roles: Role[]): Role {
    const hierarchy: Role[] = ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'];
    for (const r of hierarchy) {
      if (roles.includes(r)) return r;
    }
    return 'guest';
  }

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
}

// RoleMigrationHelper เวอร์ชันใหม่ — ใช้แปลงข้อมูลจาก DB ให้เป็น Role[] เท่านั้น
export class RoleMigrationHelper {
  static toArray(input: unknown): Role[] {
    if (Array.isArray(input)) return input.filter((r): r is Role => this.isValidRole(r));
    if (typeof input === 'string') {
      if (input.includes(',')) {
        return input.split(',').map((r) => r.trim()).filter((r): r is Role => this.isValidRole(r));
      }
      return this.isValidRole(input) ? [input] : ['guest'];
    }
    return ['guest'];
  }

  static isValidRole(roles: string): roles is Role {
    return ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'].includes(roles);
  }
}

// UserRoleService
export class UserRoleService {
  static async updateUserRoles(userId: string, newRoles: Role[]): Promise<void> {
    const validation = RoleValidator.validateRoleCombination(newRoles);
    if (!validation.valid) console.warn('Role validation warnings:', validation.warnings);
    const optimizedRoles = RoleValidator.suggestOptimalRoles(newRoles);
    const permissions = PermissionManager.combinePermissions(optimizedRoles);
    const updateData: Partial<UserRole> = { roles: optimizedRoles, permissions, updatedAt: new Date() };
    console.log('Updating user roles:', { userId, updateData });
  }

  static canAccessCSMEvaluation(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canEvaluate');
  }
  static canManageVendors(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canManageVendors');
  }
  static canApproveAssessments(userRoles: Role[]): boolean {
    return PermissionManager.hasPermission(userRoles, 'csm', 'canApprove');
  }
}

// RoleValidator
export class RoleValidator {
  static validateRoleCombination(roles: Role[]): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (roles.includes('guest') && roles.length > 1) warnings.push('Guest role should not be combined with other roles');
    if (roles.includes('superAdmin') && roles.includes('admin'))
      warnings.push('SuperAdmin role already includes Admin permissions');
    if (roles.includes('admin') && roles.includes('csmAuditor'))
      warnings.push('Admin role already includes CSM Auditor permissions');
    return { valid: warnings.length === 0, warnings };
  }

  static suggestOptimalRoles(roles: Role[]): Role[] {
    if (roles.includes('superAdmin')) return ['superAdmin'];
    if (roles.includes('admin')) {
      return roles.filter((r) => !['csmAuditor', 'auditor', 'plantAdmin'].includes(r));
    }
    return roles;
  }
}

// Additional interfaces
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
