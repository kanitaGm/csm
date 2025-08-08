// ========================================================================
// ไฟล์: src/components/layout/MainLayout.tsx
// คำอธิบาย: Layout หลักที่มี Navbar/Sidebar สำหรับหน้าที่ต้อง Login
// ========================================================================
//import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const profileName = 'firstName' in user.profile 
  ? `${user.profile.firstName} ${user.profile.lastName}`
  : String(user.profile.displayName ?? '');

  const profileLink = 'empId' in user.profile ? `/profile/${user.profile.empId}` : '/dashboard';

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <NavLink to="/" className="text-xl font-bold text-green-600">INSEE Safety</NavLink>
          <div className="flex items-center space-x-4">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-green-600 font-bold" : "text-gray-600"}>Dashboard</NavLink>
            {user.role !== 'guest' && <NavLink to={profileLink} className={({isActive}) => isActive ? "text-green-600 font-bold" : "text-gray-600"}>Profile</NavLink>}
            {(user.role === 'superadmin' || user.role === 'admin') && <NavLink to="/admin" className={({isActive}) => isActive ? "text-green-600 font-bold" : "text-gray-600"}>Admin</NavLink>}
            <span className="text-gray-500">|</span>
            <span className="text-gray-700">Welcome, {String(profileName)} </span>
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-6">
        <Outlet /> {/* <-- หน้าต่างๆ จะถูก Render ตรงนี้ */}
      </main>
    </div>
  );
};

export default MainLayout;