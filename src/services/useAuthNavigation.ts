// ========================================================================
// ไฟล์: src/sevices/useAuthNavigation.ts
// Hook สำหรับจัดการการ navigate หลังจาก login สำเร็จ
// ========================================================================
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { AppUser } from '../types/types';

interface AuthNavigationOptions {
  redirectTo?: string; // เส้นทางที่จะ redirect หลัง login สำเร็จ
  onLoginSuccess?: (user: AppUser, method: string) => void; // callback หลัง login สำเร็จ
  onLogoutSuccess?: () => void; // callback หลัง logout สำเร็จ
}

export function useAuthNavigation(options: AuthNavigationOptions = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    redirectTo = '/employees', // default redirect path
    onLoginSuccess,
    onLogoutSuccess
  } = options;

  // ✅ Handle login success event
  const handleLoginSuccess = useCallback((event: CustomEvent) => {
    const { user: loggedInUser, method } = event.detail;
    console.log('🎉 Login success detected:', method, loggedInUser?.email);
    
    // เรียก callback ถ้ามี
    if (onLoginSuccess) {
      onLoginSuccess(loggedInUser, method);
    }
    
    // Navigate ไปยังหน้าที่ต้องการ
    console.log('📍 Navigating to:', redirectTo);
    navigate(redirectTo, { replace: true });
    
  }, [navigate, redirectTo, onLoginSuccess]);

  // ✅ Handle logout success event
  const handleLogoutSuccess = useCallback(() => {
    console.log('👋 Logout success detected');
    
    // เรียก callback ถ้ามี
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
    
    // Navigate ไปยังหน้า login
    console.log('📍 Navigating to login page');
    navigate('/login', { replace: true });
    
  }, [navigate, onLogoutSuccess]);

  // ✅ Setup event listeners
  useEffect(() => {
    console.log('🎧 Setting up auth navigation listeners');
    
    // Type assertion for custom events
    const loginHandler = handleLoginSuccess as EventListener;
    const logoutHandler = handleLogoutSuccess as EventListener;
    
    // Listen to auth events
    window.addEventListener('auth:loginSuccess', loginHandler);
    window.addEventListener('auth:logoutSuccess', logoutHandler);
    
    return () => {
      console.log('🧹 Cleaning up auth navigation listeners');
      window.removeEventListener('auth:loginSuccess', loginHandler);
      window.removeEventListener('auth:logoutSuccess', logoutHandler);
    };
  }, [handleLoginSuccess, handleLogoutSuccess]);

  // ✅ Auto redirect ถ้า user login อยู่แล้ว และอยู่ในหน้า login
  useEffect(() => {
    if (user && window.location.pathname === '/login') {
      console.log('🔄 User already logged in, redirecting from login page');
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  // Return utilities
  return {
    // ฟังก์ชันสำหรับ manual navigation
    redirectToLogin: useCallback(() => {
      navigate('/login', { replace: true });
    }, [navigate]),
    
    redirectToDashboard: useCallback(() => {
      navigate(redirectTo, { replace: true });
    }, [navigate, redirectTo]),
    
    redirectTo: useCallback((path: string) => {
      navigate(path, { replace: true });
    }, [navigate]),
    
    // Current navigation state
    isOnLoginPage: window.location.pathname === '/login',
    currentPath: window.location.pathname,
  };
}