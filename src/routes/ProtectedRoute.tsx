// src/routes/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types'; 

interface ProtectedRouteProps {
  requiredRole?: Role | Role[];
  fallbackPath?: string;
}

// ✅ ฟังก์ชันตรวจสอบ role hierarchy
function checkRolePermission(userRole: Role, requiredRole: Role | Role[]): boolean {
  // Role hierarchy (เลขยิ่งสูงยิ่งมีสิทธิ์มาก)
  const roleHierarchy: Record<Role, number> = {
    guest: 0,
    //user: 1, // หากมี role user ให้เปิดคอมเมนต์
    plantAdmin: 2,
    //siteAdmin: 3,
    //zoneAdmin: 4,
    //regionalAdmin: 5,
    csmAdmin: 5,
    admin: 6,
    superadmin: 7
  };

  const userLevel = roleHierarchy[userRole] || 0;

  if (Array.isArray(requiredRole)) {
    return requiredRole.some(role => {
      const requiredLevel = roleHierarchy[role] || 0;
      return userLevel >= requiredLevel;
    });
  }

  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// ✅ หน้าแสดงเมื่อไม่มีสิทธิ์เข้าถึง (รวมไว้ในไฟล์เดียวกันเพื่อความสะดวก)
const UnauthorizedPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-100 via-orange-200 to-gray-200">
            <div className="w-full max-w-md p-8 text-center bg-white shadow-xl rounded-2xl">
                <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h1 className="mb-3 text-2xl font-bold text-gray-900">403 ไม่มีสิทธิ์เข้าถึง</h1>
                <p className="mb-6 text-gray-600">ขออภัย คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
                <div className="space-y-3">
                    <button onClick={() => window.history.back()} className="w-full px-4 py-2 font-medium text-white transition-colors duration-200 bg-gray-600 rounded-lg hover:bg-gray-700">
                        ← ย้อนกลับ
                    </button>
                    <button onClick={() => window.location.href = '/dashboard'} className="w-full px-4 py-2 font-medium text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700">
                        🏠 ไปหน้าหลัก
                    </button>
                </div>
            </div>
        </div>
    );
};


const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  requiredRole, 
  fallbackPath = '/login'
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-b-2 border-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    //console.log('🚫 No user found, redirecting to login');
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const userRole = user.role as Role;
    //console.log('🔍 Checking role access:', { userRole, requiredRole });
    
    if (!userRole || !checkRolePermission(userRole, requiredRole)) {
      //console.log('🚫 User role insufficient:', userRole, 'required:', requiredRole);
      return <UnauthorizedPage />;
    }
    //console.log('✅ Role check passed:', userRole);
  }

  // ✅ แก้ไข: ใช้ <Outlet /> เพื่อ render child routes ที่ซ้อนอยู่
  return <Outlet />;
};

export default ProtectedRoute;
