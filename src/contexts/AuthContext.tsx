// ========================================================================
// ไฟล์: src/contexts/AuthContext.tsx - แก้ไข Auth Context และ Navigation
// React Context สำหรับจัดการสถานะ Authentication ทั่วทั้งแอป
// ========================================================================
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut} from 'firebase/auth';
import type {User as FirebaseUser  } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthenticationService } from '../services/authService';
import type { AppUser, AuthContextType, EmployeeProfile } from '../types/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [empUser, setEmpUser] = useState<EmployeeProfile | null>(null);
    const [firebaseLinkedEmpProfile, setFirebaseLinkedEmpProfile] = useState<EmployeeProfile | null>(null);
    const [loginType, setLoginType] = useState<'provider' | 'firebase' | 'internal' | null>(null);
    const [currentUserClaims, setCurrentUserClaims] = useState<any>(null);
    const lastProcessedUidRef = useRef<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            //console.log('[AuthContext] Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
            setCurrentUser(firebaseUser);

            if (firebaseUser?.uid === lastProcessedUidRef.current) {
                //('[AuthContext] Same user, skipping processing');
                setLoading(false);
                return;
            }
            setLoading(true);
            setAuthError(null);

            if (firebaseUser) {
                try {
                let email = firebaseUser.email;
                let displayName = firebaseUser.displayName;

                if (!email && firebaseUser.providerData && firebaseUser.providerData.length > 0) {
                    const googleProviderData = firebaseUser.providerData.find(p => p.providerId === 'google.com');
                    if (googleProviderData && googleProviderData.email) {
                        email = googleProviderData.email;
                        //console.log('[AuthContext] Found email from providerData:', email);
                    }
                }
                
                const processedUser = {
                    uid: firebaseUser.uid,
                    email: email,
                    displayName: displayName,
                };

                /*
                console.log('[AuthContext] Processing new user:', {
                    uid: processedUser.uid,
                    email: processedUser.email,
                    emailVerified: firebaseUser.emailVerified
                });
                */

                if (!processedUser.email) {
                    //console.error('[AuthContext] Firebase user has no email after checking providerData');
                    await signOut(auth);
                    setAuthError('ไม่สามารถดึงอีเมลจากบัญชีของคุณได้ กรุณาลองเข้าสู่ระบบใหม่');
                    setLoading(false);
                    return;
                }

                const appUser = await AuthenticationService.createAppUser(processedUser);
                
                setUser(appUser);
                setLoginType(appUser.loginType);

                const idTokenResult = await firebaseUser.getIdTokenResult();
                setCurrentUserClaims(idTokenResult.claims);
                setEmpUser(null);
                setFirebaseLinkedEmpProfile(null);
                lastProcessedUidRef.current = firebaseUser.uid;
                //console.log('[AuthContext] User processing completed successfully');

                } catch (e: any) {
                    console.error("[AuthContext] Validation failed:", e.message);
                    setAuthError(e.message);
                    await signOut(auth);
                } finally {
                        setLoading(false);
                }                    
                
            } 
            
            else { // User logged out
                setUser(null);
                setLoginType(null);
                setEmpUser(null);
                setFirebaseLinkedEmpProfile(null);
                setCurrentUserClaims(null);
                lastProcessedUidRef.current = null;
                setLoading(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // เพิ่ม setLoading(false) ใน catch block เพื่อ reset สถานะเมื่อเกิด error
    const signInWithGoogle = useCallback(async () => {
        setAuthError(null);
        setLoading(true);
        try {
            //console.log('[AuthContext] Starting Google sign in...');
            await AuthenticationService.handleGoogleLogin();
            // onAuthStateChanged จะจัดการ state updates
        } catch (e: any) {
            //console.error('[AuthContext] Google sign in failed:', e);
            setAuthError(e.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
            setLoading(false);
        }
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        setAuthError(null);
        setLoading(true);
        try {
            //console.log('[AuthContext] Starting email sign in...');
            await AuthenticationService.handleEmailLogin(email, password);
            // onAuthStateChanged จะจัดการ state updates
        } catch (e: any) {
            console.error('[AuthContext] Email sign in failed:', e);
            setAuthError(e.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วยอีเมล");
            setLoading(false);
        }
    }, []);
    
    const signInWithInternalCredentials = useCallback(async (empId: string, passcode: string) => {
        setAuthError(null);
        setLoading(true);
        try {
            //console.log('[AuthContext] Starting internal sign in...');
            await AuthenticationService.handleInternalLogin(empId, passcode);
            // onAuthStateChanged จะจัดการ state updates
        } catch (e: any) {
            console.error('[AuthContext] Internal sign in failed:', e);
            setAuthError(e.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบแบบภายใน");
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const setError = (message: string | null) => {
        setAuthError(message);
    };

    const value: AuthContextType = {  
        user,
        currentUser,
        empUser,
        firebaseLinkedEmpProfile,
        loginType,
        currentUserClaims,
        loading, 
        error: authError,
        setError,
        signInWithGoogle, 
        signInWithEmail, 
        signInWithInternalCredentials,
        signInInternal: signInWithInternalCredentials,
        logout 
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};