// 📁 src/features/csm/pages/CSMAnalyticsPage.tsx
// CSM Analytics Dashboard with Real-time Data and Interactive Charts
//npm install recharts
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, 
} from 'recharts';
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Download, Filter,  RefreshCw, BarChart3, PieChart as PieChartIcon,
   Building2,  Target
} from 'lucide-react';
import type { CSMVendor, CSMAssessmentSummary } from '../../../types';
import  csmService  from '../../../services/csmService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';

// =================== TYPES ===================
interface AnalyticsData {
  vendors: readonly CSMVendor[];
  assessmentSummaries: readonly CSMAssessmentSummary[];
  totalVendors: number;
  assessedVendors: number;
  averageScore: number;
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
    notAssessed: number;
  };
  categoryDistribution: Record<string, number>;
  scoreDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  trendData: {
    month: string;
    assessments: number;
    averageScore: number;
  }[];
}

interface ChartColors {
  readonly low: string;
  readonly moderate: string;
  readonly high: string;
  readonly notAssessed: string;
  readonly primary: string;
  readonly secondary: string;
}

interface FilterOptions {
  dateRange: 'all' | '3months' | '6months' | '1year';
  category: 'all' | string;
  riskLevel: 'all' | 'Low' | 'Moderate' | 'High';
}

// =================== CONSTANTS ===================
const CHART_COLORS: ChartColors = {
  low: '#10B981',      // green-500
  moderate: '#F59E0B',  // amber-500
  high: '#EF4444',     // red-500
  notAssessed: '#6B7280', // gray-500
  primary: '#3B82F6',   // blue-500
  secondary: '#8B5CF6'  // violet-500
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  '1': 'บริหารจัดการ',
  '2': 'บริการ',
  '3': 'โครงสร้าง',
  '4': 'ขนส่ง',
  'admin': 'บริหารจัดการ',
  'service': 'บริการ',
  'structure': 'โครงสร้าง',
  'transporter': 'ขนส่ง'
} as const;

const SCORE_RANGES = [
  { min: 0, max: 39, label: '0-39', color: '#EF4444' },
  { min: 40, max: 59, label: '40-59', color: '#F59E0B' },
  { min: 60, max: 79, label: '60-79', color: '#3B82F6' },
  { min: 80, max: 100, label: '80-100', color: '#10B981' }
] as const;

// =================== COMPONENT ===================
const CSMAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  // =================== STATE ===================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    category: 'all',
    riskLevel: 'all'
  });
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  // =================== EFFECTS ===================
  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  // =================== DATA LOADING ===================
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);

      const [vendors, assessmentSummaries] = await Promise.all([
        csmService.vendors.getAll(),
        csmService.assessmentSummaries.getAll()
      ]);

      const data = processAnalyticsData(vendors, assessmentSummaries, filters);
      setAnalyticsData(data);

    } catch (error) {
      console.error('Error loading analytics data:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
    
    addToast({
      type: 'success',
      title: 'อัปเดตข้อมูลสำเร็จ',
      message: 'ข้อมูลการวิเคราะห์ได้รับการอัปเดตแล้ว'
    });
  }, [loadAnalyticsData, addToast]);

  // =================== DATA PROCESSING ===================
  const processAnalyticsData = useCallback((
    vendors: readonly CSMVendor[],
    summaries: readonly CSMAssessmentSummary[],
    currentFilters: FilterOptions
  ): AnalyticsData => {
    
    // Filter data based on current filters
    const filteredVendors = vendors.filter(vendor => {
      if (currentFilters.category !== 'all' && vendor.category !== currentFilters.category) {
        return false;
      }
      return true;
    });

    const filteredSummaries = summaries.filter(summary => {
      if (currentFilters.riskLevel !== 'all' && summary.riskLevel !== currentFilters.riskLevel) {
        return false;
      }
      
      // Date filtering
      if (currentFilters.dateRange !== 'all') {
        const monthsAgo = currentFilters.dateRange === '3months' ? 3 :
                         currentFilters.dateRange === '6months' ? 6 : 12;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
        
        if (summary.lastAssessmentDate < cutoffDate) {
          return false;
        }
      }
      
      return true;
    });

    // Calculate metrics
    const totalVendors = filteredVendors.length;
    const assessedVendors = filteredSummaries.length;
    const averageScore = assessedVendors > 0 
      ? Math.round(filteredSummaries.reduce((sum, s) => sum + s.avgScore, 0) / assessedVendors)
      : 0;

    // Risk distribution
    const riskDistribution = {
      low: filteredSummaries.filter(s => s.riskLevel === 'Low').length,
      moderate: filteredSummaries.filter(s => s.riskLevel === 'Moderate').length,
      high: filteredSummaries.filter(s => s.riskLevel === 'High').length,
      notAssessed: totalVendors - assessedVendors
    };

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    filteredVendors.forEach(vendor => {
      const categoryKey = CATEGORY_LABELS[vendor.category] || vendor.category;
      categoryDistribution[categoryKey] = (categoryDistribution[categoryKey] || 0) + 1;
    });

    // Score distribution
    const scoreDistribution = SCORE_RANGES.map(range => {
      const count = filteredSummaries.filter(s => 
        s.avgScore >= range.min && s.avgScore <= range.max
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: assessedVendors > 0 ? Math.round((count / assessedVendors) * 100) : 0
      };
    });

    // Trend data (mock data for demonstration)
    const trendData = [
      { month: 'ม.ค.', assessments: 12, averageScore: 75 },
      { month: 'ก.พ.', assessments: 18, averageScore: 78 },
      { month: 'มี.ค.', assessments: 15, averageScore: 72 },
      { month: 'เม.ย.', assessments: 22, averageScore: 80 },
      { month: 'พ.ค.', assessments: 19, averageScore: 77 },
      { month: 'มิ.ย.', assessments: 25, averageScore: 82 }
    ];

    return {
      vendors: filteredVendors,
      assessmentSummaries: filteredSummaries,
      totalVendors,
      assessedVendors,
      averageScore,
      riskDistribution,
      categoryDistribution,
      scoreDistribution,
      trendData
    };
  }, []);

  // =================== COMPUTED VALUES ===================
  const chartData = useMemo(() => {
    if (!analyticsData) return null;

    const { riskDistribution, categoryDistribution, scoreDistribution } = analyticsData;

    return {
      riskData: [
        { name: 'ความเสี่ยงต่ำ', value: riskDistribution.low, color: CHART_COLORS.low },
        { name: 'ความเสี่ยงปานกลาง', value: riskDistribution.moderate, color: CHART_COLORS.moderate },
        { name: 'ความเสี่ยงสูง', value: riskDistribution.high, color: CHART_COLORS.high },
        { name: 'ยังไม่ประเมิน', value: riskDistribution.notAssessed, color: CHART_COLORS.notAssessed }
      ].filter(item => item.value > 0),

      categoryData: Object.entries(categoryDistribution).map(([name, value]) => ({
        name,
        value,
        color: CHART_COLORS.primary
      })),

      scoreData: scoreDistribution.map((item, index) => ({
        ...item,
        color: SCORE_RANGES[index].color
      }))
    };
  }, [analyticsData]);

  // =================== EVENT HANDLERS ===================
  const handleFilterChange = useCallback((key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExportData = useCallback(() => {
    if (!analyticsData) return;

    // Create CSV data
    const csvData = analyticsData.assessmentSummaries.map(summary => ({
      'รหัสผู้รับเหมา': summary.vdCode,
      'คะแนนเฉลี่ย': summary.avgScore,
      'ระดับความเสี่ยง': summary.riskLevel,
      'วันที่ประเมินล่าสุด': summary.lastAssessmentDate.toLocaleDateString('th-TH')
    }));

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `csm-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    addToast({
      type: 'success',
      title: 'ส่งออกข้อมูลสำเร็จ',
      message: 'ไฟล์ CSV ได้รับการดาวน์โหลดแล้ว'
    });
  }, [analyticsData, addToast]);

  // =================== RENDER HELPERS ===================
  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trend?: { value: number; isPositive: boolean }
  ) => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-blue-50">
          {icon}
        </div>
      </div>
    </div>
  );

  const renderChart = () => {
    if (!chartData) return null;

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData.riskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                //label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analyticsData?.trendData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="assessments" 
                stroke={CHART_COLORS.primary} 
                name="จำนวนการประเมิน"
              />
              <Line 
                type="monotone" 
                dataKey="averageScore" 
                stroke={CHART_COLORS.secondary} 
                name="คะแนนเฉลี่ย"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default: // bar
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="จำนวน" fill={CHART_COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  // =================== LOADING STATE ===================
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonLoader className="w-64 h-8" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} className="h-32" />
          ))}
        </div>
        <SkeletonLoader className="h-96" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">ไม่พบข้อมูล</h3>
          <p className="text-gray-500">ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้</p>
        </div>
      </div>
    );
  }

  // =================== MAIN RENDER ===================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/csm')}
            className="flex items-center justify-center w-8 h-8 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การวิเคราะห์ CSM</h1>
            <p className="text-gray-600">แดชบอร์ดการวิเคราะห์ข้อมูลการประเมิน</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            ส่งออกข้อมูล
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="3months">3 เดือนล่าสุด</option>
              <option value="6months">6 เดือนล่าสุด</option>
              <option value="1year">1 ปีล่าสุด</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="1">บริหารจัดการ</option>
              <option value="2">บริการ</option>
              <option value="3">โครงสร้าง</option>
              <option value="4">ขนส่ง</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทุกระดับความเสี่ยง</option>
              <option value="Low">ความเสี่ยงต่ำ</option>
              <option value="Moderate">ความเสี่ยงปานกลาง</option>
              <option value="High">ความเสี่ยงสูง</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {renderMetricCard(
          'ผู้รับเหมาทั้งหมด',
          analyticsData.totalVendors,
          <Building2 className="w-6 h-6 text-blue-600" />
        )}
        {renderMetricCard(
          'ประเมินแล้ว',
          analyticsData.assessedVendors,
          <CheckCircle className="w-6 h-6 text-green-600" />
        )}
        {renderMetricCard(
          'คะแนนเฉลี่ย',
          `${analyticsData.averageScore}%`,
          <Target className="w-6 h-6 text-purple-600" />
        )}
        {renderMetricCard(
          'ความเสี่ยงสูง',
          analyticsData.riskDistribution.high,
          <AlertTriangle className="w-6 h-6 text-red-600" />
        )}
      </div>

      {/* Chart Section */}
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">แผนภูมิการวิเคราะห์</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-md ${chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded-md ${chartType === 'pie' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <PieChartIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-md ${chartType === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
          </div>
        </div>

        {renderChart()}
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk Distribution */}
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">การกระจายความเสี่ยง</h3>
          <div className="space-y-3">
            {chartData?.riskData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">การกระจายตามหมวดหมู่</h3>
          <div className="space-y-3">
            {chartData?.categoryData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CSMAnalyticsPage;