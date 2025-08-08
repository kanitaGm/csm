// src/features/csm/components/AssessmentSummary.tsx

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Eye,  FileText } from 'lucide-react';
import type { AssessmentDoc } from '../../../types/types';
import { formatDate} from '../../../components/utils/dateUtils';
import csmService from '../../../services/csmService';

interface AssessmentSummaryProps {
  vdCode: string;
  onViewDetails?: (assessmentId: string) => void;
}

const AssessmentSummary: React.FC<AssessmentSummaryProps> = ({ vdCode, onViewDetails }) => {
  const [assessments, setAssessments] = useState<AssessmentDoc[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'current' | 'history'>('current');

  useEffect(() => {
    loadAssessments();
  }, [vdCode]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await csmService.assessments.getByVdCode(vdCode);
      setAssessments(data);
      
      // Find current active assessment
      const active = data.find(a => a.isActive);
      setCurrentAssessment(active || null);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate score distribution
  const getScoreDistribution = (assessment: AssessmentDoc) => {
    const distribution = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, 'n/a': 0 };
    
    assessment.answers.forEach(answer => {
      if (answer.score && distribution.hasOwnProperty(answer.score)) {
        distribution[answer.score as keyof typeof distribution]++;
      }
    });
    
    return distribution;
  };

  // Calculate completion rate
  const getCompletionRate = (assessment: AssessmentDoc): number => {
    const completed = assessment.answers.filter(answer => 
      answer.isFinish && answer.comment.trim() && answer.score && answer.score !== ''
    ).length;
    
    return assessment.answers.length > 0 ? (completed / assessment.answers.length) * 100 : 0;
  };

  // Get risk level color
  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Score color mapping
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีการประเมิน</h3>
        <p className="text-gray-600">บริษัทนี้ยังไม่มีประวัติการประเมิน CSM</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setSelectedTab('current')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              การประเมินปัจจุบัน
            </button>
            <button
              onClick={() => setSelectedTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ประวัติการประเมิน ({assessments.length})
            </button>
          </nav>
        </div>

        {/* Current Assessment Tab */}
        {selectedTab === 'current' && currentAssessment && (
          <div className="p-6">
            <CurrentAssessmentView 
              assessment={currentAssessment}
              onViewDetails={onViewDetails}
              getScoreDistribution={getScoreDistribution}
              getCompletionRate={getCompletionRate}
              getRiskLevelColor={getRiskLevelColor}
              getScoreColor={getScoreColor}
            />
          </div>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <div className="p-6">
            <AssessmentHistoryView 
              assessments={assessments}
              onViewDetails={onViewDetails}
              getRiskLevelColor={getRiskLevelColor}
            />
          </div>
        )}

        {/* No Current Assessment */}
        {selectedTab === 'current' && !currentAssessment && (
          <div className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่มีการประเมินที่ใช้งานอยู่</h3>
            <p className="text-gray-600">ต้องการเริ่มการประเมินใหม่หรือไม่?</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Current Assessment View Component
interface CurrentAssessmentViewProps {
  assessment: AssessmentDoc;
  onViewDetails?: (assessmentId: string) => void;
  getScoreDistribution: (assessment: AssessmentDoc) => Record<string, number>;
  getCompletionRate: (assessment: AssessmentDoc) => number;
  getRiskLevelColor: (riskLevel: string) => string;
  getScoreColor: (score: string) => string;
}

const CurrentAssessmentView: React.FC<CurrentAssessmentViewProps> = ({
  assessment,
  onViewDetails,
  getScoreDistribution,
  getCompletionRate,
  getRiskLevelColor,
  getScoreColor
}) => {
  const scoreDistribution = getScoreDistribution(assessment);
  const completionRate = getCompletionRate(assessment);
  const totalScore = parseFloat(assessment.finalScore || '0');
  const avgScore = parseFloat(assessment.avgScore || '0');

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">คะแนนรวม</p>
              <p className="text-2xl font-bold text-blue-900">{totalScore.toFixed(1)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">คะแนนเฉลี่ย</p>
              <p className="text-2xl font-bold text-green-900">{avgScore.toFixed(1)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">ความครบถ้วน</p>
              <p className="text-2xl font-bold text-purple-900">{completionRate.toFixed(0)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">ระดับความเสี่ยง</p>
              <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${getRiskLevelColor(assessment.riskLevel || '')}`}>
                {assessment.riskLevel}
              </span>
            </div>
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Assessment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">การกระจายคะแนน</h4>
          <div className="space-y-2">
            {Object.entries(scoreDistribution).map(([score, count]) => {
              const percentage = assessment.answers.length > 0 ? (count / assessment.answers.length) * 100 : 0;
              
              return (
                <div key={score} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getScoreColor(score)}`}></div>
                    <span className="text-sm font-medium">
                      {score === 'n/a' ? 'N/A' : `${score} คะแนน`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getScoreColor(score)}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assessment Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">รายละเอียดการประเมิน</h4>
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
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียดทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};

// Assessment History View Component
interface AssessmentHistoryViewProps {
  assessments: AssessmentDoc[];
  onViewDetails?: (assessmentId: string) => void;
  getRiskLevelColor: (riskLevel: string) => string;
}

const AssessmentHistoryView: React.FC<AssessmentHistoryViewProps> = ({
  assessments,
  onViewDetails,
  getRiskLevelColor
}) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">ประวัติการประเมินทั้งหมด</h4>
      
      <div className="space-y-3">
        {assessments.map((assessment) => (
          <div 
            key={assessment.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h5 className="font-medium text-gray-900">
                    การประเมิน {formatDate(assessment.createdAt)}
                  </h5>
                  {assessment.isActive && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                      ใช้งานอยู่
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskLevelColor(assessment.riskLevel || '')}`}>
                    {assessment.riskLevel}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">คะแนนรวม:</span>
                    <span className="font-medium ml-1">{parseFloat(assessment.finalScore || '0').toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">คะแนนเฉลี่ย:</span>
                    <span className="font-medium ml-1">{parseFloat(assessment.avgScore || '0').toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ผู้ประเมิน:</span>
                    <span className="font-medium ml-1">{assessment.assessor || 'ไม่ระบุ'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">อัพเดท:</span>
                    <span className="font-medium ml-1">
                      {formatDate(assessment.updatedAt || assessment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(assessment.id)}
                  className="ml-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
};

export default AssessmentSummary;