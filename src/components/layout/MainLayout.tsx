// ================================
// 📁 src/components/layout/MainLayout.tsx
// YouTube-style Collapsible Sidebar with ESLint Strict Compliance
// ================================

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

// ================================
// STRICT TYPE DEFINITIONS
// ================================

interface SubMenuItem {
  readonly icon: React.ComponentType<{ className?: string }>
  readonly label: string
  readonly href: string
  readonly active: boolean
  readonly badge?: number
  readonly disabled?: boolean
}

interface MenuItem {
  readonly icon: React.ComponentType<{ className?: string }>
  readonly label: string
  readonly href: string
  readonly active: boolean
  readonly submenu?: readonly SubMenuItem[]
  readonly badge?: number
  readonly disabled?: boolean
}

type SidebarMode = 'expanded' | 'collapsed' | 'hidden'

interface UserProfile {
  readonly firstName?: string
  readonly lastName?: string
  readonly displayName?: string | null
  readonly email?: string
  readonly role?: string
  readonly avatar?: string
}

interface AuthUser {
  readonly uid: string
  readonly email: string | null
  readonly profile: UserProfile
}

interface UseAuthReturn {
  readonly user: AuthUser | null
  readonly loading: boolean
  readonly logout: () => Promise<void>
}

// ================================
// MEMOIZED COMPONENTS
// ================================

interface MenuItemComponentProps {
  readonly item: MenuItem
  readonly sidebarMode: SidebarMode
  readonly expandedMenus: readonly string[]
  readonly onToggleSubmenu: (label: string) => void
  readonly onNavigate: (href: string) => void
}

const MenuItemComponent = React.memo<MenuItemComponentProps>(({
  item,
  sidebarMode,
  expandedMenus,
  onToggleSubmenu,
  onNavigate
}) => {
  const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0)
  const isExpanded = expandedMenus.includes(item.label)
  const isCollapsed = sidebarMode === 'collapsed'

  const handleClick = useCallback((): void => {
    if (hasSubmenu) {
      onToggleSubmenu(item.label)
    } else {
      onNavigate(item.href)
    }
  }, [hasSubmenu, item.label, item.href, onToggleSubmenu, onNavigate])

  const handleSubmenuClick = useCallback((href: string): void => {
    onNavigate(href)
  }, [onNavigate])

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={item.disabled}
        className={`
          group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200
          ${item.active 
            ? 'bg-primary-100 text-primary-700 shadow-sm' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }
          ${item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${isCollapsed ? 'justify-center px-2' : ''}
        `}
        title={isCollapsed ? item.label : undefined}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 ${item.active ? 'text-primary-600' : ''}`} />
        
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            
            {item.badge !== undefined && item.badge > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            
            {hasSubmenu && (
              <div className="transition-transform duration-200">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            )}
          </>
        )}
      </button>

      {/* Submenu */}
      {hasSubmenu && isExpanded && !isCollapsed && item.submenu && (
        <div className="pl-4 ml-4 space-y-1 border-l-2 border-gray-100">
          {item.submenu.map((subItem) => (
            <button
              key={subItem.href}
              onClick={() => handleSubmenuClick(subItem.href)}
              disabled={subItem.disabled}
              className={`
                group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all duration-200
                ${subItem.active 
                  ? 'bg-primary-50 text-primary-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                ${subItem.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              <subItem.icon className="flex-shrink-0 w-4 h-4" />
              <span className="truncate">{subItem.label}</span>
              
              {subItem.badge !== undefined && subItem.badge > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-blue-500 rounded-full">
                  {subItem.badge > 99 ? '99+' : subItem.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

MenuItemComponent.displayName = 'MenuItemComponent'

// ================================
// USER MENU COMPONENT
// ================================

interface UserMenuProps {
  readonly user: AuthUser
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onLogout: () => Promise<void>
  readonly onNavigate: (href: string) => void
}

const UserMenu = React.memo<UserMenuProps>(({
  user,
  isOpen,
  onClose,
  onLogout,
  onNavigate
}) => {
  const userMenuRef = React.useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleProfileClick = useCallback((): void => {
    onNavigate('/profile')
    onClose()
  }, [onNavigate, onClose])

  const handleSettingsClick = useCallback((): void => {
    onNavigate('/settings')
    onClose()
  }, [onNavigate, onClose])

  const handleLogoutClick = useCallback(async (): Promise<void> => {
    try {
      await onLogout()
      onClose()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [onLogout, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={userMenuRef}
      className="absolute right-0 z-50 w-56 py-1 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg top-full ring-1 ring-black ring-opacity-5"
    >
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">
          {'firstName' in user.profile && user.profile.firstName
            ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`
            : user.profile.displayName ?? 'ผู้ใช้งาน'}
        </p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
        {user.profile.role && (
          <p className="mt-1 text-xs text-blue-600">{user.profile.role}</p>
        )}
      </div>

      <button
        onClick={handleProfileClick}
        className="flex items-center w-full gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <User className="w-4 h-4" />
        โปรไฟล์
      </button>

      <button
        onClick={handleSettingsClick}
        className="flex items-center w-full gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Settings className="w-4 h-4" />
        ตั้งค่า
      </button>

      <div className="my-1 border-t border-gray-100" />

      <button
        onClick={handleLogoutClick}
        className="flex items-center w-full gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4" />
        ออกจากระบบ
      </button>
    </div>
  )
})

UserMenu.displayName = 'UserMenu'

// ================================
// MAIN LAYOUT COMPONENT
// ================================

const MainLayout: React.FC = () => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false)
  const [expandedMenus, setExpandedMenus] = useState<readonly string[]>(['CSM'])
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  
  // ================================
  // HOOKS
  // ================================
  
  const { user, logout } = useAuth() as UseAuthReturn
  const location = useLocation()
  const navigate = useNavigate()

  // ================================
  // RESPONSIVE HANDLING
  // ================================
  
  useEffect(() => {
    const handleResize = (): void => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      // Auto-adjust sidebar mode based on screen size
      if (mobile && sidebarMode === 'expanded') {
        setSidebarMode('hidden')
      } else if (!mobile && sidebarMode === 'hidden') {
        setSidebarMode('expanded')
      }
    }

    // Set initial state
    handleResize()
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [sidebarMode])

  // ================================
  // MEMOIZED VALUES
  // ================================
  
  const profileName = useMemo((): string => {
    if (!user) return ''
    
    if ('firstName' in user.profile && user.profile.firstName) {
      return `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim()
    }
    
    return user.profile.displayName ?? user.email ?? 'ผู้ใช้งาน'
  }, [user])

  const menuItems = useMemo((): readonly MenuItem[] => {
    const currentPath = location.pathname

    return [
      {
        icon: Home,
        label: 'หน้าหลัก',
        href: '/',
        active: currentPath === '/',
      },
      {
        icon: BarChart3,
        label: 'แดชบอร์ด',
        href: '/dashboard',
        active: currentPath === '/dashboard',
      },
      {
        icon: Shield,
        label: 'CSM',
        href: '/csm',
        active: currentPath.startsWith('/csm'),
        submenu: [
          {
            icon: Building2,
            label: 'รายการผู้ขาย',
            href: '/csm/vendors',
            active: currentPath === '/csm/vendors',
          },
          {
            icon: CheckSquare,
            label: 'การประเมิน',
            href: '/csm/assessments',
            active: currentPath === '/csm/assessments',
          },
          {
            icon: TrendingUp,
            label: 'รายงาน',
            href: '/csm/reports',
            active: currentPath === '/csm/reports',
          },
          {
            icon: History,
            label: 'ประวัติการประเมิน',
            href: '/csm/history',
            active: currentPath === '/csm/history',
          },
        ],
      },
      {
        icon: Users,
        label: 'จัดการพนักงาน',
        href: '/employees',
        active: currentPath.startsWith('/employees'),
        submenu: [
          {
            icon: Users,
            label: 'รายชื่อพนักงาน',
            href: '/employees',
            active: currentPath === '/employees',
          },
          {
            icon: Plus,
            label: 'เพิ่มพนักงาน',
            href: '/employees/add',
            active: currentPath === '/employees/add',
          },
        ],
      },
      {
        icon: FileText,
        label: 'ฟอร์มและเอกสาร',
        href: '/forms',
        active: currentPath.startsWith('/forms'),
        submenu: [
          {
            icon: FileText,
            label: 'จัดการฟอร์ม',
            href: '/forms/manage',
            active: currentPath === '/forms/manage',
          },
          {
            icon: Plus,
            label: 'สร้างฟอร์มใหม่',
            href: '/forms/create',
            active: currentPath === '/forms/create',
          },
        ],
      },
      {
        icon: Calendar,
        label: 'ปฏิทิน',
        href: '/calendar',
        active: currentPath === '/calendar',
      },
      {
        icon: Activity,
        label: 'การฝึกอบรม',
        href: '/training',
        active: currentPath.startsWith('/training'),
      },
    ] as const
  }, [location.pathname])

  // ================================
  // EVENT HANDLERS
  // ================================
  
  const handleSidebarToggle = useCallback((): void => {
    if (isMobile) {
      setSidebarMode(prev => prev === 'hidden' ? 'expanded' : 'hidden')
    } else {
      setSidebarMode(prev => {
        switch (prev) {
          case 'expanded': return 'collapsed'
          case 'collapsed': return 'expanded'
          case 'hidden': return 'expanded'
          default: return 'expanded'
        }
      })
    }
  }, [isMobile])

  const handleToggleSubmenu = useCallback((label: string): void => {
    setExpandedMenus(prev => 
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }, [])

  const handleNavigate = useCallback((href: string): void => {
    navigate(href)
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setSidebarMode('hidden')
    }
  }, [navigate, isMobile])

  const handleUserMenuToggle = useCallback((): void => {
    setIsUserMenuOpen(prev => !prev)
  }, [])

  const handleUserMenuClose = useCallback((): void => {
    setIsUserMenuOpen(false)
  }, [])

  const handleSearchToggle = useCallback((): void => {
    setIsSearchOpen(prev => !prev)
  }, [])

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [logout, navigate])

  // ================================
  // KEYBOARD NAVIGATION
  // ================================
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Escape key handling
      if (event.key === 'Escape') {
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false)
        } else if (isSearchOpen) {
          setIsSearchOpen(false)
        } else if (isMobile && sidebarMode === 'expanded') {
          setSidebarMode('hidden')
        }
      }
      
      // Ctrl/Cmd + B for sidebar toggle
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        handleSidebarToggle()
      }
      
      // Ctrl/Cmd + K for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        handleSearchToggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUserMenuOpen, isSearchOpen, isMobile, sidebarMode, handleSidebarToggle, handleSearchToggle])

  // ================================
  // RENDER HELPERS
  // ================================
  
  const sidebarClasses = useMemo((): string => {
    const baseClasses = 'fixed left-0 top-0 z-40 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out'
    
    switch (sidebarMode) {
      case 'expanded':
        return `${baseClasses} w-64 translate-x-0`
      case 'collapsed':
        return `${baseClasses} w-16 translate-x-0`
      case 'hidden':
        return `${baseClasses} w-64 -translate-x-full`
      default:
        return `${baseClasses} w-64 translate-x-0`
    }
  }, [sidebarMode])

  const contentClasses = useMemo((): string => {
    const baseClasses = 'transition-all duration-300 ease-in-out'
    
    if (isMobile || sidebarMode === 'hidden') {
      return `${baseClasses} ml-0`
    }
    
    return sidebarMode === 'expanded' 
      ? `${baseClasses} ml-64` 
      : `${baseClasses} ml-16`
  }, [isMobile, sidebarMode])

  // ================================
  // EARLY RETURNS
  // ================================
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 rounded-full border-t-transparent animate-spin" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  // ================================
  // MAIN RENDER
  // ================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Backdrop */}
      {isMobile && sidebarMode === 'expanded' && (
        <div 
          className="fixed inset-0 z-30 transition-opacity bg-black bg-opacity-50"
          onClick={handleSidebarToggle}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleSidebarToggle()
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses} role="navigation" aria-label="Main navigation">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`flex items-center border-b border-gray-200 p-4 ${sidebarMode === 'collapsed' ? 'justify-center' : 'justify-between'}`}>
            {sidebarMode !== 'collapsed' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white rounded-lg bg-primary-600">
                  CSM
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  INSEE Safety
                </span>
              </div>
            )}
            
            <button
              onClick={handleSidebarToggle}
              className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={sidebarMode === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarMode === 'collapsed' ? (
                <SidebarIcon className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Main menu">
            {menuItems.map((item) => (
              <MenuItemComponent
                key={item.href}
                item={item}
                sidebarMode={sidebarMode}
                expandedMenus={expandedMenus}
                onToggleSubmenu={handleToggleSubmenu}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            {sidebarMode !== 'collapsed' && (
              <div className="text-xs text-center text-gray-500">
                <p>INSEE Safety Management</p>
                <p>Version 2.1.0</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={contentClasses}>
        {/* Top Header */}
        <header className="sticky top-0 z-20 px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={handleSidebarToggle}
                  className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Open sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              
              {/* Search Button */}
              <button
                onClick={handleSearchToggle}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">ค้นหา...</span>
                <kbd className="items-center hidden px-1 text-xs border border-gray-200 rounded sm:inline-flex">⌘K</kbd>
              </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button
                className="relative p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full -top-1 -right-1" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center gap-3 p-2 text-sm rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="flex items-center justify-center w-8 h-8 text-sm font-medium text-white rounded-full bg-primary-600">
                    {user.profile.avatar ? (
                      <img 
                        src={user.profile.avatar} 
                        alt={profileName}
                        className="object-cover w-8 h-8 rounded-full"
                      />
                    ) : (
                      profileName.charAt(0).toUpperCase()
                    )}
                  </div>
                  
                  <div className="hidden text-left sm:block">
                    <p className="font-medium text-gray-900 truncate max-w-32">
                      {profileName}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-32">
                      {user.profile.role ?? 'ผู้ใช้งาน'}
                    </p>
                  </div>
                  
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <UserMenu
                  user={user}
                  isOpen={isUserMenuOpen}
                  onClose={handleUserMenuClose}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1" role="main">
          <React.Suspense 
            fallback={
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 rounded-full border-t-transparent animate-spin" />
                  <p className="text-gray-600">กำลังโหลดหน้า...</p>
                </div>
              </div>
            }
          >
            <Outlet />
          </React.Suspense>
        </main>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen p-4 pt-16">
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
              onClick={handleSearchToggle}
            />
            <div className="relative w-full max-w-lg">
              <div className="bg-white rounded-lg shadow-xl">
                <div className="flex items-center px-4 border-b border-gray-200">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาทุกอย่าง..."
                    className="w-full px-4 py-4 text-sm border-0 focus:outline-none focus:ring-0"
                    autoFocus
                  />
                  <button
                    onClick={handleSearchToggle}
                    className="p-1 text-gray-400 rounded hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-center text-gray-500">
                    เริ่มพิมพ์เพื่อค้นหา...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainLayout