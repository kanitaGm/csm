// src/pages/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthenticationService } from '../services/authService';

const LoginPage: React.FC = () => {
    const { 
        user, 
        loading: authLoading, // เปลี่ยนชื่อเพื่อไม่ให้ชนกับ state ภายใน
        error, 
        setError,
        signInWithGoogle,
        signInWithEmail,
        signInWithInternalCredentials
    } = useAuth();
    
    const navigate = useNavigate();

    // ✅ ตรวจสอบ redirect result เมื่อหน้าโหลด
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await AuthenticationService.handleRedirectResult();
                if (result) {
                    //console.log('[LoginPage] Redirect login successful');
                    // AuthContext จะจัดการ navigation ให้
                }
            } catch (error: any) {
                console.error('[LoginPage] Redirect result error:', error);
                setError(error.message);
            }
        };

        checkRedirectResult();
    }, [setError]);

    useEffect(() => {
        if (!authLoading && user) {
            //console.log('✅ [LoginPage] Login successful. Navigating to /profile...');
            navigate(`/profile/${user.empId}`, { replace: true });
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (error) {
            console.error('🔴 [LoginPage] An error was reported from AuthContext:', error);
        }
    }, [error]);

    // State ภายในสำหรับจัดการฟอร์มและ UI
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('14900013'); // For empId - ใส่ค่าเริ่มต้นเพื่อทดสอบ
    const [internalPassword, setInternalPassword] = useState('123456'); // For passcode - ใส่ค่าเริ่มต้นเพื่อทดสอบ
    const [activeTab, setActiveTab] = useState<'email' | 'internal'>('email');
    const [isSignUpMode, setIsSignUpMode] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    // ฟังก์ชันสำหรับจัดการการกดปุ่ม Login เพิ่ม try...finally และ Log
    const handleLoginAttempt = async (loginFunction: () => Promise<void>) => {
        setError(null);
        setLocalLoading(true);
        //console.log('[LoginPage] Attempting login...');
        try {
            await loginFunction();
            //console.log('[LoginPage] loginFunction promise resolved (Auth process continues in context).');
        } catch (e) {
            console.error("[LoginPage] Login attempt function threw an unexpected error:", e);
        } finally {
            //console.log('[LoginPage] Login attempt finished, setting localLoading to false.');
            setLocalLoading(false);
        }
    };

    //  เพิ่มฟังก์ชันสำหรับ Google Redirect
    const handleGoogleRedirect = async () => {
        setError(null);
        setLocalLoading(true);
        try {
            //console.log('[LoginPage] Trying Google redirect method...');
            await AuthenticationService.handleGoogleLoginWithRedirect();
            // หน้าจะ redirect ไป Google แล้วกลับมา
        } catch (error: any) {
            console.error('[LoginPage] Google redirect failed:', error);
            setError(error.message);
            setLocalLoading(false);
        }
    };

    // 5. ฟังก์ชันเสริม (ยังไม่ได้ implement)
    const handleSignUp = (e: FormEvent) => {
        e.preventDefault();
        alert('ฟังก์ชันสร้างบัญชียังไม่ถูกสร้าง');
    };
    const handleForgotPassword = () => alert('ฟังก์ชันลืมรหัสผ่านยังไม่ถูกสร้าง');
    const handleSocialLogin = (provider: string) => alert(`ฟังก์ชัน Login ด้วย ${provider} ยังไม่ถูกสร้าง`);

    const loading = authLoading || localLoading;

    // แสดงหน้า Loading ขณะรอการตรวจสอบสิทธิ์ หรือขณะกำลังจะ redirect
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-teal-200 to-gray-200">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">กำลังตรวจสอบสถานะ...</p>
                </div>
            </div>
        );
    }

    // UI ของหน้า Login
    return (
        <div className="min-h-screen flex items-center justify-around bg-gradient-to-br from-green-100 via-teal-200 to-gray-200 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
                    <p className="text-gray-500 mt-2">Access your account</p>
                </div>
                
                {error && (
                    <div className="border px-4 py-3 rounded-lg relative bg-red-100 border-red-400 text-red-700" role="alert">
                        <p className="font-bold">เกิดข้อผิดพลาด:</p>
                        <p>{error}</p>
                            {error.includes('ลองใช้ปุ่ม "ลองวิธีอื่น"') && (
                                <button
                                    onClick={handleGoogleRedirect}
                                    disabled={loading}
                                    className="mt-2 w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                                >
                                    🔄 ลองวิธีอื่น (Redirect)
                                </button>
                            )}

                    </div>
                )}

                <button
                    onClick={() => handleLoginAttempt(signInWithGoogle)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.75 8.36,4.73 12.19,4.73C14.03,4.73 15.6,5.33 16.85,6.45L19.08,4.22C17.21,2.56 14.83,1.5 12.19,1.5C6.92,1.5 2.71,6.28 2.71,12C2.71,17.72 6.92,22.5 12.19,22.5C17.6,22.5 21.54,18.51 21.54,12.29C21.54,11.77 21.48,11.44 21.35,11.1Z"></path></svg>
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}
                </button>

                {/* ✅ ปุ่ม Google Redirect แยกเป็นตัวเลือกสำรอง */}
                <button
                    onClick={handleGoogleRedirect}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-blue-50 border border-blue-300 rounded-lg text-blue-700 font-medium transition-all duration-300 hover:bg-blue-100 disabled:opacity-50 text-sm"
                >
                    🔄 ลองวิธีอื่น (หากปุ่มข้างบนไม่ทำงาน)
                </button>
                

                <div className="flex items-center"><hr className="w-full border-gray-300" /><span className="px-4 text-gray-400 font-medium">OR</span><hr className="w-full border-gray-300" /></div>

                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('email')} className={`flex-1 py-2 text-center font-medium transition-colors duration-300 ${activeTab === 'email' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Email & Password</button>
                    <button onClick={() => setActiveTab('internal')} className={`flex-1 py-2 text-center font-medium transition-colors duration-300 ${activeTab === 'internal' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>🔧 Internal System</button>
                </div>

                <div className="pt-4">
                    {activeTab === 'email' && (
                        <div>
                            <form onSubmit={(e) => { e.preventDefault(); isSignUpMode ? handleSignUp(e) : handleLoginAttempt(() => signInWithEmail(email, password)); }} className="space-y-4">
                                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                                {isSignUpMode && <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />}
                                <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold transition-all duration-300 disabled:bg-green-400">{loading ? 'กำลังดำเนินการ...' : (isSignUpMode ? 'สร้างบัญชี' : 'เข้าสู่ระบบ')}</button>
                            </form>
                            <div className="mt-4 text-center space-y-3">
                                {!isSignUpMode && <button type="button" onClick={handleForgotPassword} className="text-sm text-blue-600 hover:text-blue-500">ลืมรหัสผ่าน?</button>}
                                <div className="text-sm">
                                    {isSignUpMode ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}
                                    <button type="button" onClick={() => { setIsSignUpMode(!isSignUpMode); setError(null); setConfirmPassword(''); }} className="ml-2 text-green-600 hover:text-green-500 font-medium">{isSignUpMode ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'internal' && (
                        <form onSubmit={(e) => { e.preventDefault(); handleLoginAttempt(() => signInWithInternalCredentials(username, internalPassword)); }} className="space-y-4">
                            <input type="text" placeholder="Username (empId)" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input type="password" placeholder="Password" value={internalPassword} onChange={e => setInternalPassword(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold transition-all duration-300 disabled:bg-blue-400">{loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign In'}</button>
                        </form>
                    )}
                </div>

                <div className="space-y-3">
                    <button onClick={() => handleSocialLogin('Apple')} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black text-white rounded-lg font-semibold transition-all duration-300 hover:bg-gray-800 disabled:opacity-50">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                        Sign in with Apple
                    </button>
                    <button onClick={() => handleSocialLogin('Facebook')} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold transition-all duration-300 hover:bg-blue-700 disabled:opacity-50">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Sign in with Facebook
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
