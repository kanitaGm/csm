// 📁 src/routes/AppRoutes.tsx
// Fixed AppRoutes - แก้ไข structure และ error handling
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

// CSM Pages
import CSMListPage from '../features/csm/pages/CSMListPage';
import CSMEvaluatePage from '../features/csm/pages/CSMEvaluatePage';
import AssessmentDetailPage from '../features/csm/pages/AssessmentDetailPage';

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
                
                {/* CSM Management */}
                <Route path="/csm" element={<CSMListPage />} />
                <Route path="/csm/e/:vdCode" element={<CSMEvaluatePage />} />
                <Route path="/csm/a/:assessmentId" element={<AssessmentDetailPage />} />
                
                {/* Placeholder routes */}
                <Route path="/reports" element={<div className="p-6">Reports Page Coming Soon...</div>} />
                <Route path="/analytics" element={<div className="p-6">Analytics Page Coming Soon...</div>} />
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