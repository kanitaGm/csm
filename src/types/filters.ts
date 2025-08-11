// src/types/filters.ts - Filter & Search Types
import type { SortBy, SortOrder, FormStatus } from './index';

// =================== FILTER STATES ===================
export interface FilterState {
  search: string;
  status: 'all' | 'active' | 'inactive' | FormStatus;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export interface EnhancedFilterState extends FilterState {
  category: string;
  hasAttachments: 'all' | 'yes' | 'no';
  applicableTo: string;
  createdBy: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  tags: string[];
}

// =================== MODAL STATES ===================
export interface ModalState {
  showDeleteModal: boolean;
  showPreviewModal: boolean;
  selectedForm: string | unknown | null; // จะใช้ FormDoc แต่หลีกเลี่ยง circular dependency
}

export interface EnhancedModalState extends ModalState {
  showDuplicateModal: boolean;
  showArchiveModal: boolean;
  showExportModal: boolean;
  showSettingsModal: boolean;
}

// =================== SEARCH OPTIONS ===================
export interface SearchOptions {
  query: string;
  fields: string[];
  filters: FilterOptions;
  term: string;
  exact?: boolean;
  caseSensitive?: boolean;  
}

export interface FilterOptions {
  search: string;
  category: string;
  assessmentStatus: 'all' | 'completed' | 'in-progress' | 'not-assessed' | 'expired';
  dateRange: 'all' | 'this-year' | 'last-year' | 'custom';
  riskLevel: string;
  company?: string;
  site?: string;
  plant?: string;
  employeeType?: string;
  status?: string;
  department?: string;
  level?: string;
  companies: string[];
  departments: string[];
  levels: string[];
  employeeTypes: string[];
  statuses: string[];
}

// =================== VALIDATION TYPES ===================
export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[]; 
}

export interface FormValidationResult {
  isValid: boolean;
  fieldResults: Record<string, FieldValidationResult>;
  generalErrors: string[];
  errors: Record<string, string>; // เพิ่ม property นี้
  score?: {
    accessibility: number;
    usability: number;
    performance: number;
    overall: number;
  };
}

// =================== BULK OPERATIONS ===================
export interface BulkAction {
  action: 'delete' | 'archive' | 'activate' | 'deactivate' | 'export';
  formIds: string[];
}