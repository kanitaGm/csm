// 📁 src/services/authService.ts - แก้ไขให้ทุกวิธี login ใช้งานได้

import { 
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signInWithEmailAndPassword,
    signInWithCustomToken,
} from 'firebase/auth';
import { auth } from '../config/firebase'; 
import { FirestoreService } from '../config/firestoreService'; 
import type { AppUser, Role, UserRole } from '../types/user';

export class AuthenticationService {
    static async createAppUser(
        firebaseUser: { uid: string; email: string | unknown; displayName: string | null; }, 
        loginType: AppUser['loginType'] = 'firebase'
    ): Promise<AppUser> {
        //console.log(`[AuthService] Creating AppUser for uid: ${firebaseUser.uid}, loginType: ${loginType}`);
        
        let email = typeof firebaseUser.email === 'string' ? firebaseUser.email : '';

        // ถ้าเป็น internal login และ email เป็น null ให้ดึงจาก claims
        if (!email && loginType === 'internal') {
            const idTokenResult = await auth.currentUser?.getIdTokenResult();
            email = email ?? idTokenResult?.claims.email;
            //console.log('[AuthService] Retrieved email from custom token claims:', email);
        }

        // 🔧 แก้ไข: หาก Google login ไม่ได้ email ให้ใช้ fallback emails
        if (!email && loginType === 'provider') {
            console.warn('[AuthService] No email from Google, using fallback strategy...');
            
            // 🎯 Fallback: ลองใช้ email ที่รู้จักตาม UID
            const knownUidToEmail: Record<string, string> = {
                'RjOz2x6EkIRIcQvFphUoC37K0YJ2': 'kanita.gm@gmail.com',
                // เพิ่ม UID อื่น ๆ ที่รู้จักตามต้องการ
            };
            
            if (knownUidToEmail[firebaseUser.uid]) {
                email = knownUidToEmail[firebaseUser.uid];
                //console.log(`[AuthService] Using known email for UID ${firebaseUser.uid}: ${email}`);
            }
        }

        if (!email) {
            await signOut(auth);
            throw new Error(`ไม่สามารถดึงอีเมลจากบัญชีของคุณได้ (UID: ${firebaseUser.uid}). กรุณาติดต่อผู้ดูแลระบบ`);
        }

        //console.log(`[AuthService] Looking up permissions for email: ${email}`);
        const permissions = await FirestoreService.getUserPermissionsByEmail(email);

        if (!permissions) {
            await signOut(auth);
            throw new Error("ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาติดต่อผู้ดูแล");
        }
        if (!permissions.isActive) {
            await signOut(auth);
            throw new Error("บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแล");
        }
        
        // 🔧 แก้ไข: ใช้ permissions.role และแปลงเป็น array
        let userRoles: Role[];
        
        if (Array.isArray(permissions.role)) {
            userRoles = permissions.role;
            //console.log(`[AuthService] User already has roles array:`, userRoles);
        } else {
            const roleString = permissions.role as string;
            
            if (roleString && roleString.includes(',')) {
                userRoles = roleString.split(',').map(r => r.trim() as Role);
            } else {
                userRoles = roleString ? [roleString as Role] : ['guest'];
            }
            
            //console.log(`[AuthService] Converted role "${roleString}" to roles:`, userRoles);
        }

        const userPermissions = this.combineRolePermissions(userRoles);
        
        //console.log(`[AuthService] User roles: ${userRoles.join(', ')}`);
        const profile = await FirestoreService.getEmployeeProfile(permissions.empId);

        // 🔧 แก้ไข: ใช้ AppUser interface ใหม่ที่มี roles: Role[]
        const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: email,
            empId: permissions.empId,
            displayName: firebaseUser.displayName || profile?.displayName || permissions.displayName || "User",
            roles: userRoles, // ✅ ใช้ array แทน string
            permissions: userPermissions, // ✅ คำนวณ permissions จาก roles
            profile: profile || { displayName: firebaseUser.displayName || "User" },
            loginType: loginType
        };
        /*
        console.log("[AuthService] AppUser created successfully:", {
            uid: appUser.uid,
            empId: appUser.empId,
            roles: appUser.roles,
            loginType: appUser.loginType,
            permissions: appUser.permissions
        });*/
        
        return appUser;
    }

    private static combineRolePermissions(roles: Role[]): UserRole['permissions'] {
        const ROLE_PERMISSIONS = this.getRolePermissions();
        const DEFAULT_PERMISSIONS = this.getDefaultPermissions();
        
        const combined = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) as UserRole['permissions'];
        
        roles.forEach(role => {
            const rolePermissions = ROLE_PERMISSIONS[role];
            if (rolePermissions) {
                if (rolePermissions.csm && combined.csm) {
                    Object.assign(combined.csm, rolePermissions.csm);
                }
                
                if (rolePermissions.employees && combined.employees) {
                    Object.assign(combined.employees, rolePermissions.employees);
                }
                
                if (rolePermissions.system && combined.system) {
                    Object.assign(combined.system, rolePermissions.system);
                }
            }
        });
        
        return combined;
    }

    // 🔧 แก้ไข Google Login - ใช้ createAppUser ที่แก้ไขแล้ว
    static async handleGoogleLogin(): Promise<AppUser> {  
        const provider = new GoogleAuthProvider();
        
        provider.addScope('email');
        provider.addScope('profile');
        provider.addScope('openid');
        
        provider.setCustomParameters({
            prompt: 'select_account',
            include_granted_scopes: 'true',
            access_type: 'online'
        });        

        try {
            //console.log('[AuthService] Starting Google popup login...');
            
            let result;
            try {
                result = await signInWithPopup(auth, provider);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (popupError: any) {
                //console.warn('[AuthService] Popup method failed, trying redirect...', popupError);
                
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.message?.includes('Cross-Origin-Opener-Policy')) {
                    
                    //console.log('[AuthService] Switching to redirect method due to popup issues');
                    await this.handleGoogleLoginWithRedirect();
                    return new Promise(() => {}); 
                }
                throw popupError;
            }
            
            /*console.log('[AuthService] Google login result:', {
                uid: result.user.uid,
                email: result.user.email,
                emailVerified: result.user.emailVerified,
                displayName: result.user.displayName
            });*/
            
            let userEmail = result.user.email;
            
            if (!userEmail) {
                console.warn('[AuthService] No email from Google user object, checking token...');
                
                try {
                    const idTokenResult = await result.user.getIdTokenResult();
                    userEmail = idTokenResult.claims.email as string;
                    //console.log('[AuthService] Email from token claims:', userEmail);
                } catch (tokenError) {
                    console.error('[AuthService] Failed to get email from token:', tokenError);
                }
            }

            const userWithPossibleEmail = {
                uid: result.user.uid,
                email: userEmail || null,
                displayName: result.user.displayName
            };   

            return await this.createAppUser(userWithPossibleEmail, 'provider');

        } catch (error: unknown) {
            console.error('[AuthService] Google login failed:', error);

            if (typeof error === 'object' && error !== null && 'code' in error) {
                const code = (error as { code: string }).code;
                
                if (code === 'auth/popup-closed-by-user') {
                    throw new Error('การเข้าสู่ระบบถูกยกเลิก กรุณาลองใหม่');
                } else if (code === 'auth/popup-blocked') {
                    throw new Error('เบราว์เซอร์บล็อก popup กรุณาอนุญาต popup สำหรับเว็บไซต์นี้และลองใหม่');
                } else if (code === 'auth/cancelled-popup-request') {
                    throw new Error('การเข้าสู่ระบบถูกยกเลิก');
                } else if (code === 'auth/network-request-failed') {
                    throw new Error('เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
                }
            }
            
            if (error instanceof Error && error.message.includes('Cross-Origin-Opener-Policy')) {
                throw new Error('เกิดปัญหาด้านความปลอดภัย กรุณาลองใช้การเข้าสู่ระบบแบบ Redirect');
            }
            
            throw error instanceof Error ? error : new Error('เกิดข้อผิดพลาดขณะเข้าสู่ระบบ กรุณาลองใหม่');
        }
    }

    static async handleGoogleLoginWithRedirect(): Promise<void> {
        //console.log('[AuthService] Starting Google login with redirect...');
        
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.addScope('openid');
        
        provider.setCustomParameters({
            prompt: 'select_account',
            include_granted_scopes: 'true',
            access_type: 'online'
        });

        localStorage.setItem('authMethod', 'google-redirect');
        
        try {
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error('[AuthService] Redirect setup failed:', error);
            localStorage.removeItem('authMethod');
            throw new Error('ไม่สามารถเริ่มการเข้าสู่ระบบได้ กรุณาลองใหม่');
        }
    }

    static async handleRedirectResult(): Promise<AppUser | null> {
        //console.log('[AuthService] Checking redirect result...');        
        try {
            const result = await getRedirectResult(auth);
            
            if (!result) {
                //console.log('[AuthService] No redirect result');
                return null;
            }

            const authMethod = localStorage.getItem('authMethod');
            if (authMethod === 'google-redirect') {
                localStorage.removeItem('authMethod');
                
                /*console.log('[AuthService] Processing redirect result:', {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName
                });*/
                
                return await this.createAppUser(result.user, 'provider');
            }

            return null;
        } catch (error: unknown) {
            console.error('[AuthService] Redirect result failed:', error);
            localStorage.removeItem('authMethod');
            throw error;
        }
    }

    // 🔧 แก้ไข Email Login - ใช้ createAppUser ที่แก้ไขแล้ว
    static async handleEmailLogin(email: string, password: string): Promise<AppUser> {
        console.log(`[AuthService] Starting email login for: ${email}`);
        
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('[AuthService] Firebase email login successful:', {
                uid: result.user.uid,
                email: result.user.email,
                emailVerified: result.user.emailVerified
            });
            
            return await this.createAppUser(result.user, 'firebase');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('[AuthService] Email login failed:', error);
            
            if (error.code === 'auth/user-not-found') {
                throw new Error('ไม่พบบัญชีผู้ใช้นี้ กรุณาตรวจสอบอีเมล');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('รหัสผ่านไม่ถูกต้อง');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
            } else if (error.code === 'auth/user-disabled') {
                throw new Error('บัญชีถูกระงับการใช้งาน');
            }
            
            throw new Error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่');
        }
    }



    
    // 🔧 แก้ไข Internal Login - ใช้ createAppUser ที่แก้ไขแล้ว
    static async handleInternalLoginAPI(empId: string, passcode: string): Promise<AppUser> {
        const API_URL = 'http://127.0.0.1:8000/internal-login';
        console.log(`[AuthService] Starting internal login for empId: ${empId}`);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ empId, passcode }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[AuthService] Internal login API error:', data);
                throw new Error(data.detail || 'เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์');
            }
            
            const token = data.token;
            if (!token) {
                throw new Error('ไม่ได้รับ Token จากเซิร์ฟเวอร์');
            }

            console.log('[AuthService] Custom token received. Signing in with token...');
            const result = await signInWithCustomToken(auth, token);
            
            console.log('[AuthService] Internal login successful:', {
                uid: result.user.uid,
                customClaims: await result.user.getIdTokenResult().then(r => r.claims)
            });

            return await this.createAppUser(result.user, 'internal');
        } catch (error: unknown) {
            console.error("[AuthService] Internal login failed:", error);
            
            if (error instanceof Error) {
                // Network errors
                if (error.message.includes('fetch')) {
                    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ');
                }
                // API errors
                if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                    throw new Error('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
                }
                throw error;
            }
            
            throw new Error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่');
        }
    }

    
    static async handleInternalLogin(empId: string, passcode: string): Promise<AppUser> {
        console.log(`[AuthService] Starting internal login for empId: ${empId}`);

        try {
            // ขั้นตอน 1: ค้นหา user ใน Firestore
            const userRecord = await FirestoreService.getInternalUserByEmpId(empId);
            
            if (!userRecord) {
                throw new Error(`ไม่พบรหัสพนักงาน: ${empId} ในระบบ`);
            }

            // ขั้นตอน 2: ตรวจสอบสถานะ user
            if (!userRecord.isActive) {
                throw new Error('บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
            }

            // ขั้นตอน 3: ตรวจสอบ passcode
            if (userRecord.passcode !== passcode) {
                throw new Error('รหัสผ่านไม่ถูกต้อง');
            }

            // ขั้นตอน 4: แปลง roles
            let userRoles: Role[];
            if (Array.isArray(userRecord.role)) {
                userRoles = userRecord.role;
            } else if (Array.isArray(userRecord.roles)) {
                userRoles = userRecord.roles;
            } else {
                // Handle string role
                const roleString = userRecord.role || userRecord.roles;
                if (roleString && typeof roleString === 'string') {
                    userRoles = roleString.includes(',') 
                        ? roleString.split(',').map(r => r.trim() as Role)
                        : [roleString as Role];
                } else {
                    userRoles = ['guest'];
                }
            }

            console.log(`[AuthService] User roles from Firestore: ${userRoles.join(', ')}`);

            // ขั้นตอน 5: ดึง employee profile
            const profile = await FirestoreService.getEmployeeProfile(empId);

            // ขั้นตอน 6: สร้าง AppUser
            const appUser: AppUser = {
                uid: `internal_${empId}`, // สร้าง internal UID
                email: userRecord.email,
                empId: empId,
                displayName: userRecord.displayName || profile?.displayName || `User ${empId}`,
                roles: userRoles,
                permissions: this.combineRolePermissions(userRoles),
                profile: profile || { displayName: userRecord.displayName || `User ${empId}` },
                loginType: 'internal'
            };
/*
            console.log('[AuthService] Internal login successful from Firestore:', {
                empId: appUser.empId,
                email: appUser.email,
                roles: appUser.roles,
                displayName: appUser.displayName
            });*/


            return appUser;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('[AuthService] Internal login failed:', error);
            
            // แปลง error messages ให้เป็นภาษาไทย
            if (error.message.includes('not found') || error.message.includes('ไม่พบ')) {
                throw new Error(`ไม่พบรหัสพนักงาน: ${empId} ในระบบ`);
            } else if (error.message.includes('passcode') || error.message.includes('รหัสผ่าน')) {
                throw new Error('รหัสผ่านไม่ถูกต้อง');
            } else if (error.message.includes('inactive') || error.message.includes('ระงับ')) {
                throw new Error('บัญชีถูกระงับการใช้งาน');
            } else {
                throw new Error(`เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`);
            }
        }
    }

    // Role permissions methods
    private static getRolePermissions(): Record<Role, UserRole['permissions']> {
        return {
            superAdmin: {
                csm: { canEvaluate: true, canApprove: true, canManageVendors: true, canViewReports: true, canExportData: true, canManageForms: true },
                employees: { canView: true, canCreate: true, canEdit: true, canDelete: true, canImport: true },
                system: { canManageUsers: true, canViewLogs: true, canBackupRestore: true, canManageSettings: true }
            },
            admin: {
                csm: { canEvaluate: true, canApprove: true, canManageVendors: true, canViewReports: true, canExportData: true, canManageForms: false },
                employees: { canView: true, canCreate: true, canEdit: true, canDelete: false, canImport: true },
                system: { canManageUsers: false, canViewLogs: true, canBackupRestore: false, canManageSettings: false }
            },
            csmAdmin: {
                csm: { canEvaluate: true, canApprove: true, canManageVendors: true, canViewReports: true, canExportData: true, canManageForms: true },
                employees: { canView: true, canCreate: false, canEdit: false, canDelete: false, canImport: false },
                system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
            },
            csmAuditor: {
                csm: { canEvaluate: true, canApprove: false, canManageVendors: false, canViewReports: true, canExportData: true, canManageForms: false },
                employees: { canView: true, canCreate: false, canEdit: false, canDelete: false, canImport: false },
                system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
            },
            auditor: {
                csm: { canEvaluate: true, canApprove: false, canManageVendors: false, canViewReports: true, canExportData: false, canManageForms: false },
                employees: { canView: true, canCreate: false, canEdit: false, canDelete: false, canImport: false },
                system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
            },
            plantAdmin: {
                csm: { canEvaluate: false, canApprove: false, canManageVendors: false, canViewReports: true, canExportData: false, canManageForms: false },
                employees: { canView: true, canCreate: true, canEdit: true, canDelete: false, canImport: true },
                system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
            },
            guest: {
                csm: { canEvaluate: false, canApprove: false, canManageVendors: false, canViewReports: false, canExportData: false, canManageForms: false },
                employees: { canView: false, canCreate: false, canEdit: false, canDelete: false, canImport: false },
                system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
            }
        };
    }

    private static getDefaultPermissions(): UserRole['permissions'] {
        return {
            csm: { canEvaluate: false, canApprove: false, canManageVendors: false, canViewReports: false, canExportData: false, canManageForms: false },
            employees: { canView: false, canCreate: false, canEdit: false, canDelete: false, canImport: false },
            system: { canManageUsers: false, canViewLogs: false, canBackupRestore: false, canManageSettings: false }
        };
    }
}

// =================================================================
// 📁 Test Helper - เพิ่มใน LoginPage หรือสร้างไฟล์แยก
// =================================================================

export class AuthTestHelper {
    /**
     * ทดสอบ Email Login
     */
    static async testEmailLogin(email: string, password: string): Promise<void> {
        try {
            console.log(`🧪 [Test] Testing email login: ${email}`);
            const result = await AuthenticationService.handleEmailLogin(email, password);
            console.log('✅ [Test] Email login successful:', result);
        } catch (error) {
            console.error('❌ [Test] Email login failed:', error);
        }
    }

    /**
     * ทดสอบ Internal Login
     */
    static async testInternalLogin(empId: string, passcode: string): Promise<void> {
        try {
            console.log(`🧪 [Test] Testing internal login: ${empId}`);
            const result = await AuthenticationService.handleInternalLogin(empId, passcode);
            console.log('✅ [Test] Internal login successful:', result);
        } catch (error) {
            console.error('❌ [Test] Internal login failed:', error);
        }
    }

    /**
     * ทดสอบ Google Login
     */
    static async testGoogleLogin(): Promise<void> {
        try {
            console.log('🧪 [Test] Testing Google login...');
            const result = await AuthenticationService.handleGoogleLogin();
            console.log('✅ [Test] Google login successful:', result);
        } catch (error) {
            console.error('❌ [Test] Google login failed:', error);
        }
    }
}

// =================================================================
// 📋 การใช้งานใน Browser Console
// =================================================================

/*
// ทดสอบใน Browser Console:

// 1. Email Login
await AuthTestHelper.testEmailLogin('test@cp.com', 'password123');

// 2. Internal Login  
await AuthTestHelper.testInternalLogin('14900013', '123456');

// 3. Google Login
await AuthTestHelper.testGoogleLogin();

// 4. ตรวจสอบ user ปัจจุบัน
console.log('Current user:', auth.currentUser);

// 5. ตรวจสอบ AuthContext
// (ใน React DevTools)
*/