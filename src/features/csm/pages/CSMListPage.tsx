// 📁 src/features/csm/pages/CSMListPage.tsx - เพิ่ม Debug Panel
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  Search,  RefreshCw, BarChart3,  
  AlertTriangle, CheckCircle, Clock, Plus, Grid, List,
   TrendingUp, Users, Building2
} from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary } from '../../../types';
import  csmService  from '../../../services/csmService';
import { useToast } from '../../../hooks/useToast';
import { useDebounce } from '../../../hooks/useDebounce';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { CSM_VENDOR_CATEGORIES } from '../../../types/csm';
import CSMDebugPanel from '../components/CSMDebugPanel'; // ✅ เพิ่ม import

// Types และ Interfaces
interface VendorWithStatus extends CSMVendor {
  assessmentStatus: 'completed' | 'due-soon' | 'overdue' | 'not-assessed';
  summary?: CSMAssessmentSummary;
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
  overdue: number;
  dueSoon: number;
  avgScore: number;
  highRisk: number;
}

const CSMListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const parentRef = useRef<HTMLDivElement>(null);

  // State Management
  const [vendors, setVendors] = useState<CSMVendor[]>([]);
  const [assessmentSummaries, setAssessmentSummaries] = useState<CSMAssessmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    assessmentStatus: 'all',
    riskLevel: 'all',
    needsAssessment: false
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Data Loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading CSM data...');
      
      const [vendorData, summaryData] = await Promise.all([
        csmService.vendors.getAll(),
        csmService.assessmentSummaries.getAll()
      ]);

      console.log(`📊 Loaded ${vendorData.length} vendors and ${summaryData.length} summaries`);
      
      if (vendorData.length === 0) {
        console.warn('⚠️ No vendors found in database');
        setError('ไม่พบข้อมูลผู้รับเหมา กรุณาเพิ่มข้อมูลหรือตรวจสอบการเชื่อมต่อ');
      }
      
      setVendors(vendorData);
      setAssessmentSummaries(summaryData);
      
    } catch (err) {
      console.error('❌ Error loading CSM data:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Assessment Status Logic
  const getAssessmentStatus = useCallback((vendor: CSMVendor, summary?: CSMAssessmentSummary): 'completed' | 'due-soon' | 'overdue' | 'not-assessed' => {
    if (!summary) return 'not-assessed';
    
    const now = new Date();
    const lastAssessment = new Date(summary.lastAssessmentDate);
    const daysSince = Math.floor((now.getTime() - lastAssessment.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = parseInt(vendor.freqAss) || 365;
    
    if (daysSince >= frequency) return 'overdue';
    if (daysSince >= frequency - 30) return 'due-soon';
    return 'completed';
  }, []);

  // Process vendors with status
  const processedVendors = useMemo((): VendorWithStatus[] => {
    return vendors.map(vendor => {
      const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
      const assessmentStatus = getAssessmentStatus(vendor, summary);
      
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
  const statistics = useMemo((): StatisticsData => {
    const total = processedVendors.length;
    const assessed = processedVendors.filter(v => v.assessmentStatus === 'completed').length;
    const overdue = processedVendors.filter(v => v.assessmentStatus === 'overdue').length;
    const dueSoon = processedVendors.filter(v => v.assessmentStatus === 'due-soon').length;
    const avgScore = assessmentSummaries.length > 0 
      ? assessmentSummaries.reduce((sum, s) => sum + s.avgScore, 0) / assessmentSummaries.length 
      : 0;
    const highRisk = assessmentSummaries.filter(s => s.riskLevel === 'High').length;
    
    return { total, assessed, overdue, dueSoon, avgScore, highRisk };
  }, [processedVendors, assessmentSummaries]);

  // Event Handlers
  const handleVendorClick = (vendor: CSMVendor) => {
    navigate(`/csm/e/${vendor.vdCode}`);
  };

  const handleAddVendor = () => {
    navigate('/csm/vendors/add');
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล CSM...</p>
        </div>
      </div>
    );
  }

  // Error State with Debug Info
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          
          <div className="space-y-2">
            <button
              onClick={loadData}
              className="w-full px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="inline w-4 h-4 mr-2" />
              ลองใหม่อีกครั้ง
            </button>
            
            <button
              onClick={handleAddVendor}
              className="w-full px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Plus className="inline w-4 h-4 mr-2" />
              เพิ่มผู้รับเหมาใหม่
            </button>
          </div>
          
          {/* Debug Panel แสดงเมื่อมี error */}
          <CSMDebugPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการผู้รับเหมา CSM</h1>
            <p className="mt-1 text-gray-600">ระบบประเมินผู้รับเหมาด้านความปลอดภัย</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/csm/reports')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              รายงาน
            </button>
            
            <button
              onClick={handleAddVendor}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้รับเหมา
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ผู้รับเหมาทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ประเมินแล้ว</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.assessed}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">เกินกำหนด</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.overdue}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ใกล้กำหนด</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.dueSoon}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">คะแนนเฉลี่ย</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.avgScore.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ความเสี่ยงสูง</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.highRisk}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหาผู้รับเหมา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <SearchableSelect
              value={
                [
                  { value: 'all', label: 'ทุกหมวดหมู่' },
                  ...CSM_VENDOR_CATEGORIES.map(cat => ({
                    value: cat.code,
                    label: cat.name
                  }))
                ].find(opt => opt.value === filters.category) || null
              }
              onChange={(option) => setFilters(prev => ({ ...prev, category: option ? option.value : 'all' }))}
              options={[
                { value: 'all', label: 'ทุกหมวดหมู่' },
                ...CSM_VENDOR_CATEGORIES.map(cat => ({
                  value: cat.code,
                  label: cat.name
                }))
              ]}
              placeholder="หมวดหมู่"
            />

            {/* Assessment Status Filter */}
            <SearchableSelect
              value={
                [
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'completed', label: 'ประเมินแล้ว' },
                  { value: 'due-soon', label: 'ใกล้กำหนด' },
                  { value: 'overdue', label: 'เกินกำหนด' },
                  { value: 'not-assessed', label: 'ยังไม่ประเมิน' }
                ].find(opt => opt.value === filters.assessmentStatus) || null
              }
              onChange={(option) => setFilters(prev => ({ ...prev, assessmentStatus: option ? option.value : 'all' }))}
              options={[
                { value: 'all', label: 'ทุกสถานะ' },
                { value: 'completed', label: 'ประเมินแล้ว' },
                { value: 'due-soon', label: 'ใกล้กำหนด' },
                { value: 'overdue', label: 'เกินกำหนด' },
                { value: 'not-assessed', label: 'ยังไม่ประเมิน' }
              ]}
              placeholder="สถานะการประเมิน"
             
            />

            {/* Risk Level Filter */}
            <SearchableSelect
              value={
                [
                  { value: 'all', label: 'ทุกระดับ' },
                  { value: 'Low', label: 'ความเสี่ยงต่ำ' },
                  { value: 'Moderate', label: 'ความเสี่ยงกลาง' },
                  { value: 'High', label: 'ความเสี่ยงสูง' }
                ].find(opt => opt.value === filters.riskLevel) || null
              }
              onChange={(option) => setFilters(prev => ({ ...prev, riskLevel: option ? option.value : 'all' }))}
              options={[
                { value: 'all', label: 'ทุกระดับ' },
                { value: 'Low', label: 'ความเสี่ยงต่ำ' },
                { value: 'Moderate', label: 'ความเสี่ยงกลาง' },
                { value: 'High', label: 'ความเสี่ยงสูง' }
              ]}
              placeholder="ระดับความเสี่ยง"
            />

            {/* Needs Assessment Toggle */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.needsAssessment}
                onChange={(e) => setFilters(prev => ({ ...prev, needsAssessment: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">ต้องประเมิน</span>
            </label>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'card' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadData}
              className="p-2 text-gray-600 transition-colors hover:text-gray-900"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">
          แสดง {filteredVendors.length} จาก {processedVendors.length} รายการ
          {debouncedSearch && ` (ค้นหา: "${debouncedSearch}")`}
        </p>
      </div>

      {/* Vendor List */}
      <div className="flex-1 overflow-hidden">
        {filteredVendors.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">ไม่พบข้อมูล</h3>
              <p className="mb-4 text-gray-600">
                {processedVendors.length === 0 
                  ? 'ยังไม่มีผู้รับเหมาในระบบ กรุณาเพิ่มผู้รับเหมาใหม่'
                  : 'ไม่พบผู้รับเหมาที่ตรงกับเงื่อนไขการค้นหา'
                }
              </p>
              
              {processedVendors.length === 0 && (
                <div className="space-y-2">
                  <button
                    onClick={handleAddVendor}
                    className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="inline w-4 h-4 mr-2" />
                    เพิ่มผู้รับเหมาใหม่
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div ref={parentRef} className="h-full overflow-auto">
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
                    {viewMode === 'card' ? (
                      <VendorCard vendor={vendor} onClick={handleVendorClick} />
                    ) : (
                      <VendorTableRow vendor={vendor} onClick={handleVendorClick} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel - แสดงใน development mode */}
      <CSMDebugPanel />
    </div>
  );
};

// Vendor Card Component
const VendorCard: React.FC<{ vendor: VendorWithStatus; onClick: (vendor: CSMVendor) => void }> = ({ vendor, onClick }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-700 bg-green-100', icon: CheckCircle, text: 'ประเมินแล้ว' };
      case 'due-soon':
        return { color: 'text-yellow-700 bg-yellow-100', icon: Clock, text: 'ใกล้กำหนด' };
      case 'overdue':
        return { color: 'text-red-700 bg-red-100', icon: AlertTriangle, text: 'เกินกำหนด' };
      default:
        return { color: 'text-gray-700 bg-gray-100', icon: Clock, text: 'ยังไม่ประเมิน' };
    }
  };

  const getRiskConfig = (level?: string) => {
    switch (level) {
      case 'Low':
        return { color: 'text-green-700 bg-green-100', text: 'ต่ำ' };
      case 'Moderate':
        return { color: 'text-yellow-700 bg-yellow-100', text: 'กลาง' };
      case 'High':
        return { color: 'text-red-700 bg-red-100', text: 'สูง' };
      default:
        return { color: 'text-gray-700 bg-gray-100', text: '-' };
    }
  };

  const statusConfig = getStatusConfig(vendor.assessmentStatus);
  const riskConfig = getRiskConfig(vendor.summary?.riskLevel);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-4 mx-6 my-2 transition-shadow bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md"
         onClick={() => onClick(vendor)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">{vendor.vdName}</h3>
            <span className="text-sm text-gray-500">({vendor.vdCode})</span>
          </div>
          
          <p className="mt-1 text-sm text-gray-600">
            หมวดหมู่: {CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category)?.name || vendor.category}
          </p>
          
          {vendor.workingArea && vendor.workingArea.length > 0 && (
            <p className="text-sm text-gray-600">
              พื้นที่ปฏิบัติงาน: {vendor.workingArea.join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.text}
          </div>
          
          {vendor.summary && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${riskConfig.color}`}>
              ความเสี่ยง: {riskConfig.text}
            </div>
          )}
        </div>
      </div>

      {vendor.summary && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <div>
            <span className="text-gray-600">คะแนนล่าสุด: </span>
            <span className="font-medium">{vendor.summary.avgScore.toFixed(1)}%</span>
          </div>
          
          {vendor.lastAssessmentDate && (
            <div>
              <span className="text-gray-600">ประเมินล่าสุด: </span>
              <span className="font-medium">{vendor.lastAssessmentDate.toLocaleDateString('th-TH')}</span>
            </div>
          )}
        </div>
      )}

      {vendor.daysUntilDue !== undefined && (
        <div className="mt-2">
          <span className="text-sm text-gray-600">
            {vendor.daysUntilDue > 0 
              ? `ครบกำหนดใน ${vendor.daysUntilDue} วัน`
              : `เกินกำหนดแล้ว ${Math.abs(vendor.daysUntilDue)} วัน`
            }
          </span>
        </div>
      )}
    </div>
  );
};

// Vendor Table Row Component
const VendorTableRow: React.FC<{ vendor: VendorWithStatus; onClick: (vendor: CSMVendor) => void }> = ({ vendor, onClick }) => {
  const getStatusBadge = (status: string) => {
    const configs = {
      'completed': 'bg-green-100 text-green-700',
      'due-soon': 'bg-yellow-100 text-yellow-700',
      'overdue': 'bg-red-100 text-red-700',
      'not-assessed': 'bg-gray-100 text-gray-700'
    };
    return configs[status as keyof typeof configs] || configs['not-assessed'];
  };

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-200 cursor-pointer hover:bg-gray-50"
         onClick={() => onClick(vendor)}>
      <div className="flex items-center justify-between">
        <div className="grid items-center flex-1 grid-cols-5 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">{vendor.vdName}</p>
            <p className="text-sm text-gray-500">{vendor.vdCode}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-900">
              {CSM_VENDOR_CATEGORIES.find(cat => cat.code === vendor.category)?.name || vendor.category}
            </p>
          </div>
          
          <div>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(vendor.assessmentStatus)}`}>
              {vendor.assessmentStatus === 'completed' && 'ประเมินแล้ว'}
              {vendor.assessmentStatus === 'due-soon' && 'ใกล้กำหนด'}
              {vendor.assessmentStatus === 'overdue' && 'เกินกำหนด'}
              {vendor.assessmentStatus === 'not-assessed' && 'ยังไม่ประเมิน'}
            </span>
          </div>
          
          <div>
            {vendor.summary ? (
              <span className="text-sm font-medium">{vendor.summary.avgScore.toFixed(1)}%</span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          
          <div>
            {vendor.lastAssessmentDate ? (
              <span className="text-sm text-gray-600">
                {vendor.lastAssessmentDate.toLocaleDateString('th-TH')}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSMListPage;