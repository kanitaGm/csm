// 📁 src/components/layout/MainLayout.tsx
// Fixed MainLayout with proper CSM navigation and Outlet
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Search,
  ChevronDown,
  LogOut,
  Activity,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const profileName = 'firstName' in user.profile 
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : String(user.profile.displayName ?? '');

  // สร้าง sidebar items พร้อม CSM
  const sidebarItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: location.pathname === '/dashboard' },
    { icon: Building2, label: 'CSM Management', href: '/csm', active: location.pathname.startsWith('/csm') },
    { icon: Users, label: 'Employees', href: '/employees', active: location.pathname.startsWith('/employees') },
    { icon: Activity, label: 'Safety Reports', href: '/reports', active: location.pathname.startsWith('/reports') },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', active: location.pathname.startsWith('/analytics') },
    { icon: FileText, label: 'Documents', href: '/documents', active: location.pathname.startsWith('/documents') },
    { icon: Calendar, label: 'Schedule', href: '/schedule', active: location.pathname.startsWith('/schedule') },
  ];

  // เพิ่ม admin panel สำหรับ admin/superadmin
  if (user.role === 'superadmin' || user.role === 'admin') {
    sidebarItems.push({ 
      icon: Shield, 
      label: 'Admin Panel', 
      href: '/admin', 
      active: location.pathname.startsWith('/admin')
    });
  }

  // เพิ่ม settings ท้ายสุด
  sidebarItems.push({
    icon: Settings, 
    label: 'Settings', 
    href: '/settings', 
    active: location.pathname.startsWith('/settings')
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b shadow-lg bg-white/80 backdrop-blur-md border-white/20">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side - Logo and menu toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white transition-all duration-200 shadow-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:shadow-xl"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text">
                INSEE Safety
              </h1>
            </div>
          </div>

          {/* Center - Search bar */}
          <div className="flex-1 hidden max-w-lg mx-8 md:flex">
            <div className="relative w-full">
              <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหารายงาน, เอกสาร, หรือผู้ใช้..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200">
              <Bell size={20} />
              <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-1 -right-1">
                3
              </span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center p-2 space-x-3 transition-all duration-200 rounded-xl hover:bg-gray-50/80"
              >
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=10b981&color=ffffff`}
                  alt={profileName}
                  className="object-cover w-10 h-10 rounded-full ring-2 ring-green-500/20"
                />
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* User dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 z-50 w-56 py-2 mt-2 border shadow-xl top-full bg-white/95 backdrop-blur-md rounded-xl border-white/20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{profileName}</p>
                    <p className="text-xs text-gray-500">{user.empId}</p>
                  </div>
                  <a 
                    href={`/profile/${user.empId || ''}`} 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600"
                  >
                    <User size={16} className="mr-3" />
                    โปรไฟล์
                  </a>
                  <a href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-green-50 hover:text-green-600">
                    <Settings size={16} className="mr-3" />
                    การตั้งค่า
                  </a>
                  <hr className="my-2 border-gray-100" />
                  <button 
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut size={16} className="mr-3" />
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } bg-white/70 backdrop-blur-md shadow-xl border-r border-white/20 transition-all duration-300 min-h-[calc(100vh-80px)]`}>
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  item.active 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-green-50 hover:text-green-600'
                }`}
              >
                <item.icon size={20} className={`${item.active ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                {isSidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content Area - ใช้ Outlet แทน hardcode content */}
        <main className="flex-1">
          <div className="w-full">
            {/* Outlet จะ render route components ตาม path */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;