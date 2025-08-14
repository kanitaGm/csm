// 📁 src/features/csm/pages/CSMListPage.tsx
// Enhanced CSM List Page with Performance Optimization
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Search,  Grid3X3, List, Download, Plus, 
  AlertTriangle, Clock, CheckCircle, Building2,
  Eye,  FileText, 
} from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../hooks/useToast';
import  csmService  from '../../../services/csmService';
import  { exportVendorsToExcel } from '../../../utils/exportUtils';
import type { CSMVendor, CSMAssessmentSummary } from '../../../types/csm';

// Types
interface FilterState {
  search: string;
  category: string;
  assessmentStatus: 'all' | 'not-assessed' | 'in-progress' | 'completed' | 'overdue' | 'due-soon';
  riskLevel: 'all' | 'Low' | 'Medium' | 'High';
  needsAssessment: boolean;
}

type ViewMode = 'card' | 'table';
type AssessmentStatus = 'not-assessed' | 'in-progress' | 'completed' | 'overdue' | 'due-soon';

interface VendorWithStatus extends CSMVendor {
  assessmentStatus: AssessmentStatus;
  summary?: CSMAssessmentSummary;
  daysUntilDue?: number;
  lastAssessmentDate?: Date;
}

// Components
const StatusBadge: React.FC<{ status: AssessmentStatus }> = ({ status }) => {
  const configs = {
    'not-assessed': { 
      color: 'bg-gray-100 text-gray-800', icon: '❓', text: 'ยังไม่ประเมิน', className: 'animate-pulse' },
    'in-progress': { 
      color: 'bg-blue-100 text-blue-800', icon: '⏳', text: 'กำลังประเมิน',className: 'animate-pulse' },
    'completed': { 
      color: 'bg-green-100 text-green-800', icon: '✅', text: 'เสร็จสิ้น' , className: 'animate-pulse' },
    'overdue': { 
      color: 'bg-red-100 text-red-800', icon: '🚨', text: 'เกินกำหนด',   className: 'animate-pulse'  },
    'due-soon': { 
      color: 'bg-yellow-100 text-yellow-800', icon: '⚠️', text: 'ใกล้ครบ', className: 'animate-pulse' }
  };
  
  const config = configs[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.className || ''}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  );
};

const VendorCard: React.FC<{ 
  vendor: VendorWithStatus; 
  onEvaluate: (vdCode: string) => void;
  onViewDetails: (vendor: CSMVendor) => void;
}> = ({ vendor, onEvaluate, onViewDetails }) => (
  <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-100">
    <div className="flex justify-between items-start mb-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 truncate" title={vendor.vdName}>
          {vendor.vdName}
        </h3>
        <p className="text-sm text-gray-500 mt-1">{vendor.vdCode}</p>
        <p className="text-xs text-gray-400 mt-1">{vendor.category}</p>
      </div>
      <div className="ml-4 flex flex-col items-end space-y-2">
        <StatusBadge status={vendor.assessmentStatus} />
        {vendor.daysUntilDue !== undefined && vendor.daysUntilDue <= 30 && (
          <span className="text-xs text-orange-600 font-medium">
            {vendor.daysUntilDue > 0 ? `${vendor.daysUntilDue} วันเหลือ` : `เกิน ${Math.abs(vendor.daysUntilDue)} วัน`}
          </span>
        )}
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
      <div>
        <span className="text-gray-500">ความถี่:</span>
        <span className="ml-2 font-medium">{vendor.freqAss || '-'} วัน</span>
      </div>
      <div>
        <span className="text-gray-500">คะแนนล่าสุด:</span>
        <span className="ml-2 font-medium">
          {vendor.summary?.avgScore ? `${vendor.summary.avgScore}%` : '-'}
        </span>
      </div>
      <div>
        <span className="text-gray-500">ระดับเสี่ยง:</span>
        <span className={`ml-2 font-medium ${
          vendor.summary?.riskLevel === 'High' ? 'text-red-600' :
          vendor.summary?.riskLevel === 'Medium' ? 'text-yellow-600' :
          vendor.summary?.riskLevel === 'Low' ? 'text-green-600' : ''
        }`}>
          {vendor.summary?.riskLevel || '-'}
        </span>
      </div>
      <div>
        <span className="text-gray-500">ประเมินล่าสุด:</span>
        <span className="ml-2 font-medium">
          {vendor.lastAssessmentDate ? 
            vendor.lastAssessmentDate.toLocaleDateString('th-TH') : '-'
          }
        </span>
      </div>
    </div>
    
    <div className="flex space-x-2">
      <button 
        onClick={() => onEvaluate(vendor.vdCode)}
        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
      >
        <FileText className="w-4 h-4 mr-1" />
        ประเมิน
      </button>
      <button 
        onClick={() => onViewDetails(vendor)}
        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center"
      >
        <Eye className="w-4 h-4 mr-1" />
        รายละเอียด
      </button>
    </div>
  </div>
);

const VendorTableRow: React.FC<{ 
  vendor: VendorWithStatus; 
  onEvaluate: (vdCode: string) => void;
  onViewDetails: (vendor: CSMVendor) => void;
}> = ({ vendor, onEvaluate, onViewDetails }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-10 w-10">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-gray-900">{vendor.vdName}</div>
          <div className="text-sm text-gray-500">{vendor.vdCode}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className="text-sm text-gray-900">{vendor.category}</span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <StatusBadge status={vendor.assessmentStatus} />
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {vendor.summary?.avgScore ? `${vendor.summary.avgScore}%` : '-'}
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`text-sm font-medium ${
        vendor.summary?.riskLevel === 'High' ? 'text-red-600' :
        vendor.summary?.riskLevel === 'Medium' ? 'text-yellow-600' :
        vendor.summary?.riskLevel === 'Low' ? 'text-green-600' : 'text-gray-500'
      }`}>
        {vendor.summary?.riskLevel || '-'}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {vendor.lastAssessmentDate ? vendor.lastAssessmentDate.toLocaleDateString('th-TH') : '-'}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
      <div className="flex space-x-2">
        <button
          onClick={() => onEvaluate(vendor.vdCode)}
          className="text-blue-600 hover:text-blue-900 transition-colors"
          title="ประเมิน"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewDetails(vendor)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="ดูรายละเอียด"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
);

// Main Component
const CSMListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    needsAssessment: false
  });
  
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // Data fetching with React Query
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['csm-vendors'],
    queryFn: () => csmService.vendors.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
  
  const { data: assessmentSummaries = [] } = useQuery({
    queryKey: ['csm-assessment-summaries'],
    queryFn: () => csmService.assessmentSummaries.getAll(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Calculate assessment status
  const getAssessmentStatus = useCallback((vendor: CSMVendor, summary: CSMAssessmentSummary | null): AssessmentStatus => {
    if (!summary) return 'not-assessed';
    
    const now = new Date();
    const lastDate = new Date(summary.lastAssessmentDate);
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = parseInt(vendor.freqAss) || 365; // default 1 year
    
    if (daysDiff > frequency + 30) return 'overdue';
    if (daysDiff > frequency - 30 && daysDiff <= frequency) return 'due-soon';
    if (daysDiff > frequency) return 'overdue';
    if (!summary.completedQuestions || summary.completedQuestions < summary.totalQuestions) return 'in-progress';
    return 'completed';
  }, []);
  
  // Process vendors with status
  const processedVendors = useMemo((): VendorWithStatus[] => {
    return vendors.map(vendor => {
      const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
      const assessmentStatus = getAssessmentStatus(vendor, summary || null);
      
      let daysUntilDue: number | undefined;
      let lastAssessmentDate: Date | undefined;
      
      if (summary) {
        lastAssessmentDate = new Date(summary.lastAssessmentDate);
        const now = new Date();
        const frequency = parseInt(vendor.freqAss) || 365;
        const nextDueDate = new Date(lastAssessmentDate.getTime() + frequency * 24 * 60 * 60 * 1000);
        daysUntilDue = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      return {
        ...vendor,
        assessmentStatus,
        summary: summary || undefined,
        daysUntilDue,
        lastAssessmentDate
      };
    });
  }, [vendors, assessmentSummaries, getAssessmentStatus]);
  
  // Filtered vendors
  const filteredVendors = useMemo((): VendorWithStatus[] => {
    return processedVendors.filter(vendor => {
      const matchesSearch = debouncedSearch === '' || 
        vendor.vdName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        vendor.vdCode.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
      const matchesAssessmentStatus = filters.assessmentStatus === 'all' || vendor.assessmentStatus === filters.assessmentStatus;
      const matchesRiskLevel = filters.riskLevel === 'all' || vendor.summary?.riskLevel === filters.riskLevel;
      const matchesNeedsAssessment = !filters.needsAssessment || 
        ['due-soon', 'overdue', 'not-assessed'].includes(vendor.assessmentStatus);
      
      return matchesSearch && matchesCategory && matchesAssessmentStatus && matchesRiskLevel && matchesNeedsAssessment;
    });
  }, [processedVendors, debouncedSearch, filters]);
  
  // Virtual list for performance
  const virtualizer = useVirtualizer({
    count: filteredVendors.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'card' ? 200 : 80),
    overscan: 5,
  });
  
  // Statistics
  const statistics = useMemo(() => {
    const total = processedVendors.length;
    const assessed = processedVendors.filter(v => v.assessmentStatus === 'completed').length;
    const overdue = processedVendors.filter(v => v.assessmentStatus === 'overdue').length;
    const dueSoon = processedVendors.filter(v => v.assessmentStatus === 'due-soon').length;
    const avgScore = assessmentSummaries.length > 0 
      ? Math.round(assessmentSummaries.reduce((sum, s) => sum + s.avgScore, 0) / assessmentSummaries.length)
      : 0;
    
    return { total, assessed, overdue, dueSoon, avgScore };
  }, [processedVendors, assessmentSummaries]);
  
  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(vendors.map(v => v.category))].filter(Boolean);
    return cats.sort();
  }, [vendors]);
  
  // Event handlers
  const handleEvaluate = useCallback((vdCode: string) => {
    navigate(`/csm/e/${vdCode}`);
  }, [navigate]);
  
  const handleViewDetails = useCallback((vendor: CSMVendor) => {
    navigate(`/csm/vendors/${vendor.id}`);
  }, [navigate]);
  
  const handleExport = useCallback(() => {
    try {
      exportVendorsToExcel(filteredVendors, []);
      addToast({
        type: 'success',
        title: 'ส่งออกสำเร็จ',
        message: 'ข้อมูลผู้รับเหมาถูกส่งออกเป็น Excel แล้ว'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถส่งออกข้อมูลได้'
      });
    }
  }, [filteredVendors, addToast]);
  
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  if (vendorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ผู้รับเหมา CSM</h1>
            <p className="text-gray-600 mt-1">จัดการและประเมินผู้รับเหมาทั้งหมด</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              ส่งออก Excel
            </button>
            <button
              onClick={() => navigate('/csm/vendors/add')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้รับเหมา
            </button>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">ทั้งหมด</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">ประเมินแล้ว</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.assessed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">ใกล้ครบ</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.dueSoon}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">เกินกำหนด</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.overdue}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">คะแนนเฉลี่ย</p>
                <p className="text-2xl font-semibold text-gray-900">{statistics.avgScore}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสผู้รับเหมา..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* Assessment Status Filter */}
          <div>
            <select
              value={filters.assessmentStatus}
              onChange={(e) => updateFilter('assessmentStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="not-assessed">ยังไม่ประเมิน</option>
              <option value="in-progress">กำลังประเมิน</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="due-soon">ใกล้ครบกำหนด</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          
          {/* Risk Level Filter */}
          <div>
            <select
              value={filters.riskLevel}
              onChange={(e) => updateFilter('riskLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">ทุกระดับความเสี่ยง</option>
              <option value="Low">ต่ำ</option>
              <option value="Medium">กลาง</option>
              <option value="High">สูง</option>
            </select>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center justify-end space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.needsAssessment}
                onChange={(e) => updateFilter('needsAssessment', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">ต้องประเมิน</span>
            </label>
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Active Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              ค้นหา: {filters.search}
              <button
                onClick={() => updateFilter('search', '')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {filters.category !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              หมวดหมู่: {filters.category}
              <button
                onClick={() => updateFilter('category', 'all')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          {filters.needsAssessment && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              ต้องประเมิน
              <button
                onClick={() => updateFilter('needsAssessment', false)}
                className="ml-2 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>
      
      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-700">
              แสดง {filteredVendors.length} จาก {processedVendors.length} รายการ
            </p>
          </div>
        </div>
        
        <div ref={parentRef} className="h-[600px] overflow-auto">
          {viewMode === 'card' ? (
            <div className="p-4">
              <div 
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const vendor = filteredVendors[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <div className="p-2">
                        <VendorCard
                          vendor={vendor}
                          onEvaluate={handleEvaluate}
                          onViewDetails={handleViewDetails}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้รับเหมา
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หมวดหมู่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะการประเมิน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      คะแนน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ระดับความเสี่ยง
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเมินล่าสุด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const vendor = filteredVendors[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <VendorTableRow
                            vendor={vendor}
                            onEvaluate={handleEvaluate}
                            onViewDetails={handleViewDetails}
                          />
                        </div>
                      );
                    })}
                  </div>
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบผู้รับเหมา</h3>
            <p className="mt-1 text-sm text-gray-500">
              ลองปรับเปลี่ยนตัวกรองหรือเพิ่มผู้รับเหมาใหม่
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/csm/vendors/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มผู้รับเหมา
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSMListPage;