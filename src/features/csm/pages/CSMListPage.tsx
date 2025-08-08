// 📁 src/features/csm/pages/CSMListPage.tsx 
//  npm install lucide-react
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
//import { usePagination } from '../../../components/hooks/usePagination';
import { Search, Plus, Building2, Calendar, Star, TrendingUp, Filter, ChevronDown,  RefreshCw } from 'lucide-react';
import type { Company, CsmAssessmentSummary, CSMFilterOptions , PaginationState  } from '../../../types/types';
import csmService from '../../../services/csmService';
import { formatDate } from '../../../components/utils/dateUtils';
import { useTheme } from '../../../components/ui/ThemeContext';
import { useToast } from '../../../components/hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader, CardSkeleton } from '../../../components/ui/SkeletonLoader';
import { AdvancedSearchModal } from '../../../components/modals/AdvancedSearchModal';
import { useKeyboardShortcuts } from '../../../components/hooks/useKeyboardShortcuts';
import { useAccessibility } from '../../../components/hooks/useAccessibility';


interface CSMListPageProps {
  onSelectCompany?: (company: Company) => void;
}

const CSMListPage: React.FC<CSMListPageProps> = ({ onSelectCompany }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assessmentSummaries, setAssessmentSummaries] = useState<CsmAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // เพิ่ม state สำหรับ infinite scroll
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  //const [error, setError] = useState<string | null>(null);
  
  const { theme, toggleTheme } = useTheme();
  const { toasts, addToast, removeToast } = useToast();
  const { announce } = useAccessibility();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  useKeyboardShortcuts();
  // เพิ่ม theme toggle button ใน header
  const handleThemeToggle = () => {
    toggleTheme();
    announce(`เปลี่ยนเป็นโหมด ${theme === 'light' ? 'Dark' : 'Light'} แล้ว`);
  };

 
 // เพิ่ม infinite scroll function
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const result = await csmService.assessments.getLatestByCompany(6, lastVisible);
      setAssessmentSummaries(prev => [...prev, ...result.summaries]);
      setHasMore(result.hasMore);
      setLastVisible(result.lastVisible);
    } catch (error) {
      console.error('Error loading more assessments:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [lastVisible, hasMore, loadingMore]);

  // เพิ่ม intersection observer สำหรับ infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, loadMore]);

  // Filter states
  const [filters, setFilters] = useState<CSMFilterOptions>({
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    dateRange: 'this-year'
  });

const getActiveFiltersCount = useCallback(() => {
  let count = 0;
  if (filters.search) count++;
  if (filters.category !== 'all') count++;
  if (filters.assessmentStatus !== 'all') count++;
  if (filters.riskLevel !== 'all') count++;
  if (filters.dateRange !== 'this-year') count++;
  return count;
}, [filters]);  

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
    companiesAssessed: 0,
    averageScore: 0
  });

  // ดึงข้อมูลเริ่มต้น
  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadData();
  }, [filters.assessmentStatus, filters.dateRange, filters.riskLevel]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [companiesData, summariesData, statsData] = await Promise.all([
        csmService.companies.getAll(),
        csmService.assessments.getLatestByCompany(),
        csmService.assessments.getStatistics()
      ]);

      setCompanies(companiesData);
      setAssessmentSummaries(summariesData.summaries);
      setHasMore(summariesData.hasMore);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ดึงข้อมูลการประเมินล่าสุดของบริษัท
  const getAssessmentSummary = useCallback((vdCode: string): CsmAssessmentSummary | null => {
    return assessmentSummaries.find(summary => summary.vdCode === vdCode) || null;
  }, [assessmentSummaries]);

  // ฟังก์ชันกำหนดสถานะการประเมิน
  const getAssessmentStatus = useCallback((company: Company, summary: CsmAssessmentSummary | null) => {
    if (!summary) {
      return 'not-assessed' ;

    }
    company.name = company.name.toLowerCase(); //ใส่ไว้เฉยๆ

    const currentYear = new Date().getFullYear();
    const assessmentYear = summary.lastAssessmentDate.getFullYear();
    
    // ตรวจสอบว่าหมดอายุหรือไม่ (เกิน 1 ปี)
    const daysSinceAssessment = Math.floor((Date.now() - summary.lastAssessmentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceAssessment > 365) {
      return 'expired';
    }
    
    if (assessmentYear < currentYear) {
      return 'not-assessed'; // ยังไม่ประเมินในปีนี้
    }

    // ตรวจสอบความครบถ้วน
    if (summary.totalScore === 0) {
      return 'in-progress';
    }

    return 'completed';
  }, []);

  // กรองและแบ่งหน้าข้อมูล
  const filteredAndPaginatedData = useMemo(() => {
    let filtered = companies.filter(company => {
      // ค้นหาชื่อบริษัทหรือรหัส
      const matchesSearch = filters.search === '' || 
        company.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        company.vdCode.toLowerCase().includes(filters.search.toLowerCase());
      
      // กรองตามหมวดหมู่
      const matchesCategory = filters.category === 'all' || company.category === filters.category;
      
      // กรองตามสถานะการประเมิน
      const summary = getAssessmentSummary(company.vdCode);
      const assessmentStatus = getAssessmentStatus(company, summary);
      const matchesAssessmentStatus = filters.assessmentStatus === 'all' || assessmentStatus === filters.assessmentStatus;
      
      // กรองตามระดับความเสี่ยง
      const matchesRiskLevel = filters.riskLevel === 'all' || 
        (summary && summary.riskLevel.toLowerCase() === filters.riskLevel.toLowerCase());
      
      // กรองตามช่วงเวลา/*
      /*
      let matchesDateRange = true;
      if (summary && filters.dateRange !== 'all') {
        const assessmentYear = summary.lastAssessmentDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        switch (filters.dateRange) {
          case 'this-year':
            matchesDateRange = assessmentYear === currentYear;
            break;
          case 'last-year':
            matchesDateRange = assessmentYear === currentYear - 1;
            break;
        }
      }
      */
      
      return matchesSearch && matchesCategory && matchesAssessmentStatus && matchesRiskLevel ;//&& matchesDateRange;
    });

    // อัปเดต pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages
    }));

    return paginatedData;
  }, [companies, filters, pagination.currentPage, pagination.itemsPerPage, assessmentSummaries, getAssessmentSummary, getAssessmentStatus]);

  
  // กำหนดสีตามระดับความเสี่ยง
  const getRiskLevelColor = (riskLevel: 'Low' | 'Moderate' | 'High' | ''): string => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // กำหนดสีตามสถานะการประเมิน
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'not-assessed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'ประเมินเสร็จสิ้น';
      case 'in-progress': return 'อยู่ระหว่างประเมิน';
      case 'not-assessed': return 'ยังไม่ได้ประเมิน';
      case 'expired': return 'หมดอายุ';
      default: return 'ไม่ทราบสถานะ';
    }
  };

// function สำหรับจัดการ advanced search filters
const handleAdvancedSearch = useCallback((newFilters: CSMFilterOptions) => {
  // อัปเดตตัวกรองหลัก
  setFilters(prev => ({
    ...prev,
    ...newFilters
  }));  
  // รีเซ็ตหน้าไปหน้าแรก
  setPagination(prev => ({ 
    ...prev, 
    currentPage: 1 
  }));  
  // แสดง toast notification
  addToast({
    title: 'ใช้ตัวกรอง',
    message: 'ใช้ตัวกรองขั้นสูงเรียบร้อยแล้ว',
    type: 'info'
  });  
  // ปิด modal
  setShowAdvancedSearch(false);
}, [addToast]);


// เพิ่ม function สำหรับรีเซ็ตตัวกรอง
const handleResetFilters = useCallback(() => {
  const defaultFilters: CSMFilterOptions = {
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    dateRange: 'this-year'
  };
  
  setFilters(defaultFilters);
  setPagination(prev => ({ 
    ...prev, 
    currentPage: 1 
  }));
  
  addToast({
    title: 'รีเซ็ตตัวกรอง',
    message: 'รีเซ็ตตัวกรองเรียบร้อยแล้ว',
    type: 'info'
  });
}, [addToast]);

  // จัดการการเลือกบริษัท
  const handleSelectCompany = (company: Company) => {
    if (onSelectCompany) {
      onSelectCompany(company);
    } else {
      window.location.href = `/csm/evaluate?vdCode=${company.vdCode}`;
    }
  };

  // จัดการการเปลี่ยนหน้า
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // จัดการการเปลี่ยนจำนวนรายการต่อหน้า
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setPagination(prev => ({ 
      ...prev, 
      itemsPerPage, 
      currentPage: 1 
    }));
  };

  // เพิ่ม toast notifications
  const handleRefresh = async () => {
    try {
      await refreshData();
      addToast({
        title: 'สำเร็จ',
        message: 'รีเฟรชข้อมูลเรียบร้อยแล้ว',
        type: 'success'
      });
    } catch (error) {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรชข้อมูลได้',
        type: 'error'
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SkeletonLoader lines={2} className="mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* เพิ่ม theme toggle ใน header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                CSM Assessment System
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                ระบบประเมินการจัดการความปลอดภัยของผู้รับเหมา
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-3">
              <button
                onClick={handleThemeToggle}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label={`เปลี่ยนเป็นโหมด ${theme === 'light' ? 'Dark' : 'Light'}`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
                {theme === 'light' ? 'Dark' : 'Light'}
              </button>
              {/* 
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              ><Filter className="w-5 h-5 mr-2" />
                ค้นหาขั้นสูง
              </button>
              */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              <button onClick={() => window.location.href = '/admin/forms'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
              <Plus className="w-4 h-4" />จัดการแบบฟอร์ม
              </button>  

            </div>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />     

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onApplyFilters={handleAdvancedSearch}
      />
             
      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">บริษัททั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">การประเมินใช้งานอยู่</p>
                <p className="text-2xl font-bold text-green-600">{statistics.activeAssessments}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">บริษัทที่ประเมินแล้ว</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.companiesAssessed}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">คะแนนเฉลี่ย</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.averageScore.toFixed(1)}</p>
              </div>
              <Star className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อบริษัท หรือรหัส VD..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                ตัวกรอง
                {getActiveFiltersCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getActiveFiltersCount()}
                  </span>
                )}                
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">ทั้งหมด</option>                      
                      <option value="1">1-งานบริหาร</option>
                      <option value="2">2-งานบริการ</option>
                      <option value="3">3-งานโครงสร้าง</option>
                      <option value="4">4-งานขนส่ง</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะการประเมิน</label>
                    <select
                      value={filters.assessmentStatus}
                      onChange={(e) => setFilters(prev => ({ ...prev, assessmentStatus: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="completed">ประเมินเสร็จสิ้น</option>
                      <option value="in-progress">อยู่ระหว่างประเมิน</option>
                      <option value="not-assessed">ยังไม่ได้ประเมิน</option>
                      <option value="expired">หมดอายุ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ระดับความเสี่ยง</label>
                    <select
                      value={filters.riskLevel}
                      onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">ทั้งหมด</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>


                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            แสดง {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} 
            จาก {pagination.totalItems} รายการ
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">แสดงต่อหน้า:</label>
            <select
              value={pagination.itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        {filteredAndPaginatedData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredAndPaginatedData.map((company, index) => {
              const summary = getAssessmentSummary(company.vdCode);
              const status = getAssessmentStatus(company, summary);              
              return (
                <div 
                  key={company.companyId}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectCompany(company) }
                  ref={index === filteredAndPaginatedData.length - 1 ? lastElementRef : null}
                >
                  <div className="p-6">
                    {/* Company Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.name}</h3>
                        <p className="text-sm text-gray-600">รหัส: {company.vdCode}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {company.category && (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {company.category}
                            </span>
                          )}
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {getStatusLabel(status)}
                          </span>
                        </div>
                      </div>
                      <Building2 className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Assessment Summary */}
                    {summary ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">ประเมินล่าสุด:</span>
                          <span className="text-sm font-medium">
                            {formatDate(summary.lastAssessmentDate)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">คะแนน:</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-blue-600">
                              {summary.totalScore.toFixed(1)}
                            </span>
                            <div className="text-xs text-gray-500">
                              เฉลี่ย: {summary.avgScore.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">ระดับความเสี่ยง:</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(summary.riskLevel)}`}>
                            {summary.riskLevel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Empty State */
                        <div className="text-center py-4">
                        <p className="text-gray-500 text-sm mb-2">ยังไม่มีการประเมิน</p>
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          <Plus className="w-3 h-3 mr-1" />
                          เริ่มประเมิน
                        </span>
                      </div>                      
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="border-t bg-gray-50 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        คลิกเพื่อประเมินหรือดูรายละเอียด
                      </span>
                      <div className="flex items-center text-blue-600">
                        <span className="text-sm font-medium">เลือก</span>
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบบริษัทที่ตรงกับเงื่อนไข</h3>
            <p className="text-gray-600 mb-4">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleResetFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                รีเซ็ตตัวกรอง
              </button>
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                ค้นหาขั้นสูง
              </button>
            </div>
          </div>
          
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                หน้า {pagination.currentPage} จาก {pagination.totalPages}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          page === pagination.currentPage 
                            ? 'bg-blue-600 text-white' 
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSMListPage;