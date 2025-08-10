// 📁 src/features/csm/pages/CSMEvaluatePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Building2, ArrowLeft, Save, CheckCircle, AlertTriangle, Clock, CheckCircle2, Lock, Shield } from 'lucide-react';
import type { Company, CSMFormDoc, CSMAssessment, CSMAssessmentAnswer } from '../../../types';
import csmService from '../../../services/csmService';
import QuestionForm from '../components/QuestionForm';
import { parseDate } from '../../../utils/dateUtils';
import { useDebouncedAutoSave } from '../../../hooks/useDebouncedAutoSave';
import { useOptimizedScoreCalculation } from '../../../hooks/useOptimizedScore';
import { useOfflineSync } from '../../../hooks/useOfflineSync'; 
import { ProgressIndicator } from '../../../components/ui/ProgressIndicator';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

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
  const [form, setForm] = useState<CSMFormDoc | null>(null);
  const [existingAssessment, setExistingAssessment] = useState<CSMAssessment | null>(null);
  const [answers, setAnswers] = useState<CSMAssessmentAnswer[]>([]);
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
  const cleanAssessmentData = (data: Record<string, unknown>): Partial<CSMAssessment> => {
    const cleaned: Partial<CSMAssessment> = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (value === '') {
          // แปลง empty string เป็น undefined สำหรับ optional fields หรือเก็บ empty string สำหรับ required fields
          if (['vdCategory', 'riskLevel', 'assessor'].includes(key)) {
            (cleaned as Record<string, unknown>)[key] = value;
          } else {
            (cleaned as Record<string, unknown>)[key] = undefined;
          }
        } else {
          (cleaned as Record<string, unknown>)[key] = value;
        }
      }
    });
    
    return cleaned;
  };

  // Validate assessment data
  const validateAssessmentData = useCallback((): boolean => {
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
  }, [assessmentData.vdCategory, assessmentData.riskLevel, assessmentData.assessor]);

  // Safe date parsing function
  const safeParseDate = (dateValue: unknown): Date => {
    // Type guard to check if dateValue is a valid DateInput
    if (dateValue === null || dateValue === undefined) {
      return new Date();
    }
    
    // Check if it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Check if it's a string that can be parsed
    if (typeof dateValue === 'string') {
      const parsed = parseDate(dateValue);
      return parsed || new Date();
    }
    
    // Handle number (timestamp)
    if (typeof dateValue === 'number') {
      try {
        return new Date(dateValue);
      } catch {
        return new Date();
      }
    }
    
    // For Firebase Timestamp or other objects with toDate method
    if (typeof dateValue === 'object' && dateValue !== null && 'toDate' in dateValue) {
      try {
        return (dateValue as { toDate(): Date }).toDate();
      } catch {
        return new Date();
      }
    }
    
    return new Date();
  };

  // Define handleAutoSave function before using it in useDebouncedAutoSave
  const handleAutoSave = useCallback(async () => {
    if (!validateAssessmentData() || !company || !form || existingAssessment?.isApproved) return;

    try {
      setSaveMessage('กำลังบันทึกอัตโนมัติ...');

      const assessmentPayload: Omit<CSMAssessment, 'id'> = {
        vdCode: company.vdCode,
        vdName: company.name,
        vdCategory: assessmentData.vdCategory,
        vdRefDoc: assessmentData.vdRefDoc || undefined,
        vdWorkingArea: assessmentData.vdWorkingArea || undefined,
        riskLevel: assessmentData.riskLevel as 'Low' | 'Moderate' | 'High' | '',
        assessor: assessmentData.assessor,
        isActive: true,
        updateBy: user?.email || 'Admin System',
        createdAt: existingAssessment?.createdAt || new Date(),
        updatedAt: new Date(),
        answers: answers,
        isApproved: existingAssessment?.isApproved ?? false,
        ...cleanAssessmentData({})
      };

      if (existingAssessment && existingAssessment.id) {
        await csmService.assessments.update(existingAssessment.id, assessmentPayload);
      } else {
        const newAssessmentId = await csmService.assessments.create(assessmentPayload);
        const newAssessment = await csmService.assessments.getById(newAssessmentId);
        setExistingAssessment(newAssessment);
      }

      setLastSaved(new Date());
      setSaveMessage('บันทึกอัตโนมัติสำเร็จ');
      
      setTimeout(() => setSaveMessage(''), 60000);

    } catch (err) {
      console.error('Error auto-saving assessment:', err);
      setSaveMessage('เกิดข้อผิดพลาดในการบันทึกอัตโนมัติ');
      setTimeout(() => setSaveMessage(''), 20000);
    }
  }, [validateAssessmentData, assessmentData, answers, company, form, existingAssessment, user?.email]);

  const { saving: autoSaving } = useDebouncedAutoSave(
    { answers, assessmentData },
    handleAutoSave,
    20000 // ดีเลย์ 20 วินาที หลังจากไม่มีการเปลี่ยนแปลง
  );

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.location.href = '/csm';
    }
  };

  // Load initial data - wrapped in useCallback to fix dependency warning
  const loadInitialData = useCallback(async () => {
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
  }, [vdCode]);

  // Load initial data
  useEffect(() => {
    if (vdCode) {
      loadInitialData();
    } else {
      setError('ไม่พบรหัสบริษัท');
      setLoading(false);
    }
  }, [vdCode, loadInitialData]);

  // Auto-save functionality - บันทึกทุก 60 วินาทีเมื่อมีการเปลี่ยนแปลง/
  /*
  useEffect(() => {
    if (existingAssessment?.isApproved) return; // ไม่ auto-save ถ้าอนุมัติแล้ว

    if (answers.length > 0 && assessmentData.vdCategory && assessmentData.assessor) {
      const timeoutId = setTimeout(() => {
        handleAutoSave();
      }, 60000*10); // รอ 60 วินาที*10 =10นาที หลังการเปลี่ยนแปลงล่าสุด

      return () => clearTimeout(timeoutId); // เคลียร์ timeout ถ้ามีการเปลี่ยนแปลงใหม่ก่อนครบ 60 วินาที
    }
  }, [answers, assessmentData.vdCategory, assessmentData.assessor, existingAssessment?.isApproved, handleAutoSave]);
*/



  // Handle answers change
  const handleAnswersChange = useCallback((newAnswers: CSMAssessmentAnswer[]) => {
    if (existingAssessment?.isApproved) return; // ไม่ให้แก้ไขถ้าอนุมัติแล้ว
    setAnswers(newAnswers);
  }, [existingAssessment?.isApproved]);

  // Manual save function (บันทึกแบบสมบูรณ์)
  const handleManualSave = useCallback(async () => {
    if (!validateAssessmentData()) {
      return;
    }

    if (!company || !form) return;

    try {
      setSaving(true);
      setSaveMessage('กำลังบันทึก...');

      const assessmentPayload: Omit<CSMAssessment, 'id'> = {
        vdCode: company.vdCode,
        vdName: company.name,
        vdCategory: assessmentData.vdCategory,
        vdRefDoc: assessmentData.vdRefDoc || undefined,
        vdWorkingArea: assessmentData.vdWorkingArea || undefined,
        riskLevel: assessmentData.riskLevel as 'Low' | 'Moderate' | 'High' | '',
        assessor: assessmentData.assessor,
        isActive: true,
        updateBy: user?.email || 'current-user@example.com',
        createdAt: existingAssessment?.createdAt || new Date(),
        updatedAt: new Date(),
        answers: answers,
        isApproved: existingAssessment?.isApproved ?? false,
        ...cleanAssessmentData({})
      };

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
  }, [validateAssessmentData, company, form, assessmentData, answers, existingAssessment, user?.email, loadInitialData]);

  // Check if assessment is complete
  const isAssessmentComplete = useCallback((): boolean => {
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
  }, [form, answers]);

  // Approve assessment function
  const handleApprove = useCallback(async () => {
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

      const assessmentPayload: Partial<CSMAssessment> = {
        isApproved: true,
        updatedAt: new Date(),
        updateBy: user?.email || 'current-user@example.com',
        ...cleanAssessmentData({})
      };

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
  }, [company, form, existingAssessment, user?.email, loadInitialData, isAssessmentComplete]);

  // Calculate completion stats
  const getCompletionStats = useCallback(() => {
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
  }, [form, answers]);

  const stats = getCompletionStats();

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={handleNavigateBack}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  if (!company || !form) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูลที่จำเป็น</p>
        </div>
      </div>
    );
  }

  // เพิ่ม offline indicator
  if (!isOnline) {
    return (
      <div className="relative min-h-screen bg-gray-50">
        <div className="fixed z-50 px-4 py-3 text-orange-700 bg-orange-100 border border-orange-400 rounded top-4 right-4">
          <div className="flex items-center gap-2">
            <span>⚠️ คุณอยู่ในโหมด Offline</span>
            {pendingSync && <span>- รอการซิงค์ข้อมูล</span>}
          </div>
        </div>
        <div className="px-4 pt-20">
          <p className="text-center text-gray-600">กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อใช้งาน</p>
        </div>
      </div>
    );
  }
  
  const isReadOnly = existingAssessment?.isApproved;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
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
                <div className="flex items-center gap-2 px-3 py-1 text-green-800 bg-green-100 rounded-full">
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
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                )}
                <span className="text-sm text-gray-600">
                  {stats.completed}/{stats.total} ข้อ ({stats.percentage}%)
                </span>
                {totalScore > 0 && (
                  <span className="ml-2 text-sm text-blue-600">
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
                    className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="px-4 py-2 mx-auto max-w-7xl sm:px-6 lg:px-8">
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
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="p-6 mb-6 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">ข้อมูลการประเมิน</h2>
            {isReadOnly && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-amber-600 bg-amber-50">
                <Lock className="w-4 h-4" />
                <span className="text-sm">ไม่สามารถแก้ไขได้</span>
              </div>
            )}
          </div>

          {/* แถวบน 3 ช่อง */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
            {/* Company Category */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                หมวดหมู่ (Category)<span className="text-red-500">*</span>
              </label>
              <select
                value={assessmentData.vdCategory}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, vdCategory: e.target.value }))}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">เลือกหมวดหมู่</option>
                <option value="1">งานทั่วไปที่ความเสี่ยงต่ำ | Office Admin</option>
                <option value="2">งานบริการ | Service</option>
                <option value="3">งานโครงสร้าง | Structure, Mechanical</option>
                <option value="4">งานขนส่ง | Transportor</option>
                <option value="0">อื่นๆ/ไม่ทราบ/ไม่มั่นใจ</option>
              </select>
            </div>

            {/* Reference Document */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                เลขที่เอกสารอ้างอิง เช่น Contract/PO
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
              <label className="block mb-2 text-sm font-medium text-gray-700">
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
          </div>

          {/* แถวล่าง 2 ช่อง */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            {/* Risk Level */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
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

            {/* Assessor */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                ผู้ประเมิน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={assessmentData.assessor}
                onChange={(e) => setAssessmentData(prev => ({ ...prev, assessor: e.target.value }))}
                placeholder="ชื่อผู้ประเมิน"
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Status Indicators */}
          <div className="p-4 mt-6 rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
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

        {/* Progress Bar */}
        <div className="p-4 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
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
              onSave={handleManualSave}
              readOnly={isReadOnly}              
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CSMEvaluatePage;