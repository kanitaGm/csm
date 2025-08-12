// 📁 src/features/csm/pages/CSMListPage.tsx 
// Fixed version to prevent infinite loops and duplicate keys
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Building2, Calendar, Star, TrendingUp, Filter, ChevronDown, RefreshCw } from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary, PaginationState } from '../../../types';
import { vendorsService } from '../../../services/csmService';
import { formatDate } from '../../../utils/dateUtils';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader, CardSkeleton } from '../../../components/ui/SkeletonLoader';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useAccessibility } from '../../../hooks/useAccessibility';
import { getCategoryInfo, CSM_VENDOR_CATEGORIES } from '../../../types/csm';

// Define CSM-specific filter options
interface CSMFilterOptions {
  search: string;
  category: string;
  assessmentStatus: 'all' | 'completed' | 'in-progress' | 'not-assessed' | 'expired';
  riskLevel: string;
  dateRange: 'all' | 'this-year' | 'last-year' | 'custom';
}

interface CSMListPageProps {
  onSelectVendor?: (vendor: CSMVendor) => void;
}

const CSMListPage: React.FC<CSMListPageProps> = ({ onSelectVendor }) => {
  // Updated state to use CSMVendor instead of Company
  const [vendors, setVendors] = useState<CSMVendor[]>([]);
  const [assessmentSummaries, setAssessmentSummaries] = useState<CSMAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Add refs to track loading states and prevent multiple calls
  const isLoadingVendors = useRef(false);
  const isLoadingAssessments = useRef(false);
  const hasInitialized = useRef(false);
  
  const { theme, toggleTheme } = useTheme();
  const { toasts, addToast, removeToast } = useToast();  
  const { announce } = useAccessibility();
  
  useKeyboardShortcuts();

  // Filter states - using CSM-specific filter options
  const [filters, setFilters] = useState<CSMFilterOptions>({
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    dateRange: 'this-year'
  });

  // Pagination states
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 6,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: true,
    hasPrevPage: true,
  });

  const [statistics, setStatistics] = useState({
    totalAssessments: 0,
    activeAssessments: 0,
    vendorsAssessed: 0,
    averageScore: 0
  });

  // Fixed fetchVendors function with proper error handling and loading guards
  const fetchVendors = useCallback(async (loadMore = false) => {
    // Prevent multiple simultaneous calls
    if (isLoadingVendors.current) return;
    
    try {
      isLoadingVendors.current = true;
      
      if (!loadMore) setLoading(true);
      else setLoadingMore(true);

      try {
        const vendorData = await vendorsService.getAll();
        
        if (loadMore) {
          setVendors(prev => [...prev, ...vendorData]);
        } else {
          setVendors(vendorData);
        }

        setPagination(prev => ({
          ...prev,
          totalItems: vendorData.length,
          totalPages: Math.ceil(vendorData.length / prev.itemsPerPage)
        }));

        // Only show success toast if not initial load
        if (hasInitialized.current) {
          addToast({
            id: `success-${Date.now()}-${Math.random()}`,
            type: 'success',
            title: 'โหลดข้อมูลสำเร็จ',
            message: `โหลดข้อมูล ${vendorData.length} รายการเรียบร้อย`
          });
        }

      } catch (serviceError) {
        console.warn('Index error, falling back to simple query:', serviceError);

        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('../../../config/firebase');

        const querySnapshot = await getDocs(
          query(
            collection(db, 'csmVendors'),
            where('isActive', '==', true)
          )
        );

        const vendorData: CSMVendor[] = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<CSMVendor, 'id'>),
          }))
          .sort((a, b) => (a.vdName || '').localeCompare(b.vdName || ''));

        if (loadMore) {
          setVendors(prev => [...prev, ...vendorData]);
        } else {
          setVendors(vendorData);
        }

        setPagination(prev => ({
          ...prev,
          totalItems: vendorData.length,
          totalPages: Math.ceil(vendorData.length / prev.itemsPerPage)
        }));

        // Only show success toast if not initial load
        if (hasInitialized.current) {
          addToast({
            id: `success-fallback-${Date.now()}-${Math.random()}`,
            type: 'success',
            title: 'โหลดข้อมูลสำเร็จ',
            message: `โหลดข้อมูล ${vendorData.length} รายการเรียบร้อย (Fallback mode)`
          });
        }
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      
      // Only show error toast if not initial load or if it's a critical error
      if (hasInitialized.current) {
        addToast({
          id: `error-${Date.now()}-${Math.random()}`,
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: 'เกิดข้อผิดพลาดในการโหลดข้อมูル กรุณาลองใหม่อีกครั้ง'
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingVendors.current = false;
    }
  }, []); // Remove addToast from dependencies to prevent loops

  // Fixed fetchAssessmentSummaries function
  const fetchAssessmentSummaries = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingAssessments.current) return;
    
    try {
      isLoadingAssessments.current = true;
      
      const summaries: CSMAssessmentSummary[] = [];
      setAssessmentSummaries(summaries);
      setStatistics({
        totalAssessments: summaries.length,
        activeAssessments: summaries.filter(s => s.riskLevel !== '').length,
        vendorsAssessed: summaries.length,
        averageScore: summaries.reduce((acc, s) => acc + s.avgScore, 0) / (summaries.length || 1)
      });
    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
    } finally {
      isLoadingAssessments.current = false;
    }
  }, []);

  // Load data on component mount - ONLY ONCE
  useEffect(() => {
    if (hasInitialized.current) return; // Prevent multiple initializations
    
    const loadData = async () => {
      hasInitialized.current = true;
      
      try {
        await Promise.all([
          fetchVendors(false),
          fetchAssessmentSummaries()
        ]);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };
    
    loadData();
  }, []); // Empty dependency array - run only once

  // Helper to get assessment summary by vendor code
  const getAssessmentSummary = useCallback((vdCode: string): CSMAssessmentSummary | null => {
    return assessmentSummaries.find(summary => summary.vdCode === vdCode) || null;
  }, [assessmentSummaries]);

  // Updated to work with CSMVendor instead of Company
  const getAssessmentStatus = useCallback((_vendor: CSMVendor, summary: CSMAssessmentSummary | null) => {
    if (!summary) {
      return 'not-assessed';      
    }

    const currentYear = new Date().getFullYear();
    const assessmentYear = summary.lastAssessmentDate.getFullYear();
    
    // ตรวจสอบว่าหมดอายุหรือไม่ (เกิน 1 ปี)
    const daysSinceAssessment = Math.floor((Date.now() - summary.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceAssessment > 365) {
      return 'expired';
    }
    
    if (assessmentYear < currentYear) {
      return 'not-assessed';
    }

    if (summary.totalScore === 0) {
      return 'in-progress';
    }

    return 'completed';
  }, []);

  // Updated filtering logic for CSMVendor
  const filteredData = useMemo(() => {
    return vendors.filter(vendor => {
      // ค้นหาชื่อบริษัทหรือรหัส vendor
      const matchesSearch = filters.search === '' || 
        vendor.vdName.toLowerCase().includes(filters.search.toLowerCase()) ||
        vendor.vdCode.toLowerCase().includes(filters.search.toLowerCase());
      
      // กรองตามหมวดหมู่
      const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
      
      // กรองตามสถานะการประเมิน
      const summary = getAssessmentSummary(vendor.vdCode);
      const assessmentStatus = getAssessmentStatus(vendor, summary);
      const matchesAssessmentStatus = filters.assessmentStatus === 'all' || assessmentStatus === filters.assessmentStatus;
      
      // กรองตามระดับความเสี่ยง
      const matchesRiskLevel = filters.riskLevel === 'all' ||         
        (summary?.riskLevel?.toLowerCase() === (filters.riskLevel?.toLowerCase() || ''));
      
      return matchesSearch && matchesCategory && matchesAssessmentStatus && matchesRiskLevel;
    });
  }, [vendors, filters, getAssessmentSummary, getAssessmentStatus]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, pagination.currentPage, pagination.itemsPerPage]);

  // Refresh data - with proper loading guards
  const handleRefresh = useCallback(async () => {
    if (refreshing || isLoadingVendors.current || isLoadingAssessments.current) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchVendors(false),
        fetchAssessmentSummaries()
      ]);
      
      addToast({
        id: `refresh-success-${Date.now()}`,
        type: 'success',
        title: 'รีเฟรชสำเร็จ',
        message: 'ข้อมูลได้รับการอัปเดตเรียบร้อยแล้ว'
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      addToast({
        id: `refresh-error-${Date.now()}`,
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'เกิดข้อผิดพลาดในการรีเฟรชข้อมูล'
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchVendors, fetchAssessmentSummaries, addToast]);

  // Handle vendor selection
  const handleVendorClick = useCallback((vendor: CSMVendor) => {
    if (onSelectVendor) {
      onSelectVendor(vendor);
    }
    // Navigate to evaluation page
    window.location.href = `/csm/e/${vendor.vdCode}`;
  }, [onSelectVendor]);

  // Theme toggle
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
    announce(`เปลี่ยนเป็นโหมด ${theme === 'light' ? 'มืด' : 'สว่าง'}`);
  }, [toggleTheme, theme, announce]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((filterType: keyof CSMFilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, []);

  // Get risk level badge color
  const getRiskLevelColor = useCallback((riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Get status badge color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'not-assessed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Get status text
  const getStatusText = useCallback((status: string) => {
    switch (status) {
      case 'completed': return 'ประเมินแล้ว';
      case 'in-progress': return 'กำลังประเมิน';
      case 'expired': return 'หมดอายุ';
      case 'not-assessed': return 'ยังไม่ประเมิน';
      default: return 'ไม่ทราบสถานะ';
    }
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !isLoadingVendors.current) {
      fetchVendors(true);
    }
  }, [loadingMore, fetchVendors]);

  if (loading) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <div className="mb-8">
          <SkeletonLoader className="w-64 h-8 mb-4" />
          <SkeletonLoader className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            รายการ Vendors สำหรับ CSM
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            จัดการและประเมิน vendors ทั้งหมด ({filteredData.length} รายการ)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleThemeToggle}
            className="p-2 transition-colors border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            title="เปลี่ยนธีม"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>

          <button
            onClick={() => window.location.href = '/csm/vd/add'}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            เพิ่ม Vendor
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white border rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ประเมินแล้ว</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.vendorsAssessed}</p>
            </div>
            <Star className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.averageScore.toFixed(1)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="p-6 bg-white border rounded-lg shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ประเมินปีนี้</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics.activeAssessments}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 space-y-4 bg-white border rounded-lg shadow-sm dark:bg-gray-800">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อ vendor หรือรหัส..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700"
        >
          <Filter className="w-4 h-4" />
          ตัวกรอง
          <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 pt-4 border-t md:grid-cols-4">
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
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                ช่วงเวลา
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="this-year">ปีนี้</option>
                <option value="last-year">ปีที่แล้ว</option>
                <option value="all-time">ทั้งหมด</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paginatedData.map((vendor) => {
          const summary = getAssessmentSummary(vendor.vdCode);
          const status = getAssessmentStatus(vendor, summary);
          const categoryInfo = getCategoryInfo(vendor.category);

          return (
            <div
              key={`vendor-${vendor.id}`} // Fixed key to prevent duplicates
              onClick={() => handleVendorClick(vendor)}
              className="transition-shadow bg-white border rounded-lg shadow-sm cursor-pointer dark:bg-gray-800 hover:shadow-md"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {vendor.vdName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      รหัส: {vendor.vdCode}
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </span>
                </div>

                {/* Category */}
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo?.color || 'bg-gray-100 text-gray-800'}`}>
                    {categoryInfo?.name || vendor.category}
                  </span>
                </div>

                {/* Assessment Info */}
                {summary && (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">ประเมินล่าสุด:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(summary.lastAssessmentDate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">คะแนนเฉลี่ย:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {summary.avgScore.toFixed(1)}/5
                      </span>
                    </div>
                    {summary.riskLevel && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">ความเสี่ยง:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(summary.riskLevel)}`}>
                          {summary.riskLevel}
                        </span>
                      </div>
                    )}
                  </div>
                )}













                {/* Working Areas */}
                {vendor.workingArea && vendor.workingArea.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">พื้นที่ทำงาน:</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.workingArea.slice(0, 3).map((area, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300"
                        >
                          {area}
                        </span>
                      ))}
                      {vendor.workingArea.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300">
                          +{vendor.workingArea.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Frequency */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  รอบประเมิน: {vendor.freqAss}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="py-12 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-2 text-gray-600 dark:text-gray-400">ไม่พบ vendor ที่ตรงกับเงื่อนไขการค้นหา</p>
          <button
            onClick={() => setFilters({
              search: '',
              category: 'all',
              assessmentStatus: 'all',
              riskLevel: 'all',
              dateRange: 'this-year'
            })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Pagination */}
      {filteredData.length > pagination.itemsPerPage && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border rounded-lg dark:bg-gray-800">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            แสดง {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} ถึง{' '}
            {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredData.length)} จาก{' '}
            {filteredData.length} รายการ
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            
            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm rounded-md ${
                      pagination.currentPage === pageNum
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
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* Load More Button for Infinite Scroll */}
      {loadingMore && (
        <div className="text-center">
          <button
            onClick={() => fetchVendors(true)}
            disabled={loadingMore}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CSMListPage;