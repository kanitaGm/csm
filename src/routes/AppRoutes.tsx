// src/routes/AppRoutes.tsx
//import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { CSMErrorBoundary } from '../contexts/ErrorBoundary';
// Layouts and Protected Routes
import { ThemeProvider } from '../contexts/ThemeContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout'; 
// import UnauthorizedPage from '../pages/UnauthorizedPage'; // ถูกรวมไปใน ProtectedRoute แล้ว
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
          
          <Route path="/admin/forms" element={<ThemeProvider><FormListPage /> </ThemeProvider>} />
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
