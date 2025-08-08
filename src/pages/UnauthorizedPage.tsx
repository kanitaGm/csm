// =================================================================
// srv/pages/UnauthorizedPage.tsx
// =================================================================
import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center text-center">
        <h1 className="text-6xl font-bold text-red-500">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mt-4 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="text-gray-600 mb-6">ขออภัย คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
        <Link to="/dashboard" className="bg-blue-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-600 transition">
            กลับไปหน้าหลัก
        </Link>
    </div>
  );
};

export default UnauthorizedPage;