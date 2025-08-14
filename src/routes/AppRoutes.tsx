
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ProtectedRoute, { CSMProtectedRoute } from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

// Lazy load pages สำหรับ performance
const HomePage = React.lazy(() => import('../pages/Homepage'));
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'));

const DebugAuth = React.lazy(() => import('../features/test/DebugAuth'));
const ImportCSVPage = React.lazy(() => import('../utils/ImportCSVPage'));

//CSM Management
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
const CSMDashboardPage = React.lazy(() => import('../features/csm/pages/CSMDashboardPage'));
const CSMListPage = React.lazy(() => import('../features/csm/pages/CSMListPage'));
const CSMEvaluatePage = React.lazy(() => import('../features/csm/pages/CSMEvaluatePage'));
const AssessmentDetailPage = React.lazy(() => import('../features/csm/pages/AssessmentDetailPage'));
const CSMReportsPage  = React.lazy(() => import('../features/csm/pages/CSMReportsPage'));

// Employees Pages
const EmployeeListPage = React.lazy(() => import('../features/employees/EmployeeListPage'));
const AddEmployeePage = React.lazy(() => import('../features/employees/AddEmployeePage'));
const EditEmployeePage = React.lazy(() => import('../features/employees/EditEmployeePage'));


// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
    </div>
);

// Placeholder Components for Missing CSM Pages
const PlaceholderPage = ({ title, description, icon = "🚧" }: { 
  title: string; 
  description: string; 
  icon?: string; 
}) => (
  <div className="max-w-4xl p-6 mx-auto">
    <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
      <div className="text-center">
        <div className="mb-4 text-6xl">{icon}</div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mb-6 text-lg text-gray-600">{description}</p>
        <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <p className="font-medium text-yellow-800">
            🚧 หน้านี้กำลังอยู่ระหว่างการพัฒนา - Coming Soon...
          </p>
        </div>
        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ← กลับหน้าก่อนหน้า
          </button>
        </div>
      </div>
    </div>
  </div>
);
const WIP = (title: string, description: string) => (
  <PlaceholderPage title={title} description={description} />
);


const AppRoutes: React.FC = () => {
    return (
        <AuthProvider>
            <ThemeProvider>
                <React.Suspense fallback={<PageLoader />}>
                    <Routes>

                        {/* ========== PUBLIC ROUTES ========== */}
                        
                        {/* Home Page - แสดงหน้าแรกพร้อม Login Panel */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/home" element={<HomePage />} />
                        
                        {/* Login Page - สำหรับ fallback */}
                        <Route path="/login" element={<LoginPage />} />                        

                        {/* Profile Page - Public access */}
                        <Route path="/profile/:empId" element={<ProfilePage />} />

                        {/* Test - Display */}
                        <Route path="/import-csv" element={<ImportCSVPage />} />
                        <Route path="/debug" element={<DebugAuth />} />

                        {/* ========== PROTECTED ROUTES ========== */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<MainLayout />}>
                                {/* Dashboard */}
                                <Route path="/dashboard" element={<DashboardPage />} />   
                                <Route path="/admin/*" element={WIP("Admin Page", "หน้านี้ยังอยู่ระหว่างการพัฒนา")} />
                        
                                
                                {/* CSM Routes */}
                                <Route path="/csm/*" element={<CSMProtectedRoute />}>
                                    <Route index element={<CSMListPage />} />
                                    <Route path="list" element={<CSMListPage />} />
                                    <Route path="e/:vdCode" element={<CSMEvaluatePage />} />
                                    <Route path="dashboard" element={<CSMDashboardPage />} />
                                    <Route path="detail/:id" element={<AssessmentDetailPage />} />
                                    <Route path="reports" element={<CSMReportsPage />} />
                                </Route>

                             {/* Emmployees Routes */}
                                <Route path="/emp/*" element={<ProtectedRoute />}>
                                    <Route index element={<EmployeeListPage />} />
                                    <Route path="list" element={<EmployeeListPage />} />
                                    {/*<Route path="s/:empId" element={<EmployeeListPage />} />*/}
                                    <Route path="e/:empId" element={<EditEmployeePage />} />
                                    <Route path="add" element={<AddEmployeePage />} />
                                    {/*<Route path="dashboard" element={<CSMDashboardPage />} />*/}
                                </Route>
                            </Route>
                        </Route>





                        {/* ========== FALLBACK ROUTES ========== */}
                        
                        {/* Redirect old login to home */}
                        <Route path="/auth/login" element={<Navigate to="/" replace />} />
                        
                        {/* 404 Not Found */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </React.Suspense>
            </ThemeProvider>
        </AuthProvider>
    );
};

export default AppRoutes;