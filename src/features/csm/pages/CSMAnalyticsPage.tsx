// 📁 src/features/csm/pages/CSMAnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';

const CSMAnalyticsPage: React.FC = () => {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">วิเคราะห์ข้อมูล CSM</h1>
              <p className="text-gray-600">Dashboard และการวิเคราะห์ข้อมูลเชิงลึก</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
              <BarChart3 className="w-5 h-5 mr-2" />
              แนวโน้มคะแนนประเมิน
            </h2>
            <div className="flex items-center justify-center h-64 rounded bg-gray-50">
              <p className="text-gray-500">🚧 กราฟแนวโน้มคะแนน - กำลังพัฒนา</p>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
              <PieChart className="w-5 h-5 mr-2" />
              การกระจายตามหมวดหมู่
            </h2>
            <div className="flex items-center justify-center h-64 rounded bg-gray-50">
              <p className="text-gray-500">🚧 กราฟวงกลม - กำลังพัฒนา</p>
            </div>
          </div>
        </div>

        <div className="p-4 mt-8 border border-blue-200 rounded-lg bg-blue-50">
          <p className="text-blue-800">
            💡 หน้านี้จะแสดงการวิเคราะห์ข้อมูลเชิงลึก รวมถึงกราฟแนวโน้ม, การเปรียบเทียบ, และ prediction
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default CSMAnalyticsPage;

// ===================================================================

// 📁 src/features/csm/pages/CSMAssessmentHistoryPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { History, Calendar, FileText, Search } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';

const CSMAssessmentHistoryPage: React.FC = () => {
  const { vdCode } = useParams<{ vdCode?: string }>();
  const { toasts, addToast, removeToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <History className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {vdCode ? `ประวัติการประเมิน - ${vdCode}` : 'ประวัติการประเมินทั้งหมด'}
              </h1>
              <p className="text-gray-600">รายการประวัติการประเมิน CSM</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="ค้นหาการประเมิน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Assessment List */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6">
            <div className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">ยังไม่มีประวัติการประเมิน</h3>
              <p className="mb-4 text-gray-600">เมื่อมีการประเมิน CSM จะแสดงประวัติที่นี่</p>
              <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <p className="text-yellow-800">🚧 กำลังพัฒนา - จะเชื่อมต่อกับข้อมูลจริงจาก Firebase</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default CSMAssessmentHistoryPage;

// ===================================================================

// 📁 src/features/csm/pages/CSMSettingsPage.tsx
import React, { useState } from 'react';
import { Settings, Save, Bell, Mail, Calendar, Users } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';

const CSMSettingsPage: React.FC = () => {
  const { toasts, addToast, removeToast } = useToast();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      assessmentReminders: true,
      expirationAlerts: true,
      weeklyReports: false
    },
    assessment: {
      defaultFrequency: '1year',
      autoReminders: true,
      reminderDays: 30,
      graceperiod: 7
    },
    reports: {
      autoGenerate: false,
      frequency: 'monthly',
      recipients: ''
    }
  });

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'บันทึกสำเร็จ',
      message: 'การตั้งค่าถูกบันทึกเรียบร้อยแล้ว'
    });
  };

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า CSM</h1>
              <p className="text-gray-600">จัดการการตั้งค่าระบบ CSM</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
              <Bell className="w-5 h-5 mr-2" />
              การแจ้งเตือน
            </h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, email: e.target.checked }
                  }))}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">แจ้งเตือนทางอีเมล</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications.assessmentReminders}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, assessmentReminders: e.target.checked }
                  }))}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">แจ้งเตือนการประเมิน</span>
              </label>
            </div>
          </div>

          {/* Assessment Settings */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
              <Calendar className="w-5 h-5 mr-2" />
              การประเมิน
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">ความถี่เริ่มต้น</label>
                <select 
                  value={settings.assessment.defaultFrequency}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    assessment: { ...prev.assessment, defaultFrequency: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1year">ทุกปี</option>
                  <option value="2year">ทุก 2 ปี</option>
                  <option value="3year">ทุก 3 ปี</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">แจ้งเตือนก่อนหมดอายุ (วัน)</label>
                <input
                  type="number"
                  value={settings.assessment.reminderDays}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    assessment: { ...prev.assessment, reminderDays: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>

        <div className="p-4 mt-8 border border-yellow-200 rounded-lg bg-yellow-50">
          <p className="text-yellow-800">🚧 หน้าตั้งค่า - กำลังพัฒนาฟีเจอร์เพิ่มเติม</p>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default CSMSettingsPage;