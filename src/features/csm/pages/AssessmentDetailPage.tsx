// src/features/csm/pages/AssessmentDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Edit, Trash2, Eye, FileText,  BarChart3 } from 'lucide-react';
import type { AssessmentDoc, FormField, Company } from '../../../types/types';
import csmService from '../../../services/csmService';
import { formatDate} from '../../../components/utils/dateUtils';

interface AssessmentDetailPageProps {
  assessmentId?: string;
  onNavigateBack?: () => void;
}

const AssessmentDetailPage: React.FC<AssessmentDetailPageProps> = ({ 
  assessmentId: propAssessmentId, 
  onNavigateBack 
}) => {
  // Use prop or get from URL params
  const assessmentId = propAssessmentId || new URLSearchParams(window.location.search).get('id') || '';
  
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<AssessmentDoc | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.href = '/csm';
    }
  };

  const handleEdit = () => {
    if (assessment) {
      window.location.href = `/csm/evaluate?vdCode=${assessment.vdCode}`;
    }
  };

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentDetail();
    }
  }, [assessmentId]);

  const loadAssessmentDetail = async () => {
    if (!assessmentId) return;

    try {
      setLoading(true);
      setError(null);

      // Load assessment
      const assessmentData = await csmService.assessments.getById(assessmentId);
      if (!assessmentData) {
        throw new Error('ไม่พบข้อมูลการประเมิน');
      }
      setAssessment(assessmentData);

      // Load company
      const companyData = await csmService.companies.getByVdCode(assessmentData.vdCode);
      if (companyData) {
        setCompany(companyData);
      }

      // Load form fields
      const formData = await csmService.forms.getCSMChecklist();
      if (formData) {
        setFormFields(formData.fields);
      }

    } catch (err) {
      console.error('Error loading assessment detail:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async () => {
    if (!assessmentId) return;

    try {
      await csmService.assessments.delete(assessmentId);
      alert('ลบการประเมินเรียบร้อยแล้ว');
      handleNavigateBack();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
    setShowDeleteModal(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('ฟีเจอร์ Export กำลังพัฒนา');
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
      case '5': return 'text-green-700 bg-green-50';
      case '4': return 'text-green-600 bg-green-50';
      case '3': return 'text-blue-600 bg-blue-50';
      case '2': return 'text-yellow-600 bg-yellow-50';
      case '1': return 'text-orange-600 bg-orange-50';
      case '0': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ไม่พบข้อมูลการประเมิน</h2>
          <p className="text-gray-600 mb-4">{error || 'ไม่พบข้อมูลการประเมินที่ระบุ'}</p>
          <button
            onClick={handleNavigateBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  const completionRate = assessment.answers.length > 0 
    ? (assessment.answers.filter(a => a.isFinish).length / assessment.answers.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleNavigateBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับ</span>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">รายละเอียดการประเมิน</h1>
                <p className="text-sm text-gray-600">
                  {company?.name} - {formatDate(assessment.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit className="w-4 h-4" />
                แก้ไข
              </button>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">คะแนนรวม</p>
                <p className="text-2xl font-bold text-blue-600">
                  {parseFloat(assessment.finalScore || '0').toFixed(1)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">คะแนนเฉลี่ย</p>
                <p className="text-2xl font-bold text-green-600">
                  {parseFloat(assessment.avgScore || '0').toFixed(1)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ความครบถ้วน</p>
                <p className="text-2xl font-bold text-purple-600">
                  {completionRate.toFixed(0)}%
                </p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ระดับความเสี่ยง</p>
                <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(assessment.riskLevel || 'Unknown')}`}>
                  {assessment.riskLevel || 'Unknown'}
                </span>
              </div>
              <div className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Assessment Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลการประเมิน</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">บริษัท:</span>
                <span className="ml-2 font-medium">{assessment.vdName}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">รหัส:</span>
                <span className="ml-2 font-medium">{assessment.vdCode}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">หมวดหมู่:</span>
                <span className="ml-2 font-medium">{assessment.vdCategory || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">เลขที่อ้างอิง:</span>
                <span className="ml-2 font-medium">{assessment.vdRefDoc || 'ไม่ระบุ'}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">พื้นที่ปฏิบัติงาน:</span>
                <span className="ml-2 font-medium">{assessment.vdWorkingArea || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">ผู้ประเมิน:</span>
                <span className="ml-2 font-medium">{assessment.assessor || 'ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">วันที่สร้าง:</span>
                <span className="ml-2 font-medium">{formatDate(assessment.createdAt)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">อัพเดทล่าสุด:</span>
                <span className="ml-2 font-medium">{formatDate(assessment.updatedAt || assessment.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Answers */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">รายละเอียดการประเมิน</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {assessment.answers.map((answer, _index) => {
                const field = formFields.find(f => f.ckItem === answer.ckItem);
                
                return (
                  <div key={answer.ckItem} className="border border-gray-200 rounded-lg p-4">
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-blue-600">ข้อ {answer.ckItem}</span>
                          {answer.ckType === 'M' && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                              จำเป็น
                            </span>
                          )}
                          {field?.fScore && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              น้ำหนัก {field.fScore}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-gray-900">
                          {field?.ckQuestion || 'ไม่พบคำถาม'}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {answer.isFinish && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            เสร็จสิ้น
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="mb-3">
                      <span className="text-sm text-gray-600 block mb-1">คะแนน:</span>
                      <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getScoreColor(answer.score || 'n/a')}`}>
                        {answer.score === 'n/a' ? 'N/A' : `${answer.score}/5`}
                      </span>
                    </div>

                    {/* Comment */}
                    <div className="mb-3">
                      <span className="text-sm text-gray-600 block mb-1">ความเห็น:</span>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-900">
                          {answer.comment || 'ไม่มีความเห็น'}
                        </p>
                      </div>
                    </div>

                    {/* Files */}
                    {answer.files && answer.files.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600 block mb-2">ไฟล์แนบ:</span>
                        <div className="flex flex-wrap gap-2">
                          {answer.files.map((fileUrl, fileIndex) => (
                            <a
                              key={fileIndex}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              <Eye className="w-3 h-3" />
                              ไฟล์ {fileIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบ</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ที่จะลบการประเมินนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                ลบการประเมิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentDetailPage;