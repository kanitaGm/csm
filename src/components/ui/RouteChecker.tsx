// 📁 src/utils/RouteChecker.tsx
// Route Checker - ตรวจสอบ routes ที่หายไปและแสดงสถานะ

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Eye, ExternalLink } from 'lucide-react';

interface RouteStatus {
  path: string;
  title: string;
  status: 'implemented' | 'placeholder' | 'missing';
  description?: string;
  component?: string;
}

const RouteChecker: React.FC = () => {
  const [routes, setRoutes] = useState<RouteStatus[]>([]);
  const [filter, setFilter] = useState<'all' | 'implemented' | 'placeholder' | 'missing'>('all');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // กำหนด routes ที่ควรมีในระบบ CSM
    const expectedRoutes: RouteStatus[] = [
      // Main CSM
      {
        path: '/csm',
        title: 'CSM List Page',
        status: 'implemented',
        description: 'หน้าแสดงรายการผู้รับเหมาทั้งหมด',
        component: 'CSMListPage'
      },
      
      // Vendor Management
      {
        path: '/csm/vendors/add',
        title: 'Add Vendor Page',
        status: 'placeholder',
        description: 'หน้าเพิ่มผู้รับเหมาใหม่',
        component: 'CSMVendorAddPage (placeholder)'
      },
      {
        path: '/csm/vendors/:vendorId',
        title: 'Vendor Detail Page',
        status: 'placeholder',
        description: 'หน้ารายละเอียดผู้รับเหมา',
        component: 'CSMVendorDetailPage (placeholder)'
      },
      {
        path: '/csm/vendors/:vendorId/edit',
        title: 'Edit Vendor Page',
        status: 'placeholder',
        description: 'หน้าแก้ไขข้อมูลผู้รับเหมา',
        component: 'CSMVendorEditPage (placeholder)'
      },
      
      // Assessment
      {
        path: '/csm/e/:vdCode',
        title: 'CSM Evaluate Page',
        status: 'implemented',
        description: 'หน้าประเมิน CSM',
        component: 'CSMEvaluatePage'
      },
      {
        path: '/csm/a/:assessmentId',
        title: 'Assessment Detail Page',
        status: 'implemented',
        description: 'หน้ารายละเอียดการประเมิน',
        component: 'AssessmentDetailPage'
      },
      {
        path: '/csm/assessments/history',
        title: 'Assessment History Page',
        status: 'placeholder',
        description: 'หน้าประวัติการประเมินทั้งหมด',
        component: 'CSMAssessmentHistoryPage (placeholder)'
      },
      {
        path: '/csm/assessments/:vdCode/history',
        title: 'Vendor Assessment History',
        status: 'placeholder',
        description: 'หน้าประวัติการประเมินของผู้รับเหมาหนึ่งราย',
        component: 'CSMAssessmentHistoryPage (placeholder)'
      },
      
      // Reports & Analytics
      {
        path: '/csm/reports',
        title: 'CSM Reports Page',
        status: 'placeholder',
        description: 'หน้ารายงาน CSM',
        component: 'CSMReportsPage (placeholder)'
      },
      {
        path: '/csm/analytics',
        title: 'CSM Analytics Page',
        status: 'placeholder',
        description: 'หน้าวิเคราะห์ข้อมูล CSM',
        component: 'CSMAnalyticsPage (placeholder)'
      },
      
      // Settings
      {
        path: '/csm/settings',
        title: 'CSM Settings Page',
        status: 'placeholder',
        description: 'หน้าตั้งค่า CSM',
        component: 'CSMSettingsPage (placeholder)'
      },
      
      // Alternative routes
      {
        path: '/csm/assessment/:vdCode',
        title: 'Alternative Assessment Route',
        status: 'implemented',
        description: 'เส้นทางทางเลือกสำหรับการประเมิน',
        component: 'CSMEvaluatePage (redirect)'
      },
      {
        path: '/csm/evaluation/:vdCode',
        title: 'Alternative Evaluation Route',
        status: 'implemented',
        description: 'เส้นทางทางเลือกสำหรับการประเมิน',
        component: 'CSMEvaluatePage (redirect)'
      },
      
      // Missing routes that might be needed
      {
        path: '/csm/vendors',
        title: 'Vendor List Page',
        status: 'missing',
        description: 'หน้ารายการผู้รับเหมา (อาจซ้ำกับ /csm)',
        component: 'Missing - might redirect to /csm'
      },
      {
        path: '/csm/dashboard',
        title: 'CSM Dashboard',
        status: 'missing',
        description: 'Dashboard เฉพาะสำหรับ CSM',
        component: 'Missing - consider creating'
      },
      {
        path: '/csm/forms',
        title: 'CSM Forms Management',
        status: 'missing',
        description: 'จัดการแบบฟอร์มประเมิน CSM',
        component: 'Missing - might be useful'
      }
    ];

    setRoutes(expectedRoutes);
  }, []);

  const filteredRoutes = routes.filter(route => {
    if (filter === 'all') return true;
    return route.status === filter;
  });

  const getStatusIcon = (status: RouteStatus['status']) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'placeholder':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: RouteStatus['status']) => {
    switch (status) {
      case 'implemented':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'placeholder':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'missing':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const testRoute = (path: string) => {
    // แทนที่ parameter ด้วยค่าทดสอบ
    const testPath = path
      .replace(':vendorId', 'test-vendor-123')
      .replace(':vdCode', 'TEST001')
      .replace(':assessmentId', 'test-assessment-456');
    
    navigate(testPath);
  };

  const summary = routes.reduce((acc, route) => {
    acc[route.status] = (acc[route.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-6xl p-6 mx-auto">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">CSM Route Checker</h1>
        <p className="text-gray-600">ตรวจสอบสถานะของ routes ทั้งหมดในระบบ CSM</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Routes</p>
              <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Implemented</p>
              <p className="text-2xl font-bold text-green-600">{summary.implemented || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Placeholder</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.placeholder || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="p-4 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missing</p>
              <p className="text-2xl font-bold text-red-600">{summary.missing || 0}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'implemented', 'placeholder', 'missing'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as 'all' | 'implemented' | 'placeholder' | 'missing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'ทั้งหมด' : 
               status === 'implemented' ? 'พร้อมใช้งาน' :
               status === 'placeholder' ? 'Placeholder' : 'หายไป'}
            </button>
          ))}
        </div>
      </div>

      {/* Route List */}
      <div className="overflow-hidden bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Route Status</h2>
        </div>
        
        <div className="divide-y">
          {filteredRoutes.map((route, index) => (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2 space-x-3">
                    {getStatusIcon(route.status)}
                    <h3 className="text-lg font-medium text-gray-900">{route.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(route.status)}`}>
                      {route.status}
                    </span>
                  </div>
                  
                  <p className="mb-2 text-sm text-gray-600">{route.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">Path:</span>
                    <code className="px-2 py-1 font-mono text-sm bg-gray-100 rounded">{route.path}</code>
                    <span className="text-gray-500">Component:</span>
                    <code className="px-2 py-1 text-sm text-blue-700 rounded bg-blue-50">{route.component}</code>
                  </div>
                </div>
                
                <div className="flex items-center ml-4 space-x-2">
                  {route.status !== 'missing' && (
                    <button
                      onClick={() => testRoute(route.path)}
                      className="flex items-center px-3 py-1 space-x-1 text-sm text-blue-700 rounded bg-blue-50 hover:bg-blue-100"
                    >
                      <Eye className="w-4 h-4" />
                      <span>ทดสอบ</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => navigator.clipboard.writeText(route.path)}
                    className="flex items-center px-3 py-1 space-x-1 text-sm text-gray-700 rounded bg-gray-50 hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Location */}
      <div className="p-4 mt-6 border border-blue-200 rounded-lg bg-blue-50">
        <h3 className="mb-1 text-sm font-medium text-blue-900">Current Location</h3>
        <code className="font-mono text-sm text-blue-700">{location.pathname}</code>
      </div>
    </div>
  );
};

export default RouteChecker;