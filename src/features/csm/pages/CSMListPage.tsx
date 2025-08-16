          
          // src/features/csm/pages/CSMListPage.tsx - Complete Working Version

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { 
  Search, RefreshCw,  AlertTriangle, CheckCircle, 
  Clock, Plus, Grid, List as ListIcon, TrendingUp, Building2,
  FileText, X, Download, ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary, CSMAssessment } from '../../../types';
import { enhancedCSMService } from '../../../services/enhancedCsmService';
import { useToast } from '../../../hooks/useToast';
import { useDebounce } from '../../../hooks/useDebounce';
import { usePagination } from '../../../hooks/usePagination';
import { CSM_VENDOR_CATEGORIES } from '../../../types/csm';
import { exportVendorsToExcel } from '../../../utils/exportUtils';

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes cache
const DEBOUNCE_DELAY = 500; // Longer delay for large datasets

// ========================================
// TYPES & INTERFACES
// ========================================
type ViewMode = 'card' | 'table' | 'virtual';

interface VendorWithStatus extends CSMVendor {
  assessmentStatus: 'completed' | 'in-progress' | 'due-soon' | 'overdue' | 'not-assessed';
  summary?: CSMAssessmentSummary;
  currentAssessment?: CSMAssessment;
  daysUntilDue?: number;
  lastAssessmentDate?: Date;
}

interface FilterState {
  category: string;
  assessmentStatus: string;
  riskLevel: string;
  needsAssessment: boolean;
  quickFilters: {
    dueSoon: boolean;
    highRisk: boolean;
    neverAssessed: boolean;
  };
}

interface StatisticsData {
  total: number;
  assessed: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
  notAssessed: number;
  avgScore: number;
  highRisk: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  trend?: number;
  subtitle?: string;
  onClick?: () => void;
  isClickable?: boolean;
}

// ========================================
// STAT CARD COMPONENT
// ========================================
const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon: Icon, color, trend, subtitle, onClick, isClickable 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 lg:p-6 rounded-lg border transition-all duration-200 ${colorClasses[color]} ${
        isClickable ? 'cursor-pointer transform hover:scale-105' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 truncate lg:text-sm">{title}</p>
          <p className="mt-1 text-xl font-bold lg:text-2xl">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <Icon className="flex-shrink-0 w-6 h-6 lg:h-8 lg:w-8" />
      </div>
      {trend !== undefined && (
        <div className="flex items-center mt-3">
          <TrendingUp className="w-3 h-3 mr-1 lg:h-4 lg:w-4" />
          <span className="text-xs lg:text-sm">{trend > 0 ? '+' : ''}{trend}%</span>
        </div>
      )}
    </div>
  );
};

