// 📁 src/features/csm/pages/CSMReportsPage.tsx
// CSM Reports dashboard with various report types
import React, { useState, useEffect,useCallback  } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Download, Calendar, Filter, FileText, 
  TrendingUp, PieChart, Users, AlertTriangle, CheckCircle,
  Clock, RefreshCw
} from 'lucide-react';
import type { CSMVendor, CSMAssessment } from '../../../types';
import { csmVendorService } from '../../../services/csmVendorService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';

interface ReportSummary {
  totalVendors: number;
  assessedVendors: number;
  pendingAssessments: number;
  expiredAssessments: number;
  averageScore: number;
  highRiskVendors: number;
}

interface CategoryReport {
  category: string;
  total: number;
  assessed: number;
  avgScore: number;
  highRisk: number;
}

const CSMReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<CSMVendor[]>([]);
  //const [assessments, setAssessments] = useState<CSMAssessment[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([]);
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadReportData();
    console.log(vendors);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);

      // Load vendors
      const vendorData = await csmVendorService.getAll();
      setVendors(vendorData);

      // Load assessments (you might need to create this method)
      // const assessmentData = await csmService.getAllAssessments();
      // setAssessments(assessmentData);

      // Generate summary
      generateSummary(vendorData, []);
      generateCategoryReports(vendorData, []);

    } catch (error) {
      console.error('Error loading report data:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลรายงานได้'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const generateSummary = (vendors: CSMVendor[], assessments: CSMAssessment[]) => {
    const totalVendors = vendors.length;
    const assessedVendors = vendors.filter(v => {
      // Check if vendor has any completed assessments
      return assessments.some(a => a.vdCode === v.vdCode && a.isFinish);
    }).length;

    const pendingAssessments = assessments.filter(a => !a.isFinish).length;
    const expiredAssessments = 0; // Calculate based on frequency and last assessment date

    const averageScore = assessments.length > 0 
      ? assessments.reduce((sum, a) => {
          const score = typeof a.totalScore === 'string' ? parseFloat(a.totalScore) : (a.totalScore || 0);
          return sum + score;
        }, 0) / assessments.length
      : 0;      

    // Safe number comparison for highRiskVendors
    const highRiskVendors = assessments.filter(a => {
      const score = typeof a.totalScore === 'string' ? parseFloat(a.totalScore) : (a.totalScore || 0);
      return score < 60;
    }).length;

    setSummary({
      totalVendors,
      assessedVendors,
      pendingAssessments,
      expiredAssessments,
      averageScore,
      highRiskVendors
    });
  };

  const generateCategoryReports = (vendors: CSMVendor[], assessments: CSMAssessment[]) => {
    const categories = ['1', '2', '3', '4', 'maintenance', 'security'];
    
    const reports = categories.map(category => {
      const categoryVendors = vendors.filter(v => v.category === category);
      const categoryAssessments = assessments.filter(a => 
        categoryVendors.some(v => v.vdCode === a.vdCode)
      );
      
      const assessed = categoryVendors.filter(v => 
        categoryAssessments.some(a => a.vdCode === v.vdCode && a.isFinish)
      ).length;
      
      // Safe number conversion for avgScore
      const avgScore = categoryAssessments.length > 0
        ? categoryAssessments.reduce((sum, a) => {
            const score = typeof a.totalScore === 'string' ? parseFloat(a.totalScore) : (a.totalScore || 0);
            return sum + score;
          }, 0) / categoryAssessments.length
        : 0;
      
      // Safe number comparison for highRisk
      const highRisk = categoryAssessments.filter(a => {
        const score = typeof a.totalScore === 'string' ? parseFloat(a.totalScore) : (a.totalScore || 0);
        return score < 60;
      }).length;

      return {
        category,
        total: categoryVendors.length,
        assessed,
        avgScore,
        highRisk
      };
    });

    setCategoryReports(reports.filter(r => r.total > 0));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const handleExportReport = (reportType: string) => {
    addToast({
      type: 'info',
      title: 'กำลังสร้างรายงาน',
      message: `กำลังสร้าง${reportType} กรุณารอสักครู่...`
    });

    // Implement export functionality here
    setTimeout(() => {
      addToast({
        type: 'success',
        title: 'สำเร็จ',
        message: `ส่งออก${reportType}เรียบร้อยแล้ว`
      });
    }, 2000);
  };

  const getCategoryName = (category: string) => {
    const categoryMap: Record<string, string> = {
      '1': 'Administrative',
      '2': 'Service Provider/Security',
      '3': 'Structure/Construction/Maintenance',
      '4': 'Transportation',
    };
    return categoryMap[category] || category;
  };

  /*
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };*/

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">รายงาน CSM</h1>
                <p className="text-gray-600">รายงานและสถิติการประเมิน CSM</p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 mb-8 bg-white border rounded-lg shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ตัวกรองรายงาน</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">หมวดหมู่</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="1">Administrative</option>
                <option value="2">Service Provider</option>
                <option value="3">Structure/Construction</option>
                <option value="4">Transportation</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">สถานะ</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทั้งหมด</option>
                <option value="completed">ประเมินแล้ว</option>
                <option value="pending">รอประเมิน</option>
                <option value="expired">หมดอายุ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ผู้รับเหมาทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalVendors}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ประเมินแล้ว</p>
                  <p className="text-2xl font-bold text-green-600">{summary.assessedVendors}</p>
                  <p className="text-xs text-gray-500">
                    {summary.totalVendors > 0 
                      ? `${Math.round((summary.assessedVendors / summary.totalVendors) * 100)}%`
                      : '0%'
                    }
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">รอประเมิน</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.pendingAssessments}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">หมดอายุ</p>
                  <p className="text-2xl font-bold text-red-600">{summary.expiredAssessments}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">คะแนนเฉลี่ย</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.averageScore.toFixed(1)}/100
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">เสี่ยงสูง</p>
                  <p className="text-2xl font-bold text-red-600">{summary.highRiskVendors}</p>
                  <p className="text-xs text-gray-500">คะแนน &lt; 60</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Category Report */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">รายงานตามหมวดหมู่</h2>
              <button
                onClick={() => handleExportReport('รายงานตามหมวดหมู่')}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Download className="w-4 h-4 mr-1" />
                ส่งออก
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 font-medium text-left text-gray-700">หมวดหมู่</th>
                    <th className="py-3 font-medium text-center text-gray-700">ทั้งหมด</th>
                    <th className="py-3 font-medium text-center text-gray-700">ประเมินแล้ว</th>
                    <th className="py-3 font-medium text-center text-gray-700">คะแนนเฉลี่ย</th>
                    <th className="py-3 font-medium text-center text-gray-700">เสี่ยงสูง</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReports.map((report, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{getCategoryName(report.category)}</td>
                      <td className="py-3 text-center">{report.total}</td>
                      <td className="py-3 text-center">
                        <span className="text-green-600">{report.assessed}</span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({report.total > 0 ? Math.round((report.assessed / report.total) * 100) : 0}%)
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          report.avgScore >= 80 ? 'bg-green-100 text-green-800' :
                          report.avgScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {report.avgScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {report.highRisk > 0 ? (
                          <span className="font-medium text-red-600">{report.highRisk}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

{/* Export Options */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">ส่งออกรายงาน</h2>
            
            <div className="space-y-4">
              <button
                onClick={() => handleExportReport('รายงานสรุปผล')}
                className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">รายงานสรุปผล</p>
                    <p className="text-sm text-gray-600">รายงานภาพรวมการประเมิน CSM</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleExportReport('รายงานรายละเอียด')}
                className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-3 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">รายงานรายละเอียด</p>
                    <p className="text-sm text-gray-600">รายงานผลประเมินแต่ละผู้รับเหมา</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleExportReport('รายงานตามหมวดหมู่')}
                className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <PieChart className="w-5 h-5 mr-3 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">รายงานตามหมวดหมู่</p>
                    <p className="text-sm text-gray-600">วิเคราะห์ผลตามประเภทผู้รับเหมา</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleExportReport('รายงานความเสี่ยง')}
                className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-3 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">รายงานความเสี่ยง</p>
                    <p className="text-sm text-gray-600">ผู้รับเหมาที่มีความเสี่ยงสูง</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => handleExportReport('รายงานการปฏิบัติตามกำหนด')}
                className="flex items-center justify-between w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-orange-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">รายงานการปฏิบัติตามกำหนด</p>
                    <p className="text-sm text-gray-600">ผู้รับเหมาที่ครบกำหนดประเมิน</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="pt-6 mt-6 border-t">
              <h3 className="mb-3 text-sm font-medium text-gray-700">รูปแบบไฟล์</h3>
              <div className="flex space-x-2">
                <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">PDF</span>
                <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded">Excel</span>
                <span className="px-2 py-1 text-xs text-purple-800 bg-purple-100 rounded">CSV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="p-6 mt-8 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">กิจกรรมล่าสุด</h2>
            <button
              onClick={() => navigate('/csm/assessments/history')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div className="space-y-4">
            {/* Mock activities - replace with real data */}
            <div className="flex items-center p-3 space-x-4 border rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  ประเมิน CSM เสร็จสิ้น - ABC Construction Co.
                </p>
                <p className="text-xs text-gray-500">2 ชั่วโมงที่แล้ว</p>
              </div>
              <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded">คะแนน: 85</span>
            </div>

            <div className="flex items-center p-3 space-x-4 border rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  เริ่มประเมิน CSM - XYZ Services Ltd.
                </p>
                <p className="text-xs text-gray-500">5 ชั่วโมงที่แล้ว</p>
              </div>
              <span className="px-2 py-1 text-xs text-yellow-800 bg-yellow-100 rounded">กำลังดำเนินการ</span>
            </div>

            <div className="flex items-center p-3 space-x-4 border rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  เพิ่มผู้รับเหมาใหม่ - DEF Maintenance Co.
                </p>
                <p className="text-xs text-gray-500">1 วันที่แล้ว</p>
              </div>
              <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">ใหม่</span>
            </div>

            <div className="flex items-center p-3 space-x-4 border rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  การประเมินหมดอายุ - GHI Security Co.
                </p>
                <p className="text-xs text-gray-500">2 วันที่แล้ว</p>
              </div>
              <span className="px-2 py-1 text-xs text-red-800 bg-red-100 rounded">ต้องประเมินใหม่</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 mt-8 text-white rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
          <h2 className="mb-4 text-lg font-semibold">การดำเนินการด่วน</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <button
              onClick={() => navigate('/csm/analytics')}
              className="flex items-center justify-center px-4 py-3 transition-colors rounded-lg bg-white/20 hover:bg-white/30"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              วิเคราะห์เชิงลึก
            </button>
            
            <button
              onClick={() => navigate('/csm/vendors/add')}
              className="flex items-center justify-center px-4 py-3 transition-colors rounded-lg bg-white/20 hover:bg-white/30"
            >
              <Users className="w-5 h-5 mr-2" />
              เพิ่มผู้รับเหมา
            </button>
            
            <button
              onClick={() => navigate('/csm/settings')}
              className="flex items-center justify-center px-4 py-3 transition-colors rounded-lg bg-white/20 hover:bg-white/30"
            >
              <Filter className="w-5 h-5 mr-2" />
              ตั้งค่ารายงาน
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CSMReportsPage;                