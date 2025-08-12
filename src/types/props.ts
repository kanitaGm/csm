// 📁 src/types/props.ts
// Practical Component Props Types - ใช้ readonly เฉพาะที่จำเป็น
import type { OptionType, FormDoc, FormField, ViewMode, ValidationResult } from './index';
import type { EnhancedFilterState, EnhancedModalState } from './filters';
import type { CSMVendor, CSMAssessmentSummary } from './csm';

// =================== UI COMPONENT PROPS ===================
export interface SearchableSelectProps {
  options: OptionType[];
  value: OptionType | null;
  onChange: (option: OptionType | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  error?: string;
}

export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

// =================== FORM COMPONENT PROPS ===================
export interface FormListPageProps {
  onEditForm?: (formId: string) => void;
  onCreateForm?: () => void;
}

export interface FormEditorPageProps {
  formId?: string;
  onSave?: (form: FormDoc) => void;
  onCancel?: () => void;
}

export interface FormCardProps {
  form: FormDoc;
  viewMode: ViewMode;
  onEdit: (form: FormDoc) => void;
  onDelete: (form: FormDoc) => void;
  onPreview: (form: FormDoc) => void;
  onDuplicate: (form: FormDoc) => void;
  onArchive: (form: FormDoc) => void;
  onExport: (form: FormDoc) => void;
}

export interface FormPreviewProps {
  form: FormDoc;
  onClose: () => void;
}

// =================== FIELD EDITOR PROPS ===================
export interface FieldEditorProps {
  field: FormField;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  validationResult?: ValidationResult;
}

// =================== FILTER & MODAL PROPS ===================
export interface AdvancedFilterProps {
  filter: EnhancedFilterState;
  onFilterChange: (filter: EnhancedFilterState) => void;
  availableCategories: string[];
  availableTags: string[];
}

export interface ModalManagerProps {
  modal: EnhancedModalState;
  onModalChange: (modal: EnhancedModalState) => void;
  selectedForm: FormDoc | null;
  onDeleteConfirm: () => Promise<void>;
  onArchiveConfirm: () => Promise<void>;
}

// =================== STATS & DISPLAY PROPS ===================
export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}

export interface ViewModeToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export interface SearchWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  loading?: boolean;
}

// =================== TOAST PROPS ===================
// Central definition of Toast - ใช้เป็น source of truth เดียว
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  createdAt?: number; // optional เพราะไม่ได้ใช้ทุกที่
}

// ใช้ readonly เฉพาะ array ที่ส่งผ่าน props เพื่อป้องกันการแก้ไข
export interface ToastContainerProps {
  toasts: readonly Toast[];
  onRemove: (id: string) => void;
}

// =================== SKELETON LOADER PROPS ===================
export interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  animated?: boolean;
}

// =================== CSM SPECIFIC PROPS ===================
export interface CSMVendorCardProps {
  vendor: CSMVendor;
  summary?: CSMAssessmentSummary;
  onSelect: (vendor: CSMVendor) => void;
  onViewDetails: (vendor: CSMVendor) => void;
  onEdit: (vendor: CSMVendor) => void;
}

export interface CSMFilterProps {
  filters: {
    search: string;
    category: string;
    assessmentStatus: string;
    riskLevel: string;
  };
  onFilterChange: (key: string, value: string) => void;
  categories: Array<{
    code: string;
    name: string;
    description: string;
    color: string;
  }>;
}

// =================== PAGINATION PROPS ===================
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

// =================== LOADING PROPS ===================
export interface LoadingProps {
  loading: boolean;
  error?: string | null;
  retry?: () => void;
}

// Note: Toast interface already exported above, no need to re-export