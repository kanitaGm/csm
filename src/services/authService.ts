// src/services/authService.ts

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
import type { AppUser } from '../types/'; 

export class AuthenticationService {
    static async createAppUser(firebaseUser: { uid: string; email: string | unknown; displayName: string | null; }, loginType: AppUser['loginType'] = 'firebase'): Promise<AppUser> {
        //console.log(`[AuthService] Creating AppUser for uid: ${firebaseUser.uid}`);
        /*console.log(`[AuthService] Firebase user data:`, { 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            displayName: firebaseUser.displayName 
        });
        */
        
        let email = typeof firebaseUser.email === 'string' ? firebaseUser.email : '';

        // ถ้าเป็น internal login และ email เป็น null ให้ดึงจาก claims
        if (!email && loginType === 'internal') { // Changed 'const email' to 'let email'
            const idTokenResult = await auth.currentUser?.getIdTokenResult();
            email = email ?? idTokenResult?.claims.email;
            //console.log('[AuthService] Retrieved email from custom token claims:', email);
        }

        if (!email) {
            await signOut(auth);
            throw new Error("ไม่สามารถดึงอีเมลจากบัญชีของคุณได้ กรุณาตรวจสอบการตั้งค่าบัญชี Google");
        }

       // console.log(`[AuthService] Looking up permissions for email: ${email}`);
        const permissions = await FirestoreService.getUserPermissionsByEmail(email);

        if (!permissions) {
            await signOut(auth);
            throw new Error("ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาติดต่อผู้ดูแล");
        }
        if (!permissions.isActive) {
            await signOut(auth);
            throw new Error("บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแล");
        }
        
        //console.log(`[AuthService] User is active with role: ${permissions.role}`);
        const profile = await FirestoreService.getEmployeeProfile(permissions.empId);

        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: email,
          empId: permissions.empId,
          role: permissions.role,
          displayName: firebaseUser.displayName || profile?.displayName || permissions.displayName || "User",
          profile: profile || { displayName: firebaseUser.displayName || "User" },
          loginType: loginType
        };
        
       //console.log("[AuthService] AppUser created successfully:", appUser);
        return appUser;
    }

    // --- Public methods สำหรับการ Login ---
    static async handleGoogleLogin(): Promise<AppUser> {  
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.addScope('openid');
        provider.setCustomParameters({
            prompt: 'consent',
            include_granted_scopes: 'true'
        });        

        try {
            //console.log('[AuthService] Provider scopes:', provider.getScopes());        
            const result = await signInWithPopup(auth, provider);    
            /*    
            console.log('[AuthService] Google popup result:', {
                uid: result.user.uid,
                email: result.user.email,
                emailVerified: result.user.emailVerified,
                displayName: result.user.displayName,
                providerData: result.user.providerData
            });
            */
            
            // ตรวจสอบ credential
            //const credential = GoogleAuthProvider.credentialFromResult(result);
            //console.log('[AuthService] Google credential:', credential);
            //console.log('[AuthService] User object keys:', Object.keys(result.user));
            //console.log('[AuthService] Full user object:', result.user);            

            let userEmail = result.user.email;
            // ถ้าไม่มี email ลองดูจาก providerData
            if (!userEmail && result.user.providerData && result.user.providerData.length > 0) {
                const googleProviderData = result.user.providerData.find(provider => provider.providerId === 'google.com');
                if (googleProviderData) {
                    userEmail = googleProviderData.email;
                    //console.log('[AuthService] Found email in providerData:', userEmail);
                }
            }         
            // ถ้ายังไม่มี email ลองรอและ reload user
            if (!userEmail) {
                //console.log('[AuthService] No email found, trying to reload user...');
                await result.user.reload();
                userEmail = result.user.email;
                //console.log('[AuthService] Email after reload:', userEmail);
            }     
            // ถ้ายังไม่มี email ให้ขอ user เลือกบัญชีอีกครั้ง
            if (!userEmail) {
                console.error('[AuthService] No email found after all attempts');
                // ลองใช้ redirect แทน popup
                throw new Error('ไม่สามารถดึงอีเมลจากบัญชี Google ได้ กรุณาลองใช้วิธีอื่น หรือตรวจสอบการตั้งค่าความเป็นส่วนตัวของเบราว์เซอร์');
            }        
            // สร้าง user object ที่มี email
            const userWithEmail = {
                uid: result.user.uid,
                email: userEmail,
                displayName: result.user.displayName
            };   

           return await this.createAppUser(userWithEmail, 'provider');

        } catch (error: unknown) {
            console.error('[AuthService] Google login failed:', error);

            if (typeof error === 'object' && error !== null && 'code' in error) {
                const code = (error as { code: string }).code;
                if (code === 'auth/popup-closed-by-user') {
                throw new Error('การเข้าสู่ระบบถูกยกเลิก');
                } else if (code === 'auth/popup-blocked') {
                throw new Error('เบราว์เซอร์บล็อก popup กรุณาอนุญาตและลองใหม่');
                } else if (code === 'auth/cancelled-popup-request') {
                throw new Error('การเข้าสู่ระบบถูกยกเลิก');
                }
            }
            // กรณีอื่น ๆ
            throw new Error('เกิดข้อผิดพลาดขณะเข้าสู่ระบบ');
            }
    }

    static async handleGoogleLoginWithRedirect(): Promise<void> {
        //console.log('[AuthService] Starting Google login with redirect...');
        
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.addScope('openid');
        
        provider.setCustomParameters({
            prompt: 'consent select_account',
            include_granted_scopes: 'true'
        });

        // เก็บ flag ว่าเป็น redirect login
        localStorage.setItem('authMethod', 'google-redirect');
        
        await signInWithRedirect(auth, provider);
    }

    static async handleRedirectResult(): Promise<AppUser | null> {
        //console.log('[AuthService] Checking redirect result...');        
        try {
            const result = await getRedirectResult(auth);
            
            if (!result) {
                console.log('[AuthService] No redirect result');
                return null;
            }

            /*
            console.log('[AuthService] Redirect result:', {
                uid: result.user.uid,
                email: result.user.email,
                emailVerified: result.user.emailVerified,
                displayName: result.user.displayName
            });
            */

            const authMethod = localStorage.getItem('authMethod');
            if (authMethod === 'google-redirect') {
                localStorage.removeItem('authMethod');
                
                if (!result.user.email) {
                    throw new Error('ไม่สามารถดึงอีเมลจากบัญชี Google ได้แม้ใช้วิธี Redirect');
                }

                return await this.createAppUser(result.user, 'provider');
            }

            return null;
        } catch (error: unknown) {
            console.error('[AuthService] Redirect result failed:', error);
            localStorage.removeItem('authMethod');
            throw error;
        }
    }

    static async handleEmailLogin(email: string, password: string): Promise<AppUser> {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return this.createAppUser(result.user, 'firebase');
    }

    static async handleInternalLogin(empId: string, passcode: string): Promise<AppUser> {
        // Step 1: กำหนด URL ของ Backend API ของคุณ
        const API_URL = 'http://127.0.0.1:8000/internal-login';
        //console.log(`[AuthService] Sending internal login request to ${API_URL}`);

        try {
            // Step 2: ส่ง Request ไปยัง Backend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ empId, passcode }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์');
            }
            
            const token = data.token;
            if (!token) {
                throw new Error('ไม่ได้รับ Token จากเซิร์ฟเวอร์');
            }

            //console.log('[AuthService] Custom token received. Signing in with token...');
            const result = await signInWithCustomToken(auth, token);

            return await this.createAppUser(result.user, 'internal');
        } catch (error: unknown) {
            console.error("[AuthService] Internal login failed:", error);
            throw error;
        }
    }
}
