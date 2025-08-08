// 📁 src/features/csm/pages/CSMEvaluatePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Building2, ArrowLeft, Save, CheckCircle, AlertTriangle, Clock, CheckCircle2, Lock, Shield } from 'lucide-react';
import type { Company, FormDoc, CsmAssessment, AssessmentAnswer } from '../../../types/types';
import csmService from '../../../services/csmService';
import QuestionForm from '../components/QuestionForm';
import { parseDate } from '../../../components/utils/dateUtils';
import { useDebouncedAutoSave } from '../../../components/hooks/useDebouncedAutoSave';
import { useOptimizedScoreCalculation } from '../../../components/hooks/useOptimizedScore';
import { useOfflineSync } from '../../../components/hooks/useOfflineSync'; 
import { ProgressIndicator } from '../../../components/ui/ProgressIndicator';
import { useKeyboardShortcuts } from '../../../components/hooks/useKeyboardShortcuts';

interface CSMEvaluatePageProps {
  vdCode?: string;
  onNavigateBack?: () => void;
}

const CSMEvaluatePage: React.FC<CSMEvaluatePageProps> = ({ vdCode: propVdCode, onNavigateBack }) => {
  useKeyboardShortcuts();
  
  // Get vdCode from props or URL params
  const vdCode = propVdCode || new URLSearchParams(window.location.search).get('vdCode') || '';
  const { user } = useAuth();

  // State variables
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<FormDoc | null>(null);
  const [existingAssessment, setExistingAssessment] = useState<CsmAssessment | null>(null);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const { isOnline, pendingSync } = useOfflineSync();
  const { totalScore, avgScore, maxScore } = useOptimizedScoreCalculation(answers, form?.fields || []);

  // Assessment metadata state - single declaration
  const [assessmentData, setAssessmentData] = useState({
    vdCategory: '',
    vdRefDoc: '',
    vdWorkingArea: '',
    riskLevel: 'Low',
    assessor: ''
  });

  // Helper function to clean data before sending to service
  const cleanAssessmentData = (data: Record<string, any>): any => {
    const cleaned: any = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (value === '') {
          // แปลง empty string เป็น null สำหรับ optional fields
          cleaned[key] = ['vdCategory', 'riskLevel', 'assessor'].includes(key) ? value : null;
        } else {
          cleaned[key] = value;
        }
      }
    });
    
    return cleaned;
  };

  // Validate assessment data
  const validateAssessmentData = (): boolean => {
    if (!assessmentData.vdCategory.trim()) {
      setSaveMessage('กรุณาระบุหมวดหมู่บริษัท');
      return false;
    }
    if (!assessmentData.riskLevel.trim()) {
      setSaveMessage('กรุณาระบุระดับความเสี่ยง');
      return false;
    }
    if (!assessmentData.assessor.trim()) {
      setSaveMessage('กรุณาระบุชื่อผู้ประเมิน');
      return false;
    }
    return true;
  };

  // Define handleAutoSave function before using it in useDebouncedAutoSave
  const handleAutoSave = useCallback(async () => {
    if (!validateAssessmentData() || !company || !form || existingAssessment?.isApproved) return;

    try {
      setSaveMessage('กำลังบันทึกอัตโนมัติ...');

      const assessmentPayload: Omit<CsmAssessment, 'id'> = cleanAssessmentData({
        vdCode: company.vdCode,
        vdName: company.name,
        vdCategory: assessmentData.vdCategory,
        vdRefDoc: assessmentData.vdRefDoc || null,
        vdWorkingArea: assessmentData.vdWorkingArea || null,
        riskLevel: assessmentData.riskLevel as 'Low' | 'Moderate' | 'High' | 'Unknown',
        assessor: assessmentData.assessor,
        isActive: true,
        updateBy: user?.email || 'Admin System',
        createdAt: existingAssessment?.createdAt || new Date(),
        updatedAt: new Date(),
        answers: answers,
        isApproved: existingAssessment?.isApproved ?? false
      });

      if (existingAssessment && existingAssessment.id) {
        await csmService.assessments.update(existingAssessment.id, assessmentPayload);
      } else {
        const newAssessmentId = await csmService.assessments.create(assessmentPayload);
        const newAssessment = await csmService.assessments.getById(newAssessmentId);
        setExistingAssessment(newAssessment);
      }

      setLastSaved(new Date());
      setSaveMessage('บันทึกอัตโนมัติสำเร็จ');
      
      setTimeout(() => setSaveMessage(''), 3000);

    } catch (err) {
      console.error('Error auto-saving assessment:', err);
      setSaveMessage('เกิดข้อผิดพลาดในการบันทึกอัตโนมัติ');
      setTimeout(() => setSaveMessage(''), 5000);
    }
  }, [assessmentData, answers, company, form, existingAssessment, user?.email]);

  const { saving: autoSaving } = useDebouncedAutoSave(
    { answers, assessmentData },
    handleAutoSave,
    5000
  );

  const safeParseDate = (dateValue: any): Date => {
    const parsed = parseDate(dateValue);
    return parsed || new Date();
  };

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.href = '/csm';
    }
  };

  // Load initial data
  useEffect(() => {
    if (vdCode) {
      loadInitialData();
    } else {
      setError('ไม่พบรหัสบริษัท');
      setLoading(false);
    }
  }, [vdCode]);

  // Auto-save functionality - บันทึกทุก 60 วินาทีเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (existingAssessment?.isApproved) return; // ไม่ auto-save ถ้าอนุมัติแล้ว

    const interval = setInterval(() => {
      if (answers.length > 0 && assessmentData.vdCategory && assessmentData.assessor) {
        handleAutoSave();
      }
    }, 60000); // Auto-save ทุก 60 วินาที

    return () => clearInterval(interval);
  }, [answers, assessmentData, existingAssessment?.isApproved, handleAutoSave]);

  // Save on answers change (debounced)
  useEffect(() => {
    if (existingAssessment?.isApproved) return; // ไม่ auto-save ถ้าอนุมัติแล้ว

    if (answers.length > 0 && assessmentData.vdCategory && assessmentData.assessor) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 5000); // Auto-save หลังจากไม่มีการเปลี่ยนแปลง 5 วินาที

      return () => clearTimeout(timeoutId);
    }
  }, [answers, existingAssessment?.isApproved, handleAutoSave]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load company data
      const companyData = await csmService.companies.getByVdCode(vdCode);
      if (!companyData) {
        throw new Error('ไม่พบข้อมูลบริษัท');
      }
      setCompany(companyData);

      // Load CSM form
      const formData = await csmService.forms.getCSMChecklist();
      if (!formData) {
        throw new Error('ไม่พบแบบฟอร์ม CSM Checklist');
      }
      setForm(formData);

      // Check for existing assessment
      const existingAssessments = await csmService.assessments.getByVdCode(vdCode);
      const activeAssessment = existingAssessments.find(a => a.isActive);
      
      if (activeAssessment) {
        setExistingAssessment(activeAssessment);
        setAnswers(activeAssessment.answers || []);
        setAssessmentData({
          vdCategory: activeAssessment.vdCategory || '',
          vdRefDoc: activeAssessment.vdRefDoc || '',
          vdWorkingArea: activeAssessment.vdWorkingArea || '',
          riskLevel: activeAssessment.riskLevel || 'Low',
          assessor: activeAssessment.assessor || ''
        });
        
        // ใช้ safeParseDate แทน convertTimestampToDate
        const lastUpdateTime = activeAssessment.updatedAt || activeAssessment.createdAt;
        if (lastUpdateTime) {
          const lastSavedDate = safeParseDate(lastUpdateTime);
          setLastSaved(lastSavedDate);
        }
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Handle answers change
  const handleAnswersChange = useCallback((newAnswers: AssessmentAnswer[]) => {
    if (existingAssessment?.isApproved) return; // ไม่ให้แก้ไขถ้าอนุมัติแล้ว
    setAnswers(newAnswers);
  }, [existingAssessment?.isApproved]);

  // Manual save function (บันทึกแบบสมบูรณ์)
  const handleManualSave = async () => {
    if (!validateAssessmentData()) {
      return;
    }

    if (!company || !form) return;

    try {
      setSaving(true);
      setSaveMessage('กำลังบันทึก...');

      const assessmentPayload: Omit<CsmAssessment, 'id'> = cleanAssessmentData({
        vdCode: company.vdCode,
        vdName: company.name,
        vdCategory: assessmentData.vdCategory,
        vdRefDoc: assessmentData.vdRefDoc || null,
        vdWorkingArea: assessmentData.vdWorkingArea || null,
        riskLevel: assessmentData.riskLevel as 'Low' | 'Moderate' | 'High' | 'Unknown',
        assessor: assessmentData.assessor,
        isActive: true,
        updateBy: user?.email || 'current-user@example.com',
        createdAt: existingAssessment?.createdAt || new Date(),
        updatedAt: new Date(),
        answers: answers,
        isApproved: existingAssessment?.isApproved ?? false
      });

      if (existingAssessment && existingAssessment.id) {
        await csmService.assessments.update(existingAssessment.id, assessmentPayload);
        setSaveMessage('อัพเดทการประเมินสำเร็จ');
      } else {
        await csmService.assessments.create(assessmentPayload);
        setSaveMessage('บันทึกการประเมินสำเร็จ');
      }

      setLastSaved(new Date());
      
      // Refresh data
      await loadInitialData();
      
      setTimeout(() => setSaveMessage(''), 3000);

    } catch (err) {
      console.error('Error saving assessment:', err);
      setSaveMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Approve assessment function
  const handleApprove = async () => {
    if (!isAssessmentComplete()) {
      alert('กรุณาประเมินให้ครบถ้วนทุกข้อก่อนยืนยัน');
      return;
    }

    if (!confirm('คุณแน่ใจหรือไม่ที่จะยืนยันการประเมินนี้? หลังจากยืนยันแล้วจะไม่สามารถแก้ไขได้อีก')) {
      return;
    }

    if (!company || !form || !existingAssessment || !existingAssessment.id) return;

    try {
      setApproving(true);
      setSaveMessage('กำลังยืนยันการประเมิน...');

      const assessmentPayload: Partial<CsmAssessment> = cleanAssessmentData({
        isApproved: true,
        updatedAt: new Date(),
        updateBy: user?.email || 'current-user@example.com'
      });

      await csmService.assessments.update(existingAssessment.id, assessmentPayload);
      
      setSaveMessage('ยืนยันการประเมินสำเร็จ - รายการนี้ถูกล็อคแล้ว');
      
      // Refresh data
      await loadInitialData();
      
      setTimeout(() => setSaveMessage(''), 5000);

    } catch (err) {
      console.error('Error approving assessment:', err);
      setSaveMessage('เกิดข้อผิดพลาดในการยืนยันการประเมิน');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setApproving(false);
    }
  };

  // Alias for backward compatibility
  const handleSave = handleManualSave;

  // Check if assessment is complete
  const isAssessmentComplete = (): boolean => {
    if (!form || answers.length === 0) return false;
    
    const requiredFields = form.fields.filter(field => field.required);
    const completedRequired = requiredFields.every(field => {
      const answer = answers.find(a => a.ckItem === field.ckItem);
      return answer && 
             answer.comment.trim() !== '' && 
             answer.score && 
             answer.score !== '' &&
             answer.isFinish;
    });
    
    return completedRequired;
  };

  // Calculate completion stats
  const getCompletionStats = () => {
    if (!form || answers.length === 0) return { completed: 0, total: 0, percentage: 0, withAnswers: 0 };
    
    const completed = answers.filter(answer => 
      answer.isFinish && answer.comment.trim() && answer.score && answer.score !== ''
    ).length;

    const withAnswers = answers.filter(answer => 
      answer.comment.trim() || (answer.score && answer.score !== '')
    ).length;
    
    return {
      completed,
      withAnswers,
      total: form.fields.length,
      percentage: Math.round((completed / form.fields.length) * 100)
    };
  };

  const stats = getCompletionStats();

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
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

  if (!company || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูลที่จำเป็น</p>
        </div>
      </div>
    );
  }

  // เพิ่ม offline indicator
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        <div className="fixed top-4 right-4 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded z-50">
          <div className="flex items-center gap-2">
            <span>⚠️ คุณอยู่ในโหมด Offline</span>
            {pendingSync && <span>- รอการซิงค์ข้อมูล</span>}
          </div>
        </div>
        <div className="pt-20 px-4">
          <p className="text-center text-gray-600">กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อใช้งาน</p>
        </div>
      </div>
    );
  }
  
  const isReadOnly = existingAssessment?.isApproved;

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
              
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-sm text-gray-600">รหัส: {company.vdCode}</p>
                </div>
              </div>

              {/* Approval Status Badge */}
              {isReadOnly && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">ยืนยันแล้ว</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Save Status */}
              <div className="flex items-center gap-2">
                {autoSaving ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">กำลังบันทึก...</span>
                  </div>
                ) : lastSaved ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">
                      บันทึกล่าสุด: {lastSaved.toLocaleTimeString('th-TH')}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Completion Status */}
              <div className="flex items-center gap-2">
                {isAssessmentComplete() ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm text-gray-600">
                  {stats.completed}/{stats.total} ข้อ ({stats.percentage}%)
                </span>
                {totalScore > 0 && (
                  <span className="text-sm text-blue-600 ml-2">
                    คะแนน: {totalScore.toFixed(1)}/{maxScore}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isReadOnly && (
                  <button
                    onClick={handleManualSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'กำลังบันทึก...' : 'บันทึก (Ctrl+S)'}
                  </button>
                )}

                {!isReadOnly && isAssessmentComplete() && (
                  <button
                    onClick={handleApprove}
                    data-action="submit"
                    disabled={approving}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {approving ? 'กำลังยืนยัน...' : 'ยืนยันเสร็จสิ้น (Ctrl+Enter)'}
                  </button>
                )}

                {isReadOnly && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">ล็อคแล้ว</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className={`p-3 rounded-lg text-sm ${
            saveMessage.includes('สำเร็จ') || saveMessage.includes('ยืนยัน')
              ? 'bg-green-100 text-green-800 border border-green-200'
              : saveMessage.includes('ข้อผิดพลาด')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {saveMessage}
          </div>
        </div>
      )}

      {/* Assessment Metadata Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ข้อมูลการประเมิน</h2>
            {isReadOnly && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" />
                <span className="text-sm">ไม่สามารถแก้ไขได้</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Company Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                หมวดหมู่บริษัท <span className="text-red-500">*</span>
              </label>
              <select
                value={assessmentData.vdCategory}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, vdCategory: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">เลือกหมวดหมู่</option>
                <option value="1">งานทั่วไปที่ความเสี่ยงตำ | Office Admin</option>
                <option value="2">งานบริการ | Service</option>
                <option value="3">งานโครงสร้าง | Structure, Mechanical</option>
                <option value="4">งานขนส่ง | Transportor</option>
                <option value="0">อื่นๆ/ไม่ทราบ/ไม่มั่นใจ</option>
              </select>
            </div>

            {/* Reference Document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลขที่อ้างอิง
              </label>
              <input
                type="text"
                value={assessmentData.vdRefDoc}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, vdRefDoc: e.target.value }))}
                placeholder="เลขสัญญา, PO, Job No."
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Working Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                พื้นที่ปฏิบัติงาน
              </label>
              <input
                type="text"
                value={assessmentData.vdWorkingArea}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, vdWorkingArea: e.target.value }))}
                placeholder="ระบุพื้นที่"
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Risk Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ระดับความเสี่ยง <span className="text-red-500">*</span>
              </label>
              <select
                value={assessmentData.riskLevel}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, riskLevel: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="Low">Low - ต่ำ</option>
                <option value="Moderate">Moderate - ปานกลาง</option>
                <option value="High">High - สูง</option>
              </select>
            </div>
          </div>

          {/* Assessor */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ผู้ประเมิน <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assessmentData.assessor}
              onChange={(e) => setAssessmentData(prev => ({ ...prev, assessor: e.target.value }))}
              placeholder="ชื่อผู้ประเมิน"
              disabled={isReadOnly}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Status Indicators */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ความคืบหน้า:</span>
                <span className="font-medium">
                  {stats.completed}/{stats.total} ข้อ ({stats.percentage}%)
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">มีคำตอบ:</span>
                <span className="font-medium text-blue-600">
                  {stats.withAnswers} ข้อ
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">คะแนนรวม:</span>
                <span className="font-medium text-blue-600">
                  {totalScore.toFixed(1)}/{maxScore} ({avgScore.toFixed(1)} เฉลี่ย)
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">สถานะ:</span>
                <span className={`font-medium ${
                  isReadOnly ? 'text-green-600' :
                  isAssessmentComplete() ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {isReadOnly ? 'ยืนยันแล้ว' : isAssessmentComplete() ? 'เสร็จสิ้น' : 'ดำเนินการ'}
                </span>
              </div>
              
              {existingAssessment && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">อัพเดทล่าสุด:</span>
                  <span className="font-medium">
                    {lastSaved ? lastSaved.toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <ProgressIndicator
            current={stats.completed}
            total={stats.total}
            size="lg"
            color="blue"
          />
        </div>

        {/* Question Form */}
        {form && (
          <QuestionForm
            formFields={form.fields}
            initialAnswers={answers}
            vdCode={company.vdCode}
            onAnswersChange={handleAnswersChange}
            onSave={handleSave}
            readOnly={isReadOnly}
          />
        )}
      </div>
    </div>
  );
};

export default CSMEvaluatePage;