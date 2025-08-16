// ================================
// 🔧 src/features/csm/pages/CSMListPage.tsx
// CSM List Page with ESLint Strict Compliance
// ================================

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { FixedSizeList as List } from 'react-window'
import { 
  Search, RefreshCw,  AlertTriangle, CheckCircle, Clock, 
  Plus, Grid, List as ListIcon, TrendingUp, Building2,
  FileText, X, Download, ChevronLeft, ChevronRight, 
  MoreHorizontal,Filter,Eye, Edit3, Trash2, ExternalLink, Square 
} from 'lucide-react'

// Design System Imports
import { Card, CardHeader, CardTitle, CardDescription, CardContent,
  CardFooter, Button, Badge, Input, Dropdown, Skeleton,
  useToast, Pagination, Alert} from '../../../components/design'

// Type Imports
import type { 
  CSMVendor, 
  CSMAssessmentSummary, 
  CSMAssessment,
  CSMVendorCategory,
  CSMRiskLevel 
} from '../../../types'

// Service Imports
import { enhancedCSMService } from '../../../services/enhancedCsmService'

// Hook Imports
import { useDebounce } from '../../../hooks/useDebounce'
import { usePagination } from '../../../hooks/usePagination'
import { usePerformanceTracking } from '../../../utils/performanceMonitor'

// Utility Imports
import { exportVendorsToExcel } from '../../../utils/exportUtils'
import { CSM_VENDOR_CATEGORIES } from '../../../types/csm'



// ================================
// STRICT TYPE DEFINITIONS
// ================================
type ViewMode = 'card' | 'table' | 'virtual'
type AssessmentStatus = 'completed' | 'in-progress' | 'due-soon' | 'overdue' | 'not-assessed'

interface VendorWithStatus extends CSMVendor {
  readonly assessmentStatus: AssessmentStatus
  readonly summary?: CSMAssessmentSummary
  readonly currentAssessment?: CSMAssessment
  readonly daysUntilDue?: number
  readonly lastAssessmentDate?: Date
  readonly urgencyScore: number
}

interface FilterState {
  readonly category: CSMVendorCategory | 'all'
  readonly assessmentStatus: AssessmentStatus | 'all'
  readonly riskLevel: CSMRiskLevel | 'all'
  readonly needsAssessment: boolean
  readonly quickFilters: {
    readonly dueSoon: boolean
    readonly highRisk: boolean
    readonly neverAssessed: boolean
  }
}

interface StatisticsData {
  readonly total: number
  readonly assessed: number
  readonly inProgress: number
  readonly overdue: number
  readonly dueSoon: number
  readonly notAssessed: number
  readonly avgScore: number
  readonly highRisk: number
  readonly categories: Record<CSMVendorCategory, number>
}

interface StatCardProps {
  readonly title: string
  readonly value: number | string
  readonly icon: React.ComponentType<{ className?: string }>
  readonly color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  readonly trend?: number
  readonly subtitle?: string
  readonly onClick?: () => void
  readonly isClickable?: boolean
  readonly loading?: boolean
}

interface VendorCardProps {
  readonly vendor: VendorWithStatus
  readonly onView: (id: string) => void
  readonly onEdit: (id: string) => void
  readonly onDelete: (id: string, name: string) => void
  readonly onAssess: (id: string) => void
  readonly loading?: boolean
}

interface VirtualRowProps {
  readonly index: number
  readonly style: React.CSSProperties
  readonly data: {
    readonly vendors: readonly VendorWithStatus[]
    readonly onView: (id: string) => void
    readonly onEdit: (id: string) => void
    readonly onDelete: (id: string, name: string) => void
    readonly onAssess: (id: string) => void
  }
}

interface CSMListPageState {
  readonly searchTerm: string
  readonly viewMode: ViewMode
  readonly filters: FilterState
  readonly sortBy: 'name' | 'lastAssessment' | 'riskLevel' | 'urgencyScore'
  readonly sortOrder: 'asc' | 'desc'
  readonly selectedVendors: readonly string[]
  readonly isExporting: boolean
}

// ================================
// CONSTANTS
// ================================

const CACHE_TIME = 10 * 60 * 1000 // 10 minutes
const DEBOUNCE_DELAY = 500
const ITEMS_PER_PAGE = 20
const VIRTUAL_ITEM_HEIGHT = 120

const INITIAL_FILTERS: FilterState = {
  category: 'all',
  assessmentStatus: 'all',
  riskLevel: 'all',
  needsAssessment: false,
  quickFilters: {
    dueSoon: false,
    highRisk: false,
    neverAssessed: false
  }
} as const

const INITIAL_STATE: CSMListPageState = {
  searchTerm: '',
  viewMode: 'card',
  filters: INITIAL_FILTERS,
  sortBy: 'urgencyScore',
  sortOrder: 'desc',
  selectedVendors: [],
  isExporting: false
} as const

// ================================
// UTILITY FUNCTIONS
// ================================

const calculateUrgencyScore = (vendor: VendorWithStatus): number => {
  let score = 0
  
  // Risk level weight
  if (vendor.riskLevel === 'HIGH') score += 100
  else if (vendor.riskLevel === 'MODERATE') score += 50
  else if (vendor.riskLevel === 'LOW') score += 25
  
  // Assessment status weight
  switch (vendor.assessmentStatus) {
    case 'overdue': score += 80; break
    case 'due-soon': score += 60; break
    case 'not-assessed': score += 40; break
    case 'in-progress': score += 20; break
    case 'completed': score += 0; break
  }
  
  // Days until due weight
  if (typeof vendor.daysUntilDue === 'number') {
    if (vendor.daysUntilDue < 0) score += 50 // Overdue
    else if (vendor.daysUntilDue <= 7) score += 30 // Due soon
    else if (vendor.daysUntilDue <= 30) score += 10 // Due within a month
  }
  
  return score
}

const getAssessmentStatus = (vendor: CSMVendor): AssessmentStatus => {
  if (!vendor.lastAssessmentDate) return 'not-assessed'
  
  const daysSinceAssessment = Math.floor(
    (Date.now() - new Date(vendor.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (vendor.currentAssessment?.status === 'IN_PROGRESS') return 'in-progress'
  if (daysSinceAssessment > 365) return 'overdue'
  if (daysSinceAssessment > 300) return 'due-soon'
  
  return 'completed'
}

const getStatusColor = (status: AssessmentStatus): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (status) {
    case 'completed': return 'success'
    case 'in-progress': return 'info'
    case 'due-soon': return 'warning'
    case 'overdue': return 'error'
    case 'not-assessed': return 'default'
    default: return 'default'
  }
}

const getRiskLevelColor = (riskLevel: CSMRiskLevel): 'success' | 'warning' | 'error' => {
  switch (riskLevel) {
    case 'LOW': return 'success'
    case 'MEDIUM': return 'warning'
    case 'HIGH': return 'error'
    default: return 'warning'
  }
}

// ================================
// MEMOIZED COMPONENTS
// ================================

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  onClick,
  isClickable = Boolean(onClick),
  loading = false
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    yellow: 'from-yellow-500 to-yellow-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
    purple: 'from-purple-500 to-purple-600 text-white',
    gray: 'from-gray-500 to-gray-600 text-white'
  }

  const Component = isClickable ? 'button' : 'div'

  return (
    <Component
      onClick={isClickable ? onClick : undefined}
      className={`
        relative rounded-xl bg-gradient-to-br p-6 shadow-sm transition-all duration-200
        ${colorClasses[color]}
        ${isClickable ? 'hover:scale-105 hover:shadow-md cursor-pointer' : ''}
      `}
      disabled={loading}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">
            {loading ? <Skeleton className="w-16 h-8" /> : value}
          </div>
          <div className="text-sm opacity-80">{title}</div>
          {subtitle && (
            <div className="mt-1 text-xs opacity-60">{subtitle}</div>
          )}
          {typeof trend === 'number' && (
            <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="text-3xl opacity-20">
          <Icon className="w-8 h-8" />
        </div>
      </div>
      {!loading && (
        <div className="absolute w-2 h-2 bg-white rounded-full -top-1 -right-1 animate-ping opacity-30" />
      )}
    </Component>
  )
})

StatCard.displayName = 'StatCard'

const VendorCard = React.memo<VendorCardProps>(({
  vendor,
  onView,
  onEdit,
  onDelete,
  onAssess,
  loading = false
}) => {
  const handleView = useCallback(() => onView(vendor.id), [vendor.id, onView])
  const handleEdit = useCallback(() => onEdit(vendor.id), [vendor.id, onEdit])
  const handleDelete = useCallback(() => onDelete(vendor.id, vendor.name), [vendor.id, vendor.name, onDelete])
  const handleAssess = useCallback(() => onAssess(vendor.id), [vendor.id, onAssess])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="w-3/4 h-6" />
            <Skeleton className="w-1/2 h-4" />
            <Skeleton className="w-full h-4" />
            <div className="flex gap-2">
              <Skeleton className="flex-1 h-8" />
              <Skeleton className="flex-1 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated" interactive>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{vendor.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4" />
              {vendor.category}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge variant={getRiskLevelColor(vendor.riskLevel)} size="sm">
              {vendor.riskLevel}
            </Badge>
            <Badge variant={getStatusColor(vendor.assessmentStatus)} size="sm">
              {vendor.assessmentStatus.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">คะแนนล่าสุด:</span>
              <span className="ml-2 font-medium">
                {vendor.summary?.overallScore ?? 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ประเมินล่าสุด:</span>
              <span className="ml-2">
                {vendor.lastAssessmentDate 
                  ? new Date(vendor.lastAssessmentDate).toLocaleDateString('th-TH')
                  : 'ยังไม่เคยประเมิน'
                }
              </span>
            </div>
          </div>
          
          {vendor.daysUntilDue !== undefined && (
            <div className="text-sm">
              <span className="text-gray-600">ครบกำหนดใน:</span>
              <span className={`ml-2 font-medium ${
                vendor.daysUntilDue < 0 ? 'text-red-600' :
                vendor.daysUntilDue <= 7 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {vendor.daysUntilDue < 0 
                  ? `เกินกำหนด ${Math.abs(vendor.daysUntilDue)} วัน`
                  : `${vendor.daysUntilDue} วัน`
                }
              </span>
            </div>
          )}
          
          {vendor.summary && (
            <div className="text-sm">
              <span className="text-gray-600">ประเด็นที่ต้องปรับปรุง:</span>
              <span className="ml-2 font-medium text-red-600">
                {vendor.summary.criticalIssues ?? 0} ประเด็น
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleView}
            leftIcon={<Eye className="w-4 h-4" />}
            className="flex-1"
          >
            ดูรายละเอียด
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEdit}
            leftIcon={<Edit3 className="w-4 h-4" />}
          >
            แก้ไข
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleAssess}
            leftIcon={<CheckSquare className="w-4 h-4" />}
            className="flex-1"
          >
            ประเมิน
          </Button>
          <Button 
            variant="error" 
            size="sm" 
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            ลบ
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
})

VendorCard.displayName = 'VendorCard'

const VirtualRow = React.memo<VirtualRowProps>(({ index, style, data }) => {
  const vendor = data.vendors[index]
  
  if (!vendor) {
    return (
      <div style={style}>
        <div className="p-4">
          <Skeleton className="w-full h-24" />
        </div>
      </div>
    )
  }

  return (
    <div style={style}>
      <div className="p-2">
        <VendorCard
          vendor={vendor}
          onView={data.onView}
          onEdit={data.onEdit}
          onDelete={data.onDelete}
          onAssess={data.onAssess}
        />
      </div>
    </div>
  )
})

VirtualRow.displayName = 'VirtualRow'

// ================================
// MAIN COMPONENT
// ================================

const CSMListPage: React.FC = () => {
  // ================================
  // PROCESSED DATA
  // ================================
  
  const processedVendors = useMemo((): readonly VendorWithStatus[] => {
    if (!vendorsQuery.data) return []
    
    return vendorsQuery.data.map((vendor): VendorWithStatus => {
      const assessmentStatus = getAssessmentStatus(vendor)
      const urgencyScore = calculateUrgencyScore({
        ...vendor,
        assessmentStatus,
        urgencyScore: 0 // Temporary value for calculation
      })
      
      return {
        ...vendor,
        assessmentStatus,
        urgencyScore,
        daysUntilDue: vendor.lastAssessmentDate 
          ? Math.floor((Date.now() - new Date(vendor.lastAssessmentDate).getTime()) / (1000 * 60 * 60 * 24))
          : undefined
      }
    })
  }, [vendorsQuery.data])

  const filteredVendors = useMemo((): readonly VendorWithStatus[] => {
    let filtered = [...processedVendors]

    // Apply filters
    if (state.filters.assessmentStatus !== 'all') {
      filtered = filtered.filter(v => v.assessmentStatus === state.filters.assessmentStatus)
    }

    if (state.filters.needsAssessment) {
      filtered = filtered.filter(v => ['overdue', 'due-soon', 'not-assessed'].includes(v.assessmentStatus))
    }

    // Apply quick filters
    if (state.filters.quickFilters.dueSoon) {
      filtered = filtered.filter(v => v.assessmentStatus === 'due-soon')
    }

    if (state.filters.quickFilters.highRisk) {
      filtered = filtered.filter(v => v.riskLevel === 'HIGH')
    }

    if (state.filters.quickFilters.neverAssessed) {
      filtered = filtered.filter(v => v.assessmentStatus === 'not-assessed')
    }

    return filtered
  }, [processedVendors, state.filters])

  const statistics = useMemo((): StatisticsData => {
    const total = processedVendors.length
    if (total === 0) {
      return {
        total: 0,
        assessed: 0,
        inProgress: 0,
        overdue: 0,
        dueSoon: 0,
        notAssessed: 0,
        avgScore: 0,
        highRisk: 0,
        categories: Object.fromEntries(
          CSM_VENDOR_CATEGORIES.map(cat => [cat, 0])
        ) as Record<CSMVendorCategory, number>
      }
    }

    const assessed = processedVendors.filter(v => v.assessmentStatus === 'completed').length
    const inProgress = processedVendors.filter(v => v.assessmentStatus === 'in-progress').length
    const overdue = processedVendors.filter(v => v.assessmentStatus === 'overdue').length
    const dueSoon = processedVendors.filter(v => v.assessmentStatus === 'due-soon').length
    const notAssessed = processedVendors.filter(v => v.assessmentStatus === 'not-assessed').length
    const highRisk = processedVendors.filter(v => v.riskLevel === 'HIGH').length

    const scoresSum = processedVendors
      .filter(v => v.summary?.overallScore)
      .reduce((sum, v) => sum + (v.summary?.overallScore ?? 0), 0)
    const scoredVendors = processedVendors.filter(v => v.summary?.overallScore).length
    const avgScore = scoredVendors > 0 ? scoresSum / scoredVendors : 0

    const categories = Object.fromEntries(
      CSM_VENDOR_CATEGORIES.map(cat => [
        cat, 
        processedVendors.filter(v => v.category === cat).length
      ])
    ) as Record<CSMVendorCategory, number>

    return {
      total,
      assessed,
      inProgress,
      overdue,
      dueSoon,
      notAssessed,
      avgScore,
      highRisk,
      categories
    }
  }, [processedVendors])

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage
  } = usePagination(filteredVendors, ITEMS_PER_PAGE)

  // ================================
  // EVENT HANDLERS
  // ================================
  
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    setState(prev => ({ ...prev, searchTerm: event.target.value }))
  }, [])

  const handleViewModeChange = useCallback((mode: ViewMode): void => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }, [])

  const handleFilterChange = useCallback((key: keyof FilterState, value: unknown): void => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }))
  }, [])

  const handleQuickFilterToggle = useCallback((filter: keyof FilterState['quickFilters']): void => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        quickFilters: {
          ...prev.filters.quickFilters,
          [filter]: !prev.filters.quickFilters[filter]
        }
      }
    }))
  }, [])

  const handleSortChange = useCallback((sortBy: CSMListPageState['sortBy']): void => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleVendorView = useCallback((id: string): void => {
    navigate(`/csm/vendors/${id}`)
  }, [navigate])

  const handleVendorEdit = useCallback((id: string): void => {
    navigate(`/csm/vendors/${id}/edit`)
  }, [navigate])

  const handleVendorAssess = useCallback((id: string): void => {
    navigate(`/csm/assessments/new?vendorId=${id}`)
  }, [navigate])

  const handleVendorDelete = useCallback(async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`คุณต้องการลบผู้ขาย "${name}" ใช่หรือไม่?`)) {
      return
    }

    try {
      await enhancedCSMService.deleteVendor(id)
      await vendorsQuery.refetch()
      addToast({
        title: 'สำเร็จ',
        message: `ลบผู้ขาย "${name}" เรียบร้อยแล้ว`,
        type: 'success'
      })
    } catch (error) {
      console.error('Delete vendor error:', error)
      addToast({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถลบผู้ขายได้ กรุณาลองใหม่อีกครั้ง',
        type: 'error'
      })
    }
  }, [addToast, vendorsQuery])

  const handleExport = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isExporting: true }))
    
    try {
      await exportVendorsToExcel(filteredVendors, {
        filename: `CSM_Vendors_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeStats: true,
        filters: state.filters
      })
      
      addToast({
        title: 'สำเร็จ',
        message: 'ส่งออกข้อมูลเรียบร้อยแล้ว',
        type: 'success'
      })
    } catch (error) {
      console.error('Export error:', error)
      addToast({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถส่งออกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        type: 'error'
      })
    } finally {
      setState(prev => ({ ...prev, isExporting: false }))
    }
  }, [filteredVendors, state.filters, addToast])

  const handleRefresh = useCallback(async (): Promise<void> => {
    await vendorsQuery.refetch()
    addToast({
      message: 'รีเฟรชข้อมูลเรียบร้อยแล้ว',
      type: 'success'
    })
  }, [vendorsQuery, addToast])

  const handleClearFilters = useCallback((): void => {
    setState(prev => ({ 
      ...prev, 
      filters: INITIAL_FILTERS,
      searchTerm: ''
    }))
    
    if (searchInputRef.current) {
      searchInputRef.current.value = ''
    }
  }, [])

  // ================================
  // KEYBOARD SHORTCUTS
  // ================================
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Ctrl/Cmd + K for search focus
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Ctrl/Cmd + E for export
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault()
        void handleExport()
      }
      
      // Ctrl/Cmd + R for refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        void handleRefresh()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleExport, handleRefresh])

  // ================================
  // LOADING AND ERROR STATES
  // ================================
  
  if (vendorsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-64 h-4" />
          </div>
          <Skeleton className="w-32 h-10" />
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="w-full h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="w-3/4 h-6" />
                  <Skeleton className="w-1/2 h-4" />
                  <Skeleton className="w-full h-4" />
                  <div className="flex gap-2">
                    <Skeleton className="flex-1 h-8" />
                    <Skeleton className="flex-1 h-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (vendorsQuery.isError) {
    return (
      <div className="p-6">
        <Alert variant="error" title="เกิดข้อผิดพลาด">
          <p>ไม่สามารถโหลดข้อมูลผู้ขายได้ กรุณาลองใหม่อีกครั้ง</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="mt-3"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            ลองใหม่
          </Button>
        </Alert>
      </div>
    )
  }

  // ================================
  // MAIN RENDER
  // ================================
  
  return (
    <div className="p-6 space-y-6">
      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 text-xs text-gray-500 rounded bg-gray-50">
          Render #{renderCount} | Vendors: {filteredVendors.length} | Page: {currentPage}/{totalPages}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            รายการผู้ขาย CSM
          </h1>
          <p className="mt-1 text-gray-600">
            จัดการและประเมินผู้ขายทั้งหมด ({statistics.total} รายการ)
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={vendorsQuery.isFetching}
            leftIcon={<RefreshCw className={`w-4 h-4 ${vendorsQuery.isFetching ? 'animate-spin' : ''}`} />}
          >
            รีเฟรช
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            loading={state.isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            ส่งออก Excel
          </Button>
          
          <Button
            onClick={() => navigate('/csm/vendors/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            เพิ่มผู้ขายใหม่
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ทั้งหมด"
          value={statistics.total}
          icon={Building2}
          color="blue"
          onClick={() => handleClearFilters()}
          isClickable
        />
        
        <StatCard
          title="ต้องประเมิน"
          value={statistics.overdue + statistics.dueSoon + statistics.notAssessed}
          icon={AlertTriangle}
          color="red"
          onClick={() => handleFilterChange('needsAssessment', true)}
          isClickable
        />
        
        <StatCard
          title="ความเสี่ยงสูง"
          value={statistics.highRisk}
          icon={TrendingUp}
          color="yellow"
          onClick={() => handleQuickFilterToggle('highRisk')}
          isClickable
        />
        
        <StatCard
          title="คะแนนเฉลี่ย"
          value={statistics.avgScore.toFixed(1)}
          icon={CheckCircle}
          color="green"
          subtitle="จากการประเมินล่าสุด"
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            ตัวกรองและการค้นหา
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              ref={searchInputRef}
              placeholder="ค้นหาผู้ขาย... (Ctrl+K)"
              value={state.searchTerm}
              onChange={handleSearchChange}
              leftIcon={<Search className="w-4 h-4" />}
            />
            
            <Dropdown
              label="หมวดหมู่"
              items={[
                { value: 'all', label: 'ทุกหมวดหมู่' },
                ...CSM_VENDOR_CATEGORIES.map(cat => ({
                  value: cat,
                  label: cat
                }))
              ]}
              value={state.filters.category}
              onChange={(value) => handleFilterChange('category', value)}
            />
            
            <Dropdown
              label="สถานะการประเมิน"
              items={[
                { value: 'all', label: 'ทุกสถานะ' },
                { value: 'completed', label: 'ประเมินแล้ว' },
                { value: 'in-progress', label: 'กำลังประเมิน' },
                { value: 'due-soon', label: 'ใกล้ครบกำหนด' },
                { value: 'overdue', label: 'เกินกำหนด' },
                { value: 'not-assessed', label: 'ยังไม่ประเมิน' }
              ]}
              value={state.filters.assessmentStatus}
              onChange={(value) => handleFilterChange('assessmentStatus', value)}
            />
            
            <Dropdown
              label="ระดับความเสี่ยง"
              items={[
                { value: 'all', label: 'ทุกระดับ' },
                { value: 'HIGH', label: 'สูง' },
                { value: 'MEDIUM', label: 'กลาง' },
                { value: 'LOW', label: 'ต่ำ' }
              ]}
              value={state.filters.riskLevel}
              onChange={(value) => handleFilterChange('riskLevel', value)}
            />
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={state.filters.quickFilters.dueSoon ? "primary" : "outline"}
              size="sm"
              onClick={() => handleQuickFilterToggle('dueSoon')}
            >
              ใกล้ครบกำหนด
            </Button>
            
            <Button
              variant={state.filters.quickFilters.highRisk ? "primary" : "outline"}
              size="sm"
              onClick={() => handleQuickFilterToggle('highRisk')}
            >
              ความเสี่ยงสูง
            </Button>
            
            <Button
              variant={state.filters.quickFilters.neverAssessed ? "primary" : "outline"}
              size="sm"
              onClick={() => handleQuickFilterToggle('neverAssessed')}
            >
              ยังไม่เคยประเมิน
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              leftIcon={<X className="w-4 h-4" />}
            >
              ล้างตัวกรอง
            </Button>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">มุมมอง:</span>
              <div className="flex overflow-hidden border border-gray-300 rounded-lg">
                <button
                  onClick={() => handleViewModeChange('card')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    state.viewMode === 'card' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    state.viewMode === 'table' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('virtual')}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    state.viewMode === 'virtual' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              แสดง {paginatedData.length} จาก {filteredVendors.length} รายการ
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Section */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                ไม่พบข้อมูลผู้ขาย
              </h3>
              <p className="mb-4 text-gray-600">
                {state.searchTerm || Object.values(state.filters).some(f => 
                  f !== 'all' && f !== false && (!Array.isArray(f) || f.some(Boolean))
                ) 
                  ? 'ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง'
                  : 'เริ่มต้นด้วยการเพิ่มผู้ขายใหม่'
                }
              </p>
              <div className="flex justify-center gap-2">
                {(state.searchTerm || Object.values(state.filters).some(f => 
                  f !== 'all' && f !== false && (!Array.isArray(f) || f.some(Boolean))
                )) && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    ล้างการค้นหา
                  </Button>
                )}
                <Button
                  onClick={() => navigate('/csm/vendors/new')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  เพิ่มผู้ขายใหม่
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vendors List */}
          {state.viewMode === 'card' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedData.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onView={handleVendorView}
                  onEdit={handleVendorEdit}
                  onDelete={handleVendorDelete}
                  onAssess={handleVendorAssess}
                />
              ))}
            </div>
          )}

          {state.viewMode === 'virtual' && (
            <Card>
              <CardContent padding="none">
                <List
                  ref={listRef}
                  height={600}
                  itemCount={filteredVendors.length}
                  itemSize={VIRTUAL_ITEM_HEIGHT}
                  itemData={{
                    vendors: filteredVendors,
                    onView: handleVendorView,
                    onEdit: handleVendorEdit,
                    onDelete: handleVendorDelete,
                    onAssess: handleVendorAssess
                  }}
                  overscanCount={5}
                >
                  {VirtualRow}
                </List>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {state.viewMode !== 'virtual' && totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                showFirstLast
                showPrevNext
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default React.memo(CSMListPage)
  // PERFORMANCE TRACKING
  // ================================
  
  const { renderCount } = usePerformanceTracking('CSMListPage')

  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [state, setState] = useState<CSMListPageState>(INITIAL_STATE)
  const { addToast } = useToast()
  const navigate = useNavigate()
  
  // ================================
  // REFS
  // ================================
  
  const listRef = useRef<List>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ================================
  // DEBOUNCED VALUES
  // ================================
  
  const debouncedSearchTerm = useDebounce(state.searchTerm, DEBOUNCE_DELAY)

  // ================================
  // QUERIES
  // ================================
  
  const vendorsQuery: UseQueryResult<readonly CSMVendor[], Error> = useQuery({
    queryKey: ['csm-vendors', debouncedSearchTerm, state.filters, state.sortBy, state.sortOrder],
    queryFn: async (): Promise<readonly CSMVendor[]> => {
      const result = await enhancedCSMService.getVendors({
        search: debouncedSearchTerm || undefined,
        category: state.filters.category !== 'all' ? state.filters.category : undefined,
        riskLevel: state.filters.riskLevel !== 'all' ? state.filters.riskLevel : undefined,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      })
      return result
    },
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000)
  })

  // ================================