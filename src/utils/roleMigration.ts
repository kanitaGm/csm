
// =================================================================
// 📁 src/utils/roleMigration.ts - แก้ไข import และ auth errors
// =================================================================

import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { RoleMigrationHelper } from '../types/user';
import type { Role } from '../types/user';
//import type { AuthProvider } from '../contexts/AuthContext'; // ✅ แก้ไข import ให้ถูกต้อง

interface OldUserRecord {
    empId: string;
    email: string;
    roles: string[]; // Old format
    isActive: boolean;
    displayName?: string;
    passcode?: string;
}

export class RoleMigrationService {
    /**
     * Migrate all users from string role to array roles
     */
    static async migrateAllUsers(): Promise<void> {
        console.log('🚀 [Migration] Starting role migration...');
        
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            
            const batch = writeBatch(db);
            let migrationCount = 0;
            let errorCount = 0;

            snapshot.forEach((docSnap) => {
                try {
                    const userData = docSnap.data() as OldUserRecord;
                    
                    // Check if already migrated (has roles array)
                    if (Array.isArray(userData.roles)) {
                        console.log(`✅ [Migration] User ${userData.empId} already migrated`);
                        return;
                    }

                    // Migrate string role to array
                    const newRoles = RoleMigrationHelper.toArray(userData.roles);
                    
                    // Update document
                    const userRef = doc(db, 'users', docSnap.id);
                    batch.update(userRef, {
                        roles: newRoles,
                        // Keep old role field for backup
                        oldRole: userData.roles,
                        migratedAt: new Date(),
                        updatedAt: new Date()
                    });

                    migrationCount++;
                    console.log(`🔄 [Migration] Migrating ${userData.empId}: "${userData.roles}" → [${newRoles.join(', ')}]`);
                    
                } catch (error) {
                    errorCount++;
                    console.error(`❌ [Migration] Error migrating user ${docSnap.id}:`, error);
                }
            });

            if (migrationCount > 0) {
                await batch.commit();
                console.log(`✅ [Migration] Successfully migrated ${migrationCount} users`);
            } else {
                console.log('ℹ️ [Migration] No users needed migration');
            }

            if (errorCount > 0) {
                console.warn(`⚠️ [Migration] ${errorCount} users had migration errors`);
            }

        } catch (error) {
            console.error('❌ [Migration] Migration failed:', error);
            throw error;
        }
    }

    /**
     * Verify migration results
     */
    static async verifyMigration(): Promise<void> {
        console.log('🔍 [Migration] Verifying migration results...');
        
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            
            let totalUsers = 0;
            let migratedUsers = 0;
            let unmigrated = 0;

            snapshot.forEach((docSnap) => {
                const userData = docSnap.data();
                totalUsers++;

                if (Array.isArray(userData.roles)) {
                    migratedUsers++;
                    console.log(`✅ ${userData.empId}: roles = [${userData.roles.join(', ')}]`);
                } else if (userData.roles && !Array.isArray(userData.roles)) {
                    unmigrated++;
                    console.log(`❌ ${userData.empId}: still has old role = "${userData.roles}"`);
                }
            });

            console.log(`📊 [Migration] Results: ${migratedUsers}/${totalUsers} users migrated`);
            
            if (unmigrated > 0) {
                console.warn(`⚠️ [Migration] ${unmigrated} users still need migration`);
            } else {
                console.log('✅ [Migration] All users successfully migrated!');
            }

        } catch (error) {
            console.error('❌ [Migration] Verification failed:', error);
        }
    }

    /**
     * Test login with specific user for debugging
     */
    static async testUserLogin(email: string): Promise<void> {
        console.log(`🧪 [Debug] Testing user lookup for: ${email}`);
        
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            
            let userFound = false;

            snapshot.forEach((docSnap) => {
                const userData = docSnap.data();
                
                if (userData.email === email) {
                    userFound = true;
                    console.log('👤 [Debug] User found:', {
                        empId: userData.empId,
                        email: userData.email,
                        roles: userData.roles,
                        isActive: userData.isActive,
                        displayName: userData.displayName
                    });

                    // Test role migration
                    if (!Array.isArray(userData.roles) && userData.roles) {
                        const migratedRoles = RoleMigrationHelper.toArray(userData.roles);
                        console.log(`🔄 [Debug] Would migrate "${userData.roles}" to:`, migratedRoles);
                    }
                }
            });

            if (!userFound) {
                console.log(`❌ [Debug] User not found: ${email}`);
            }

        } catch (error) {
            console.error('❌ [Debug] Test failed:', error);
        }
    }

    /**
     * Create test user for debugging
     */
    static async createTestUser(empId: string, email: string, roles: Role[]): Promise<void> {
        console.log(`🧪 [Debug] Creating test user: ${empId}`);
        
        try {
            const userRef = doc(db, 'users', empId);
            await updateDoc(userRef, {
                empId: empId,
                email: email,
                roles: roles,
                isActive: true,
                displayName: `Test User ${empId}`,
                passcode: 'test123',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'migration-script'
            });

            console.log(`✅ [Debug] Test user created: ${empId} with roles: [${roles.join(', ')}]`);
            
        } catch (error) {
            console.error('❌ [Debug] Failed to create test user:', error);
        }
    }
}

// Auth Debugger Utils
export class AuthDebugger {
    /**
     * Log current auth state
     */
    static logAuthState(): void {
        console.log('🔍 [AuthDebug] Current auth state:');
        console.log('- Firebase Auth User:', auth.currentUser);
        console.log('- Local Storage:', {
            authMethod: localStorage.getItem('authMethod')
        });
    }

    /**
     * Test role checking logic
     */
    static testRoleChecking(userRoles: Role[], requiredRole: Role | Role[]): void {
        console.log('🧪 [AuthDebug] Testing role access:');
        console.log('- User roles:', userRoles);
        console.log('- Required role:', requiredRole);
        
        // Test with PermissionManager
        try {
            const { PermissionManager } = require('../types/user');
            const hasAccess = PermissionManager.checkRoleHierarchy(userRoles, requiredRole);
            console.log('- Access granted:', hasAccess);
        } catch (error) {
            console.log('- PermissionManager not available');
        }
    }

    /**
     * Clear all auth data (for debugging)
     */
    static clearAuthData(): void {
        console.log('🧹 [AuthDebug] Clearing all auth data...');
        
        // Clear localStorage
        localStorage.removeItem('authMethod');
        
        // Sign out from Firebase
        if (auth.currentUser) {
            auth.signOut();
        }
        
        console.log('✅ [AuthDebug] Auth data cleared');
    }
}