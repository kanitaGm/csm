// 📁 src/routes/AppRoutes.tsx
// Complete and Fixed AppRoutes with all CSM routes
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import NotFoundPage from '../pages/NotFoundPage';

// Pages
import LoginPage from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// Employees Pages
import EmployeeListPage from '../features/employees/EmployeeListPage';
import AddEmployeePage from '../features/employees/AddEmployeePage';
import EditEmployeePage from '../features/employees/EditEmployeePage';
import ProfilePage from '../features/employees/ProfilePage';

// CSM Pages - Existing Real Components
import CSMListPage from '../features/csm/pages/CSMListPage';
import CSMEvaluatePage from '../features/csm/pages/CSMEvaluatePage';
import AssessmentDetailPage from '../features/csm/pages/AssessmentDetailPage';

// CSM Pages - Check if these exist or need to be implemented
import CSMReportsPage from '../features/csm/pages/CSMReportsPage';

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

// CSM Placeholder Pages
const CSMVendorAddPage = () => (
  <PlaceholderPage 
    title="เพิ่มผู้ขาย/ผู้รับเหมา" 
    description="หน้าสำหรับเพิ่มข้อมูลผู้ขาย/ผู้รับเหมาใหม่เข้าสู่ระบบ" 
    icon="🏢"
  />
);

const CSMVendorListPage = () => (
  <PlaceholderPage 
    title="รายการผู้ขาย/ผู้รับเหมา" 
    description="หน้าแสดงรายการผู้ขาย/ผู้รับเหมาทั้งหมดในระบบ" 
    icon="📋"
  />
);

const CSMVendorDetailPage = () => (
  <PlaceholderPage 
    title="รายละเอียดผู้ขาย/ผู้รับเหมา" 
    description="หน้าแสดงรายละเอียดข้อมูลผู้ขาย/ผู้รับเหมา" 
    icon="👁️"
  />
);

const CSMVendorEditPage = () => (
  <PlaceholderPage 
    title="แก้ไขข้อมูลผู้ขาย/ผู้รับเหมา" 
    description="หน้าสำหรับแก้ไขข้อมูลผู้ขาย/ผู้รับเหมา" 
    icon="✏️"
  />
);

const CSMAnalyticsPage = () => (
  <PlaceholderPage 
    title="วิเคราะห์ข้อมูล CSM" 
    description="Dashboard และการวิเคราะห์ข้อมูลด้วยกราฟและชาร์ต" 
    icon="📊"
  />
);

const CSMAssessmentHistoryPage = () => (
  <PlaceholderPage 
    title="ประวัติการประเมิน" 
    description="หน้าแสดงประวัติการประเมินทั้งหมดในระบบ" 
    icon="📜"
  />
);

const CSMSettingsPage = () => (
  <PlaceholderPage 
    title="ตั้งค่า CSM" 
    description="หน้าตั้งค่าระบบ CSM และการจัดการฟอร์มการประเมิน" 
    icon="⚙️"
  />
);

const TrainingPage = () => (
  <PlaceholderPage 
    title="การฝึกอบรม" 
    description="ระบบจัดการการฝึกอบรมด้านความปลอดภัย" 
    icon="🎓"
  />
);

const GeneralReportsPage = () => (
  <PlaceholderPage 
    title="รายงานทั่วไป" 
    description="รายงานและสถิติทั่วไปของระบบ (ไม่เฉพาะ CSM)" 
    icon="📈"
  />
);

const SystemSettingsPage = () => (
  <PlaceholderPage 
    title="ตั้งค่าระบบ" 
    description="ตั้งค่าทั่วไปของระบบและการจัดการผู้ใช้" 
    icon="🔧"
  />
);

// Admin Pages - Forms (if they exist)
const FormListPage = React.lazy(() => 
  import('../features/forms/ListFormManagementPage').catch(() => ({
    default: () => <PlaceholderPage title="จัดการฟอร์ม" description="ระบบจัดการฟอร์มต่างๆ" icon="📝" />
  }))
);

const EditFormPage = React.lazy(() => 
  import('../features/forms/DynamicFormEditPage').catch(() => ({
    default: () => <PlaceholderPage title="แก้ไขฟอร์ม" description="หน้าแก้ไขฟอร์มแบบไดนามิก" icon="🔧" />
  }))
);

// Test Pages (optional)
const TestPage = React.lazy(() => 
  import('../features/test/test').catch(() => ({
    default: () => <PlaceholderPage title="หน้าทดสอบ" description="หน้าสำหรับทดสอบฟีเจอร์ต่างๆ" icon="🧪" />
  }))
);

const ImportCSVPage = React.lazy(() => 
  import('../utils/ImportCSVPage').catch(() => ({
    default: () => <PlaceholderPage title="นำเข้า CSV" description="หน้านำเข้าข้อมูลจากไฟล์ CSV" icon="📊" />
  }))
);

const BulkDeleteExamples = React.lazy(() => 
  import('../features/test/BulkDeleteExamples').catch(() => ({
    default: () => <PlaceholderPage title="ตัวอย่างลบหลายรายการ" description="หน้าทดสอบการลบข้อมูลหลายรายการ" icon="🗑️" />
  }))
);

const AppRoutes: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            {/* ========== PUBLIC ROUTES (ไม่ต้อง Login) ========== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile/:empId" element={<ProfilePage />} />
            
            {/* Test/Utility Routes - Public */}
            <Route path="/test" element={
              <React.Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
                <TestPage />
              </React.Suspense>
            } />
            <Route path="/ImportCSVPage" element={
              <React.Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
                <ImportCSVPage />
              </React.Suspense>
            } />
            
            {/* Admin routes ที่ไม่ใช้ MainLayout */}
            <Route path="/admin/forms" element={
              <React.Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
                <FormListPage />
              </React.Suspense>
            } />
            <Route path="/admin/forms/e/:formId" element={
              <React.Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
                <EditFormPage />
              </React.Suspense>
            } />
            <Route path="/admin/xDel" element={
              <React.Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
                <BulkDeleteExamples />
              </React.Suspense>
            } />

            {/* ========== PROTECTED ROUTES (ต้อง Login + ใช้ MainLayout) ========== */}
            <Route element={<ProtectedRoute requiredRole={["admin", "superadmin"]} />}>
              <Route element={<MainLayout />}>
                {/* Dashboard */}
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Employee Management */}
                <Route path="/employees" element={<EmployeeListPage />} />
                <Route path="/employees/add" element={<AddEmployeePage />} />
                <Route path="/employees/:empId/edit" element={<EditEmployeePage />} />
                
                {/* ========== CSM MANAGEMENT (ครบถ้วนและแก้ไข Navigation) ========== */}
                
                {/* CSM Main - List Page */}
                <Route path="/csm" element={<CSMListPage />} />
                
                {/* CSM Vendor Management */}
                <Route path="/csm/vendors" element={<CSMVendorListPage />} />
                <Route path="/csm/vendors/add" element={<CSMVendorAddPage />} />
                <Route path="/csm/vendors/:vendorId" element={<CSMVendorDetailPage />} />
                <Route path="/csm/vendors/:vendorId/edit" element={<CSMVendorEditPage />} />
                
                {/* CSM Assessment Routes - แก้ไขปัญหา Navigation */}
                <Route path="/csm/e/:vdCode" element={<CSMEvaluatePage />} />
                <Route path="/csm/evaluate" element={<CSMEvaluatePage />} />
                <Route path="/csm/assessment/:vdCode" element={<CSMEvaluatePage />} />
                <Route path="/csm/evaluation/:vdCode" element={<CSMEvaluatePage />} />
                
                {/* Assessment Detail */}
                <Route path="/csm/a/:assessmentId" element={<AssessmentDetailPage />} />
                
                {/* Assessment History */}
                <Route path="/csm/assessments/history" element={<CSMAssessmentHistoryPage />} />
                <Route path="/csm/assessments/:vdCode/history" element={<CSMAssessmentHistoryPage />} />
                <Route path="/csm/history" element={<CSMAssessmentHistoryPage />} />
                
                {/* CSM Reports & Analytics */}
                <Route path="/csm/reports" element={<CSMReportsPage />} />
                <Route path="/csm/analytics" element={<CSMAnalyticsPage />} />
                
                {/* CSM Settings */}
                <Route path="/csm/settings" element={<CSMSettingsPage />} />
                
                {/* ========== OTHER MODULES ========== */}
                
                {/* Training */}
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/training/*" element={<TrainingPage />} />
                
                {/* General Reports & Analytics */}
                <Route path="/reports" element={<GeneralReportsPage />} />
                <Route path="/analytics" element={<GeneralReportsPage />} />
                
                {/* System Settings */}
                <Route path="/settings" element={<SystemSettingsPage />} />
                
                {/* Other placeholder routes */}
                <Route path="/documents" element={
                  <PlaceholderPage title="เอกสาร" description="ระบบจัดการเอกสาร" icon="📄" />
                } />
                <Route path="/schedule" element={
                  <PlaceholderPage title="ตารางเวลา" description="ระบบจัดการตารางเวลา" icon="📅" />
                } />
              </Route>
            </Route>

            {/* ========== REDIRECTS ========== */}
            
            {/* Root redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* CSM shortcuts */}
            <Route path="/csm/list" element={<Navigate to="/csm" replace />} />
            
            {/* ========== 404 NOT FOUND ========== */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRoutes;