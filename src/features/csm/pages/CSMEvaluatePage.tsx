// 🔧 Enhanced CSM Evaluate Page with Fixed Save Logic
// src/features/csm/pages/CSMEvaluatePage.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import  csmService from '../../../services/csmService'; 
import { csmVendorService } from '../../../services/csmVendorService';
import { enhancedCSMFormsService } from '../../../services/enhancedCsmService';
import { QuestionForm } from '../components/QuestionForm';
import type { 
  CSMAssessment, 
  CSMAssessmentAnswer, 
  CSMAuditor, 
  CSMFormDoc, 
  CSMFormField,
  CSMVendor,
  Company
} from '../../../types';

// =================== TYPES ===================
interface PageState {
  loading: boolean;
  saving: boolean;
  vendor: CSMVendor | null;
  company: Company | null;
  form: CSMFormDoc | null;
  assessment: CSMAssessment | null;
  answers: CSMAssessmentAnswer[];
  auditor: CSMAuditor;
  isDirty: boolean;
  readOnly: boolean;
  lastSaved?: Date;
}

interface ScoreCalculation {
  totalScore: number;
  maxScore: number;
  percentage: number;
  completedQuestions: number;
  totalQuestions: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

// Helper function to safely convert date-like values to Date strings
const formatFinishedDate = (finishedDate: unknown): string => {
  if (finishedDate instanceof Date) {
    return finishedDate.toLocaleDateString('th-TH');
  }
  
  if (typeof finishedDate === 'string') {
    return new Date(finishedDate).toLocaleDateString('th-TH');
  }
  
  // Handle Firestore Timestamp
  if (finishedDate && 
      typeof finishedDate === 'object' && 
      'toDate' in finishedDate &&
      typeof (finishedDate as Record<string, unknown>).toDate === 'function') {
    const timestamp = finishedDate as { toDate(): Date };
    return timestamp.toDate().toLocaleDateString('th-TH');
  }
  
  return '';
};

// =================== MAIN COMPONENT ===================
export const CSMEvaluatePage: React.FC = () => {
  const { vdCode } = useParams<{ vdCode: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // State
  const [state, setState] = useState<PageState>({
    loading: true,
    saving: false,
    vendor: null,
    company: null,
    form: null,
    assessment: null,
    answers: [],
    auditor: {
      name: '',
      email: '',
      phone: '',
      position: ''
    },
    isDirty: false,
    readOnly: false
  });

  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // =================== COMPUTED VALUES ===================
  const scoreCalculation = useMemo((): ScoreCalculation => {
    if (!state.answers.length) {
      return {
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        completedQuestions: 0,
        totalQuestions: 0,
        riskLevel: 'High'
      };
    }

    const completed = state.answers.filter(answer => 
      answer.score !== '0' && answer.score !== 'n/a' && answer.score !== ''
    );
    
    const totalScore = completed.reduce((sum, answer) => {
      const score = answer.score === 'n/a' ? 0 : parseInt(answer.score || '0', 10) || 0;
      return sum + score;
    }, 0);
    
    const maxScore = state.answers.reduce((sum, answer) => {
      const maxForQuestion = parseInt(answer.tScore || '5', 10) || 5;
      return sum + maxForQuestion;
    }, 0);

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    let riskLevel: 'Low' | 'Medium' | 'High' = 'High';
    if (percentage >= 80) riskLevel = 'Low';
    else if (percentage >= 60) riskLevel = 'Medium';

    return {
      totalScore,
      maxScore,
      percentage,
      completedQuestions: completed.length,
      totalQuestions: state.answers.length,
      riskLevel
    };
  }, [state.answers]);

  // =================== SAVE FUNCTIONS ===================
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!state.assessment || !state.vendor || state.readOnly) {
      console.log('🚫 Cannot save: missing data or read-only mode');
      return false;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));

      // Enhanced assessment data preparation
      const assessmentToSave: CSMAssessment = {
        ...state.assessment,
        answers: state.answers,
        auditor: state.auditor,
        updatedAt: new Date(),
        // Calculate and store scores
        totalScore: scoreCalculation.totalScore.toString(),
        maxScore: scoreCalculation.maxScore.toString(),
        avgScore: scoreCalculation.percentage.toString()
      };

