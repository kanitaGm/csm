// src/pages/DashboardPage.tsx

//import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { EmployeeProfile } from '../types/types';

export const DashboardPage = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">


            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white p-8 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold text-gray-800">ข้อมูลผู้ใช้</h2>
                        <div className="mt-4 space-y-2 text-gray-700">
                            <p><strong>UID:</strong> {user?.uid}</p>
                            <p><strong>Email:</strong> {user?.email}</p>
                            <p><strong>รหัสพนักงาน (empId):</strong> {user?.empId}</p>
                            <p><strong>สิทธิ์ (Role):</strong> <span className="px-3 py-1 text-sm font-semibold text-white bg-blue-500 rounded-full">{user?.role}</span></p>
                            <hr className="my-4"/>
                            <h3 className="text-xl font-bold text-gray-800">โปรไฟล์พนักงาน</h3>
                            <p><strong>Profiles:</strong> {user?.displayName}</p>
                            <p><strong>ตำแหน่ง:</strong> {(user?.profile as EmployeeProfile)?.position || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
