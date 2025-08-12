// 📁 src/components/layout/MainLayout.tsx
// Updated MainLayout with complete CSM navigation
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronUp,
  LogOut,
  Activity,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Building2,
  Plus,
  History,
  TrendingUp,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SubMenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
  submenu?: SubMenuItem[];
}

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['csm']); // CSM เปิดอยู่ตอนเริ่มต้น
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const profileName = 'firstName' in user.profile 
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : String(user.profile.displayName ?? '');

  // สร้าง CSM submenu
  const csmSubmenu: SubMenuItem[] = [
    { icon: Building2, label: 'รายการผู้รับเหมา', href: '/csm', active: location.pathname === '/csm' },
    { icon: Plus, label: 'เพิ่มผู้รับเหมา', href: '/csm/vendors/add', active: location.pathname === '/csm/vendors/add' },
    { icon: CheckSquare, label: 'ประเมิน CSM', href: '/csm/assessments', active: location.pathname.startsWith('/csm/e/') },
    { icon: History, label: 'ประวัติการประเมิน', href: '/csm/assessments/history', active: location.pathname.includes('/assessments/history') },
    { icon: BarChart3, label: 'รายงาน CSM', href: '/csm/reports', active: location.pathname === '/csm/reports' },
    { icon: TrendingUp, label: 'วิเคราะห์ข้อมูล', href: '/csm/analytics', active: location.pathname === '/csm/analytics' },
    { icon: Settings, label: 'ตั้งค่า CSM', href: '/csm/settings', active: location.pathname === '/csm/settings' },
  ];

  // สร้าง sidebar items พร้อม submenu
  const sidebarItems: MenuItem[] = [
    { 
      icon: Home, 
      label: 'Dashboard', 
      href: '/dashboard', 
      active: location.pathname === '/dashboard' 
    },
    { 
      icon: Building2, 
      label: 'CSM Management', 
      href: '/csm', 
      active: location.pathname.startsWith('/csm'),
      submenu: csmSubmenu
    },
    { 
      icon: Users, 
      label: 'Employees', 
      href: '/employees', 
      active: location.pathname.startsWith('/employees') 
    },
    { 
      icon: Activity, 
      label: 'Safety Reports', 
      href: '/reports', 
      active: location.pathname.startsWith('/reports') && !location.pathname.startsWith('/reports') 
    },
    { 
      icon: BarChart3, 
      label: 'Analytics', 
      href: '/analytics', 
      active: location.pathname.startsWith('/analytics') && !location.pathname.includes('/csm/')
    },
    { 
      icon: FileText, 
      label: 'Documents', 
      href: '/documents', 
      active: location.pathname.startsWith('/documents') 
    },
    { 
      icon: Calendar, 
      label: 'Schedule', 
      href: '/schedule', 
      active: location.pathname.startsWith('/schedule') 
    },
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
    active: location.pathname.startsWith('/settings') && !location.pathname.includes('/csm/')
  });

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuKey) 
        ? prev.filter(key => key !== menuKey)
        : [...prev, menuKey]
    );
  };

  const handleNavigation = (href: string) => {
    navigate(href);
  };

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
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 text-white rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Safety System</h1>
                <p className="text-sm text-gray-500">CSM Management Platform</p>
              </div>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 hidden max-w-md mx-8 md:flex">
            <div className="relative w-full">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหา..."
                className="w-full py-2 pl-10 pr-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Right side - Notifications and User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-600 transition-colors hover:text-blue-600 hover:bg-blue-50 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute w-2 h-2 bg-red-500 rounded-full top-1 right-1"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center p-2 space-x-3 transition-all duration-200 rounded-xl hover:bg-white/50 backdrop-blur-sm"
              >
                <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-gray-900">{profileName}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 z-50 w-48 mt-2 bg-white border border-gray-200 shadow-lg rounded-xl">
                  <div className="py-1">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="w-4 h-4 mr-3" />
                      โปรไฟล์
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="w-4 h-4 mr-3" />
                      ตั้งค่า
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white/90 backdrop-blur-md border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
        `}>
          <div className="flex flex-col h-full pt-20">
            <nav className="flex-1 px-4 py-6 overflow-y-auto">
              <div className="space-y-2">
                {sidebarItems.map((item) => (
                  <div key={item.href}>
                    <button
                      onClick={() => {
                        if (item.submenu) {
                          toggleMenu(item.href);
                        } else {
                          handleNavigation(item.href);
                        }
                      }}
                      className={`
                        flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium rounded-xl transition-all duration-200
                        ${item.active 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.label}
                      </div>
                      {item.submenu && (
                        expandedMenus.includes(item.href) 
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Submenu */}
                    {item.submenu && expandedMenus.includes(item.href) && (
                      <div className="mt-2 ml-4 space-y-1">
                        {item.submenu.map((subItem) => (
                          <button
                            key={subItem.href}
                            onClick={() => handleNavigation(subItem.href)}
                            className={`
                              flex items-center w-full px-4 py-2 text-left text-sm rounded-lg transition-all duration-200
                              ${subItem.active 
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                              }
                            `}
                          >
                            <subItem.icon className="w-4 h-4 mr-3" />
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">Safety Management</p>
                  <p className="text-xs text-gray-500">v2.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`
          flex-1 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}
        `}>
          <div className="min-h-screen bg-transparent">
            {/* Content wrapper with padding */}
            <div className="h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;