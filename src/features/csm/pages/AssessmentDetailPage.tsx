// src/features/csm/pages/AssessmentDetailPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, Download, Edit, Trash2, Eye, FileText, BarChart3, 
  AlertTriangle, CheckCircle2, ChevronDown, Search, Filter,
  TrendingUp, Target, Award, Clock
} from 'lucide-react';
import type { CSMAssessmentDoc, CSMFormField, Company, CSMAssessmentAnswer } from '../../../types/';
import {csmService} from '../../../services/csmService';
import { formatDate } from '../../../utils/dateUtils';

interface CSMAssessmentDetailPageProps {
  assessmentId?: string;
  onNavigateBack?: () => void;
}

// Type definitions
interface CSMFilterState {
  scoreRange: 'all' | '0-2' | '3-5' | 'na';
  status: 'all' | 'completed' | 'incomplete';
  hasFiles: boolean;
}

// Memoized Components for Performance
const ScoreCard = React.memo<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}>(({ title, value, subtitle, icon: Icon, color }) => (
  <div className="p-6 transition-all duration-200 bg-white border rounded-lg shadow-sm cursor-pointer group hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-2xl font-bold text-${color}-600 group-hover:scale-105 transition-transform`}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
      <Icon className={`w-8 h-8 text-${color}-600 group-hover:scale-110 transition-transform`} />
    </div>
  </div>
));

const InteractiveScoreChart = React.memo<{
  scoreDistribution: Record<string, number>;
  getScoreColor: (score: string) => string;
}>(({ scoreDistribution, getScoreColor }) => {
  const totalAnswers = Object.values(scoreDistribution).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(scoreDistribution));

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <h2 className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-900">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        การกระจายคะแนน
      </h2>
      
      <div className="grid grid-cols-7 gap-3">
        {Object.entries(scoreDistribution).map(([score, count], index) => {
          const height = maxCount > 0 ? Math.max((count / maxCount) * 100, 5) : 5;
          const percentage = totalAnswers > 0 ? ((count / totalAnswers) * 100).toFixed(1) : '0';
          
          return (
            <div key={score} className="relative group">
              {/* Animated bar */}
              <div className="flex items-end h-20 mb-2 overflow-hidden bg-gray-200 rounded-t">
                <div 
                  className={`w-full transition-all duration-700 ease-out rounded-t ${getScoreColor(score)} opacity-80 hover:opacity-100`}
                  style={{ 
                    height: `${height}%`,
                    transitionDelay: `${index * 100}ms`
                  }}
                />
              </div>
              
              {/* Score label */}
              <div className="text-center">
                <div className="text-sm font-bold text-gray-900">
                  {score === 'n/a' ? 'N/A' : score}
                </div>
                <div className="text-xs text-gray-600">{count} ข้อ</div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute z-10 px-3 py-2 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded-lg opacity-0 bottom-full left-1/2 group-hover:opacity-100 whitespace-nowrap">
                <div className="font-medium">{count} คำตอบ</div>
                <div>({percentage}% ของทั้งหมด)</div>
                <div className="absolute transform -translate-x-1/2 border-4 border-transparent top-full left-1/2 border-t-gray-800"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const SearchAndFilter = React.memo<{
  onSearchChange: (search: string) => void;
  onFilterChange: (filters: CSMFilterState) => void;
  totalAnswers: number;
  filteredCount: number;
}>(({ onSearchChange, onFilterChange, totalAnswers, filteredCount }) => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CSMFilterState>({
    scoreRange: 'all',
    status: 'all',
    hasFiles: false
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleFilterChange = (newFilters: CSMFilterState) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="p-4 mb-6 bg-white border rounded-lg shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Search and filter toggle */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหาคำถาม, ความเห็น..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              แสดง {filteredCount} จาก {totalAnswers} คำตอบ
            </span>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              ตัวกรอง
            </button>
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">คะแนน:</label>
              <select 
                value={filters.scoreRange}
                onChange={(e) => handleFilterChange({ ...filters, scoreRange: e.target.value as CSMFilterState['scoreRange'] })}
                className="px-3 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="all">ทั้งหมด</option>
                <option value="0-2">ต่ำ (0-2)</option>
                <option value="3-5">สูง (3-5)</option>
                <option value="na">N/A</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">สถานะ:</label>
              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange({ ...filters, status: e.target.value as CSMFilterState['status'] })}
                className="px-3 py-1 text-sm border border-gray-300 rounded"
              >
                <option value="all">ทั้งหมด</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="incomplete">ไม่เสร็จ</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hasFiles}
                onChange={(e) => handleFilterChange({ ...filters, hasFiles: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">มีไฟล์แนบ</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
});

const EnhancedAnswerCard = React.memo<{
  answer: CSMAssessmentAnswer;
  field?: CSMFormField;
  index: number;
  getScoreColor: (score: string) => string;
}>(({ answer, field, index, getScoreColor }) => {
  const [expanded, setExpanded] = useState(false);
  index.toString();

  return (
    <div className="transition-all duration-200 border border-gray-200 rounded-lg group hover:shadow-lg hover:border-blue-300">
      {/* Header - always visible */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center flex-1 gap-3">
          <span className="text-lg font-bold text-blue-600">ข้อ {answer.ckItem}</span>
          
          <div className="flex items-center gap-2">
            {/* Score badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all group-hover:scale-105 border ${getScoreColor(answer.score || 'n/a')}`}>
              {answer.score === 'n/a' ? 'N/A' : `${answer.score}/5`}
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {answer.isFinish && (
                <div className="flex items-center gap-1 px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>เสร็จ</span>
                </div>
              )}
              {answer.files && answer.files.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                  <FileText className="w-3 h-3" />
                  <span>{answer.files.length}</span>
                </div>
              )}
              {answer.ckType === 'M' && (
                <div className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                  จำเป็น
                </div>
              )}
            </div>
          </div>
        </div>
        
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Question preview - always visible */}
      <div className="px-4 pb-2">
        <h3 className="font-medium text-gray-900 line-clamp-2">
          {field?.ckQuestion || 'ไม่พบคำถาม'}
        </h3>
      </div>

      {/* Expandable content */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="px-4 pb-4 space-y-4">
          {/* Full question and requirements */}
          {field?.ckRequirement && (
            <div className="p-3 border-l-4 border-blue-400 rounded-r bg-blue-50">
              <p className="text-sm text-blue-900">
                <strong>เกณฑ์การประเมิน:</strong> {field.ckRequirement}
              </p>
            </div>
          )}

          {/* Score details */}
          <div>
            <span className="block mb-2 text-sm font-medium text-gray-600">คะแนนและน้ำหนัก:</span>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-2 rounded-lg text-sm font-medium border ${getScoreColor(answer.score || 'n/a')}`}>
                {answer.score === 'n/a' ? 'N/A (ไม่เกี่ยวข้อง)' : `${answer.score}/5 คะแนน`}
              </span>
              {field?.fScore && (
                <span className="text-sm text-gray-600">
                  น้ำหนัก: {field.fScore}
                  {answer.tScore && ` → คะแนนถ่วงน้ำหนัก: ${answer.tScore}`}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <span className="block mb-2 text-sm font-medium text-gray-600">ความเห็น/หมายเหตุ:</span>
            <div className="p-3 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {answer.comment || 'ไม่มีความเห็น'}
              </p>
            </div>
          </div>

          {/* Files */}
          {answer.files && answer.files.length > 0 && (
            <div>
              <span className="block mb-2 text-sm font-medium text-gray-600">
                ไฟล์แนบ ({answer.files.length} ไฟล์):
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {answer.files.map((fileUrl, fileIndex) => (
                  <a
                    key={fileIndex}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 group"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 truncate">
                      ไฟล์ {fileIndex + 1}
                    </span>
                    <span className="ml-auto text-xs text-blue-600 group-hover:text-blue-800">
                      เปิด ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Main Component
const AssessmentDetailPage: React.FC<CSMAssessmentDetailPageProps> = ({ 
  assessmentId: propAssessmentId, 
  onNavigateBack 
}) => {
  const assessmentId = propAssessmentId || new URLSearchParams(window.location.search).get('id') || '';
  
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<CSMAssessmentDoc | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [formFields, setFormFields] = useState<CSMFormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CSMFilterState>({
    scoreRange: 'all',
    status: 'all',
    hasFiles: false
  });

  // Memoized calculations
  const completionStats = useMemo(() => {
    if (!assessment || assessment.answers.length === 0) {
      return { 
        completionRate: 0, 
        completedCount: 0, 
        totalCount: 0,
        withAnswersCount: 0 
      };
    }

    const completed = assessment.answers.filter(a => a.isFinish).length;
    const withAnswers = assessment.answers.filter(a => 
      a.comment.trim() || (a.score && a.score !== '')
    ).length;
    
    return {
      completionRate: (completed / assessment.answers.length) * 100,
      completedCount: completed,
      totalCount: assessment.answers.length,
      withAnswersCount: withAnswers
    };
  }, [assessment]);

  const scoreDistribution = useMemo(() => {
    if (!assessment) return {};
    
    const distribution: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'n/a': 0 };
    
    assessment.answers.forEach(answer => {
      if (answer.score && answer.score in distribution) {
        distribution[answer.score]++;
      }
    });
    
    return distribution;
  }, [assessment]);

  // Filtered answers based on search and filters
  const filteredAnswers = useMemo(() => {
    if (!assessment) return [];
    
    return assessment.answers.filter(answer => {
      // Search filter
      if (searchTerm) {
        const field = formFields.find(f => f.ckItem === answer.ckItem);
        const searchableText = `${field?.ckQuestion || ''} ${answer.comment || ''}`.toLowerCase();
        if (!searchableText.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      // Score range filter
      if (filters.scoreRange !== 'all') {
        if (filters.scoreRange === 'na' && answer.score !== 'n/a') return false;
        if (filters.scoreRange === '0-2' && (!answer.score || answer.score === 'n/a' || parseInt(answer.score) > 2)) return false;
        if (filters.scoreRange === '3-5' && (!answer.score || answer.score === 'n/a' || parseInt(answer.score) < 3)) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        if (filters.status === 'completed' && !answer.isFinish) return false;
        if (filters.status === 'incomplete' && answer.isFinish) return false;
      }

      // Files filter
      if (filters.hasFiles && (!answer.files || answer.files.length === 0)) {
        return false;
      }

      return true;
    });
  }, [assessment, formFields, searchTerm, filters]);

  const handleNavigateBack = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.href = '/csm';
    }
  }, [onNavigateBack]);

  const handleEdit = useCallback(() => {
    if (assessment) {
      window.location.href = `/csm/evaluate?vdCode=${assessment.vdCode}`;
    }
  }, [assessment]);

  const loadAssessmentDetail = useCallback(async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      const [assessmentData, formData] = await Promise.all([
        csmService.assessments.getById(assessmentId),
        csmService.forms.getCSMChecklist()
      ]);

      if (!assessmentData) {
        throw new Error('ไม่พบข้อมูลการประเมิน');
      }
      setAssessment(assessmentData);

      if (formData) {
        setFormFields(formData.fields);
      }

      // Load company data
      if (assessmentData.vdCode) {
        const companyData = await csmService.companies.getByVdCode(assessmentData.vdCode);
        if (companyData) {
          setCompany(companyData);
        }
      }

    } catch (err) {
      console.error('Error loading assessment detail:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentDetail();
    }
  }, [assessmentId, loadAssessmentDetail]);

  const handleDelete = useCallback(async () => {
    if (!assessmentId) return;

    try {
      setDeleting(true);
      await csmService.assessments.delete(assessmentId);
      alert('ลบการประเมินเรียบร้อยแล้ว');
      handleNavigateBack();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [assessmentId, handleNavigateBack]);

  const handleExport = useCallback(async () => {
    if (!assessment) return;
    
    setExporting(true);
    
    try {
      const csvRows = [
        // Header
        ['ข้อ', 'คำถาม', 'คะแนน', 'ความเห็น', 'สถานะ', 'น้ำหนัก', 'เกณฑ์การประเมิน'].join(','),
        
        // Data rows
        ...filteredAnswers.map(answer => {
          const field = formFields.find(f => f.ckItem === answer.ckItem);
          return [
            answer.ckItem,
            `"${field?.ckQuestion?.replace(/"/g, '""') || 'ไม่พบคำถาม'}"`,
            answer.score || 'N/A',
            `"${answer.comment?.replace(/"/g, '""') || 'ไม่มีความเห็น'}"`,
            answer.isFinish ? 'เสร็จสิ้น' : 'ไม่เสร็จ',
            field?.fScore || '1',
            `"${field?.ckRequirement?.replace(/"/g, '""') || 'ไม่ระบุ'}"`
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment_${assessment.vdCode}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    } finally {
      setExporting(false);
    }
  }, [assessment, formFields, filteredAnswers]);

  const getRiskLevelColor = useCallback((riskLevel: string): string => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, []);

  const getScoreColor = useCallback((score: string): string => {
    switch (score) {
      case '5': return 'text-green-700 bg-green-50 border-green-200';
      case '4': return 'text-green-600 bg-green-50 border-green-200';
      case '3': return 'text-blue-600 bg-blue-50 border-blue-200';
      case '2': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case '1': return 'text-orange-600 bg-orange-50 border-orange-200';
      case '0': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">ไม่พบข้อมูลการประเมิน</h2>
          <p className="mb-4 text-gray-600">{error || 'ไม่พบข้อมูลการประเมินที่ระบุ'}</p>
          <button
            onClick={handleNavigateBack}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับ</span>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">รายละเอียดการประเมิน</h1>
                <p className="text-sm text-gray-600">
                  {company?.name || assessment.vdName} -  {assessment.createdAt ? formatDate(assessment.createdAt) : 'ไม่ระบุ'}     
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2">
                {assessment.isApproved && (
                  <div className="flex items-center gap-2 px-3 py-1 text-green-800 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">ยืนยันแล้ว</span>
                  </div>
                )}
                {assessment.isActive && (
                  <div className="flex items-center gap-2 px-3 py-1 text-blue-800 bg-blue-100 rounded-full">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">ใช้งานอยู่</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'กำลังส่งออก...' : 'Export CSV'}
              </button>
              
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-4 h-4" />
                แก้ไข
              </button>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 transition-colors border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Enhanced Overview Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard
            title="คะแนนรวม"
            value={assessment.finalScore ? parseFloat(assessment.finalScore).toFixed(1) : '0'}
            subtitle="จากคะแนนเต็ม"
            icon={BarChart3}
            color="blue"
          />
          <ScoreCard
            title="คะแนนเฉลี่ย"
            value={assessment.avgScore ? parseFloat(assessment.avgScore).toFixed(1) : '0'}
            subtitle="คะแนนเฉลี่ยต่อข้อ"
            icon={TrendingUp}
            color="green"
          />
          <ScoreCard
            title="ความครบถ้วน"
            value={`${completionStats.completionRate.toFixed(0)}%`}
            subtitle={`${completionStats.completedCount}/${completionStats.totalCount} ข้อ`}
            icon={Target}
            color="purple"
          />
          <ScoreCard
            title="ระดับความเสี่ยง"
            value={assessment.riskLevel || 'Unknown'}
            subtitle="ผลการประเมิน"
            icon={Award}
            color="gray"
          />
        </div>

        {/* Interactive Score Distribution */}
        <InteractiveScoreChart 
          scoreDistribution={scoreDistribution}
          getScoreColor={getScoreColor}
        />

        {/* Assessment Information */}
        <div className="p-6 mb-8 bg-white border rounded-lg shadow-sm">
          <h2 className="flex items-center gap-2 mb-6 text-lg font-semibold text-gray-900">
            <FileText className="w-5 h-5 text-blue-600" />
            ข้อมูลการประเมิน
          </h2>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">ข้อมูลบริษัท</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">บริษัท:</span>
                  <span className="font-medium text-gray-900">{assessment.vdName}</span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">รหัส:</span>
                  <span className="font-medium text-gray-900">{assessment.vdCode}</span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">หมวดหมู่:</span>
                  <span className="font-medium text-gray-900">{assessment.vdCategory || 'ไม่ระบุ'}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">รายละเอียดโครงการ</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">เลขอ้างอิง:</span>
                  <span className="font-medium text-gray-900">{assessment.vdRefDoc || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">พื้นที่งาน:</span>
                  <span className="font-medium text-gray-900">{assessment.vdWorkingArea || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">ความเสี่ยง:</span>
                  <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(assessment.riskLevel || 'Unknown')}`}>
                    {assessment.riskLevel || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">การประเมิน</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">ผู้ประเมิน:</span>
                  <span className="font-medium text-gray-900">{assessment.assessor || 'ไม่ระบุ'}</span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">วันที่สร้าง:</span>
                  <span className="font-medium text-gray-900">{assessment.createdAt ? formatDate(assessment.createdAt) : 'ไม่ระบุ'}  </span>
                </div>
                <div className="flex items-start">
                  <span className="flex-shrink-0 w-20 text-sm text-gray-600">อัพเดท:</span>
                  <span className="font-medium text-gray-900">{assessment.createdAt ? formatDate(assessment.createdAt || assessment.updatedAt) : 'ไม่ระบุ'}  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          onSearchChange={setSearchTerm}
          onFilterChange={setFilters}
          totalAnswers={assessment.answers.length}
          filteredCount={filteredAnswers.length}
        />

        {/* Assessment Answers */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">รายละเอียดการประเมิน</h2>
                <p className="text-sm text-gray-600">
                  แสดง {filteredAnswers.length} จาก {assessment.answers.length} คำตอบ
                  {completionStats.withAnswersCount > 0 && ` - ${completionStats.withAnswersCount} มีคำตอบ`}
                </p>
              </div>
              
              {searchTerm && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Search className="w-4 h-4" />
                  <span>ค้นหา: "{searchTerm}"</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {filteredAnswers.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">ไม่พบผลลัพธ์</h3>
                <p className="text-gray-600">
                  ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองเพื่อดูข้อมูลเพิ่มเติม
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ scoreRange: 'all', status: 'all', hasFiles: false });
                  }}
                  className="px-4 py-2 mt-4 text-blue-600 transition-colors border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnswers.map((answer, index) => {
                  const field = formFields.find(f => f.ckItem === answer.ckItem);
                  
                  return (
                    <EnhancedAnswerCard
                      key={answer.ckItem}
                      answer={answer}
                      field={field}
                      index={index}
                      getScoreColor={getScoreColor}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 duration-200 bg-white shadow-2xl rounded-xl animate-in zoom-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบ</h3>
            </div>
            
            <div className="mb-6">
              <p className="mb-3 text-gray-600">
                คุณแน่ใจหรือไม่ที่จะลบการประเมินนี้?
              </p>
              <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                <p className="text-sm text-red-800">
                  <strong>⚠️ คำเตือน:</strong> การดำเนินการนี้ไม่สามารถย้อนกลับได้ และจะลบข้อมูลทั้งหมดรวมถึงไฟล์แนบ
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />}
                {deleting ? 'กำลังลบ...' : 'ลบการประเมิน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentDetailPage;