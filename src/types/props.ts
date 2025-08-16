// ========================================
// 🔧 src/types/props.ts - เหมาะสมกับระบบ ไม่ซับซ้อน
// ========================================

import React from 'react'
import type { FormDoc, FormField, ViewMode, SelectOption,FormFilterState } from './forms'
import type { CSMVendor, CSMAssessmentSummary, CSMVendorCategory, CSMRiskLevel } from './csm'

// ========================================
// BASIC UI COMPONENT PROPS
// ========================================

export interface SearchableSelectProps {
  options: SelectOption[]
  value: SelectOption | null
  onChange: (option: SelectOption | null) => void
  placeholder?: string
  isDisabled?: boolean
  isLoading?: boolean
  error?: string
  className?: string
}

export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
}

// ========================================
// TOAST PROPS (เอาจาก Design System)
// ========================================

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
  createdAt?: number
}

export interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

// ========================================
// FORM COMPONENT PROPS (เฉพาะที่ใช้จริง)
// ========================================

export interface FormListPageProps {
  onEditForm?: (formId: string) => void
  onCreateForm?: () => void
  viewMode?: ViewMode
  filters?: FormFilterState
}

export interface FormEditorPageProps {
  formId?: string
  onSave?: (form: FormDoc) => void
  onCancel?: () => void
  isLoading?: boolean
  error?: string
}

export interface FormCardProps {
  form: FormDoc
  viewMode: ViewMode
  onEdit: (form: FormDoc) => void
  onDelete: (form: FormDoc) => void
  onPreview: (form: FormDoc) => void
  onDuplicate?: (form: FormDoc) => void
  onArchive?: (form: FormDoc) => void
  onExport?: (form: FormDoc) => void
  loading?: boolean
}

export interface FormPreviewProps {
  form: FormDoc
  onClose: () => void
  isOpen: boolean
}

// ========================================
// FIELD EDITOR PROPS (เรียบง่าย)
// ========================================

export interface FieldEditorProps {
  field: FormField
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<FormField>) => void
  onDelete: () => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  validationError?: string
}

// ========================================
// FILTER PROPS (เบื้องต้น)
// ========================================

export interface FilterState {
  search: string
  category: string
  status: string
  isActive: string
  dateRange: string
  tags: string[]
}

export interface AdvancedFilterProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  availableCategories: Array<{ value: string; label: string }>
  availableTags: string[]
  onReset: () => void
}

// ========================================
// MODAL PROPS (เบื้องต้น)
// ========================================

export interface ModalState {
  isOpen: boolean
  type: 'delete' | 'archive' | 'duplicate' | 'export' | null
  data?: unknown
}

export interface ModalManagerProps {
  modal: ModalState
  onModalChange: (modal: ModalState) => void
  selectedForm: FormDoc | null
  onDeleteConfirm: () => Promise<void>
  onArchiveConfirm?: () => Promise<void>
  loading?: boolean
}

// ========================================
// STATS & DISPLAY PROPS
// ========================================

export interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'gray'
  loading?: boolean
  onClick?: () => void
  subtitle?: string
}

export interface ViewModeToggleProps {
  viewMode: ViewMode
  onChange: (mode: ViewMode) => void
  options?: Array<{ value: ViewMode; label: string; icon: React.ComponentType }>
}

export interface SearchWithSuggestionsProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  loading?: boolean
  onSuggestionClick?: (suggestion: string) => void
  debounceMs?: number
}

// ========================================
// SKELETON LOADER PROPS
// ========================================

export interface SkeletonLoaderProps {
  lines?: number
  className?: string
  animated?: boolean
  height?: string | number
  width?: string | number
}

// ========================================
// CSM SPECIFIC PROPS (เหมาะสมกับ CSM)
// ========================================

export interface CSMVendorCardProps {
  vendor: CSMVendor
  summary?: CSMAssessmentSummary
  onSelect?: (vendor: CSMVendor) => void
  onViewDetails: (vendor: CSMVendor) => void
  onEdit: (vendor: CSMVendor) => void
  onDelete?: (vendor: CSMVendor) => void
  onAssess?: (vendor: CSMVendor) => void
  loading?: boolean
  selected?: boolean
}

export interface CSMFilterState {
  search: string
  category: CSMVendorCategory | 'all'
  assessmentStatus: 'all' | 'completed' | 'in-progress' | 'due-soon' | 'overdue' | 'not-assessed'
  riskLevel: CSMRiskLevel | 'all'
  needsAssessment: boolean
  quickFilters: {
    dueSoon: boolean
    highRisk: boolean
    neverAssessed: boolean
  }
}

export interface CSMFilterProps {
  filters: CSMFilterState
  onFilterChange: (filters: CSMFilterState) => void
  categories: Array<{
    code: string
    name: string
    description: string
    color: string
  }>
  onReset: () => void
  loading?: boolean
}

export interface CSMStatsProps {
  stats: {
    total: number
    assessed: number
    overdue: number
    highRisk: number
    avgScore: number
  }
  loading?: boolean
  onStatClick?: (statType: string) => void
}

// ========================================
// PAGINATION PROPS (เรียบง่าย)
// ========================================

export interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (items: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  siblingCount?: number
  className?: string
}

// ========================================
// LOADING PROPS
// ========================================

export interface LoadingProps {
  loading: boolean
  error?: string | null
  retry?: () => void
  children?: React.ReactNode
}

export interface LoadingStateProps {
  isLoading: boolean
  hasError: boolean
  errorMessage?: string
  isEmpty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  children: React.ReactNode
}

// ========================================
// BULK OPERATIONS PROPS
// ========================================

export interface BulkOperationProps {
  selectedItems: string[]
  onSelectAll: () => void
  onSelectNone: () => void
  onBulkDelete?: () => void
  onBulkArchive?: () => void
  onBulkExport?: () => void
  totalItems: number
  loading?: boolean
}

// ========================================
// DATA TABLE PROPS
// ========================================

export interface DataTableColumn<T = unknown> {
  key: string
  title: string
  dataIndex: keyof T
  width?: string | number
  sortable?: boolean
  filterable?: boolean
  render?: (value: unknown, record: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T = unknown> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  pagination?: PaginationProps
  selection?: {
    selectedKeys: string[]
    onChange: (keys: string[]) => void
    getRowKey: (record: T) => string
  }
  sorting?: {
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  }
  onRowClick?: (record: T, index: number) => void
  className?: string
  size?: 'small' | 'medium' | 'large'
  bordered?: boolean
  striped?: boolean
}

// ========================================
// SEARCH PROPS
// ========================================

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  onSearch?: (value: string) => void
  loading?: boolean
  className?: string
  size?: 'small' | 'medium' | 'large'
  showClearButton?: boolean
  debounceMs?: number
}

// ========================================
// EXPORT TYPES
// ========================================

export type {  FormFilterState} from './forms'

// ========================================
// RE-EXPORT COMMONLY USED TYPES
// ========================================

export type { ViewMode, SelectOption } from './forms'
export type { CSMVendor, CSMAssessmentSummary, CSMVendorCategory, CSMRiskLevel } from './csm'