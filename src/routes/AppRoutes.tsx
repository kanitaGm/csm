// 📁 src/routes/AppRoutes.tsx
// Complete CSM Routes - เพิ่ม routes ให้ครอบคลุม CSM ทั้งหมด
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import NotFoundPage from '../pages/NotFoundPage';
import ProfilePage from '../features/employees/ProfilePage';

// Pages
import LoginPage from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Employees Pages
import EmployeeListPage from '../features/employees/EmployeeListPage';
import AddEmployeePage from '../features/employees/AddEmployeePage';
import EditEmployeePage from '../features/employees/EditEmployeePage';

// CSM Pages - Existing
import CSMListPage from '../features/csm/pages/CSMListPage';
import CSMEvaluatePage from '../features/csm/pages/CSMEvaluatePage';
import AssessmentDetailPage from '../features/csm/pages/AssessmentDetailPage';

// CSM Pages - Real implementations
import CSMVendorAddPage from '../features/csm/pages/CSMVendorAddPage';
import CSMVendorEditPage from '../features/csm/pages/CSMVendorEditPage';
import CSMVendorDetailPage from '../features/csm/pages/CSMVendorDetailPage';
import CSMReportsPage from '../features/csm/pages/CSMReportsPage';
//import CSMAnalyticsPage from '../features/csm/pages/CSMAnalyticsPage';
//import CSMAssessmentHistoryPage from '../features/csm/pages/CSMAssessmentHistoryPage';
//import CSMSettingsPage from '../features/csm/pages/CSMSettingsPage';

// Temporary Placeholder Components (เก็บไว้สำหรับ fallback)
/*
const PlaceholderComponent = ({ title, description }: { title: string; description: string }) => (
  <div className="p-6">
    <h1 className="mb-4 text-2xl font-bold">{title}</h1>
    <p className="text-gray-600">{description}</p>
    <div className="p-4 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <p className="text-yellow-800">🚧 กำลังพัฒนา - Coming Soon...</p>
    </div>
  </div>
); */

const CSMAnalyticsPage = () => (
  <div className="p-6">
    <h1 className="mb-4 text-2xl font-bold">วิเคราะห์ข้อมูล CSM</h1>
    <p className="text-gray-600">หน้านี้จะแสดงการวิเคราะห์ข้อมูล Dashboard และกราฟต่างๆ</p>
    <div className="p-4 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <p className="text-yellow-800">🚧 กำลังพัฒนา - Coming Soon...</p>
    </div>
  </div>
);

const CSMAssessmentHistoryPage = () => (
  <div className="p-6">
    <h1 className="mb-4 text-2xl font-bold">ประวัติการประเมิน</h1>
    <p className="text-gray-600">หน้านี้จะแสดงประวัติการประเมินทั้งหมด</p>
    <div className="p-4 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <p className="text-yellow-800">🚧 กำลังพัฒนา - Coming Soon...</p>
    </div>
  </div>
);

const CSMSettingsPage = () => (
  <div className="p-6">
    <h1 className="mb-4 text-2xl font-bold">ตั้งค่า CSM</h1>
    <p className="text-gray-600">หน้านี้จะใช้สำหรับตั้งค่าระบบ CSM</p>
    <div className="p-4 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
      <p className="text-yellow-800">🚧 กำลังพัฒนา - Coming Soon...</p>
    </div>
  </div>
);

// Admin Pages - Forms
import FormListPage from '../features/forms/ListFormManagementPage';
import EditFormPage from '../features/forms/DynamicFormEditPage';

// Test/Util Pages
import TestPage from '../features/test/test';
import ImportCSVPage from '../utils/ImportCSVPage';
import BulkDeleteExamples from '../features/test/BulkDeleteExamples';

const AppRoutes: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            {/* ========== PUBLIC ROUTES (ไม่ต้อง Login) ========== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile/:empId" element={<ProfilePage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/ImportCSVPage" element={<ImportCSVPage />} />
            
            {/* Admin routes ที่ไม่ใช้ MainLayout */}
            <Route path="/admin/forms" element={<FormListPage />} />
            <Route path="/admin/forms/e/:formId" element={<EditFormPage />} />
            <Route path="/admin/xDel" element={<BulkDeleteExamples />} />

            {/* ========== PROTECTED ROUTES (ต้อง Login + ใช้ MainLayout) ========== */}
            <Route element={<ProtectedRoute requiredRole={["admin", "superadmin"]} />}>
              <Route element={<MainLayout />}>
                {/* Dashboard */}
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Employee Management */}
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/employees/add" element={<AddEmployeePage />} />
                <Route path="/employees/:empId/edit" element={<EditEmployeePage />} />
                
                {/* ========== CSM MANAGEMENT (ครบถ้วน) ========== */}
                
                {/* CSM Main */}
                <Route path="/csm" element={<CSMListPage />} />
                
                {/* CSM Vendor Management */}
                <Route path="/csm/vendors/add" element={<CSMVendorAddPage />} />
                <Route path="/csm/vendors/:vendorId" element={<CSMVendorDetailPage />} />
                <Route path="/csm/vendors/:vendorId/edit" element={<CSMVendorEditPage />} />
                
                {/* CSM Assessment */}
                <Route path="/csm/e/:vdCode" element={<CSMEvaluatePage />} />
                <Route path="/csm/a/:assessmentId" element={<AssessmentDetailPage />} />
                <Route path="/csm/assessments/history" element={<CSMAssessmentHistoryPage />} />
                <Route path="/csm/assessments/:vdCode/history" element={<CSMAssessmentHistoryPage />} />
                
                {/* CSM Reports & Analytics */}
                <Route path="/csm/reports" element={<CSMReportsPage />} />
                <Route path="/csm/analytics" element={<CSMAnalyticsPage />} />
                
                {/* CSM Settings */}
                <Route path="/csm/settings" element={<CSMSettingsPage />} />
                
                {/* Alternative CSM Routes (สำหรับ backward compatibility) */}
                <Route path="/csm/assessment/:vdCode" element={<CSMEvaluatePage />} />
                <Route path="/csm/evaluation/:vdCode" element={<CSMEvaluatePage />} />
                
                {/* ========== OTHER MODULES ========== */}
                
                {/* General Reports & Analytics */}
                <Route path="/reports" element={<div className="p-6">
                  <h1 className="mb-4 text-2xl font-bold">รายงานทั่วไป</h1>
                  <p className="text-gray-600">รายงานระบบทั่วไป (ไม่เฉพาะ CSM)</p>
                  <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-blue-800">💡 สำหรับรายงาน CSM ไปที่ <a href="/csm/reports" className="underline">CSM Reports</a></p>
                  </div>
                </div>} />
                
                <Route path="/analytics" element={<div className="p-6">
                  <h1 className="mb-4 text-2xl font-bold">วิเคราะห์ข้อมูลทั่วไป</h1>
                  <p className="text-gray-600">วิเคราะห์ข้อมูลระบบทั่วไป (ไม่เฉพาะ CSM)</p>
                  <div className="p-4 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                    <p className="text-blue-800">💡 สำหรับ Analytics CSM ไปที่ <a href="/csm/analytics" className="underline">CSM Analytics</a></p>
                  </div>
                </div>} />
                
                {/* Other placeholder routes */}
                <Route path="/documents" element={<div className="p-6">Documents Page Coming Soon...</div>} />
                <Route path="/schedule" element={<div className="p-6">Schedule Page Coming Soon...</div>} />
                <Route path="/settings" element={<div className="p-6">Settings Page Coming Soon...</div>} />
              </Route>
            </Route>

            {/* Route หลัก */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 NOT FOUND */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRoutes;