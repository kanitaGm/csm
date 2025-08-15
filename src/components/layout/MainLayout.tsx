// 📁 src/components/layout/MainLayout.tsx
// YouTube-style Collapsible Sidebar with Performance Optimization
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  CheckSquare,
  Sidebar as SidebarIcon
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
  // YouTube-style sidebar states: expanded, collapsed, hidden
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed' | 'hidden'>('expanded');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['csm']);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // Auto-adjust sidebar mode based on screen size
      if (mobile && sidebarMode === 'expanded') {
        setSidebarMode('hidden');
      } else if (!mobile && sidebarMode === 'hidden') {
        setSidebarMode('expanded');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarMode]);

  // Memoized profile name calculation
  const profileName = useMemo(() => {
    if (!user) return '';
    return 'firstName' in user.profile 
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : String(user.profile.displayName ?? 'User');
  }, [user]);

  // Memoized sidebar items
  const sidebarItems = useMemo<MenuItem[]>(() => [
    {
      icon: Home,
      label: 'แดชบอร์ด',
      href: '/dashboard',
      active: location.pathname === '/dashboard'
    },
    {
      icon: Shield,
      label: 'CSM Management',
      href: '/csm',
      active: location.pathname.startsWith('/csm'),
      submenu: [
        {
          icon: FileText,
          label: 'รายการประเมิน',
          href: '/csm',
          active: location.pathname === '/csm'
        },
        {
          icon: Plus,
          label: 'เพิ่มผู้ขาย',
          href: '/csm/vendors/add',
          active: location.pathname === '/csm/vendors/add'
        },
        {
          icon: Building2,
          label: 'จัดการผู้ขาย',
          href: '/csm/vendors',
          active: location.pathname === '/csm/vendors'
        },
        {
          icon: CheckSquare,
          label: 'ประเมินผู้ขาย',
          href: '/csm/evaluate',
          active: location.pathname === '/csm/evaluate'
        },
        {
          icon: BarChart3,
          label: 'รายงาน',
          href: '/csm/reports',
          active: location.pathname === '/csm/reports'
        },
        {
          icon: TrendingUp,
          label: 'วิเคราะห์',
          href: '/csm/analytics',
          active: location.pathname === '/csm/analytics'
        },
        {
          icon: History,
          label: 'ประวัติการประเมิน',
          href: '/csm/assessments/history',
          active: location.pathname === '/csm/assessments/history'
        }
      ]
    },
    {
      icon: Users,
      label: 'จัดการพนักงาน',
      href: '/employees',
      active: location.pathname.startsWith('/employees'),
      submenu: [
        {
          icon: Users,
          label: 'รายชื่อพนักงาน',
          href: '/employees',
          active: location.pathname === '/employees'
        },
        {
          icon: Plus,
          label: 'เพิ่มพนักงาน',
          href: '/employees/add',
          active: location.pathname === '/employees/add'
        }
      ]
    },
    {
      icon: Calendar,
      label: 'การฝึกอบรม',
      href: '/training',
      active: location.pathname.startsWith('/training')
    },
    {
      icon: Activity,
      label: 'รายงานและวิเคราะห์',
      href: '/reports',
      active: location.pathname.startsWith('/reports')
    },
    {
      icon: Settings,
      label: 'ตั้งค่าระบบ',
      href: '/settings',
      active: location.pathname.startsWith('/settings')
    }
  ], [location.pathname]);

  // Optimized callbacks
  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarMode(prev => prev === 'hidden' ? 'expanded' : 'hidden');
    } else {
      setSidebarMode(prev => {
        if (prev === 'expanded') return 'collapsed';
        if (prev === 'collapsed') return 'expanded';
        return 'expanded';
      });
    }
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarMode('hidden');
    }
  }, [isMobile]);

  const toggleUserMenu = useCallback(() => {
    setIsUserMenuOpen(prev => !prev);
  }, []);

  const toggleMenu = useCallback((href: string) => {
    setExpandedMenus(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  }, []);

  const handleNavigation = useCallback((href: string) => {
    navigate(href);
    if (isMobile) {
      setSidebarMode('hidden');
    }
    setIsUserMenuOpen(false);
  }, [navigate, isMobile]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, navigate]);

  // Close dropdowns when clicking outside
  const handleOutsideClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-user-menu]') && !target.closest('[data-sidebar]')) {
      setIsUserMenuOpen(false);
    }
  }, []);

  // Calculate sidebar width classes
  const getSidebarClasses = () => {
    const baseClasses = "fixed inset-y-0 left-0 z-40 bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-lg transform transition-all duration-300 ease-in-out";
    
    if (isMobile) {
      return `${baseClasses} w-64 ${sidebarMode === 'hidden' ? '-translate-x-full' : 'translate-x-0'}`;
    }
    
    // Desktop modes
    if (sidebarMode === 'expanded') {
      return `${baseClasses} w-64 translate-x-0`;
    } else if (sidebarMode === 'collapsed') {
      return `${baseClasses} w-16 translate-x-0`;
    } else {
      return `${baseClasses} w-0 -translate-x-full`;
    }
  };

  const getMainContentClasses = () => {
    if (isMobile || sidebarMode === 'hidden') {
      return "flex-1 transition-all duration-300 ease-in-out ml-0";
    }
    
    return sidebarMode === 'expanded' 
      ? "flex-1 transition-all duration-300 ease-in-out ml-64"
      : "flex-1 transition-all duration-300 ease-in-out ml-16";
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50" onClick={handleOutsideClick}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 shadow-sm bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-600 transition-colors hover:text-blue-600 hover:bg-blue-50 rounded-xl"
              aria-label="Toggle sidebar"
              title={isMobile ? "เปิด/ปิดเมนู" : sidebarMode === 'expanded' ? "ย่อเมนู" : "ขยายเมนู"}
            >
              {isMobile ? (
                sidebarMode === 'hidden' ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />
              ) : (
                <SidebarIcon className="w-5 h-5" />
              )}
            </button>
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 text-white shadow-lg rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
                <Shield className="w-6 h-6" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Safety MS</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
          </div>

          {/* Center - Search (Desktop) */}
          <div className="flex-1 hidden max-w-md mx-8 md:flex">
            <div className="relative w-full">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหา..."
                className="w-full py-2 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search */}
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-gray-600 transition-colors hover:text-blue-600 hover:bg-blue-50 rounded-xl md:hidden"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 transition-colors hover:text-blue-600 hover:bg-blue-50 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute w-2 h-2 bg-red-500 rounded-full top-1 right-1" aria-label="New notifications"></span>
            </button>

            {/* User Menu */}
            <div className="relative" data-user-menu>
              <button
                onClick={toggleUserMenu}
                className="flex items-center p-2 space-x-3 transition-all duration-200 rounded-xl hover:bg-white/50 backdrop-blur-sm"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-24">{profileName}</p>
                  <p className="text-xs text-gray-500">{user.roles}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 z-50 w-48 mt-2 bg-white border border-gray-200 shadow-lg rounded-xl animate-in fade-in-0 zoom-in-95">
                  <div className="py-1">
                    <button 
                      onClick={() => handleNavigation('/profile')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <User className="w-4 h-4 mr-3" />
                      โปรไฟล์
                    </button>
                    <button 
                      onClick={() => handleNavigation('/settings')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      ตั้งค่า
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
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

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="px-4 pb-4 border-t border-gray-200 md:hidden animate-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหา..."
                className="w-full py-2 pl-10 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex pt-16">
        {/* YouTube-style Sidebar */}
        <aside className={getSidebarClasses()} data-sidebar>
          <div className="flex flex-col h-full pt-4">
            <nav className="flex-1 px-2 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <div className="space-y-2">
                {sidebarItems.map((item) => (
                  <div key={item.href}>
                    <button
                      onClick={() => {
                        if (item.submenu && sidebarMode === 'expanded') {
                          toggleMenu(item.href);
                        } else {
                          handleNavigation(item.href);
                        }
                      }}
                      className={`
                        flex items-center justify-between w-full px-3 py-3 text-left text-sm font-medium rounded-xl transition-all duration-200 group
                        ${item.active 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
                        }
                        ${sidebarMode === 'collapsed' ? 'justify-center px-2' : ''}
                      `}
                      title={sidebarMode === 'collapsed' ? item.label : undefined}
                    >
                      <div className="flex items-center">
                        <item.icon className={`flex-shrink-0 ${sidebarMode === 'collapsed' ? 'w-5 h-5' : 'w-5 h-5 mr-3'}`} />
                        {sidebarMode === 'expanded' && <span className="truncate">{item.label}</span>}
                      </div>
                      {item.submenu && sidebarMode === 'expanded' && (
                        <ChevronUp className={`w-4 h-4 transition-transform flex-shrink-0 ${
                          expandedMenus.includes(item.href) ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>

                    {/* Submenu - only show in expanded mode */}
                    {item.submenu && expandedMenus.includes(item.href) && sidebarMode === 'expanded' && (
                      <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2">
                        {item.submenu.map((subItem) => (
                          <button
                            key={subItem.href}
                            onClick={() => handleNavigation(subItem.href)}
                            className={`
                              flex items-center w-full px-4 py-2 text-left text-sm rounded-lg transition-all duration-200
                              ${subItem.active 
                                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 hover:translate-x-1'
                              }
                            `}
                          >
                            <subItem.icon className="flex-shrink-0 w-4 h-4 mr-3" />
                            <span className="truncate">{subItem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </nav>

            {/* Sidebar Footer */}
            {sidebarMode === 'expanded' && (
              <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 text-white rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">Safety Management</p>
                    <p className="text-xs text-gray-500">v2.1.0</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className={getMainContentClasses()}>
          <div className="min-h-full bg-transparent">
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              </div>
            }>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarMode === 'expanded' && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default MainLayout;