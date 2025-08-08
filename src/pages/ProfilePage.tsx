// =================================================================
// src/pages/ProfilePage.tsx
// หน้าตัวอย่างสำหรับผู้ใช้ที่ login แล้ว
// =================================================================
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AppUser, EmployeeProfile } from '../types/types';

const UserProfileCard: React.FC<{ user: AppUser }> = ({ user }) => {
    const isEmployee = 'firstName' in user.profile;

    return (
        <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {isEmployee ? `สวัสดี, ${(user.profile as EmployeeProfile).firstName}` : `สวัสดี, ${user.profile.displayName}`}
            </h2>
            <p className="text-gray-600 mb-4">คุณเข้าสู่ระบบในฐานะ: 
                <span className="font-bold px-2 py-1 rounded-full text-sm ml-2 bg-blue-100 text-blue-800">{user.role}</span>
            </p>
            <div className="border-t border-gray-200 pt-4">
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
        </header>
        <main>
          <UserProfileCard user={user} />
          {/* Add more dashboard components here based on user role */}
          <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">ส่วนเนื้อหา</h3>
            <p>เนื้อหาสำหรับผู้ใช้ที่มีสิทธิ์ `{user.role}` จะแสดงที่นี่</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;