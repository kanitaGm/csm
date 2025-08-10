// src/features/csm/components/AssessmentSummary.tsx

import React, { useState, useEffect, useCallback , useMemo} from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Eye, FileText, RefreshCw } from 'lucide-react';
import type { CSMAssessmentDoc } from '../../../types';
import { formatDate} from '../../../utils/dateUtils';
import csmService from '../../../services/csmService';
import { CardSkeleton} from '../../../components/ui/SkeletonLoader';


interface CSMAssessmentSummaryProps {
  vdCode: string;
  onViewDetails?: (assessmentId: string) => void;
}

// Types
type ScoreKey = '0' | '1' | '2' | '3' | '4' | '5' | 'n/a';
type ScoreDistribution = Record<ScoreKey, number>;

// Custom Hook
const useAssessments = (vdCode: string) => {
  const [assessments, setAssessments] = useState<CSMAssessmentDoc[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<CSMAssessmentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await csmService.assessments.getByVdCode(vdCode);
      setAssessments(data);
      
      // Find current active assessment
      const active = data.find(a => a.isActive);
      setCurrentAssessment(active || null);
    } catch (error) {
      console.error('Error loading assessments:', error);
      setError('ไม่สามารถโหลดข้อมูลการประเมินได้');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [vdCode]);

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  return { assessments, currentAssessment, loading, error, refetch, isRefreshing };
};

// Utility Functions
const getScoreDistribution = (assessment: CSMAssessmentDoc): ScoreDistribution => {
  const distribution: ScoreDistribution = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'n/a': 0 };
  
  assessment.answers.forEach(answer => {
    if (answer.score && answer.score in distribution) {
      distribution[answer.score as ScoreKey]++;
    }
  });
  
  return distribution;
};

const getCompletionRate = (assessment: CSMAssessmentDoc): number => {
  const completed = assessment.answers.filter(answer => 
    answer.isFinish && answer.comment.trim() && answer.score && answer.score !== ''
  ).length;
  
  return assessment.answers.length > 0 ? (completed / assessment.answers.length) * 100 : 0;
};

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-800 border-green-300';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getScoreColor = (score: string): string => {
  switch (score) {
    case '5': return 'bg-green-500';
    case '4': return 'bg-green-400';
    case '3': return 'bg-blue-400';
    case '2': return 'bg-yellow-400';
    case '1': return 'bg-orange-400';
    case '0': return 'bg-red-400';
    default: return 'bg-gray-400';
  }
};

// Components
const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ percentage, color = 'blue' }) => (
  <div className="w-24 h-2 overflow-hidden bg-gray-200 rounded-full">
    <div 
      className={`h-full bg-${color}-500 transition-all duration-700 ease-out rounded-full relative`}
      style={{ width: `${Math.min(percentage, 100)}%` }}
    >
      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
    </div>
  </div>
);

const ScoreTrend: React.FC<{ assessments: CSMAssessmentDoc[] }> = React.memo(({ assessments }) => {
  const scores = useMemo(() => 
    assessments
      .slice(-10) // Last 10 assessments
      .map(a => parseFloat(a.avgScore || '0'))
      .reverse(),
    [assessments]
  );
  
  if (scores.length <= 1) return null;

  return (
    <div className="flex items-end h-8 space-x-1">
      {scores.map((score, i) => (
        <div 
          key={i}
          className="w-1 transition-all bg-blue-400 rounded-sm cursor-pointer hover:bg-blue-600"
          style={{ height: `${Math.max((score / 5) * 100, 10)}%` }}
          title={`คะแนน: ${score.toFixed(1)}`}
        />
      ))}
    </div>
  );
});

const EmptyState: React.FC<{ type: 'no-data' | 'no-current'; onStartAssessment?: () => void }> = React.memo(({ type, onStartAssessment }) => (
  <div className="py-12 text-center">
    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
      {type === 'no-data' ? 
        <FileText className="w-8 h-8 text-gray-400" /> : 
        <AlertTriangle className="w-8 h-8 text-orange-400" />
      }
    </div>
    <h3 className="mb-2 text-lg font-medium text-gray-900">
      {type === 'no-data' ? 'ยังไม่มีการประเมิน' : 'ไม่มีการประเมินที่ใช้งานอยู่'}
    </h3>
    <p className="mb-4 text-gray-600">
      {type === 'no-data' ? 
        'บริษัทนี้ยังไม่มีประวัติการประเมิน CSM' : 
        'ต้องการเริ่มการประเมินใหม่หรือไม่?'
      }
    </p>
    {type === 'no-current' && onStartAssessment && (
      <button 
        onClick={onStartAssessment}
        className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        เริ่มการประเมิน
      </button>
    )}
  </div>
));

const ErrorAlert: React.FC<{ message: string; onRetry: () => void }> = React.memo(({ message, onRetry }) => (
  <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
        <span className="text-sm text-red-800">{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-red-600 hover:text-red-800"
      >
        ลองใหม่
      </button>
    </div>
  </div>
));

// Main Component
const AssessmentSummary: React.FC<CSMAssessmentSummaryProps> = ({ vdCode, onViewDetails }) => {
  const { assessments, currentAssessment, loading, error, refetch, isRefreshing } = useAssessments(vdCode);
  const [selectedTab, setSelectedTab] = useState<'current' | 'history'>('current');

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return <ErrorAlert message={error} onRetry={refetch} />;
  }

  // No Data State
  if (assessments.length === 0) {
    return (
      <div className="bg-white border rounded-lg shadow-sm">
        <EmptyState type="no-data" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setSelectedTab('current')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'current'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                การประเมินปัจจุบัน
              </button>
              <button
                onClick={() => setSelectedTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ประวัติการประเมิน ({assessments.length})
              </button>
            </nav>
            
            {/* Refresh Button */}
            <button
              onClick={refetch}
              disabled={isRefreshing}
              className="p-2 text-gray-500 transition-colors rounded-lg hover:text-gray-700 disabled:opacity-50 hover:bg-gray-100"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Current Assessment Tab */}
        {selectedTab === 'current' && currentAssessment && (
          <div className="p-6">
            <CurrentAssessmentView 
              assessment={currentAssessment}
              onViewDetails={onViewDetails}
            />
          </div>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <div className="p-6">
            <AssessmentHistoryView 
              assessments={assessments}
              onViewDetails={onViewDetails}
            />
          </div>
        )}

        {/* No Current Assessment */}
        {selectedTab === 'current' && !currentAssessment && (
          <EmptyState type="no-current" />
        )}
      </div>
    </div>
  );
};

// Current Assessment View Component
const CurrentAssessmentView: React.FC<{
  assessment: CSMAssessmentDoc;
  onViewDetails?: (assessmentId: string) => void;
}> = React.memo(({ assessment, onViewDetails }) => {
  const scoreDistribution = useMemo(() => getScoreDistribution(assessment), [assessment]);
  const completionRate = useMemo(() => getCompletionRate(assessment), [assessment]);
  
  const totalScore = parseFloat(assessment.finalScore || '0');
  const avgScore = parseFloat(assessment.avgScore || '0');

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 transition-all border border-blue-200 rounded-lg bg-blue-50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">คะแนนรวม</p>
              <p className="text-2xl font-bold text-blue-900">{totalScore.toFixed(1)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="p-4 transition-all border border-green-200 rounded-lg bg-green-50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-green-900">{avgScore.toFixed(1)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="p-4 transition-all border border-purple-200 rounded-lg bg-purple-50 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">ความครบถ้วน</p>
              <p className="text-2xl font-bold text-purple-900">{completionRate.toFixed(0)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="p-4 transition-all bg-white border border-gray-200 rounded-lg hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ระดับความเสี่ยง</p>
              <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(assessment.riskLevel || '')}`}>
                {assessment.riskLevel || 'ไม่ระบุ'}
              </span>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Score Distribution Chart */}
        <div className="p-4 rounded-lg bg-gray-50">
          <h4 className="mb-4 font-medium text-gray-900">การกระจายคะแนน</h4>
          <div className="space-y-3">
            {Object.entries(scoreDistribution).map(([score, count]) => {
              const percentage = assessment.answers.length > 0 ? (count / assessment.answers.length) * 100 : 0;
              
              return (
                <div key={score} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded transition-transform group-hover:scale-110 ${getScoreColor(score)}`}
                      title={`${score} คะแนน: ${count} รายการ (${percentage.toFixed(1)}%)`}
                    ></div>
                    <span className="text-sm font-medium">
                      {score === 'n/a' ? 'N/A' : `${score} คะแนน`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar percentage={percentage} />
                    <span className="w-8 text-sm text-gray-600">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assessment Info */}
        <div className="p-4 rounded-lg bg-gray-50">
          <h4 className="mb-4 font-medium text-gray-900">รายละเอียดการประเมิน</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">หมวดหมู่:</span>
              <span className="text-sm font-medium">{assessment.vdCategory || 'ไม่ระบุ'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">เลขที่อ้างอิง:</span>
              <span className="text-sm font-medium">{assessment.vdRefDoc || 'ไม่ระบุ'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">พื้นที่ปฏิบัติงาน:</span>
              <span className="text-sm font-medium">{assessment.vdWorkingArea || 'ไม่ระบุ'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ผู้ประเมิน:</span>
              <span className="text-sm font-medium">{assessment.assessor || 'ไม่ระบุ'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">วันที่ประเมิน:</span>
              <span className="text-sm font-medium">
                {formatDate(assessment.createdAt)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">อัพเดทล่าสุด:</span>
              <span className="text-sm font-medium">
                {formatDate(assessment.updatedAt || assessment.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onViewDetails && (
        <div className="flex justify-center">
          <button
            onClick={() => onViewDetails(assessment.id)}
            className="flex items-center gap-2 px-6 py-2 text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียดทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
});

// Assessment History View Component
const AssessmentHistoryView: React.FC<{
  assessments: CSMAssessmentDoc[];
  onViewDetails?: (assessmentId: string) => void;
}> = React.memo(({ assessments, onViewDetails }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">ประวัติการประเมินทั้งหมด</h4>
        <ScoreTrend assessments={assessments} />
      </div>
      
      <div className="space-y-3">
        {assessments.map((assessment) => (
          <div 
            key={assessment.id}
            className="p-4 transition-colors border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h5 className="font-medium text-gray-900">
                    การประเมิน {formatDate(assessment.createdAt)}
                  </h5>
                  {assessment.isActive && (
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      ใช้งานอยู่
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getRiskLevelColor(assessment.riskLevel || '')}`}>
                    {assessment.riskLevel || 'ไม่ระบุ'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <span className="text-gray-600">คะแนนรวม:</span>
                    <span className="ml-1 font-medium">{parseFloat(assessment.finalScore || '0').toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">คะแนนเฉลี่ย:</span>
                    <span className="ml-1 font-medium">{parseFloat(assessment.avgScore || '0').toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ผู้ประเมิน:</span>
                    <span className="ml-1 font-medium">{assessment.assessor || 'ไม่ระบุ'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">อัพเดท:</span>
                    <span className="ml-1 font-medium">
                      {formatDate(assessment.updatedAt || assessment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(assessment.id)}
                  className="flex items-center gap-1 p-2 ml-4 text-blue-600 transition-colors rounded-lg hover:text-blue-800 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">ดู</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AssessmentSummary;
