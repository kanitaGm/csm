// 📁 src/features/csm/pages/CSMDashboardPage.tsx
// Complete CSM Dashboard with Analytics and KPI Cards
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, CheckCircle, Clock, AlertTriangle, TrendingUp, 
  FileText, BarChart3, Calendar, Download,  Eye
} from 'lucide-react';
import { enhancedCSMService } from '../../../services/enhancedCsmService';
import { exportVendorsToExcel } from '../../../utils/exportUtils';
import { useToast } from '../../../hooks/useToast';
import type { CSMVendor } from '../../../types/csm';

// Types
interface DashboardStats {
  totalVendors: number;
  assessedVendors: number;
  pendingAssessments: number;
  overdue: number;
  dueSoon: number;
  avgScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  categoryBreakdown: Record<string, number>;
  recentAssessments: Array<{
    vdCode: string;
    vdName: string;
    score: number;
    date: Date;
    riskLevel: string;
  }>;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

// Components
const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  onClick 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div 
      className={`bg-white rounded-lg p-6 border-2 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

const RiskLevelChart: React.FC<{ data: DashboardStats['riskDistribution'] }> = ({ data }) => {
  const total = data.low + data.medium + data.high;
  
  if (total === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">การกระจายความเสี่ยง</h3>
        <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
      </div>
    );
  }

  const lowPercentage = (data.low / total) * 100;
  const mediumPercentage = (data.medium / total) * 100;
  const highPercentage = (data.high / total) * 100;

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">การกระจายความเสี่ยง</h3>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
        <div className="flex h-full">
          <div 
            className="bg-green-500 transition-all duration-500" 
            style={{ width: `${lowPercentage}%` }}
          />
          <div 
            className="bg-yellow-500 transition-all duration-500" 
            style={{ width: `${mediumPercentage}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500" 
            style={{ width: `${highPercentage}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">ความเสี่ยงต่ำ</span>
          </div>
          <p className="text-lg font-bold text-green-600">{data.low}</p>
          <p className="text-xs text-gray-500">{lowPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">ความเสี่ยงปานกลาง</span>
          </div>
          <p className="text-lg font-bold text-yellow-600">{data.medium}</p>
          <p className="text-xs text-gray-500">{mediumPercentage.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">ความเสี่ยงสูง</span>
          </div>
          <p className="text-lg font-bold text-red-600">{data.high}</p>
          <p className="text-xs text-gray-500">{highPercentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

const CategoryBreakdownChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const categories = Object.entries(data).sort(([,a], [,b]) => b - a);
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ประเภทผู้รับเหมา</h3>
      
      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">ไม่มีข้อมูล</div>
      ) : (
        <div className="space-y-3">
          {categories.map(([category, count], index) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const colors = [
              'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 
              'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
            ];
            
            return (
              <div key={category} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const RecentAssessmentsTable: React.FC<{ 
  assessments: DashboardStats['recentAssessments'];
  onViewDetails: (vdCode: string) => void;
}> = ({ assessments, onViewDetails }) => (
  <div className="bg-white rounded-lg p-6 border shadow-sm">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">การประเมินล่าสุด</h3>
    
    {assessments.length === 0 ? (
      <div className="text-center py-8 text-gray-500">ไม่มีข้อมูลการประเมิน</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">ผู้รับเหมา</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">คะแนน</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">ความเสี่ยง</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">วันที่</th>
              <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((assessment, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{assessment.vdName}</p>
                    <p className="text-xs text-gray-500">{assessment.vdCode}</p>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    assessment.score >= 80 ? 'bg-green-100 text-green-800' :
                    assessment.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {assessment.score}%
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    assessment.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                    assessment.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {assessment.riskLevel === 'Low' ? 'ต่ำ' : 
                     assessment.riskLevel === 'Medium' ? 'ปานกลาง' : 'สูง'}
                  </span>
                </td>
                <td className="py-3 px-3 text-sm text-gray-900">
                  {assessment.date.toLocaleDateString('th-TH')}
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => onViewDetails(assessment.vdCode)}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const UpcomingAssessmentsAlert: React.FC<{ 
  vendors: CSMVendor[];
  onNavigateToList: () => void;
}> = ({ vendors, onNavigateToList }) => {
  if (vendors.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              มีผู้รับเหมา {vendors.length} รายที่ต้องประเมินเร็วๆ นี้
            </h3>
            <p className="text-xs text-yellow-600 mt-1">
              ใกล้ครบกำหนดหรือเกินกำหนดการประเมินแล้ว
            </p>
          </div>
        </div>
        <button
          onClick={onNavigateToList}
          className="text-yellow-700 hover:text-yellow-900 text-sm font-medium underline"
        >
          ดูรายการ
        </button>
      </div>
    </div>
  );
};

// Main Dashboard Component
const CSMDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Data fetching
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['csm-vendors'],
    queryFn: () => enhancedCSMService.vendors.getAll(),
  });

  const { data: assessmentSummaries = [] } = useQuery({
    queryKey: ['csm-assessment-summaries'],
    queryFn: () => enhancedCSMService.assessmentSummaries.getAll(),
  });

  const { data: vendorsNeedingAssessment = [] } = useQuery({
    queryKey: ['vendors-needing-assessment'],
    queryFn: () => enhancedCSMService.vendors.getVendorsNeedingAssessment(),
  });

  // Calculate dashboard statistics
  const dashboardStats = useMemo((): DashboardStats => {
    const totalVendors = vendors.length;
    const assessedVendors = assessmentSummaries.length;
    const pendingAssessments = totalVendors - assessedVendors;
    
    // Calculate overdue and due soon
    const now = new Date();
    let overdue = 0;
    let dueSoon = 0;
    
    vendors.forEach(vendor => {
      const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
      if (!summary) {
        overdue++; // Never assessed = overdue
        return;
      }
      
      const lastDate = new Date(summary.lastAssessmentDate);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const frequency = parseInt(vendor.freqAss) || 365;
      
      if (daysSince > frequency) overdue++;
      else if (daysSince > frequency - 30) dueSoon++;
    });

    // Calculate average score
    const avgScore = assessmentSummaries.length > 0 
      ? Math.round(assessmentSummaries.reduce((sum, s) => sum + s.avgScore, 0) / assessmentSummaries.length)
      : 0;

    // Risk distribution
    const riskDistribution = assessmentSummaries.reduce(
      (acc, summary) => {
        const level = summary.riskLevel?.toLowerCase() || 'high';
        if (level === 'low') acc.low++;
        else if (level === 'medium') acc.medium++;
        else acc.high++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Category breakdown
    const categoryBreakdown = vendors.reduce((acc, vendor) => {
      const category = vendor.category || 'ไม่ระบุ';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent assessments (last 10)
    const recentAssessments = assessmentSummaries
      .sort((a, b) => new Date(b.lastAssessmentDate).getTime() - new Date(a.lastAssessmentDate).getTime())
      .slice(0, 10)
      .map(summary => {
        const vendor = vendors.find(v => v.vdCode === summary.vdCode);
        return {
          vdCode: summary.vdCode,
          vdName: vendor?.vdName || summary.vdCode,
          score: summary.avgScore,
          date: new Date(summary.lastAssessmentDate),
          riskLevel: summary.riskLevel || 'High'
        };
      });

    return {
      totalVendors,
      assessedVendors,
      pendingAssessments,
      overdue,
      dueSoon,
      avgScore,
      riskDistribution,
      categoryBreakdown,
      recentAssessments
    };
  }, [vendors, assessmentSummaries]);

  // Event handlers
  const handleExportData = () => {
    try {
      exportVendorsToExcel(vendors, assessmentSummaries);
      addToast({
        type: 'success',
        title: 'ส่งออกสำเร็จ',
        message: 'ข้อมูลถูกส่งออกเป็น Excel แล้ว'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถส่งออกข้อมูลได้'
      });
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard CSM</h1>
            <p className="text-gray-600 mt-1">ภาพรวมการจัดการและประเมินผู้รับเหมา</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              ส่งออกข้อมูล
            </button>
            <button
              onClick={() => navigate('/csm')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              จัดการ CSM
            </button>
          </div>
        </div>

        {/* Alert for upcoming assessments */}
        <UpcomingAssessmentsAlert 
          vendors={vendorsNeedingAssessment} 
          onNavigateToList={() => navigate('/csm?filter=needsAssessment')}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="ผู้รับเหมาทั้งหมด"
          value={dashboardStats.totalVendors}
          icon={Building2}
          color="blue"
          onClick={() => navigate('/csm')}
        />
        <StatCard
          title="ประเมินแล้ว"
          value={dashboardStats.assessedVendors}
          icon={CheckCircle}
          color="green"
          onClick={() => navigate('/csm?status=completed')}
        />
        <StatCard
          title="รอการประเมิน"
          value={dashboardStats.pendingAssessments}
          icon={Clock}
          color="yellow"
          onClick={() => navigate('/csm?status=pending')}
        />
        <StatCard
          title="เกินกำหนด"
          value={dashboardStats.overdue}
          icon={AlertTriangle}
          color="red"
          onClick={() => navigate('/csm?status=overdue')}
        />
        <StatCard
          title="ใกล้ครบกำหนด"
          value={dashboardStats.dueSoon}
          icon={Calendar}
          color="yellow"
          onClick={() => navigate('/csm?status=due-soon')}
        />
        <StatCard
          title="คะแนนเฉลี่ย"
          value={`${dashboardStats.avgScore}%`}
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RiskLevelChart data={dashboardStats.riskDistribution} />
        <CategoryBreakdownChart data={dashboardStats.categoryBreakdown} />
      </div>

      {/* Recent Assessments */}
      <div className="mb-8">
        <RecentAssessmentsTable 
          assessments={dashboardStats.recentAssessments}
          onViewDetails={(vdCode) => navigate(`/csm/vendors/${vdCode}`)}
        />
      </div>
    </div>
  );
};

export default CSMDashboardPage;