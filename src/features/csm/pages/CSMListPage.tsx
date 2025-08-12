// 📁 src/features/csm/pages/CSMListPage.tsx
// Strict TypeScript with Real Firestore Data Only
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Plus, Building2, Calendar, Star, Filter, 
  ChevronDown, RefreshCw, Eye, Edit, ArrowRight, MapPin,
  BarChart3, Users, Clock, AlertTriangle
} from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary } from '../../../types/csm';
import { useCSMData } from '../../../hooks/useCSMData';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';
import { getCategoryInfo, CSM_VENDOR_CATEGORIES } from '../../../types/csm';
import { formatDate } from '../../../utils/dateUtils';
import { safeWorkingAreaDisplay } from '../../../utils/dataValidation';

// =================== TYPES ===================
interface CSMFilterOptions {
  readonly search: string;
  readonly category: string;
  readonly assessmentStatus: 'all' | 'completed' | 'in-progress' | 'not-assessed' | 'expired';
  readonly riskLevel: string;
}

interface CSMListPageProps {
  readonly onSelectVendor?: (vendor: CSMVendor) => void;
}

interface StatisticsData {
  readonly totalVendors: number;
  readonly assessedVendors: number;
  readonly averageScore: number;
  readonly expiredAssessments: number;
}

type AssessmentStatus = 'completed' | 'in-progress' | 'not-assessed' | 'expired';

// =================== MAIN COMPONENT ===================
const CSMListPage: React.FC<CSMListPageProps> = ({ onSelectVendor }) => {
  const [filters, setFilters] = useState<CSMFilterOptions>({
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all'
  });
  
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  const {
    vendors,
    assessmentSummaries,
    loading,
    error,
    loadData,
    refreshData,
    clearError
  } = useCSMData();

  const { toasts, addToast, removeToast } = useToast();
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // =================== EFFECTS ===================
  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (error) {
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: error
      });
      clearError();
    }
  }, [error, addToast, clearError]);

  // =================== HELPER FUNCTIONS ===================
  const getAssessmentSummary = useCallback((vdCode: string): CSMAssessmentSummary | null => {
    return assessmentSummaries.find(summary => summary.vdCode === vdCode) ?? null;
  }, [assessmentSummaries]);

  const getAssessmentStatus = useCallback((_vendor: CSMVendor, summary: CSMAssessmentSummary | null): AssessmentStatus => {
    if (!summary) return 'not-assessed';

    const daysSinceAssessment = Math.floor((Date.now() - summary.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceAssessment > 365) return 'expired';
    if (summary.totalScore === 0) return 'in-progress';
    return 'completed';
  }, []);

  // =================== COMPUTED VALUES ===================
  const filteredVendors = useMemo((): readonly CSMVendor[] => {
    return vendors.filter(vendor => {
      const matchesSearch = debouncedSearch === '' || 
        vendor.vdName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        vendor.vdCode.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
      
      const summary = getAssessmentSummary(vendor.vdCode);
      const assessmentStatus = getAssessmentStatus(vendor, summary);
      const matchesAssessmentStatus = filters.assessmentStatus === 'all' || assessmentStatus === filters.assessmentStatus;
      
      const matchesRiskLevel = filters.riskLevel === 'all' || 
        summary?.riskLevel?.toLowerCase() === filters.riskLevel?.toLowerCase();
      
      return matchesSearch && matchesCategory && matchesAssessmentStatus && matchesRiskLevel;
    });
  }, [vendors, debouncedSearch, filters, getAssessmentSummary, getAssessmentStatus]);

  const totalPages = useMemo((): number => {
    return Math.ceil(filteredVendors.length / itemsPerPage);
  }, [filteredVendors.length, itemsPerPage]);

  const paginatedVendors = useMemo((): readonly CSMVendor[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVendors, currentPage, itemsPerPage]);

  const statistics = useMemo((): StatisticsData => {
    return {
      totalVendors: vendors.length,
      assessedVendors: assessmentSummaries.length,
      averageScore: assessmentSummaries.length > 0 
        ? Math.round(assessmentSummaries.reduce((acc, s) => acc + s.avgScore, 0) / assessmentSummaries.length)
        : 0,
      expiredAssessments: assessmentSummaries.filter(s => 
        getAssessmentStatus({} as CSMVendor, s) === 'expired'
      ).length
    };
  }, [vendors, assessmentSummaries, getAssessmentStatus]);

  // =================== EVENT HANDLERS ===================
  const handleRefresh = useCallback(async (): Promise<void> => {
    try {
      await refreshData();
      addToast({
        type: 'success',
        title: 'รีเฟรชสำเร็จ',
        message: 'ข้อมูลได้รับการอัปเดตเรียบร้อยแล้ว'
      });
    } catch {
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรชข้อมูลได้'
      });
    }
  }, [refreshData, addToast]);

  const handleVendorClick = useCallback((vendor: CSMVendor): void => {
    if (onSelectVendor) {
      onSelectVendor(vendor);
    }
    window.location.href = `/csm/evaluate/${vendor.vdCode}`;
  }, [onSelectVendor]);

  const handleFilterChange = useCallback((key: keyof CSMFilterOptions, value: string): void => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleNavigate = useCallback((url: string): void => {
    window.location.href = url;
  }, []);

  // =================== UTILITY FUNCTIONS ===================
  const getRiskLevelColor = useCallback((riskLevel: string): string => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not-assessed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getStatusText = useCallback((status: string): string => {
    switch (status) {
      case 'completed': return 'ประเมินแล้ว';
      case 'in-progress': return 'กำลังประเมิน';
      case 'not-assessed': return 'ยังไม่ประเมิน';
      case 'expired': return 'หมดอายุ';
      default: return 'ไม่ทราบ';
    }
  }, []);

  // =================== LOADING STATE ===================
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <SkeletonLoader lines={1} className="w-48 h-8" />
          <SkeletonLoader lines={1} className="w-32 h-10" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonLoader key={i} lines={2} className="w-full h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonLoader key={i} lines={8} className="w-full h-64" />
          ))}
        </div>
      </div>
    );
  }

  // =================== EMPTY STATE ===================
  if (vendors.length === 0 && !loading) {
    return (
      <div className="p-6 space-y-6">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        
        <div className="p-12 text-center bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            ไม่พบข้อมูลผู้รับเหมา
          </h3>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            ยังไม่มีข้อมูลผู้รับเหมาในระบบ กรุณาเพิ่มข้อมูลใหม่
          </p>
          <button
            onClick={() => handleNavigate('/csm/vendors/add')}
            className="flex items-center gap-2 px-4 py-2 mx-auto text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            เพิ่มผู้รับเหมาใหม่
          </button>
        </div>
      </div>
    );
  }

  // =================== MAIN RENDER ===================
  return (
    <div className="min-h-screen p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header Section */}
      <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              CSM Vendor Management
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              จัดการและประเมินผู้รับเหมา/คู่ค้า
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleRefresh()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
            
            <button
              onClick={() => handleNavigate('/csm/vendors/add')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้รับเหมา
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ผู้รับเหมาทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.totalVendors}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ประเมินแล้ว</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.assessedVendors}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.averageScore}%</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ต้องประเมินใหม่</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.expiredAssessments}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 bg-white rounded-lg shadow-sm dark:bg-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อบริษัท หรือรหัส..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4" />
            ตัวกรอง
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 pt-4 mt-4 border-t md:grid-cols-3">
            {/* Category Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                หมวดหมู่
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                {CSM_VENDOR_CATEGORIES.map(category => (
                  <option key={category.code} value={category.code}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assessment Status Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                สถานะการประเมิน
              </label>
              <select
                value={filters.assessmentStatus}
                onChange={(e) => handleFilterChange('assessmentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="completed">ประเมินแล้ว</option>
                <option value="in-progress">กำลังประเมิน</option>
                <option value="not-assessed">ยังไม่ประเมิน</option>
                <option value="expired">หมดอายุ</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                ระดับความเสี่ยง
              </label>
              <select
                value={filters.riskLevel}
                onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="low">ต่ำ</option>
                <option value="moderate">ปานกลาง</option>
                <option value="high">สูง</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          แสดง {paginatedVendors.length} จาก {filteredVendors.length} รายการ
        </p>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            แสดงต่อหน้า:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {paginatedVendors.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedVendors.map((vendor) => {
            const summary = getAssessmentSummary(vendor.vdCode);
            const status = getAssessmentStatus(vendor, summary);
            const categoryInfo = getCategoryInfo(vendor.category);
            
            return (
              <div
                key={vendor.vdCode}
                className="transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer dark:bg-gray-800 dark:border-gray-700 hover:shadow-md"
                onClick={() => handleVendorClick(vendor)}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {vendor.vdName}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        รหัส: {vendor.vdCode}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  
                  {/* Category Badge */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${categoryInfo?.color ?? 'bg-gray-100 text-gray-800'}`}>
                      {categoryInfo?.name ?? vendor.category}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Assessment Info */}
                  {summary ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          คะแนนล่าสุด
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {summary.avgScore}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ความเสี่ยง
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getRiskLevelColor(summary.riskLevel)}`}>
                          {summary.riskLevel}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          ประเมินครั้งล่าสุด
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatDate(summary.lastAssessmentDate)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ยังไม่มีการประเมิน
                      </p>
                    </div>
                  )}

                  {/* Working Area */}
                  {(() => {
                    const workingAreaInfo = safeWorkingAreaDisplay(vendor.workingArea, 2);
                    
                    return workingAreaInfo.display && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {workingAreaInfo.display}
                          {workingAreaInfo.hasMore && ` +${workingAreaInfo.totalCount - 2} เพิ่มเติม`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Assessment Frequency */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ประเมินทุก {vendor.freqAss === '1year' ? '1 ปี' : 
                                vendor.freqAss === '2year' ? '2 ปี' : 
                                vendor.freqAss === '4year' ? '4 ปี' : vendor.freqAss}
                    </span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(`/csm/details/${vendor.vdCode}`);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20"
                      >
                        <Eye className="w-3 h-3" />
                        ดูรายละเอียด
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(`/csm/vendors/edit/${vendor.vdCode}`);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50 dark:text-gray-400 dark:border-gray-400 dark:hover:bg-gray-700"
                      >
                        <Edit className="w-3 h-3" />
                        แก้ไข
                      </button>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVendorClick(vendor);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      ประเมิน
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Filtered Empty State */
        <div className="p-12 text-center bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            ไม่พบข้อมูลผู้รับเหมา
          </h3>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            {filters.search || filters.category !== 'all' ? 
              'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา' : 
              'ยังไม่มีข้อมูลผู้รับเหมาในระบบ'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {(filters.search || filters.category !== 'all') && (
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    category: 'all',
                    assessmentStatus: 'all',
                    riskLevel: 'all'
                  });
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                ล้างตัวกรอง
              </button>
            )}
            <button
              onClick={() => handleNavigate('/csm/vendors/add')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              เพิ่มผู้รับเหมาใหม่
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 bg-white rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              แสดงหน้า {currentPage} จาก {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  
                  // Show pages around current page
                  if (totalPages > 5) {
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, start + 4);
                    pageNum = start + i;
                    
                    if (pageNum > end) return null;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Floating Button */}
      <div className="fixed z-50 bottom-6 right-6">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleNavigate('/csm/reports')}
            className="flex items-center justify-center w-12 h-12 text-white transition-colors bg-green-600 rounded-full shadow-lg hover:bg-green-700"
            title="รายงาน"
          >
            <BarChart3 className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => handleNavigate('/csm/vendors/add')}
            className="flex items-center justify-center w-12 h-12 text-white transition-colors bg-blue-600 rounded-full shadow-lg hover:bg-blue-700"
            title="เพิ่มผู้รับเหมา"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSMListPage;