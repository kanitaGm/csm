// 📁 src/routes/ProtectedRoute.tsx - แก้ไข Hooks Order

import React, { useMemo } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PermissionManager, UserRoleService } from '../types/user';
import type { Role, UserRole } from '../types/user';

interface ProtectedRouteProps {
  requiredRole?: Role | Role[];
  requiredPermission?: {
    module: keyof UserRole['permissions'];
    action: string;
  };
  fallbackPath?: string;
  children?: React.ReactNode;
}

// Enhanced role permission checking
function checkAccess(
  userRoles: Role[], 
  requiredRole?: Role | Role[],
  requiredPermission?: ProtectedRouteProps['requiredPermission']
): boolean {
  // If no requirements specified, allow access
  if (!requiredRole && !requiredPermission) {
    return true;
  }

  // Check specific permission first (more granular)
  if (requiredPermission) {
    return PermissionManager.hasPermission(
      userRoles, 
      requiredPermission.module, 
      requiredPermission.action
    );
  }

  // Fall back to role hierarchy check
  if (requiredRole) {
    return PermissionManager.checkRoleHierarchy(userRoles, requiredRole);
  }

  return false;
}

// Main Protected Route Component
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole,
  requiredPermission,
  fallbackPath = '/unauthorized',
  children
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ✅ แก้ไข: ย้าย useMemo ขึ้นมาก่อน early returns
  const userRoles: Role[] = useMemo(() => {
    if (!user) return ['guest'];
    
    // Handle various role formats
    if (Array.isArray(user.roles)) {
      return user.roles.length > 0 ? user.roles : ['guest'];
    }
    
    // Legacy: if user.role exists (old format)
    if ((user as any).role) {
      const legacyRole = (user as any).role;
      if (typeof legacyRole === 'string') {
        return legacyRole.includes(',') 
          ? legacyRole.split(',').map((r: string) => r.trim() as Role)
          : [legacyRole as Role];
      }
    }
    
    return ['guest'];
  }, [user]);

  // Show loading state while authentication is being resolved
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check access permissions
  const hasAccess = checkAccess(userRoles, requiredRole, requiredPermission);

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Render children or Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

// Specialized route components for common use cases
export const CSMProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredPermission={{
      module: 'csm',
      action: 'canEvaluate'
    }}
    fallbackPath="/unauthorized"
  >
    {children}
  </ProtectedRoute>
);

export const AdminProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredRole={['admin', 'superAdmin']}
    fallbackPath="/unauthorized"
  >
    {children}
  </ProtectedRoute>
);

export const VendorManagementRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute
    requiredPermission={{
      module: 'csm',
      action: 'canManageVendors'
    }}
    fallbackPath="/unauthorized"
  >
    {children}
  </ProtectedRoute>
);

// Hook for checking permissions in components
export const usePermissions = () => {
  const { user } = useAuth();
  
  // ✅ แก้ไข: ใช้ useMemo เสมอ
  const userRoles: Role[] = useMemo(() => {
    if (!user) return ['guest'];
    
    if (Array.isArray(user.roles)) {
      return user.roles.length > 0 ? user.roles : ['guest'];
    }
    
    // Handle single role
    if (user.roles) {
      return [user.roles as Role];
    }
    
    return ['guest'];
  }, [user]);

  // ✅ แก้ไข: ใช้ useMemo สำหรับ return object เพื่อหลีกเลี่ยง re-render
  return useMemo(() => ({
    canEvaluateCSM: () => UserRoleService.canAccessCSMEvaluation(userRoles),
    canManageVendors: () => UserRoleService.canManageVendors(userRoles),
    canApproveAssessments: () => UserRoleService.canApproveAssessments(userRoles),
    canExportData: () => PermissionManager.hasPermission(userRoles, 'csm', 'canExportData'),
    canManageUsers: () => PermissionManager.hasPermission(userRoles, 'system', 'canManageUsers'),
    canViewReports: () => PermissionManager.hasPermission(userRoles, 'csm', 'canViewReports'),
    hasRole: (role: Role) => userRoles.includes(role),
    hasAnyRole: (roles: Role[]) => roles.some(role => userRoles.includes(role)),
    userRoles,
    displayRoles: PermissionManager.formatRolesForDisplay(userRoles),
    highestRole: PermissionManager.getHighestRole(userRoles)
  }), [userRoles]);
};

// Unauthorized Page Component
const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();
  
  // ✅ แก้ไข: ใช้ useMemo เสมอ
  const userRoles: Role[] = useMemo(() => {
    if (!user) return ['guest'];
    
    if (Array.isArray(user.roles)) {
      return user.roles.length > 0 ? user.roles : ['guest'];
    }
    
    if (user.roles) {
      return [user.roles as Role];
    }
    
    return ['guest'];
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-100 via-orange-200 to-gray-200">
      <div className="w-full max-w-md p-8 text-center bg-white shadow-xl rounded-2xl">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="mb-3 text-2xl font-bold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mb-4 text-gray-600">ขออภัย คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
        
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">สิทธิ์ปัจจุบันของคุณ:</p>
          <div className="space-y-1">
            {userRoles.map(role => (
              <span key={role} className="inline-block px-2 py-1 mr-1 text-xs bg-blue-100 text-blue-800 rounded">
                {PermissionManager.formatRolesForDisplay([role])}
              </span>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={() => window.history.back()} 
            className="w-full px-4 py-2 font-medium text-white transition-colors duration-200 bg-gray-600 rounded-lg hover:bg-gray-700"
          >
            ← ย้อนกลับ
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="w-full px-4 py-2 font-medium text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700"
          >
            🏠 ไปหน้าหลัก
          </button>
          <button 
            onClick={() => window.location.href = '/profile'} 
            className="w-full px-4 py-2 font-medium text-gray-700 transition-colors duration-200 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            👤 จัดการโปรไฟล์
          </button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            หากคุณคิดว่านี่เป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </div>
      </div>
    </div>
  );
};

export { UnauthorizedPage };
export default ProtectedRoute;