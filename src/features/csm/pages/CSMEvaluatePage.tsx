// 📁 src/features/csm/pages/CSMEvaluatePage.tsx
// Fixed CSMEvaluatePage - แก้ไขปัญหา Navigation และ Type Errors
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Save, Send, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../contexts/AuthContext';
import csmService from '../../../services/csmService';
import type { 
  CSMVendor, 
  CSMFormField, 
  CSMAssessment, 
  CSMAssessmentAnswer, 
  CSMAuditor,
  Company,
  CSMFormDoc
} from '../../../types/csm';

// Assessment form component (lazy loaded)
const QuestionForm = React.lazy(() => import('../components/QuestionForm'));


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
  confirmations: Record<string, boolean>;
}

const CSMEvaluatePage: React.FC = () => {
  const { vdCode } = useParams<{ vdCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  
  // Prevent navigation loops
  const isInitializedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationBlockedRef = useRef(false);

  // Get vdCode from params or query string
  const finalVdCode = vdCode || searchParams.get('vdCode');

  const [state, setState] = useState<PageState>({
    loading: true,
    saving: false,
    vendor: null,
    company: null,
    form: null,
    assessment: null,
    answers: [],
    auditor: {
      name: user?.displayName || '',
      email: user?.email || '',
      phone: '',
      position: ''
    },
    isDirty: false,
    readOnly: false,
    confirmations: {}
  });

    // Calculate score
  const scoreCalculation = React.useMemo(() => {
    if (state.answers.length === 0) return { total: 0, max: 0, percentage: 0 };
    
    const total = state.answers.reduce((sum, answer) => {
      const score = parseFloat(answer.score || '0') || 0;
      return sum + score;
    }, 0);
    
    const max = state.answers.reduce((sum, answer) => {
      const tScore = parseFloat(answer.tScore || '5') || 5;
      return sum + tScore;
    }, 0);
    
    const percentage = max > 0 ? (total / max) * 100 : 0;
    
    return { total, max, percentage };
  }, [state.answers]);

  // =================== SAVE FUNCTIONS ===================
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!finalVdCode || !state.assessment || state.readOnly || state.saving) {
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));

      const updatedAssessment: CSMAssessment = {
        ...state.assessment,
        answers: state.answers,
        auditor: state.auditor,
        totalScore: scoreCalculation.total.toString(),
        maxScore: scoreCalculation.max.toString(),
        avgScore: scoreCalculation.percentage.toFixed(1),
        updatedAt: new Date(),
        isFinish: false
      };

      await csmService.assessments.save(updatedAssessment);

      setState(prev => ({ ...prev, isDirty: false, assessment: updatedAssessment }));

      if (!isAutoSave) {
        addToast({
          type: 'success',
          title: 'บันทึกสำเร็จ',
          message: 'ข้อมูลการประเมินถูกบันทึกแล้ว'
        });
      }

    } catch (error) {
      console.error('❌ Error saving assessment:', error);
      if (!isAutoSave) {
        addToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
        });
      }
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [finalVdCode, state.assessment, state.readOnly, state.saving, state.answers, state.auditor, scoreCalculation, addToast]);

  const handleSubmit = useCallback(async () => {
    if (!state.assessment || state.readOnly || state.saving) {
      return;
    }

    // Validate required fields
    const incompleteAnswers = state.answers.filter(answer => !answer.score || answer.score.trim() === '');
    if (incompleteAnswers.length > 0) {
      addToast({
        type: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: `กรุณากรอกคะแนนให้ครบทุกข้อ (ขาดไป ${incompleteAnswers.length} ข้อ)`
      });
      return;
    }

    if (!state.auditor.name.trim()) {
      addToast({
        type: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกชื่อผู้ประเมิน'
      });
      return;
    }

    try {
      setState(prev => ({ ...prev, saving: true }));

      const finalAssessment: CSMAssessment = {
        ...state.assessment,
        answers: state.answers.map(answer => ({ ...answer, isFinish: true })),
        auditor: state.auditor,
        totalScore: scoreCalculation.total.toString(),
        maxScore: scoreCalculation.max.toString(),
        avgScore: scoreCalculation.percentage.toFixed(1),
        isFinish: true,
        finishedAt: new Date(),
        updatedAt: new Date()
      };

      await csmService.assessments.save(finalAssessment);

      setState(prev => ({ 
        ...prev, 
        isDirty: false, 
        readOnly: true, 
        assessment: finalAssessment 
      }));

      addToast({
        type: 'success',
        title: 'ส่งการประเมินสำเร็จ',
        message: `การประเมิน CSM ถูกส่งเรียบร้อยแล้ว (คะแนน: ${scoreCalculation.percentage.toFixed(1)}%)`
      });

      // Don't redirect immediately - let user see the success message first

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
  }, [state.assessment, state.readOnly, state.saving, state.answers, state.auditor, scoreCalculation, addToast]);

  // =================== AUTO-SAVE LOGIC ===================
  useEffect(() => {
    if (!isInitializedRef.current || navigationBlockedRef.current) return;
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

  // =================== CONFIRMATION CHANGE HANDLER ===================
  const handleConfirmChange = useCallback((ckItem: string, confirmed: boolean) => {
    setState(prev => ({
      ...prev,
      confirmations: {
        ...prev.confirmations,
        [ckItem]: confirmed
      },
      isDirty: true
    }));
  }, []);

  // =================== NAVIGATION HANDLERS ===================
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      const confirmLeave = window.confirm(
        'คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?'
      );
      if (!confirmLeave) return;
    }
    
    navigationBlockedRef.current = true;
    navigate('/csm', { replace: true });
  }, [navigate, state.isDirty]);

  // =================== INITIALIZATION ===================
  useEffect(() => {
    if (!finalVdCode) {
      console.error('❌ No vdCode provided');
      addToast({
        type: 'error',
        title: 'ข้อผิดพลาด',
        message: 'ไม่พบรหัส Vendor'
      });
      navigate('/csm', { replace: true });
      return;
    }

    const initializePage = async () => {
      try {
        console.log('🚀 Initializing CSM Evaluate Page for vdCode:', finalVdCode);
        setState(prev => ({ ...prev, loading: true }));
        navigationBlockedRef.current = false;

        // Load vendor data
        console.log('🔍 Loading vendor with vdCode:', finalVdCode);
        const vendor = await csmService.vendors.getByVdCode(finalVdCode);
        if (!vendor) {
          throw new Error(`ไม่พบข้อมูล Vendor สำหรับรหัส: ${finalVdCode}`);
        }
        console.log('✅ Found vendor:', vendor.vdName);

        // Load company data (if available)
        let company: Company | null = null;
        try {
          company = await csmService.companies.getByVdCode(vendor.vdCode);
          if (company) {
            console.log('✅ Found company:', company.name);
          }
        } catch (error) {
          console.warn('Could not load company data:', error);
        }

        // Load CSM form
        console.log('🔍 Loading CSM form...');
        let csmForm: CSMFormDoc | null = null;
        
        try {
          // Try enhanced service first
          console.log('🔍 Trying enhancedCSMFormsService.getCSMChecklist()...');
          const enhancedCSMFormsService = await import('../../../services/enhancedCsmService');
          csmForm = await enhancedCSMFormsService.enhancedCSMFormsService.getCSMChecklist();
          
          if (csmForm) {
            console.log('✅ Found CSM form from enhanced service:', csmForm.formTitle || csmForm.formCode);
          }
        } catch (enhancedError) {
          console.warn('⚠️ Enhanced service failed, trying regular service:', enhancedError);
        }
        
        // Fallback to regular service
        if (!csmForm) {
          try {
            console.log('🔍 Trying csmService.forms.getAll()...');
            const allForms = await csmService.forms.getAll();
            console.log(`📋 Found ${allForms.length} forms total`);
            
            // Look for CSM form by various criteria
            csmForm = allForms.find(form => 
              form.formCode === 'CSM' || 
              form.formCode === 'CSMChecklist' ||
              form.formCode?.toLowerCase().includes('csm') ||
              form.formTitle?.toLowerCase().includes('csm') ||
              form.applicableTo?.includes('csm')
            ) || null;
            
            if (csmForm) {
              console.log('✅ Found CSM form from regular service:', csmForm.formTitle || csmForm.formCode);
            } else {
              console.log('📋 Available forms:', allForms.map(f => ({ code: f.formCode, title: f.formTitle })));
            }
          } catch (regularError) {
            console.warn('⚠️ Regular service also failed:', regularError);
          }
        }
        
        // Create mock form if nothing found
        if (!csmForm) {
          console.log('📝 Creating mock CSM form for development...');
          csmForm = {
            id: 'mock-csm-form',
            formCode: 'CSMChecklist',
            formTitle: 'CSM Assessment Checklist (Mock)',
            formDescription: 'Mock CSM assessment form for testing purposes',
            isActive: true,
            applicableTo: ['csm'],
            fields: [
              {
                id: '1',
                ckItem: '1',
                ckType: 'M',
                ckQuestion: 'มีการจัดการด้านความปลอดภัยหรือไม่?',
                ckRequirement: 'ต้องมีระบบจัดการความปลอดภัยที่ครอบคลุม',
                fScore: '5',
                tScore: '5',
                type: 'text',
                required: true,
                allowAttach: false
              },
              {
                id: '2',
                ckItem: '2',
                ckType: 'M',
                ckQuestion: 'มีการฝึกอบรมพนักงานหรือไม่?',
                ckRequirement: 'ควรมีการฝึกอบรมอย่างสม่ำเสมอและมีหลักฐาน',
                fScore: '5',
                tScore: '5',
                type: 'text',
                required: true,
                allowAttach: false
              },
              {
                id: '3',
                ckItem: '3',
                ckType: 'P',
                ckQuestion: 'มีใบรับรองมาตรฐานที่เกี่ยวข้องหรือไม่?',
                ckRequirement: 'ควรมีใบรับรองมาตรฐานที่เกี่ยวข้อง',
                fScore: '3',
                tScore: '3',
                type: 'text',
                required: false,
                allowAttach: true
              }
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system'
          };
          console.log('✅ Created mock CSM form');
        }
        
        if (!csmForm.fields || csmForm.fields.length === 0) {
          throw new Error('แบบฟอร์ม CSM ไม่มีคำถาม กรุณาตรวจสอบข้อมูลในระบบ');
        }

        // Try to load existing assessment
        let assessment: CSMAssessment;
        let answers: CSMAssessmentAnswer[];
        let auditor: CSMAuditor = {
          name: '',
          email: '',
          phone: '',
          position: ''
        };

        try {
          const existingAssessments = await csmService.assessments.getByVdCode(finalVdCode);
          const currentAssessment = existingAssessments.find((a: CSMAssessment) => 
            a.formId === csmForm.id && !a.isFinish
          );

          if (currentAssessment) {
            console.log('📋 Found existing assessment');
            assessment = currentAssessment;
            answers = currentAssessment.answers || [];
            auditor = currentAssessment.auditor || auditor;
          } else {
            throw new Error('No existing assessment'); // Force creation of new assessment
          }
        } catch {
          console.log('📝 Creating new assessment');
          assessment = {
            id: `${finalVdCode}_${Date.now()}`,
            companyId: vendor.companyId,
            vdCode: vendor.vdCode,
            vdName: vendor.vdName,
            formId: csmForm.id || '',
            formVersion: '1.0',
            answers: [],
            auditor,
            vdCategory: vendor.category,
            vdWorkingArea: Array.isArray(vendor.workingArea) 
              ? vendor.workingArea.join(', ') 
              : (vendor.workingArea || ''),
            totalScore: '0',
            maxScore: '0',
            avgScore: '0',
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
            tScore: field.tScore || field.fScore || '5',
            action: '',
            files: [],
            isFinish: false
          }));
        }

        setState({
          loading: false,
          saving: false,
          vendor,
          company,
          form: csmForm,
          assessment,
          answers,
          auditor,
          isDirty: false,
          readOnly: assessment.isFinish || false,
          confirmations: {}
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
        
        // Don't auto-redirect on error - let user try again
      }
    };

    initializePage();
  }, [finalVdCode, navigate, addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
          <p className="mb-4 text-gray-600">ไม่พบข้อมูลที่ต้องการ</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ← กลับหน้ารายการ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 transition-colors rounded-lg hover:text-blue-600 hover:bg-blue-50"
                title="กลับหน้ารายการ"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {state.readOnly ? 'ดูผลการประเมิน CSM' : 'ประเมิน CSM'}
                </h1>
                <p className="mt-1 text-gray-600">
                  {state.company?.name || state.vendor.vdName} ({state.vendor.vdCode})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Score Display */}
              <div className="text-right">
                <p className="text-sm text-gray-600">คะแนนรวม</p>
                <p className="text-2xl font-bold text-blue-600">
                  {scoreCalculation.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {scoreCalculation.total}/{scoreCalculation.max}
                </p>
              </div>

              {/* Status */}
              {state.readOnly ? (
                <div className="flex items-center px-3 py-2 space-x-2 text-green-700 border border-green-200 rounded-lg bg-green-50">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">เสร็จสิ้น</span>
                </div>
              ) : (
                <div className="flex items-center px-3 py-2 space-x-2 text-yellow-700 border border-yellow-200 rounded-lg bg-yellow-50">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">กำลังประเมิน</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!state.readOnly && (
          <div className="p-4 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {state.isDirty && (
                  <div className="flex items-center space-x-2 text-amber-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">มีการเปลี่ยนแปลง</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={state.saving || !state.isDirty}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                    ${state.saving || !state.isDirty 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                  `}
                >
                  <Save className="w-4 h-4" />
                  <span>{state.saving ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={state.saving}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                    ${state.saving 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }
                  `}
                >
                  <Send className="w-4 h-4" />
                  <span>{state.saving ? 'กำลังส่ง...' : 'ส่งการประเมิน'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assessment Form */}
        <React.Suspense fallback={
          <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-xl">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">กำลังโหลดแบบฟอร์ม...</span>
            </div>
          </div>
        }>
          {/* Auditor Information */}
          {!state.readOnly && (
            <div className="p-6 mb-6 bg-white border border-gray-200 shadow-sm rounded-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">ข้อมูลผู้ประเมิน</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    ชื่อผู้ประเมิน *
                  </label>
                  <input
                    type="text"
                    value={state.auditor.name}
                    onChange={(e) => handleAuditorChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="กรอกชื่อผู้ประเมิน"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    ตำแหน่ง
                  </label>
                  <input
                    type="text"
                    value={state.auditor.position}
                    onChange={(e) => handleAuditorChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="กรอกตำแหน่ง"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={state.auditor.email}
                    onChange={(e) => handleAuditorChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="กรอกอีเมล"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={state.auditor.phone || ''}
                    onChange={(e) => handleAuditorChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="กรอกเบอร์โทรศัพท์"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Question Form */}
          <QuestionForm
            formFields={state.form.fields}
            answers={state.answers}
            onAnswersChange={handleAnswersChange}
            readOnly={state.readOnly}
            autoSaveEnabled={!state.readOnly}
            onSave={() => handleSave(false)}
            confirmations={state.confirmations}
            onConfirmChange={handleConfirmChange}
          />
        </React.Suspense>
      </div>
    </div>
  );
};

export default CSMEvaluatePage;