// ========================================
// OPTIMIZED VENDOR CARD COMPONENT
// ========================================
const OptimizedVendorCard: React.FC<{ 
  vendor: VendorWithStatus; 
  onSelect: (vendor: CSMVendor) => void;
}> = React.memo(({ vendor, onSelect }) => {
  const categoryInfo = CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category);
  
  return (
    <div 
      onClick={() => onSelect(vendor)}
      className="p-4 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer lg:p-6 hover:shadow-md hover:border-blue-300"
    >
      {/* Header - Optimized for mobile */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate lg:text-lg">
            {vendor.vdName}
          </h3>
          <p className="text-xs text-gray-500 truncate lg:text-sm">
            {vendor.vdCode}
          </p>
        </div>
        
        {/* Mobile-optimized status badge */}
        <div className="flex-shrink-0 ml-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            vendor.assessmentStatus === 'completed' ? 'bg-green-100 text-green-800' :
            vendor.assessmentStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
            vendor.assessmentStatus === 'due-soon' ? 'bg-yellow-100 text-yellow-800' :
            vendor.assessmentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {vendor.assessmentStatus === 'completed' && '✓'}
            {vendor.assessmentStatus === 'in-progress' && '⏳'}
            {vendor.assessmentStatus === 'due-soon' && '⚠️'}
            {vendor.assessmentStatus === 'overdue' && '❌'}
            {vendor.assessmentStatus === 'not-assessed' && '➖'}
          </span>
        </div>
      </div>

      {/* Compact info grid */}
      <div className="grid grid-cols-2 gap-2 text-xs lg:text-sm">
        <div>
          <span className="text-gray-500">หมวด:</span>
          <span className="block ml-1 font-medium truncate">
            {categoryInfo?.name || vendor.category}
          </span>
        </div>
        
        {vendor.summary?.avgScore !== undefined && (
          <div>
            <span className="text-gray-500">คะแนน:</span>
            <span className={`ml-1 font-medium ${
              vendor.summary.avgScore >= 80 ? 'text-green-600' :
              vendor.summary.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {vendor.summary.avgScore}%
            </span>
          </div>
        )}
        
        {vendor.daysUntilDue !== undefined && (
          <div className="col-span-2">
            <span className="text-gray-500">กำหนด:</span>
            <span className={`ml-1 font-medium ${
              vendor.daysUntilDue < 0 ? 'text-red-600' : 
              vendor.daysUntilDue <= 30 ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {vendor.daysUntilDue > 0 
                ? `อีก ${vendor.daysUntilDue} วัน`
                : `เกิน ${Math.abs(vendor.daysUntilDue)} วัน`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedVendorCard.displayName = 'OptimizedVendorCard';

// ========================================
// VIRTUAL LIST ITEM COMPONENT
// ========================================
const VirtualVendorItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    vendors: VendorWithStatus[];
    onSelect: (vendor: CSMVendor) => void;
  };
}> = ({ index, style, data }) => {
  const vendor = data.vendors[index];
  const categoryInfo = CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'due-soon': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div style={style} className="px-4">
      <div 
        onClick={() => data.onSelect(vendor)}
        className="flex items-center justify-between p-4 transition-all duration-200 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {vendor.vdName}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {vendor.vdCode} • {categoryInfo?.name || vendor.category}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Status */}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.assessmentStatus)}`}>
                {vendor.assessmentStatus === 'completed' && 'ประเมินแล้ว'}
                {vendor.assessmentStatus === 'in-progress' && 'กำลังประเมิน'}
                {vendor.assessmentStatus === 'due-soon' && 'ใกล้ครบ'}
                {vendor.assessmentStatus === 'overdue' && 'เกินกำหนด'}
                {vendor.assessmentStatus === 'not-assessed' && 'ยังไม่ประเมิน'}
              </span>

              {/* Score */}
              {vendor.summary?.avgScore !== undefined && (
                <span className={`text-sm font-medium ${
                  vendor.summary.avgScore >= 80 ? 'text-green-600' :
                  vendor.summary.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {vendor.summary.avgScore}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// OPTIMIZED PAGINATION COMPONENT
// ========================================
const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  nextPage: () => void;
  prevPage: () => void;
  totalItems: number;
  itemsPerPage: number;
  loading?: boolean;
  showPageJumper?: boolean;
}> = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  goToPage,
  goToFirst,
  goToLast,
  nextPage,
  prevPage,
  totalItems,
  itemsPerPage,
  loading = false,
  showPageJumper = true
}) => {
  const [pageInput, setPageInput] = useState<string>('');

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (page >= 1 && page <= totalPages) {
      goToPage(page);
      setPageInput('');
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 bg-white border-t border-gray-200 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      {/* Items Info */}
      <div className="text-sm text-center text-gray-700 lg:text-left">
        แสดงรายการที่ {startItem.toLocaleString()} - {endItem.toLocaleString()} จาก {totalItems.toLocaleString()} รายการ
      </div>
      
      {/* Pagination Controls */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {/* Mobile: Simple Previous/Next */}
        <div className="flex items-center space-x-2 sm:hidden">
          <button
            onClick={prevPage}
            disabled={!hasPrevPage || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            ก่อนหน้า
          </button>
          
          <span className="px-3 py-2 text-sm font-medium text-gray-700">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={nextPage}
            disabled={!hasNextPage || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ถัดไป
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Desktop: Full Controls */}
        <div className="items-center hidden space-x-2 sm:flex">
          {/* First/Previous */}
          <div className="flex items-center space-x-1">
            <button
              onClick={goToFirst}
              disabled={!hasPrevPage || loading}
              className="p-2 text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="หน้าแรก"
            >
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-2" />
            </button>
            
            <button
              onClick={prevPage}
              disabled={!hasPrevPage || loading}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              ก่อนหน้า
            </button>
          </div>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {getVisiblePages().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? goToPage(page) : undefined}
                disabled={page === '...' || loading}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border border-blue-600'
                    : page === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                } ${page === '...' ? '' : 'min-w-[40px]'}`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next/Last */}
          <div className="flex items-center space-x-1">
            <button
              onClick={nextPage}
              disabled={!hasNextPage || loading}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ถัดไป
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
            
            <button
              onClick={goToLast}
              disabled={!hasNextPage || loading}
              className="p-2 text-gray-600 rounded-lg hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="หน้าสุดท้าย"
            >
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-2" />
            </button>
          </div>
        </div>

        {/* Page Jumper */}
        {showPageJumper && totalPages > 10 && (
          <form onSubmit={handlePageJump} className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">ไปหน้า:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={currentPage.toString()}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              ไป
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ========================================
// MAIN COMPONENT
// ========================================
const CSMListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const listRef = useRef<List>(null);

  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    needsAssessment: false,
    quickFilters: {
      dueSoon: false,
      highRisk: false,
      neverAssessed: false
    }
  });

  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_DELAY);

  // Adaptive page size based on screen and performance
  const [pageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const isSlowDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      return isMobile ? 20 : isSlowDevice ? 30 : 50;
    }
    return 30;
  });

  // ========================================
  // DATA FETCHING
  // ========================================
  
  // Get summary statistics first (lightweight)
  const { data: quickStats, isLoading: statsLoading } = useQuery({
    queryKey: ['csm-quick-stats'],
    queryFn: async () => {
      const [vendors, summaries] = await Promise.all([
        enhancedCSMService.vendors.getAll().then(data => data.length),
        enhancedCSMService.assessmentSummaries.getAll().then(data => data.length)
      ]);
      return { totalVendors: vendors, assessedVendors: summaries };
    },
    staleTime: CACHE_TIME,
  });

  // Load vendors
  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['csm-vendors-paginated', filters.category, debouncedSearch],
    queryFn: async () => {
      return await enhancedCSMService.vendors.getAll();
    },
    staleTime: CACHE_TIME,
    enabled: !isInitialLoad
  });

  // Load assessment data separately for better performance
  const { data: assessmentSummaries = [] } = useQuery({
    queryKey: ['csm-assessment-summaries'],
    queryFn: () => enhancedCSMService.assessmentSummaries.getAll(),
    staleTime: CACHE_TIME,
  });

  const { data: currentAssessments = [] } = useQuery({
    queryKey: ['csm-current-assessments'],  
    queryFn: () => enhancedCSMService.assessments.getAllCurrent(),
    staleTime: CACHE_TIME / 4,
  });

  const allVendors = vendors;

  // ========================================
  // DATA PROCESSING
  // ========================================
  
  const getAssessmentStatus = useCallback((
    vendor: CSMVendor, 
    summary?: CSMAssessmentSummary,
    currentAssessment?: CSMAssessment
  ): 'completed' | 'in-progress' | 'due-soon' | 'overdue' | 'not-assessed' => {
    
    if (currentAssessment && !currentAssessment.isFinish) {
      return 'in-progress';
    }
    
    if (!summary) {
      return 'not-assessed';
    }
    
    const now = new Date();
    const lastAssessment = new Date(summary.lastAssessmentDate);
    const daysSince = Math.floor((now.getTime() - lastAssessment.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = parseInt(vendor.freqAss) || 365;
    
    if (daysSince >= frequency) return 'overdue';
    if (daysSince >= frequency - 30) return 'due-soon';
    return 'completed';
  }, []);

  // Memoized vendor processing with performance optimization
  const processedVendors = useMemo((): VendorWithStatus[] => {
    if (!allVendors.length) return [];

    // Create lookup maps for O(1) access
    const summaryMap = new Map(assessmentSummaries.map(s => [s.vdCode, s]));
    const currentAssessmentMap = new Map(
      currentAssessments.filter(a => !a.isFinish).map(a => [a.vdCode, a])
    );

    return allVendors.map(vendor => {
      const summary = summaryMap.get(vendor.vdCode);
      const currentAssessment = currentAssessmentMap.get(vendor.vdCode);
      
      const assessmentStatus = getAssessmentStatus(vendor, summary, currentAssessment);
      
      let daysUntilDue: number | undefined;
      let lastAssessmentDate: Date | undefined;
      
      if (summary) {
        lastAssessmentDate = new Date(summary.lastAssessmentDate);
        const frequency = parseInt(vendor.freqAss) || 365;
        const nextDueDate = new Date(lastAssessmentDate);
        nextDueDate.setDate(nextDueDate.getDate() + frequency);
        const now = new Date();
        daysUntilDue = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...vendor,
        assessmentStatus,
        summary,
        currentAssessment,
        daysUntilDue,
        lastAssessmentDate
      };
    });
  }, [allVendors, assessmentSummaries, currentAssessments, getAssessmentStatus]);

  // ========================================
  // FILTERING & PAGINATION
  // ========================================
  
  const filteredVendors = useMemo((): VendorWithStatus[] => {
    let result = processedVendors;

    // Apply filters
    if (filters.assessmentStatus !== 'all') {
      result = result.filter(v => v.assessmentStatus === filters.assessmentStatus);
    }
    
    if (filters.riskLevel !== 'all') {
      result = result.filter(v => v.summary?.riskLevel === filters.riskLevel);
    }
    
    if (filters.needsAssessment) {
      result = result.filter(v => 
        ['due-soon', 'overdue', 'not-assessed', 'in-progress'].includes(v.assessmentStatus)
      );
    }

    // Quick filters
    if (filters.quickFilters.dueSoon) {
      result = result.filter(v => v.assessmentStatus === 'due-soon' || v.assessmentStatus === 'overdue');
    }
    
    if (filters.quickFilters.highRisk) {
      result = result.filter(v => v.summary?.riskLevel === 'High');
    }
    
    if (filters.quickFilters.neverAssessed) {
      result = result.filter(v => v.assessmentStatus === 'not-assessed');
    }

    return result;
  }, [processedVendors, filters]);

  // Use the enhanced usePagination hook
  const {
    paginatedItems: displayVendors,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    itemsPerPage,
    totalItems
  } = usePagination(filteredVendors, pageSize);

  // ========================================
  // STATISTICS CALCULATION
  // ========================================
  const statistics = useMemo((): StatisticsData => {
    const total = quickStats?.totalVendors || processedVendors.length;
    const completed = processedVendors.filter(v => v.assessmentStatus === 'completed').length;
    const inProgress = processedVendors.filter(v => v.assessmentStatus === 'in-progress').length;
    const overdue = processedVendors.filter(v => v.assessmentStatus === 'overdue').length;
    const dueSoon = processedVendors.filter(v => v.assessmentStatus === 'due-soon').length;
    const notAssessed = processedVendors.filter(v => v.assessmentStatus === 'not-assessed').length;
    
    const summariesWithScores = assessmentSummaries.filter(s => s.avgScore > 0);
    const avgScore = summariesWithScores.length > 0 
      ? Math.round(summariesWithScores.reduce((sum, s) => sum + s.avgScore, 0) / summariesWithScores.length)
      : 0;
    
    const highRisk = assessmentSummaries.filter(s => s.riskLevel === 'High').length

  return {
      total,
      assessed: completed,
      inProgress,
      overdue,
      dueSoon,
      notAssessed,
      avgScore,
      highRisk
    };
  }, [quickStats, processedVendors, assessmentSummaries]);

  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  const handleVendorSelect = useCallback((vendor: CSMVendor) => {
    const inProgressAssessment = currentAssessments.find(a => a.vdCode === vendor.vdCode && !a.isFinish);
    
    if (inProgressAssessment) {
      addToast({
        type: 'info',
        title: 'การประเมินที่ยังไม่เสร็จ',
        message: `พบการประเมินที่ยังไม่เสร็จสำหรับ ${vendor.vdName} จะเปิดหน้าการประเมินต่อ`
      });
    }
    
    navigate(`/csm/e/${vendor.vdCode}`);
  }, [currentAssessments, navigate, addToast]);

  const handleQuickFilter = useCallback((filterType: keyof FilterState['quickFilters']) => {
    setFilters(prev => ({
      ...prev,
      quickFilters: {
        ...prev.quickFilters,
        [filterType]: !prev.quickFilters[filterType]
      }
    }));
    goToPage(1);
  }, [goToPage]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    goToPage(1);
  }, [goToPage]);

  const handleExport = useCallback(async () => {
    try {
      addToast({
        type: 'info',
        title: 'ส่งออกข้อมูล',
        message: 'กำลังเตรียมไฟล์ Excel...'
      });
      
      await exportVendorsToExcel(
        filteredVendors, 
        assessmentSummaries, 
        'CSM_Vendors_Report'
      );
      
      addToast({
        type: 'success',
        title: 'ส่งออกสำเร็จ',
        message: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'ส่งออกไม่สำเร็จ',
        message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
      });
      console.error('Export error:', error);
    }
  }, [filteredVendors, addToast, assessmentSummaries]);

  // ========================================
  // EFFECTS
  // ========================================
  
  // Start loading vendors after initial stats are loaded
  useEffect(() => {
    if (quickStats && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [quickStats, isInitialLoad]);

  // Reset page when search changes
  useEffect(() => {
    if (debouncedSearch !== searchTerm) {
      goToPage(1);
    }
  }, [debouncedSearch, searchTerm, goToPage]);

  // ========================================
  // RENDER CONDITIONS
  // ========================================
  
  const isLoading = statsLoading || (vendorsLoading && isInitialLoad);
  const error = vendorsError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลได้</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="p-4 mx-auto lg:p-6 max-w-7xl">
          <div className="flex flex-col mb-4 lg:flex-row lg:items-start lg:justify-between lg:mb-6">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">
                CSM - Contractor Safety Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 lg:text-base">
                ระบบจัดการความปลอดภัยผู้รับเหมา
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm lg:text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-3 h-3 mr-2 lg:w-4 lg:h-4" />
                ส่งออก
              </button>
              
              <button
                onClick={() => window.location.reload()}
                disabled={isLoading}
                className="inline-flex items-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm lg:text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 lg:w-4 lg:h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              
              <button
                onClick={() => navigate('/csm/vendors/add')}
                className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm lg:text-sm hover:bg-blue-700"
              >
                <Plus className="w-3 h-3 mr-2 lg:w-4 lg:h-4" />
                เพิ่มผู้รับเหมา
              </button>
            </div>
          </div>

          {/* Statistics Cards - Clickable for quick filtering */}
          <div className="grid grid-cols-2 gap-2 mb-4 lg:grid-cols-4 lg:gap-4 lg:mb-6">
            <StatCard
              title="ผู้รับเหมาทั้งหมด"
              value={statistics.total.toLocaleString()}
              icon={Building2}
              color="blue"
              onClick={() => handleFilterChange({ 
                assessmentStatus: 'all', 
                quickFilters: { dueSoon: false, highRisk: false, neverAssessed: false } 
              })}
              isClickable={true}
            />
            <StatCard
              title="ประเมินแล้ว"
              value={statistics.assessed.toLocaleString()}
              icon={CheckCircle}
              color="green"
              subtitle={`${statistics.total > 0 ? Math.round((statistics.assessed / statistics.total) * 100) : 0}% ของทั้งหมด`}
              onClick={() => handleFilterChange({ assessmentStatus: 'completed' })}
              isClickable={true}
            />
            <StatCard
              title="กำลังประเมิน"
              value={statistics.inProgress.toLocaleString()}
              icon={Clock}
              color="yellow"
              onClick={() => handleFilterChange({ assessmentStatus: 'in-progress' })}
              isClickable={true}
            />
            <StatCard
              title="ต้องการประเมิน"
              value={(statistics.overdue + statistics.dueSoon + statistics.notAssessed).toLocaleString()}
              icon={AlertTriangle}
              color="red"
              onClick={() => handleQuickFilter('dueSoon')}
              isClickable={true}
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleQuickFilter('dueSoon')}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.quickFilters.dueSoon
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              ใกล้ครบกำหนด ({statistics.dueSoon + statistics.overdue})
            </button>
            
            <button
              onClick={() => handleQuickFilter('highRisk')}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.quickFilters.highRisk
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              ความเสี่ยงสูง ({statistics.highRisk})
            </button>
            
            <button
              onClick={() => handleQuickFilter('neverAssessed')}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.quickFilters.neverAssessed
                  ? 'bg-gray-200 text-gray-800 border border-gray-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-3 h-3 mr-1" />
              ยังไม่เคยประเมิน ({statistics.notAssessed})
            </button>
          </div>
        </div>
      </div>


                {/* Pagination for Table View */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hasNextPage={hasNextPage}
                  hasPrevPage={hasPrevPage}
                  goToPage={goToPage}
                  goToFirst={goToFirst}
                  goToLast={goToLast}
                  nextPage={nextPage}
                  prevPage={prevPage}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  loading={isLoading}
                  showPageJumper={totalPages > 10}
                />                

      {/* Main Content */}
      <div className="p-4 mx-auto lg:p-6 max-w-7xl">
        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Bar - Mobile Optimized */}
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 lg:w-5 lg:h-5 left-3 top-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือรหัสผู้รับเหมา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-8 pr-4 text-sm border border-gray-300 rounded-lg lg:py-3 lg:pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {debouncedSearch && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute text-gray-400 transform -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters and View Toggle */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange({ category: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg lg:px-3 lg:py-2 lg:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">หมวดหมู่ทั้งหมด</option>
                {CSM_VENDOR_CATEGORIES.map(category => (
                  <option key={category.code} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.assessmentStatus}
                onChange={(e) => handleFilterChange({ assessmentStatus: e.target.value })}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg lg:px-3 lg:py-2 lg:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="completed">ประเมินแล้ว</option>
                <option value="in-progress">กำลังประเมิน</option>
                <option value="due-soon">ใกล้ครบกำหนด</option>
                <option value="overdue">เกินกำหนด</option>
                <option value="not-assessed">ยังไม่ได้ประเมิน</option>
              </select>

              {/* Clear Filters */}
              {(filters.category !== 'all' || filters.assessmentStatus !== 'all' || filters.riskLevel !== 'all' || 
                Object.values(filters.quickFilters).some(Boolean) || debouncedSearch) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      category: 'all',
                      assessmentStatus: 'all',
                      riskLevel: 'all',
                      needsAssessment: false,
                      quickFilters: { dueSoon: false, highRisk: false, neverAssessed: false }
                    });
                  }}
                  className="px-2 py-1 text-xs text-blue-600 rounded-lg lg:px-3 lg:py-2 lg:text-sm bg-blue-50 hover:bg-blue-100"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>


            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 lg:text-sm">มุมมอง:</span>
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1 lg:p-2 ${viewMode === 'card' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  } rounded-l-lg border-r border-gray-300`}
                >
                  <Grid className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 lg:p-2 ${viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  } border-r border-gray-300`}
                >
                  <ListIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
                <button
                  onClick={() => setViewMode('virtual')}
                  className={`p-1 lg:p-2 ${viewMode === 'virtual' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                  } rounded-r-lg`}
                  title="Virtual Scrolling - สำหรับข้อมูลจำนวนมาก"
                >
                  <MoreHorizontal className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-xs text-gray-600 lg:text-sm">
            <span>
              แสดง {displayVendors.length.toLocaleString()} จาก {totalItems.toLocaleString()} รายการ
              {quickStats?.totalVendors && allVendors.length < quickStats.totalVendors && (
                <span className="ml-2 text-blue-600">
                  (โหลดแล้ว {Math.round((allVendors.length / quickStats.totalVendors) * 100)}%)
                </span>
              )}
            </span>
            
            <span className="text-gray-500">
              หน้า {currentPage} จาก {totalPages}
            </span>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 mx-auto mb-4 text-blue-600 lg:w-8 lg:h-8 animate-spin" />
              <p className="text-sm text-gray-600 lg:text-base">กำลังโหลดข้อมูล...</p>
              {quickStats && (
                <p className="mt-2 text-xs text-gray-500">
                  พบผู้รับเหมา {quickStats.totalVendors.toLocaleString()} ราย
                </p>
              )}
            </div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="w-8 h-8 mx-auto mb-4 text-gray-400 lg:w-12 lg:h-12" />
              <h3 className="mb-2 text-base font-medium text-gray-900 lg:text-lg">ไม่พบข้อมูล</h3>
              <p className="mb-4 text-sm text-gray-500 lg:text-base">
                {searchTerm || filters.category !== 'all' || filters.assessmentStatus !== 'all' || 
                 Object.values(filters.quickFilters).some(Boolean)
                  ? 'ไม่พบผู้รับเหมาที่ตรงกับเงื่อนไขที่เลือก'
                  : 'ยังไม่มีข้อมูลผู้รับเหมาในระบบ'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                  {displayVendors.map((vendor) => (
                    <OptimizedVendorCard
                      key={vendor.vdCode}
                      vendor={vendor}
                      onSelect={handleVendorSelect}
                    />
                  ))}
                </div>
                

              </div>
            )}

            {/* Table View - Mobile Responsive */}
            {viewMode === 'table' && (
              <div className="space-y-6">
                <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase lg:px-6">
                            ผู้รับเหมา
                          </th>
                          <th className="hidden px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase lg:table-cell">
                            หมวดหมู่
                          </th>
                          <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase lg:px-6">
                            สถานะ
                          </th>
                          <th className="hidden px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase md:table-cell lg:px-6">
                            คะแนน
                          </th>
                          <th className="hidden px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase lg:table-cell">
                            ประเมินล่าสุด
                          </th>
                          <th className="hidden px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase xl:table-cell">
                            กำหนดการ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayVendors.map((vendor) => {
                          const categoryInfo = CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category);
                          return (
                            <tr 
                              key={vendor.vdCode}
                              onClick={() => handleVendorSelect(vendor)}
                              className="transition-colors cursor-pointer hover:bg-gray-50"
                            >
                              <td className="px-3 py-4 text-sm lg:px-6 whitespace-nowrap">
                                <div>
                                  <div className="font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">
                                    {vendor.vdName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {vendor.vdCode}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 lg:hidden">
                                    {categoryInfo?.name || vendor.category}
                                  </div>
                                </div>
                              </td>
                              <td className="hidden px-6 py-4 text-sm text-gray-900 lg:table-cell whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  categoryInfo?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  {categoryInfo?.name || vendor.category}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-sm lg:px-6 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  vendor.assessmentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                  vendor.assessmentStatus === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                  vendor.assessmentStatus === 'due-soon' ? 'bg-yellow-100 text-yellow-800' :
                                  vendor.assessmentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {vendor.assessmentStatus === 'completed' && 'ประเมินแล้ว'}
                                  {vendor.assessmentStatus === 'in-progress' && 'กำลังประเมิน'}
                                  {vendor.assessmentStatus === 'due-soon' && 'ใกล้ครบ'}
                                  {vendor.assessmentStatus === 'overdue' && 'เกิน'}
                                  {vendor.assessmentStatus === 'not-assessed' && 'ยังไม่ประเมิน'}
                                </span>
                              </td>
                              <td className="hidden px-3 py-4 text-sm text-gray-900 md:table-cell lg:px-6 whitespace-nowrap">
                                {vendor.summary?.avgScore !== undefined ? (
                                  <span className={`font-medium ${
                                    vendor.summary.avgScore >= 80 ? 'text-green-600' :
                                    vendor.summary.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {vendor.summary.avgScore}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="hidden px-6 py-4 text-sm text-gray-900 lg:table-cell whitespace-nowrap">
                                {vendor.lastAssessmentDate ? (
                                  vendor.lastAssessmentDate.toLocaleDateString('th-TH')
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="hidden px-6 py-4 text-sm text-gray-900 xl:table-cell whitespace-nowrap">
                                {vendor.daysUntilDue !== undefined ? (
                                  <span className={vendor.daysUntilDue < 0 ? 'text-red-600' : 'text-gray-600'}>
                                    {vendor.daysUntilDue > 0 
                                      ? `${vendor.daysUntilDue} วัน`
                                      : `เกิน ${Math.abs(vendor.daysUntilDue)} วัน`
                                    }
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>              
              </div>
            )}

            {/* Virtual Scrolling View - For Large Datasets */}
            {viewMode === 'virtual' && (
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <h3 className="flex items-center text-sm font-medium text-gray-900">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Virtual Scrolling - แสดง {filteredVendors.length.toLocaleString()} รายการ
                    <span className="ml-2 text-xs text-gray-500">(เหมาะสำหรับข้อมูลจำนวนมาก)</span>
                  </h3>
                </div>
                <List
                  ref={listRef}
                  height={600}
                  width="100%"
                  itemCount={filteredVendors.length}
                  itemSize={80}
                  itemData={{
                    vendors: filteredVendors,
                    onSelect: handleVendorSelect
                  }}
                >
                  {VirtualVendorItem}
                </List>
                
                {/* Virtual Scroll Info */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      แสดงทั้งหมด {filteredVendors.length.toLocaleString()} รายการ (Virtual Scrolling)
                    </span>
                    <button
                      onClick={() => setViewMode('table')}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      เปลี่ยนเป็นแบบแบ่งหน้า →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Performance Monitor - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed z-50 max-w-xs p-3 text-xs text-white bg-black rounded-lg bottom-4 right-4">
          <h4 className="mb-2 font-bold">🚀 Performance Monitor</h4>
          <div>Total: {statistics.total.toLocaleString()}</div>
          <div>Loaded: {allVendors.length.toLocaleString()}</div>
          <div>Filtered: {totalItems.toLocaleString()}</div>
          <div>Display: {displayVendors.length}</div>
          <div>Page: {currentPage}/{totalPages}</div>
          <div>View: {viewMode}</div>
          <div>Page Size: {pageSize}</div>
          <div>Cache: {CACHE_TIME / 1000}s</div>
          {allVendors.length < (quickStats?.totalVendors || 0) && (
            <div className="text-yellow-300">Loading from cache...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSMListPage;