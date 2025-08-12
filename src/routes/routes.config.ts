// 📁 src/routes/routes.config.ts
// CSM Routes Configuration - จัดการ routes ให้เป็นระเบียบ

export interface RouteConfig {
  path: string;
  title: string;
  description?: string;
  icon?: string;
  protected?: boolean;
  roles?: string[];
  parent?: string;
  children?: RouteConfig[];
}

// =================== CSM ROUTES CONFIGURATION ===================
export const CSM_ROUTES: RouteConfig[] = [
  {
    path: '/csm',
    title: 'CSM Management',
    description: 'หน้าหลักการจัดการ CSM',
    icon: 'Building2',
    protected: true,
    roles: ['admin', 'superadmin'],
    children: [
      // Vendor Management
      {
        path: '/csm/vendors/add',
        title: 'เพิ่มผู้รับเหมา',
        description: 'เพิ่มผู้รับเหมาใหม่เข้าระบบ',
        icon: 'Plus',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/vendors/:vendorId',
        title: 'รายละเอียดผู้รับเหมา',
        description: 'ดูรายละเอียดผู้รับเหมา',
        icon: 'Eye',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/vendors/:vendorId/edit',
        title: 'แก้ไขผู้รับเหมา',
        description: 'แก้ไขข้อมูลผู้รับเหมา',
        icon: 'Edit',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      
      // Assessment Management
      {
        path: '/csm/e/:vdCode',
        title: 'ประเมิน CSM',
        description: 'หน้าประเมิน CSM',
        icon: 'CheckSquare',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/a/:assessmentId',
        title: 'รายละเอียดการประเมิน',
        description: 'ดูรายละเอียดการประเมิน',
        icon: 'FileText',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/assessments/history',
        title: 'ประวัติการประเมิน',
        description: 'ดูประวัติการประเมินทั้งหมด',
        icon: 'History',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/assessments/:vdCode/history',
        title: 'ประวัติการประเมินของผู้รับเหมา',
        description: 'ดูประวัติการประเมินของผู้รับเหมารายหนึ่ง',
        icon: 'History',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      
      // Reports & Analytics
      {
        path: '/csm/reports',
        title: 'รายงาน CSM',
        description: 'รายงานต่างๆ ของระบบ CSM',
        icon: 'BarChart3',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      {
        path: '/csm/analytics',
        title: 'วิเคราะห์ข้อมูล CSM',
        description: 'Dashboard และการวิเคราะห์ข้อมูล CSM',
        icon: 'TrendingUp',
        protected: true,
        roles: ['admin', 'superadmin']
      },
      
      // Settings
      {
        path: '/csm/settings',
        title: 'ตั้งค่า CSM',
        description: 'ตั้งค่าระบบ CSM',
        icon: 'Settings',
        protected: true,
        roles: ['admin', 'superadmin']
      }
    ]
  }
];

// =================== HELPER FUNCTIONS ===================

/**
 * Get all CSM routes as flat array
 */
export const getAllCSMRoutes = (): RouteConfig[] => {
  const flatRoutes: RouteConfig[] = [];
  
  const addRoutesRecursively = (routes: RouteConfig[]) => {
    routes.forEach(route => {
      flatRoutes.push(route);
      if (route.children) {
        addRoutesRecursively(route.children);
      }
    });
  };
  
  addRoutesRecursively(CSM_ROUTES);
  return flatRoutes;
};

/**
 * Get route by path
 */
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  const allRoutes = getAllCSMRoutes();
  return allRoutes.find(route => route.path === path);
};

/**
 * Check if user has access to route
 */
export const hasRouteAccess = (route: RouteConfig, userRole: string): boolean => {
  if (!route.protected) return true;
  if (!route.roles || route.roles.length === 0) return true;
  return route.roles.includes(userRole);
};

/**
 * Get navigation breadcrumbs
 */
export const getBreadcrumbs = (currentPath: string): RouteConfig[] => {
  const breadcrumbs: RouteConfig[] = [];
  const allRoutes = getAllCSMRoutes();
  
  // Find the current route
  const currentRoute = allRoutes.find(route => route.path === currentPath);
  if (!currentRoute) return breadcrumbs;
  
  // Build breadcrumbs by traversing up the hierarchy
  // This is a simplified version - you might want to implement proper parent tracking
  breadcrumbs.push(currentRoute);
  
  return breadcrumbs;
};

// =================== ROUTE VALIDATION ===================

/**
 * Validate that all CSM routes are properly configured
 */
export const validateCSMRoutes = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const allRoutes = getAllCSMRoutes();
  
  // Check for duplicate paths
  const paths = allRoutes.map(route => route.path);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate routes found: ${duplicates.join(', ')}`);
  }
  
  // Check for missing required fields
  allRoutes.forEach(route => {
    if (!route.path) errors.push('Route missing path');
    if (!route.title) errors.push(`Route ${route.path} missing title`);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// =================== EXPORT FOR USE IN COMPONENTS ===================

export default CSM_ROUTES;