      console.log('💾 Saving assessment:', { 
        isAutoSave, 
        assessmentId: assessmentToSave.id,
        vdCode: assessmentToSave.vdCode,
        answersCount: assessmentToSave.answers.length,
        hasAuditor: !!assessmentToSave.auditor.name
      });

      // Use the enhanced save method
      const savedAssessmentId = await csmService.assessments.save(assessmentToSave);
      
      // Update state with the saved assessment ID if it was new
      setState(prev => ({
        ...prev,
        assessment: {
          ...prev.assessment!,
          id: savedAssessmentId
        },
        isDirty: false,
        lastSaved: new Date(),
        saving: false
      }));

      if (!isAutoSave) {
        addToast({
          type: 'success',
          title: 'บันทึกสำเร็จ',
          message: 'ข้อมูลการประเมินถูกบันทึกเรียบร้อยแล้ว'
        });
      }

      console.log('✅ Assessment saved successfully with ID:', savedAssessmentId);
      return true;
      
    } catch (error) {
      console.error('❌ Error saving assessment:', error);
      
      setState(prev => ({ ...prev, saving: false }));
      
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: `ไม่สามารถบันทึกข้อมูลได้: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      
      return false;
    }
  }, [state.assessment, state.vendor, state.readOnly, state.answers, state.auditor, scoreCalculation, addToast]);

  // Submit function with enhanced validation
  const handleSubmit = useCallback(async () => {
    if (!state.assessment || state.readOnly) return;

    // Enhanced validation for M type questions
    const mandatoryQuestions = state.answers.filter(answer => answer.ckType === 'M');
    const incompleteMandatory = mandatoryQuestions.filter(answer => 
      !answer.score || 
      answer.score === '0' || 
      answer.score === '' || 
      answer.score === 'n/a' ||
      !answer.comment.trim()
    );

    if (incompleteMandatory.length > 0) {
      addToast({
        type: 'warning',
        title: 'ข้อมูลไม่สมบูรณ์',
        message: `กรุณาให้คะแนนและความเห็นสำหรับคำถาม Mandatory ที่ยังไม่สมบูรณ์ (${incompleteMandatory.length} ข้อ)`
      });
      return;
    }

    // Check for any incomplete questions
    const incompleteAnswers = state.answers.filter(answer => 
      !answer.score || answer.score === '0' || answer.score === '' || !answer.comment.trim()
    );

    if (incompleteAnswers.length > 0) {
      addToast({
        type: 'warning',
        title: 'ข้อมูลไม่สมบูรณ์',
        message: `กรุณาให้คะแนนและความเห็นที่ยังไม่สมบูรณ์ (${incompleteAnswers.length} ข้อ)`
      });
      return;
    }

    // Validate auditor information
    if (!state.auditor.name || !state.auditor.position) {
      addToast({
        type: 'warning',
        title: 'ข้อมูลผู้ประเมินไม่สมบูรณ์',
        message: 'กรุณากรอกชื่อและตำแหน่งผู้ประเมิน'
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));
      
      const finalAssessment: CSMAssessment = {
        ...state.assessment,
        answers: state.answers,
        auditor: state.auditor,
        isFinish: true,
        finishedAt: new Date(),
        updatedAt: new Date(),
        totalScore: scoreCalculation.totalScore.toString(),
        maxScore: scoreCalculation.maxScore.toString(),
        avgScore: scoreCalculation.percentage.toString()
      };

      await csmService.assessments.save(finalAssessment);
      
      addToast({
        type: 'success',
        title: 'ส่งการประเมินสำเร็จ',
        message: `การประเมิน CSM ถูกส่งเรียบร้อยแล้ว (คะแนน: ${scoreCalculation.percentage.toFixed(1)}%)`
      });

      // Redirect to assessment list
      setTimeout(() => {
        navigate('/csm');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error submitting assessment:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถส่งการประเมินได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [state.assessment, state.readOnly, state.answers, state.auditor, scoreCalculation, addToast, navigate]);

  // =================== AUTO-SAVE LOGIC ===================
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!state.isDirty || state.readOnly || state.saving) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Auto-saving assessment...');
      handleSave(true);
    }, 3000); // 3 seconds delay

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.readOnly, state.saving, handleSave]);

  // =================== ANSWERS CHANGE HANDLER ===================
  const handleAnswersChange = useCallback((newAnswers: CSMAssessmentAnswer[]) => {
    setState(prev => ({
      ...prev,
      answers: newAnswers,
      isDirty: true
    }));
  }, []);

  // =================== AUDITOR CHANGE HANDLERS ===================
  const handleAuditorChange = useCallback((field: keyof CSMAuditor, value: string) => {
    setState(prev => ({
      ...prev,
      auditor: {
        ...prev.auditor,
        [field]: value
      },
      isDirty: true
    }));
  }, []);

  // =================== INITIALIZATION ===================
  useEffect(() => {
    const initializePage = async () => {
      if (!vdCode) {
        addToast({
          type: 'error',
          title: 'ข้อผิดพลาด',
          message: 'ไม่พบรหัส Vendor'
        });
        navigate('/csm');
        return;
      }

      try {
        setState(prev => ({ ...prev, loading: true }));

        // Get vendor with company info
        console.log('🔍 Loading vendor:', vdCode);
        const vendorWithCompany = await csmVendorService.getVendorWithCompany(vdCode);
        
        if (!vendorWithCompany) {
          addToast({
            type: 'error',
            title: 'ไม่พบข้อมูล',
            message: 'ไม่พบข้อมูล Vendor ที่ระบุ'
          });
          navigate('/csm');
          return;
        }

        console.log('✅ Found vendor:', vendorWithCompany.vendor.vdName);

        // Get CSM form
        console.log('🔍 Getting CSM form...');
        const csmForm = await enhancedCSMFormsService.getCSMChecklist();
        
        if (!csmForm) {
          addToast({
            type: 'error',
            title: 'ไม่พบแบบฟอร์ม',
            message: 'ไม่พบแบบฟอร์มประเมิน CSM ที่เปิดใช้งาน'
          });
          return;
        }

        console.log('✅ Found CSM form:', csmForm.formTitle || csmForm.formCode);

        // Check for existing assessment
        console.log('🔍 Checking for existing assessments...');
        const existingAssessments = await csmService.assessments.getByVdCode(vdCode);
        console.log('📋 Existing assessments found:', existingAssessments.length);
        
        const currentAssessment = existingAssessments.find((a: CSMAssessment) => 
          a.formId === csmForm.id && !a.isFinish
        );

        let assessment: CSMAssessment;
        let answers: CSMAssessmentAnswer[] = [];
        let auditor: CSMAuditor = {
          name: '',
          email: '',
          phone: '',
          position: ''
        };

        if (currentAssessment) {
          console.log('✅ Found existing assessment:', currentAssessment.id);
          assessment = currentAssessment;
          answers = currentAssessment.answers || [];
          auditor = currentAssessment.auditor || auditor;
        } else {
          console.log('📝 Creating new assessment');
          assessment = {
            id: '', // Will be set when saved
            companyId: vendorWithCompany.vendor.companyId,
            vdCode: vendorWithCompany.vendor.vdCode,
            vdName: vendorWithCompany.vendor.vdName,
            formId: csmForm.id || '',
            formVersion: '1.0',
            answers: [],
            auditor,
            vdCategory: vendorWithCompany.vendor.category,
            vdWorkingArea: vendorWithCompany.vendor.workingArea?.join(', ') || '',
            isActive: true,
            isFinish: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Initialize answers for all form fields
          answers = csmForm.fields.map((field: CSMFormField) => ({
            ckItem: field.ckItem,
            ckType: field.ckType,
            ckQuestion: field.ckQuestion,
            comment: '',
            score: '', // Start with empty score
            tScore: field.tScore || field.fScore || '5', // Fixed property name
            action: '',
            files: [],
            isFinish: false
          }));
        }

        setState({
          loading: false,
          saving: false,
          vendor: vendorWithCompany.vendor,
          company: vendorWithCompany.company,
          form: csmForm,
          assessment,
          answers,
          auditor,
          isDirty: false,
          readOnly: assessment.isFinish || false
        });

        // Mark as initialized for auto-save
        isInitializedRef.current = true;
        
        console.log('✅ Page initialization complete');

      } catch (error) {
        console.error('❌ Error initializing page:', error);
        addToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
        });
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initializePage();
  }, [vdCode, navigate, addToast]);

  // =================== RENDER ===================
  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!state.vendor || !state.form || !state.assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">ไม่พบข้อมูลที่ต้องการ</p>
          <button
            onClick={() => navigate('/csm')}
            className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/csm')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                กลับ
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  ประเมิน CSM: {state.vendor.vdName}
                </h1>
                <p className="text-sm text-gray-600">
                  รหัส: {state.vendor.vdCode} | แบบฟอร์ม: {state.form.formTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save Status */}
              {state.saving && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </div>
              )}
              
              {state.lastSaved && !state.saving && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  บันทึกล่าสุด: {state.lastSaved.toLocaleTimeString('th-TH')}
                </div>
              )}

              {/* Action Buttons */}
              {!state.readOnly && (
                <>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={state.saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {state.saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={state.saving || scoreCalculation.completedQuestions === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    ส่งการประเมิน
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <QuestionForm
              formFields={state.form.fields}
              answers={state.answers}
              onAnswersChange={handleAnswersChange}
              onSave={() => handleSave(false)}
              readOnly={state.readOnly}
              autoSaveEnabled={true}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {/* Score Summary */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">สรุปคะแนน</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">คะแนนรวม:</span>
                  <span className="font-medium">{scoreCalculation.totalScore}/{scoreCalculation.maxScore}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">เปอร์เซ็นต์:</span>
                  <span className="font-medium">{scoreCalculation.percentage.toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ความคืบหน้า:</span>
                  <span className="font-medium">
                    {scoreCalculation.completedQuestions}/{scoreCalculation.totalQuestions}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ระดับความเสี่ยง:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    scoreCalculation.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                    scoreCalculation.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {scoreCalculation.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Auditor Information */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">ข้อมูลผู้ประเมิน</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    ชื่อผู้ประเมิน *
                  </label>
                  <input
                    type="text"
                    value={state.auditor.name}
                    onChange={(e) => handleAuditorChange('name', e.target.value)}
                    disabled={state.readOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    ตำแหน่ง *
                  </label>
                  <input
                    type="text"
                    value={state.auditor.position}
                    onChange={(e) => handleAuditorChange('position', e.target.value)}
                    disabled={state.readOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="ตำแหน่งงาน"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={state.auditor.email}
                    onChange={(e) => handleAuditorChange('email', e.target.value)}
                    disabled={state.readOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="email@domain.com"
                  />
                </div>
                
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    เบอร์โทร
                  </label>
                  <input
                    type="tel"
                    value={state.auditor.phone || ''}
                    onChange={(e) => handleAuditorChange('phone', e.target.value)}
                    disabled={state.readOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    placeholder="0XX-XXX-XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">ข้อมูล Vendor</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">รหัส:</span>
                  <span className="ml-2 font-medium">{state.vendor.vdCode}</span>
                </div>
                
                <div>
                  <span className="text-gray-600">ชื่อ:</span>
                  <span className="ml-2 font-medium">{state.vendor.vdName}</span>
                </div>
                
                <div>
                  <span className="text-gray-600">หมวดหมู่:</span>
                  <span className="ml-2 font-medium">{state.vendor.category}</span>
                </div>
                
                {state.vendor.workingArea && state.vendor.workingArea.length > 0 && (
                  <div>
                    <span className="text-gray-600">พื้นที่ทำงาน:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {state.vendor.workingArea.map((area, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {state.company && (
                  <div>
                    <span className="text-gray-600">บริษัท:</span>
                    <span className="ml-2 font-medium">{state.company.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment Status */}
            {state.assessment.isFinish && (
              <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">การประเมินเสร็จสิ้น</h3>
                </div>
                <p className="text-sm text-green-700">
                  การประเมินนี้ได้ส่งเรียบร้อยแล้วเมื่อ{' '}
                  {formatFinishedDate(state.assessment.finishedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSMEvaluatePage;