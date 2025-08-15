// ========================================
// //src/features/csm/pages/CSMListPage.tsx 

import React, { useState,  useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, RefreshCw, BarChart3, AlertTriangle, CheckCircle, 
  Clock, Plus, Grid, List, TrendingUp,  Building2,
  FileText,  X, Download
} from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary, CSMAssessment } from '../../../types';
import { enhancedCSMService } from '../../../services/enhancedCsmService';
import { useToast } from '../../../hooks/useToast';
import { useDebounce } from '../../../hooks/useDebounce';
import { CSM_VENDOR_CATEGORIES } from '../../../types/csm';
import { exportVendorsToExcel } from '../../../utils/exportUtils';

// ========================================
// TYPES & INTERFACES
// ========================================
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
}

interface StatisticsData {
  total: number;
  assessed: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
  avgScore: number;
  highRisk: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: number;
}

// ========================================
// STAT CARD COMPONENT
// ========================================
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className="p-4 transition-shadow bg-white border rounded-lg shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">{title}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && trend > 0 && (
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>+{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// VENDOR CARD COMPONENT
// ========================================
const VendorCard: React.FC<{ vendor: VendorWithStatus; onClick: (vendor: CSMVendor) => void }> = ({ vendor, onClick }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-700 bg-green-100 border-green-200', icon: CheckCircle, text: 'ประเมินแล้ว' };
      case 'in-progress':
        return { color: 'text-blue-700 bg-blue-100 border-blue-200', icon: Clock, text: 'กำลังประเมิน' };
      case 'due-soon':
        return { color: 'text-yellow-700 bg-yellow-100 border-yellow-200', icon: Clock, text: 'ใกล้กำหนด' };
      case 'overdue':
        return { color: 'text-red-700 bg-red-100 border-red-200', icon: AlertTriangle, text: 'เกินกำหนด' };
      default:
        return { color: 'text-gray-700 bg-gray-100 border-gray-200', icon: Clock, text: 'ยังไม่ประเมิน' };
    }
  };

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const statusConfig = getStatusConfig(vendor.assessmentStatus);

  return (
    <div 
      className="transition-all duration-200 bg-white border rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300"
      onClick={() => onClick(vendor)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">{vendor.vdName}</h3>
            <p className="mb-2 text-sm text-gray-500">{vendor.vdCode}</p>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
              {CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category)?.name || vendor.category}
            </span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
            <statusConfig.icon className="w-3 h-3 mr-1" />
            {statusConfig.text}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">คะแนนล่าสุด:</span>
            <span className={`ml-2 font-semibold ${getRiskColor(vendor.summary?.avgScore)}`}>
              {vendor.summary?.avgScore ? `${vendor.summary.avgScore.toFixed(1)}%` : 'ยังไม่มี'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">ความถี่การประเมิน:</span>
            <span className="ml-2 text-gray-900">{vendor.freqAss} วัน</span>
          </div>
        </div>

        {vendor.daysUntilDue !== undefined && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {vendor.daysUntilDue > 0 
                ? `ครบกำหนดใน ${vendor.daysUntilDue} วัน`
                : `เกินกำหนดแล้ว ${Math.abs(vendor.daysUntilDue)} วัน`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================
// VENDOR TABLE ROW COMPONENT
// ========================================
const VendorTableRow: React.FC<{ vendor: VendorWithStatus; onClick: (vendor: CSMVendor) => void }> = ({ vendor, onClick }) => {
  const getStatusBadge = (status: string) => {
    const configs = {
      'completed': 'bg-green-100 text-green-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      'due-soon': 'bg-yellow-100 text-yellow-700',
      'overdue': 'bg-red-100 text-red-700',
      'not-assessed': 'bg-gray-100 text-gray-700'
    };
    return configs[status as keyof typeof configs] || configs['not-assessed'];
  };

  const getStatusText = (status: string) => {
    const texts = {
      'completed': 'ประเมินแล้ว',
      'in-progress': 'กำลังประเมิน',
      'due-soon': 'ใกล้กำหนด',
      'overdue': 'เกินกำหนด',
      'not-assessed': 'ยังไม่ประเมิน'
    };
    return texts[status as keyof typeof texts] || texts['not-assessed'];
  };

  return (
    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => onClick(vendor)}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{vendor.vdName}</div>
          <div className="text-sm text-gray-500">{vendor.vdCode}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        {CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category)?.name || vendor.category}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(vendor.assessmentStatus)}`}>
          {getStatusText(vendor.assessmentStatus)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        {vendor.summary ? (
          <span className="font-medium">{vendor.summary.avgScore.toFixed(1)}%</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
        {vendor.lastAssessmentDate ? (
          vendor.lastAssessmentDate.toLocaleDateString('th-TH')
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
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
};

// ========================================
// MAIN COMPONENT
// ========================================
const CSMListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  //onst parentRef = useRef<HTMLDivElement>(null);

  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    needsAssessment: false
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // ========================================
  // DATA FETCHING
  // ========================================
  
  // Load vendors
  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError } = useQuery({
    queryKey: ['csm-vendors'],
    queryFn: async () => {
      console.log('🔍 Loading vendors...');
      const result = await enhancedCSMService.vendors.getAll();
      console.log('👥 Vendors loaded:', result.length);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load assessment summaries
  const { data: assessmentSummaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ['csm-assessment-summaries'],
    queryFn: async () => {
      console.log('🔍 Loading assessment summaries...');
      const result = await enhancedCSMService.assessmentSummaries.getAll();
      console.log('📊 Summaries loaded:', result.length);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Load current assessments (in-progress)
  const { data: currentAssessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ['csm-current-assessments'],
    queryFn: async () => {
      console.log('🔍 Loading current assessments...');
      const result = await enhancedCSMService.assessments.getAllCurrent();
      console.log('📋 Current assessments loaded:', result.length);
      return result;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const isLoading = vendorsLoading || summariesLoading || assessmentsLoading;
  const error = vendorsError;

  // ========================================
  // ASSESSMENT STATUS LOGIC - FIXED
  // ========================================
  
  const getAssessmentStatus = useCallback((
    vendor: CSMVendor, 
    summary?: CSMAssessmentSummary,
    currentAssessment?: CSMAssessment
  ): 'completed' | 'in-progress' | 'due-soon' | 'overdue' | 'not-assessed' => {
    
    // 1. Check if there's a current in-progress assessment
    if (currentAssessment) {
      if (!currentAssessment.isFinish) {
        console.log(`📝 Vendor ${vendor.vdCode} has in-progress assessment`);
        return 'in-progress';
      }
    }
    
    // 2. Check if vendor has completed assessment (summary exists)
    if (!summary) {
      console.log(`❌ Vendor ${vendor.vdCode} has no assessment summary - not assessed`);
      return 'not-assessed';
    }
    
    // 3. Calculate time-based status for completed assessments
    const now = new Date();
    const lastAssessment = new Date(summary.lastAssessmentDate);
    const daysSince = Math.floor((now.getTime() - lastAssessment.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = parseInt(vendor.freqAss) || 365;
    
    console.log(`📅 Vendor ${vendor.vdCode}: ${daysSince} days since last assessment, frequency: ${frequency} days`);
    
    if (daysSince >= frequency) {
      return 'overdue';
    }
    if (daysSince >= frequency - 30) {
      return 'due-soon';
    }
    return 'completed';
  }, []);

  // ========================================
  // PROCESS VENDORS WITH STATUS
  // ========================================
  
  const processedVendors = useMemo((): VendorWithStatus[] => {
    return vendors.map(vendor => {
      const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
      const currentAssessment = currentAssessments.find(a => a.vdCode === vendor.vdCode && !a.isFinish);
      
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
        summary: summary || undefined,
        currentAssessment: currentAssessment || undefined,
        daysUntilDue,
        lastAssessmentDate
      };
    });
  }, [vendors, assessmentSummaries, currentAssessments, getAssessmentStatus]);

  // ========================================
  // FILTERED VENDORS
  // ========================================
  
  const filteredVendors = useMemo((): VendorWithStatus[] => {
    return processedVendors.filter(vendor => {
      const matchesSearch = debouncedSearch === '' || 
        vendor.vdName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        vendor.vdCode.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
      const matchesAssessmentStatus = filters.assessmentStatus === 'all' || vendor.assessmentStatus === filters.assessmentStatus;
      const matchesRiskLevel = filters.riskLevel === 'all' || vendor.summary?.riskLevel === filters.riskLevel;
      const matchesNeedsAssessment = !filters.needsAssessment || 
        ['due-soon', 'overdue', 'not-assessed', 'in-progress'].includes(vendor.assessmentStatus);
      
      return matchesSearch && matchesCategory && matchesAssessmentStatus && matchesRiskLevel && matchesNeedsAssessment;
    });
  }, [processedVendors, debouncedSearch, filters]);

  // ========================================
  // STATISTICS CALCULATION
  // ========================================
  
  const statistics = useMemo((): StatisticsData => {
    const total = vendors.length;
    const assessed = processedVendors.filter(v => v.assessmentStatus === 'completed').length;
    const inProgress = processedVendors.filter(v => v.assessmentStatus === 'in-progress').length;
    const overdue = processedVendors.filter(v => v.assessmentStatus === 'overdue').length;
    const dueSoon = processedVendors.filter(v => v.assessmentStatus === 'due-soon').length;
    
    const summariesWithScores = assessmentSummaries.filter(s => s.avgScore > 0);
    const avgScore = summariesWithScores.length > 0 
      ? summariesWithScores.reduce((sum, s) => sum + s.avgScore, 0) / summariesWithScores.length 
      : 0;
    
    const highRisk = assessmentSummaries.filter(s => s.avgScore < 60).length;
    
    return {
      total,
      assessed,
      inProgress,
      overdue,
      dueSoon,
      avgScore,
      highRisk
    };
  }, [vendors.length, processedVendors, assessmentSummaries]);

  // ========================================
  // EVENT HANDLERS
  // ========================================
  
  const handleVendorSelect = useCallback((vendor: CSMVendor) => {
    // Check if vendor has in-progress assessment
    const inProgressAssessment = currentAssessments.find(a => a.vdCode === vendor.vdCode && !a.isFinish);
    
    if (inProgressAssessment) {
      // Continue existing assessment
      addToast({
        type: 'info',
        title: 'การประเมินที่ยังไม่เสร็จ',
        message: `พบการประเมินที่ยังไม่เสร็จสำหรับ ${vendor.vdName} จะเปิดหน้าการประเมินต่อ`
      });
    }
    
    navigate(`/csm/e/${vendor.vdCode}`);
  }, [currentAssessments, navigate, addToast]);

  // Refresh data handler
  const handleRefresh = useCallback(() => {
    // Refresh all data
    addToast({
      type: 'info',
      title: 'รีเฟรชข้อมูล',
      message: 'กำลังโหลดข้อมูลใหม่...'
    });
    // The React Query will automatically refetch
  }, [addToast]);

  const handleExport = useCallback(async () => {
    try {
      addToast({
        type: 'info',
        title: 'ส่งออกข้อมูล',
        message: 'กำลังเตรียมไฟล์ Excel...'
      });
      
      // Export filtered vendors data
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
  // RENDER CONDITIONS
  // ========================================
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลได้</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="p-6 mx-auto max-w-7xl">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                CSM - Contractor Safety Management
              </h1>
              <p className="mt-1 text-gray-600">
                ระบบจัดการความปลอดภัยผู้รับเหมา
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                ส่งออก Excel
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              
              <button
                onClick={() => navigate('/csm/vendors/add')}
                className="inline-flex items-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มผู้รับเหมา
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              title="ทั้งหมด"
              value={statistics.total}
              icon={Building2}
              color="blue"
            />
            <StatCard
              title="ประเมินแล้ว"
              value={statistics.assessed}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="กำลังประเมิน"
              value={statistics.inProgress}
              icon={Clock}
              color="yellow"
              trend={statistics.inProgress > 0 ? statistics.inProgress : undefined}
            />
            <StatCard
              title="เกินกำหนด"
              value={statistics.overdue}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="ใกล้ครบกำหนด"
              value={statistics.dueSoon}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="คะแนนเฉลี่ย"
              value={`${statistics.avgScore.toFixed(1)}%`}
              icon={BarChart3}
              color="purple"
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาผู้รับเหมา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทุกประเภท</option>
                {CSM_VENDOR_CATEGORIES.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.assessmentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, assessmentStatus: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="completed">ประเมินแล้ว</option>
                <option value="in-progress">กำลังประเมิน</option>
                <option value="due-soon">ใกล้กำหนด</option>
                <option value="overdue">เกินกำหนด</option>
                <option value="not-assessed">ยังไม่ประเมิน</option>
              </select>

{/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.category !== 'all' || filters.assessmentStatus !== 'all' || filters.riskLevel !== 'all' || filters.needsAssessment) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700">กรองโดย:</span>
              
              {filters.category !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                  {CSM_VENDOR_CATEGORIES.find(cat => cat.code === filters.category)?.name}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {filters.assessmentStatus !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                  สถานะ: {filters.assessmentStatus}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, assessmentStatus: 'all' }))}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {filters.needsAssessment && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                  ต้องการประเมิน
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, needsAssessment: false }))}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              <button
                onClick={() => setFilters({
                  category: 'all',
                  assessmentStatus: 'all',
                  riskLevel: 'all',
                  needsAssessment: false
                })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 mx-auto max-w-7xl">
        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            แสดง {filteredVendors.length} จาก {vendors.length} ผู้รับเหมา
          </div>
          
          {isLoading && (
            <div className="flex items-center text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              กำลังโหลด...
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-6 bg-white border rounded-lg shadow-sm animate-pulse">
                <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded"></div>
                <div className="w-1/2 h-3 mb-4 bg-gray-200 rounded"></div>
                <div className="w-1/4 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredVendors.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">ไม่พบผู้รับเหมา</h3>
            <p className="mb-6 text-gray-500">
              {searchTerm || filters.category !== 'all' || filters.assessmentStatus !== 'all' 
                ? 'ไม่พบผู้รับเหมาที่ตรงกับเงื่อนไขการค้นหา'
                : 'ยังไม่มีผู้รับเหมาในระบบ'
              }
            </p>
            {!searchTerm && filters.category === 'all' && filters.assessmentStatus === 'all' && (
              <button
                onClick={() => navigate('/csm/vendors/add')}
                className="inline-flex items-center px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มผู้รับเหมาแรก
              </button>
            )}
          </div>
        )}

        {/* Card View */}
        {!isLoading && viewMode === 'card' && filteredVendors.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVendors.map((vendor) => (
              <VendorCard 
                key={vendor.vdCode} 
                vendor={vendor} 
                onClick={handleVendorSelect} 
              />
            ))}
          </div>
        )}

        {/* Table View */}
        {!isLoading && viewMode === 'table' && filteredVendors.length > 0 && (
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      ผู้รับเหมา
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      คะแนน
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      ประเมินล่าสุด
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      กำหนดเวลา
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVendors.map((vendor) => (
                    <VendorTableRow 
                      key={vendor.vdCode} 
                      vendor={vendor} 
                      onClick={handleVendorSelect} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredVendors.length > 50 && (
          <div className="flex items-center justify-center mt-8">
            <div className="px-4 py-2 text-sm text-gray-500 bg-white border rounded-lg">
              แสดงครบทุกรายการแล้ว ({filteredVendors.length} รายการ)
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons - Floating */}
      <div className="fixed z-10 flex flex-col space-y-3 bottom-6 right-6">
        <button
          onClick={() => navigate('/csm/reports')}
          className="flex items-center justify-center w-12 h-12 text-white transition-all duration-200 bg-purple-600 rounded-full shadow-lg hover:bg-purple-700 hover:scale-110"
          title="รายงาน CSM"
        >
          <FileText className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => navigate('/csm/dashboard')}
          className="flex items-center justify-center w-12 h-12 text-white transition-all duration-200 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 hover:scale-110"
          title="แดชบอร์ด CSM"
        >
          <BarChart3 className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => navigate('/csm/vendors/add')}
          className="flex items-center justify-center w-12 h-12 text-white transition-all duration-200 bg-green-600 rounded-full shadow-lg hover:bg-green-700 hover:scale-110"
          title="เพิ่มผู้รับเหมาใหม่"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed z-10 max-w-xs p-4 text-xs text-white bg-black rounded-lg bottom-6 left-6 bg-opacity-90">
          <div className="mb-2 font-bold text-yellow-400">🔧 CSM Debug Panel</div>
          <div className="space-y-1">
            <div>📊 Total Vendors: <span className="text-blue-300">{vendors.length}</span></div>
            <div>📋 Summaries: <span className="text-green-300">{assessmentSummaries.length}</span></div>
            <div>⏳ Current Assessments: <span className="text-yellow-300">{currentAssessments.length}</span></div>
            <div>🔍 Filtered Results: <span className="text-purple-300">{filteredVendors.length}</span></div>
            <div>🔄 Loading: <span className={isLoading ? 'text-red-300' : 'text-green-300'}>{isLoading ? 'Yes' : 'No'}</span></div>
            <div>🎯 View Mode: <span className="text-cyan-300">{viewMode}</span></div>
            {error && (
              <div className="p-2 mt-2 text-red-300 bg-red-900 rounded bg-opacity-30">
                ❌ Error: {error || 'Unknown error'}
              </div>
            )}
            <div className="pt-2 mt-2 text-gray-400 border-t border-gray-600">
              🔧 Use for debugging only
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div id="toast-container" className="fixed z-50 space-y-2 top-4 right-4">
        {/* Toast messages will be rendered here by useToast hook */}
      </div>
    </div>
  );
};

export default CSMListPage;