// src/pages/HomePage.tsx - แยก HomePage ออกมา
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ระบบจัดการข้อมูลพนักงาน
          </h1>
          <p className="text-gray-600">
            ค้นหาข้อมูลพนักงานและประวัติการอบรม
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">
              📋 สำหรับผู้ใช้ทั่วไป
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              เข้าดูโปรไฟล์พนักงานโดยใส่รหัสใน URL
            </p>
            <div className="bg-white rounded border px-3 py-2 text-sm font-mono text-gray-600">
              /profile/[รหัสพนักงาน]
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">
              🔐 สำหรับผู้ดูแลระบบ
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                เข้าสู่ระบบหลัก
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                เข้าสู่ระบบจัดการ
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">ตัวอย่างการใช้งาน</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div>👤 /profile/EMP001 - ดูข้อมูลพนักงาน EMP001</div>
            <div>👤 /profile/STF123 - ดูข้อมูลพนักงาน STF123</div>
            <div>🔑 /login - เข้าระบบหลัก</div>
            <div>⚙️ /admin - เข้าระบบจัดการ (Admin)</div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            💡 ระบบนี้ใช้สำหรับการตรวจสอบข้อมูลและประวัติการอบรมของพนักงาน
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;