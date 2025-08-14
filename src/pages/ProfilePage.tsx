// =================================================================
// src/pages/ProfilePage.tsx
// หน้าตัวอย่างสำหรับผู้ใช้ที่ login แล้ว
// =================================================================
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AppUser, EmployeeProfile } from '../types';

const UserProfileCard: React.FC<{ user: AppUser }> = ({ user }) => {
    const isEmployee = 'firstName' in user.profile;

    return (
        <div className="p-8 bg-white border border-gray-200 shadow-lg rounded-xl">
            <h2 className="mb-2 text-2xl font-bold text-gray-800">
                {isEmployee ? `สวัสดี, ${(user.profile as EmployeeProfile).firstName}` : `สวัสดี, ${user.profile.displayName}`}
            </h2>
            <p className="mb-4 text-gray-600">คุณเข้าสู่ระบบในฐานะ: 
                <span className="px-2 py-1 ml-2 text-sm font-bold text-blue-800 bg-blue-100 rounded-full">{user.roles}</span>
            </p>
            <div className="pt-4 border-t border-gray-200">
                <p className="text-gray-500"><span className="font-semibold text-gray-700">Email:</span> {user.email}</p>
                {isEmployee && (
                    <>
                        <p className="text-gray-500"><span className="font-semibold text-gray-700">รหัสพนักงาน:</span> {(user.profile as EmployeeProfile).empId}</p>
                        <p className="text-gray-500"><span className="font-semibold text-gray-700">ตำแหน่ง:</span> {(user.profile as EmployeeProfile).position}</p>
                    </>
                )}
            </div>
        </div>
    )
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>ไม่พบข้อมูลผู้ใช้</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
        </header>
        <main>
          <UserProfileCard user={user} />
          {/* Add more dashboard components here based on user role */}
          <div className="p-6 mt-8 bg-white border border-gray-200 shadow-lg rounded-xl">
            <h3 className="mb-4 text-xl font-semibold">ส่วนเนื้อหา</h3>
            <p>เนื้อหาสำหรับผู้ใช้ที่มีสิทธิ์ `{user.roles}` จะแสดงที่นี่</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;