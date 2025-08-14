// 📁 src/types/user.ts - แก้ไขให้ตรงกับ database และไม่มี type errors

import { Timestamp } from 'firebase/firestore';
import type { EmployeeProfile } from './employees';

export type Role = 'superAdmin' | 'admin' | 'csmAdmin' | 'csmAuditor' | 'auditor' | 'plantAdmin' | 'guest';

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
  roles: Role[]; // ✅ เป็น array เสมอ
  
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

// ✅ แก้ไข UserPermissions interface ให้ตรงกับ database
export interface UserPermissions {
    empId: string;
    email: string;
    role: Role | Role[]; // ✅ รองรับทั้ง string และ array สำหรับ backward compatibility
    isActive: boolean;
    passcode?: string; 
    displayName?: string;
}

// ✅ แก้ไข AppUser ให้ใช้ roles (array) เท่านั้น
export interface AppUser {
    uid: string;
    empId: string | null;
    email: string | null;
    displayName: string | null;
    roles: Role[]; // ✅ เป็น array เสมอ
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
  loginType: 'provider' | 'firebase' |'internal' | null;
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

// ✅ เพิ่ม Default Permissions
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

// ✅ Role Permissions Mapping - ครบทุก role
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
    /**
     * Combine permissions from multiple roles
     */
    static combinePermissions(roles: Role[]): UserRole['permissions'] {
        const combined = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) as UserRole['permissions'];
        
        roles.forEach(role => {
            const rolePermissions = ROLE_PERMISSIONS[role];
            if (rolePermissions) {
                // Merge CSM permissions
                if (rolePermissions.csm && combined.csm) {
                    Object.assign(combined.csm, rolePermissions.csm);
                }
                
                // Merge employees permissions
                if (rolePermissions.employees && combined.employees) {
                    Object.assign(combined.employees, rolePermissions.employees);
                }
                
                // Merge system permissions
                if (rolePermissions.system && combined.system) {
                    Object.assign(combined.system, rolePermissions.system);
                }
            }
        });

        return combined;
    }

    /**
     * Check if user has specific permission
     */
    static hasPermission(
        userRoles: Role[], 
        module: keyof UserRole['permissions'], 
        action: string
    ): boolean {
        const permissions = this.combinePermissions(userRoles);
        const modulePermissions = permissions[module];
        
        if (!modulePermissions) return false;
        
        return (modulePermissions as any)[action] === true;
    }

    /**
     * Check role hierarchy
     */
    static checkRoleHierarchy(userRoles: Role[], requiredRole: Role | Role[]): boolean {
        const roleHierarchy = new Map<Role, number>([
            ['guest', 0],
            ['plantAdmin', 2],
            ['auditor', 3],
            ['csmAuditor', 4],
            ['csmAdmin', 5],
            ['admin', 6],
            ['superAdmin', 10]
        ]);

        const userMaxLevel = Math.max(...userRoles.map(role => roleHierarchy.get(role) || 0));

        if (Array.isArray(requiredRole)) {
            return requiredRole.some(role => {
                const requiredLevel = roleHierarchy.get(role) || 0;
                return userMaxLevel >= requiredLevel;
            });
        }

        const requiredLevel = roleHierarchy.get(requiredRole) || 0;
        return userMaxLevel >= requiredLevel;
    }

    /**
     * Get user's highest role
     */
    static getHighestRole(roles: Role[]): Role {
        const hierarchy: Role[] = ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'];
        
        for (const role of hierarchy) {
            if (roles.includes(role)) {
                return role;
            }
        }
        
        return 'guest';
    }

    /**
     * Format roles for display
     */
    static formatRolesForDisplay(roles: Role[]): string {
        const roleLabels = new Map<Role, string>([
            ['superAdmin', 'ผู้ดูแลระบบสูงสุด'],
            ['admin', 'ผู้ดูแลระบบ'],
            ['csmAdmin', 'ผู้ดูแลระบบ CSM'],
            ['csmAuditor', 'ผู้ตรวจสอบ CSM'],
            ['auditor', 'ผู้ตรวจสอบ'],
            ['plantAdmin', 'ผู้ดูแลโรงงาน'],
            ['guest', 'ผู้เข้าชม']
        ]);

        return roles.map(role => roleLabels.get(role) || role).join(', ');
    }
}

// Role Migration Helper
export class RoleMigrationHelper {
    /**
     * Convert old string role to new array format
     */
    static migrateStringRoleToArray(oldRole: string | Role[]): Role[] {
        // If already an array, return as is
        if (Array.isArray(oldRole)) {
            return oldRole.filter(r => this.isValidRole(r));
        }

        // Handle comma-separated roles
        if (typeof oldRole === 'string' && oldRole.includes(',')) {
            return oldRole.split(',').map(r => r.trim() as Role).filter(r => this.isValidRole(r));
        }
        
        // Single role
        if (typeof oldRole === 'string' && this.isValidRole(oldRole as Role)) {
            return [oldRole as Role];
        }
        
        // Default to guest if invalid
        console.warn('[RoleMigration] Invalid role detected, defaulting to guest:', oldRole);
        return ['guest'];
    }

    /**
     * Convert array back to string for storage (if needed)
     */
    static convertArrayRoleToString(roles: Role[]): string {
        return roles.join(', ');
    }

    /**
     * Check if role is valid
     */
    static isValidRole(role: string): role is Role {
        const validRoles: Role[] = ['superAdmin', 'admin', 'csmAdmin', 'csmAuditor', 'auditor', 'plantAdmin', 'guest'];
        return validRoles.includes(role as Role);
    }
}

// Service for managing user roles
export class UserRoleService {
    /**
     * Update user roles
     */
    static async updateUserRoles(userId: string, newRoles: Role[]): Promise<void> {
        // Validate role combination
        const validation = RoleValidator.validateRoleCombination(newRoles);
        if (!validation.valid) {
            console.warn('Role validation warnings:', validation.warnings);
        }
        
        // Optimize roles
        const optimizedRoles = RoleValidator.suggestOptimalRoles(newRoles);
        
        // Combine permissions
        const permissions = PermissionManager.combinePermissions(optimizedRoles);
        
        // Update in database (implementation depends on your data layer)
        const updateData: Partial<UserRole> = {
            roles: optimizedRoles,
            permissions,
            updatedAt: new Date()
        };
        
        console.log('Updating user roles:', { userId, updateData });
    }

    /**
     * Check if user can access CSM evaluation
     */
    static canAccessCSMEvaluation(userRoles: Role[]): boolean {
        return PermissionManager.hasPermission(userRoles, 'csm', 'canEvaluate');
    }

    /**
     * Check if user can manage vendors
     */
    static canManageVendors(userRoles: Role[]): boolean {
        return PermissionManager.hasPermission(userRoles, 'csm', 'canManageVendors');
    }

    /**
     * Check if user can approve assessments
     */
    static canApproveAssessments(userRoles: Role[]): boolean {
        return PermissionManager.hasPermission(userRoles, 'csm', 'canApprove');
    }
}

// Role Validation Utilities
export class RoleValidator {
    /**
     * Validate role combinations
     */
    static validateRoleCombination(roles: Role[]): { valid: boolean; warnings: string[] } {
        const warnings: string[] = [];
        
        // Check for conflicting roles
        if (roles.includes('guest') && roles.length > 1) {
            warnings.push('Guest role should not be combined with other roles');
        }
        
        // Check for redundant roles
        if (roles.includes('superAdmin') && roles.includes('admin')) {
            warnings.push('SuperAdmin role already includes Admin permissions');
        }
        
        if (roles.includes('admin') && roles.includes('csmAuditor')) {
            warnings.push('Admin role already includes CSM Auditor permissions');
        }
        
        return {
            valid: warnings.length === 0,
            warnings
        };
    }

    /**
     * Suggest optimal role combination
     */
    static suggestOptimalRoles(roles: Role[]): Role[] {
        if (roles.includes('superAdmin')) {
            return ['superAdmin']; // SuperAdmin is sufficient
        }
        
        if (roles.includes('admin')) {
            // Remove redundant roles
            return roles.filter(role => !['csmAuditor', 'auditor', 'plantAdmin'].includes(role));
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