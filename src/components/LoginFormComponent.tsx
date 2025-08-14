// 📁 src/components/LoginFormComponent.tsx - Login Form ที่เร็วและไม่ค้าง

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, User, Lock, Mail, Chrome } from 'lucide-react';

interface LoginFormProps {
    onSuccess?: () => void;
}

const LoginFormComponent: React.FC<LoginFormProps> = ({ onSuccess }) => {
    const { 
        signInWithGoogle, 
        signInWithEmail, 
        signInWithInternalCredentials, 
        loading, 
        error 
    } = useAuth();

    // Form states
    const [activeTab, setActiveTab] = useState<'email' | 'internal'>('internal');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [empId, setEmpId] = useState('14900013'); // Test default
    const [passcode, setPasscode] = useState('123456'); // Test default
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ✅ ปรับปรุง: ใช้ useCallback เพื่อป้องกัน re-render ไม่จำเป็น
    const handleGoogleLogin = useCallback(async () => {
        setIsSubmitting(true);
        try {
            await signInWithGoogle();
            onSuccess?.();
        } catch (error) {
            console.error('Google login failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [signInWithGoogle, onSuccess]);

    const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;

        setIsSubmitting(true);
        try {
            await signInWithEmail(email.trim(), password);
            onSuccess?.();
        } catch (error) {
            console.error('Email login failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [email, password, signInWithEmail, onSuccess]);

    const handleInternalLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empId.trim() || !passcode.trim()) return;

        setIsSubmitting(true);
        try {
            await signInWithInternalCredentials(empId.trim(), passcode);
            onSuccess?.();
        } catch (error) {
            console.error('Internal login failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [empId, passcode, signInWithInternalCredentials, onSuccess]);

    // ✅ ปรับปรุง: ใช้ useMemo สำหรับ validation
    const emailFormValid = useMemo(() => 
        email.trim().length > 0 && password.trim().length > 0
    , [email, password]);

    const internalFormValid = useMemo(() => 
        empId.trim().length > 0 && passcode.trim().length > 0
    , [empId, passcode]);

    const isFormLoading = loading || isSubmitting;

    // ✅ Test users info
    const testUsers = [
        { empId: '14900013', passcode: '123456', role: 'csmAuditor' },
        { empId: '14900001', passcode: '123456', role: 'admin' },
        { empId: '14900014', passcode: 'admin123', role: 'superAdmin' }
    ];

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Tab Navigation */}
            <div className="flex p-1 mb-6 bg-gray-100 rounded-lg">
                <button
                    onClick={() => setActiveTab('internal')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'internal'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    รหัสพนักงาน
                </button>
                <button
                    onClick={() => setActiveTab('email')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'email'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    อีเมล
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Google Login Button */}
            <button
                onClick={handleGoogleLogin}
                disabled={isFormLoading}
                className="flex items-center justify-center w-full px-4 py-3 mb-4 space-x-3 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Chrome className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">
                    {isFormLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
                </span>
            </button>

            <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 text-gray-500 bg-white">หรือ</span>
                </div>
            </div>

            {/* Internal Login Form */}
            {activeTab === 'internal' && (
                <form onSubmit={handleInternalLogin} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            รหัสพนักงาน
                        </label>
                        <div className="relative">
                            <User className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                            <input
                                type="text"
                                value={empId}
                                onChange={(e) => setEmpId(e.target.value)}
                                className="w-full px-3 py-2 pl-10 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="14900013"
                                disabled={isFormLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            รหัสผ่าน
                        </label>
                        <div className="relative">
                            <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="w-full px-3 py-2 pl-10 pr-10 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="123456"
                                disabled={isFormLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute text-gray-400 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!internalFormValid || isFormLoading}
                        className="w-full px-4 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFormLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>

                    {/* Test Users Info */}
                    <div className="p-3 mt-4 rounded-lg bg-blue-50">
                        <h4 className="mb-2 text-sm font-medium text-blue-800">🧪 บัญชีทดสอบ:</h4>
                        <div className="space-y-1 text-xs">
                            {testUsers.map((user, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex space-x-2">
                                        <span className="font-mono">{user.empId}</span>
                                        <span className="text-gray-500">|</span>
                                        <span className="font-mono">{user.passcode}</span>
                                    </div>
                                    <span className="px-1 text-xs text-blue-800 bg-blue-200 rounded">
                                        {user.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            )}

            {/* Email Login Form */}
            {activeTab === 'email' && (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            อีเมล
                        </label>
                        <div className="relative">
                            <Mail className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 pl-10 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="your@email.com"
                                disabled={isFormLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700">
                            รหัสผ่าน
                        </label>
                        <div className="relative">
                            <Lock className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 pl-10 pr-10 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="รหัสผ่าน"
                                disabled={isFormLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute text-gray-400 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!emailFormValid || isFormLoading}
                        className="w-full px-4 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFormLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default LoginFormComponent;

