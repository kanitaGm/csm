import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
//import { profile } from 'console';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  if (!user) return null;

  const profileName = 'firstName' in user.profile 
    ? `${user.profile.firstName} ${user.profile.lastName}`
    : String(user.profile.displayName ?? '');

  const sidebarItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: Activity, label: 'Safety Reports', href: '/reports' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Users, label: 'Team', href: '/team' },
    { icon: FileText, label: 'Documents', href: '/documents' },
    { icon: Calendar, label: 'Schedule', href: '/schedule' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  if (user.role === 'superadmin' || user.role === 'admin') {
    sidebarItems.splice(-1, 0, { icon: Shield, label: 'Admin Panel', href: '/admin' });
  }

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

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {/* Welcome section */}
            <div className="p-8 mb-6 text-white shadow-xl bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl">
              <h2 className="mb-2 text-3xl font-bold">สวัสดี, {profileName}! 👋</h2>
              <p className="text-lg text-green-100">ยินดีต้อนรับสู่ระบบ INSEE Safety Dashboard</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { title: 'รายงานความปลอดภัย', value: '24', change: '+12%', color: 'blue' },
                { title: 'เหตุการณ์สำคัญ', value: '3', change: '-8%', color: 'red' },
                { title: 'การตรวจสอบ', value: '156', change: '+5%', color: 'green' },
                { title: 'การฝึกอบรม', value: '89%', change: '+2%', color: 'purple' },
              ].map((stat, index) => (
                <div key={index} className="p-6 transition-all duration-200 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20 hover:shadow-xl">
                  <h3 className="mb-2 text-sm font-medium text-gray-600">{stat.title}</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-sm font-medium ${
                        stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change} จากเดือนที่แล้ว
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${
                      stat.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                      stat.color === 'red' ? 'from-red-500 to-pink-500' :
                      stat.color === 'green' ? 'from-green-500 to-emerald-500' :
                      'from-purple-500 to-indigo-500'
                    } flex items-center justify-center`}>
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="p-8 border shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl border-white/20">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">แดชบอร์ดหลัก</h3>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">รายงานล่าสุด</h4>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center p-4 space-x-4 border bg-gray-50/50 rounded-xl border-gray-200/50">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">รายงานความปลอดภัย #{item}</p>
                        <p className="text-sm text-gray-500">อัปเดตเมื่อ 2 ชั่วโมงที่แล้ว</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                        เสร็จสิ้น
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800">กิจกรรมทีม</h4>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center p-4 space-x-4 border bg-gray-50/50 rounded-xl border-gray-200/50">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">การประชุมทีม Safety #{item}</p>
                        <p className="text-sm text-gray-500">กำหนดการ: วันนี้ 14:00 น.</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                        รอการเข้าร่วม
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-white bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="px-6 py-12 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">INSEE Safety</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-400">
                ระบบจัดการความปลอดภัยที่ทันสมัยและครอบคลุม เพื่อสร้างสภาพแวดล้อมการทำงานที่ปลอดภัยสำหรับทุกคน
              </p>
            </div>
            
            <div>
              <h4 className="mb-4 text-lg font-semibold text-white">เมนูหลัก</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/dashboard" className="transition-colors hover:text-green-400">แดชบอร์ด</a></li>
                <li><a href="/reports" className="transition-colors hover:text-green-400">รายงาน</a></li>
                <li><a href="/analytics" className="transition-colors hover:text-green-400">การวิเคราะห์</a></li>
                <li><a href="/team" className="transition-colors hover:text-green-400">ทีมงาน</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="mb-4 text-lg font-semibold text-white">ช่วยเหลือ</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/support" className="transition-colors hover:text-green-400">ศูนย์ช่วยเหลือ</a></li>
                <li><a href="/docs" className="transition-colors hover:text-green-400">เอกสารประกอบ</a></li>
                <li><a href="/training" className="transition-colors hover:text-green-400">การฝึกอบรม</a></li>
                <li><a href="/contact" className="transition-colors hover:text-green-400">ติดต่อเรา</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="mb-4 text-lg font-semibold text-white">ติดต่อ</h4>
              <div className="space-y-2 text-gray-400">
                <p>บริษัท อินทรีซีเมนต์ จำกัด</p>
                <p>โทร: 02-123-4567</p>
                <p>อีเมล: safety@insee.co.th</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-between pt-8 mt-8 border-t border-gray-700 md:flex-row">
            <p className="text-sm text-gray-400">
              © 2024 INSEE Safety. สงวนลิขสิทธิ์
            </p>
            <div className="flex mt-4 space-x-6 md:mt-0">
              <a href="/privacy" className="text-sm text-gray-400 transition-colors hover:text-green-400">
                นโยบายความเป็นส่วนตัว
              </a>
              <a href="/terms" className="text-sm text-gray-400 transition-colors hover:text-green-400">
                เงื่อนไขการใช้งาน
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;