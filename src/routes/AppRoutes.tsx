// src/routes/AppRoutes.tsx
//import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CSMErrorBoundary } from '../contexts/ErrorBoundary';
// Layouts and Protected Routes
import { ThemeProvider } from '../components/ui/ThemeContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout'; 
// import UnauthorizedPage from '../pages/UnauthorizedPage'; // ถูกรวมไปใน ProtectedRoute แล้ว
import NotFoundPage from '../pages/NotFoundPage'; 
import ProfilePage from '../pages/employees/ProfilePage'; 

// Pages
import LoginPage from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Employees Pages
import EmployeeListPage from '../pages/employees/EmployeeListPage'; 
import AddEmployeePage from '../pages/employees/AddEmployeePage'; 
import EditEmployeePage from '../pages/employees/EditEmployeePage'; 

// CSM Pages
import CSMListPage from '../features/csm/pages/CSMListPage';
import CSMEvaluatePage from '../features/csm/pages/CSMEvaluatePage';
import AssessmentDetailPage from '../features/csm/pages/AssessmentDetailPage';

// Admin Pages
import FormListPage from '../features/admin/forms/formsListPage';
import CreateFormPage from '../features/admin/forms/CreateFormPage';
import EditFormPage from '../features/admin/forms/FormEditorPage';

// Test/Util Pages
import TestPage from '../pages/test/test'; 
import ImportCSVPage from '../components/utils/ImportCSVPage'; 



const AppRoutes = () => {
  return (
    <AuthProvider> 
      <BrowserRouter>
        <Routes>
          {/* ========== PUBLIC ROUTES (ไม่ต้อง Login) ========== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile/:empId" element={<ProfilePage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/ImportCSVPage" element={<ImportCSVPage />} />

          <Route path="/admin/forms" element={<FormListPage />} />
          <Route path="/admin/forms/c" element={<CreateFormPage />} />
          <Route path="/admin/forms/e/:formId" element={<EditFormPage />} />
          
          
          
          {/* ========== PROTECTED ROUTES (ต้อง Login) ========== */}
          <Route element={<ProtectedRoute requiredRole={["admin", "superadmin"]} />}>
            <Route element={<MainLayout />}>
              {/* Route ทั้งหมดข้างในนี้จะถูกป้องกันและใช้ MainLayout */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeeListPage />} />
              <Route path="/employees/add" element={<AddEmployeePage />} />
              <Route path="/employees/:empId/edit" element={<EditEmployeePage />} />
            
              {/* ========== CMS Process ROUTES (SafetyAdmin only*) ========== */} ฃ
                  <Route
                    path="/csm"
                    element={
                      <ThemeProvider>
                        <CSMErrorBoundary>
                          <CSMListPage />
                        </CSMErrorBoundary>
                      </ThemeProvider>
                    }
                  />


                  <Route path="/csm/evaluate" element={<ThemeProvider><CSMEvaluatePage /> </ThemeProvider>} />
                  <Route path="/csm/assessment/:assessmentId" element={<ThemeProvider><AssessmentDetailPage /></ThemeProvider>} />

              
              
            {/* ========== Forms ROUTES (SuperAdmin only*) ==========  
            <Route path="/admin/forms" element={<FormListPage  />} />
            <Route path="/admin/forms/create" element={<FormEditorPage    />} />
            <Route path="/admin/forms/edit/:formId" element={<FormEditorPage  />} />
            */}


            </Route>
          </Route>



          {/* Route หลัก: ถ้าเข้าเว็บครั้งแรก ให้ไปที่ /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* ========== 404 NOT FOUND ========== */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRoutes;
