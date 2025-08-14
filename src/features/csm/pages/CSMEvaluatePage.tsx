// 📁 src/features/csm/pages/CSMEvaluatePage.tsx
// Complete Fixed CSM Evaluation Page
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Save, Send, Clock, CheckCircle, AlertTriangle, 
  FileText, Camera, Trash2, ChevronLeft, ChevronRight,
  Building2, User, MapPin
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../contexts/AuthContext';
import { useDebouncedAutoSave } from '../../../hooks/useDebouncedAutoSave';
import { enhancedCSMService } from '../../../services/enhancedCsmService';
import type { 
  CSMFormField, 
  CSMAssessment, 
  CSMAssessmentAnswer, 
  CSMAuditor,
  Score
} from '../../../types/csm';

// Types
interface QuestionProgress {
  completed: number;
  total: number;
  percentage: number;
}

interface ScoreOption {
  value: Score;
  label: string;
  description: string;
  color: string;
}

// Constants
const SCORE_OPTIONS: ScoreOption[] = [
  { value: '5', label: '5', description: 'ดีเยี่ยม', color: 'bg-green-500' },
  { value: '4', label: '4', description: 'ดี', color: 'bg-green-400' },
  { value: '3', label: '3', description: 'พอใช้', color: 'bg-yellow-500' },
  { value: '2', label: '2', description: 'ต้องปรับปรุง', color: 'bg-orange-500' },
  { value: '1', label: '1', description: 'ไม่ดี', color: 'bg-red-500' },
  { value: '0', label: '0', description: 'ไม่มี', color: 'bg-red-600' },
  { value: 'n/a', label: 'N/A', description: 'ไม่เกี่ยวข้อง', color: 'bg-gray-500' }
];

// Components
const ProgressBar: React.FC<{ progress: QuestionProgress }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${progress.percentage}%` }}
    />
  </div>
);

const QuestionSidebar: React.FC<{
  questions: CSMFormField[];
  answers: CSMAssessmentAnswer[];
  selectedIndex: number;
  onQuestionSelect: (index: number) => void;
}> = ({ questions, answers, selectedIndex, onQuestionSelect }) => {
  const getQuestionStatus = (index: number) => {
    const answer = answers[index];
    if (!answer || !answer.score) return 'incomplete';
    if (answer.isFinish) return 'complete';
    return 'in-progress';
  };

  const progress = useMemo((): QuestionProgress => {
    const completed = answers.filter(a => a.score && a.score !== '').length;
    const total = questions.length;
    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0
    };
  }, [answers, questions.length]);

  return (
    <div className="w-80 bg-white shadow-lg border-r overflow-y-auto flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-blue-50">
        <h2 className="font-semibold text-gray-900 mb-2">รายการคำถาม</h2>
        <div className="text-sm text-gray-600 mb-2">
          ตอบแล้ว {progress.completed}/{progress.total} ข้อ
        </div>
        <ProgressBar progress={progress} />
      </div>
      
      {/* Questions List */}
      <div className="flex-1 p-2 overflow-y-auto">
        {questions.map((question, index) => {
          const status = getQuestionStatus(index);
          const isSelected = selectedIndex === index;
          const answer = answers[index];
          
          return (
            <button
              key={question.id}
              onClick={() => onQuestionSelect(index)}
              className={`w-full text-left p-3 mb-2 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-200 shadow-sm ring-2 ring-blue-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    question.ckType === 'M' 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    {question.ckType}
                  </span>
                  <span className="text-sm font-medium">ข้อ {question.ckItem}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {status === 'complete' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {status === 'in-progress' && (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                  {question.required && (
                    <span className="text-red-500 text-xs font-bold">*</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-3 mb-1">
                {question.ckQuestion}
              </p>
              {answer?.score && (
                <div className="flex items-center mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    คะแนน: {answer.score}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ScoreSelector: React.FC<{
  value: Score | '';
  onChange: (score: Score) => void;
  disabled?: boolean;
  allowNA?: boolean;
}> = ({ value, onChange, disabled = false, allowNA = true }) => {
  const options = allowNA ? SCORE_OPTIONS : SCORE_OPTIONS.filter(opt => opt.value !== 'n/a');
  
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`relative p-3 rounded-lg border-2 transition-all duration-200 ${
            value === option.value
              ? `${option.color} text-white border-gray-900 ring-2 ring-offset-2 ring-gray-900`
              : `border-gray-300 hover:border-gray-400 hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
          }`}
        >
          <div className="text-center">
            <div className={`text-lg font-bold ${value === option.value ? 'text-white' : 'text-gray-900'}`}>
              {option.label}
            </div>
            <div className={`text-xs mt-1 ${value === option.value ? 'text-white' : 'text-gray-600'}`}>
              {option.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const QuestionForm: React.FC<{
  question: CSMFormField;
  answer: CSMAssessmentAnswer;
  onChange: (answer: Partial<CSMAssessmentAnswer>) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  questionNumber: number;
  totalQuestions: number;
}> = ({ 
  question, 
  answer, 
  onChange, 
  onNext, 
  onPrev, 
  hasNext, 
  hasPrev,
  questionNumber,
  totalQuestions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScoreChange = (score: Score) => {
    // Calculate tScore
    const fScore = parseFloat(question.fScore || '0') || 0;
    let tScore = '0';
    
    if (score !== 'n/a') {
      const scoreValue = parseFloat(score) || 0;
      tScore = (fScore * scoreValue / 5).toString(); // Assuming max score is 5
    }
    
    onChange({ 
      score, 
      tScore,
      isFinish: true
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Handle file upload logic here
      const fileNames = Array.from(files).map(file => file.name);
      onChange({ 
        files: [...(answer.files || []), ...fileNames]
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...(answer.files || [])];
    newFiles.splice(index, 1);
    onChange({ files: newFiles });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Question Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
              question.ckType === 'M' ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              {question.ckType}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ข้อ {question.ckItem} จาก {totalQuestions}
              </h2>
              <div className="flex items-center mt-1 space-x-2">
                {question.required && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    บังคับ
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  คะแนนเต็ม: {question.fScore || '0'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            ข้อ {questionNumber} / {totalQuestions}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">คำถาม</h3>
            <p className="text-gray-700 leading-relaxed">{question.ckQuestion}</p>
          </div>
          
          {question.ckRequirement && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">ข้อกำหนด</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {question.ckRequirement}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Answer Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-6">
          {/* Score Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              คะแนน {question.required && <span className="text-red-500">*</span>}
            </label>
            <ScoreSelector
              value={answer.score as Score || ''}
              onChange={handleScoreChange}
              allowNA={question.ckType !== 'M'} // M type cannot be N/A
            />
            {answer.score && answer.tScore && (
              <div className="mt-2 text-sm text-gray-600">
                คะแนนที่ได้: {answer.tScore} / {question.fScore || '0'}
              </div>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              ความคิดเห็น / รายละเอียดเพิ่มเติม
            </label>
            <textarea
              rows={4}
              value={answer.comment || ''}
              onChange={(e) => onChange({ comment: e.target.value })}
              placeholder="บันทึกข้อสังเกต หรือข้อเสนอแนะ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* File Attachments */}
          {question.allowAttach && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                ไฟล์แนบ (รูปภาพ, เอกสาร)
              </label>
              
              <div className="space-y-3">
                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    แนบไฟล์
                  </button>
                </div>
                
                {/* File List */}
                {answer.files && answer.files.length > 0 && (
                  <div className="space-y-2">
                    {answer.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-700 truncate">{file}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          ข้อก่อนหน้า
        </button>
        
        <div className="text-sm text-gray-500">
          ข้อ {questionNumber} จาก {totalQuestions}
        </div>
        
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ข้อถัดไป
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

// Main Component
const CSMEvaluatePage: React.FC = () => {
  const { vdCode } = useParams<{ vdCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<CSMAssessmentAnswer[]>([]);
  const [auditor] = useState<CSMAuditor>({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    position: ''
  });
  
  const finalVdCode = vdCode || searchParams.get('vdCode');
  
  // Data fetching
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['csm-vendor', finalVdCode],
    queryFn: () => finalVdCode ? enhancedCSMService.vendors.getByVdCode(finalVdCode) : null,
    enabled: !!finalVdCode,
  });
  
  const { data: company } = useQuery({
    queryKey: ['company', vendor?.companyId],
    queryFn: () => vendor?.companyId ? enhancedCSMService.companies.getByVdCode(vendor.vdCode) : null,
    enabled: !!vendor?.companyId,
  });
  
  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['csm-form', 'CSMChecklist'],
    queryFn: () => enhancedCSMService.forms.getCSMChecklist(),
  });
  
  const { data: existingAssessment } = useQuery({
    queryKey: ['csm-assessment', finalVdCode],
    queryFn: async () => {
      if (!finalVdCode || !form?.id) return null;
      const assessments = await enhancedCSMService.assessments.getByVdCode(finalVdCode);
      return assessments.find(a => a.id && !a.isFinish) || null;
    },
    enabled: !!finalVdCode && !!form?.id,
  });
  
  // Initialize answers when form loads
  useEffect(() => {
    if (form?.fields && answers.length === 0) {
      const initialAnswers: CSMAssessmentAnswer[] = form.fields.map(field => ({
        ckItem: field.ckItem,
        ckType: field.ckType,
        ckQuestion: field.ckQuestion,
        comment: '',
        score: '',
        tScore: '0',
        files: [],
        isFinish: false
      }));
      
      // Load existing answers if available
      if (existingAssessment?.answers) {
        existingAssessment.answers.forEach((existingAnswer, index) => {
          if (initialAnswers[index]) {
            initialAnswers[index] = { ...initialAnswers[index], ...existingAnswer };
          }
        });
      }
      
      setAnswers(initialAnswers);
    }
  }, [form?.fields, existingAssessment?.answers, answers.length]);
  
  // Calculation functions
  const calculateTotalScore = useCallback((answers: CSMAssessmentAnswer[]): number => {
    return answers.reduce((total, answer) => {
      const score = parseFloat(answer.tScore || '0') || 0;
      return total + score;
    }, 0);
  }, []);
  
  const calculateMaxScore = useCallback((fields: CSMFormField[]): number => {
    return fields.reduce((total, field) => {
      const fScore = parseFloat(field.fScore || '0') || 0;
      return total + fScore;
    }, 0);
  }, []);
  
  const calculateAvgScore = useCallback((answers: CSMAssessmentAnswer[], fields: CSMFormField[]): number => {
    const totalScore = calculateTotalScore(answers);
    const maxScore = calculateMaxScore(fields);
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [calculateTotalScore, calculateMaxScore]);
  
  const calculateRiskLevel = useCallback((answers: CSMAssessmentAnswer[], fields: CSMFormField[]): string => {
    const avgScore = calculateAvgScore(answers, fields);
    if (avgScore >= 80) return 'Low';
    if (avgScore >= 60) return 'Medium';
    return 'High';
  }, [calculateAvgScore]);
  
  // Auto-save functionality
  const saveAssessment = useCallback(async (assessmentData: Partial<CSMAssessment>) => {
    if (!vendor || !form) return;
    
    // ✅ Fix assessment object structure - match CSMAssessment type exactly
    const assessmentToSave = {
      companyId: vendor.companyId,
      vdCode: vendor.vdCode,
      vdName: vendor.vdName,
      docReference: vendor.vdCode, // ✅ Add required field
      formCode: 'CSMChecklist', // ✅ Add required field as string
      formVersion: '1.0',
      vdWorkingArea: Array.isArray(vendor.workingArea) ? vendor.workingArea.join(', ') : vendor.workingArea || '',
      vdCategory: vendor.category,
      answers,
      auditor,
      riskLevel: calculateRiskLevel(answers, form.fields),
      totalScore: calculateTotalScore(answers).toString(),
      maxScore: calculateMaxScore(form.fields).toString(),
      avgScore: calculateAvgScore(answers, form.fields).toString(),
      isActive: true,
      isFinish: false,
      createdAt: existingAssessment?.createdAt || new Date(),
      updatedAt: new Date(),
      ...assessmentData
    };
    
    if (existingAssessment?.id) {
      await enhancedCSMService.assessments.update(existingAssessment.id, assessmentToSave);
    } else {
      await enhancedCSMService.assessments.create(assessmentToSave);
    }
    
    queryClient.invalidateQueries({ queryKey: ['csm-assessment', finalVdCode] });
  }, [vendor, form, answers, auditor, existingAssessment, finalVdCode, queryClient, calculateRiskLevel, calculateTotalScore, calculateMaxScore, calculateAvgScore]);
  
  // ✅ Fix auto-save options
  const { isSaving, lastSaved } = useDebouncedAutoSave(
    { answers, auditor },
    saveAssessment,
    { delay: 60000 }
  );
  
  // Mutations
  const finishAssessmentMutation = useMutation({
    mutationFn: async () => {
      await saveAssessment({ 
        isFinish: true, 
        finishedAt: new Date()
      });
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'บันทึกสำเร็จ',
        message: 'การประเมินได้รับการบันทึกเรียบร้อยแล้ว'
      });
      navigate('/csm');
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถบันทึกการประเมินได้'
      });
    }
  });
  
  // Event handlers
  const handleAnswerChange = useCallback((index: number, changes: Partial<CSMAssessmentAnswer>) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = { ...newAnswers[index], ...changes };
      return newAnswers;
    });
  }, []);
  
  const handleQuestionSelect = useCallback((index: number) => {
    setSelectedQuestionIndex(index);
  }, []);
  
  const handleNext = useCallback(() => {
    if (form && selectedQuestionIndex < form.fields.length - 1) {
      setSelectedQuestionIndex(prev => prev + 1);
    }
  }, [selectedQuestionIndex, form]);
  
  const handlePrev = useCallback(() => {
    if (selectedQuestionIndex > 0) {
      setSelectedQuestionIndex(prev => prev - 1);
    }
  }, [selectedQuestionIndex]);
  
  const handleFinishAssessment = useCallback(() => {
    if (!form) return;
    
    // Validate required questions
    const requiredQuestions = form.fields.filter(f => f.required);
    const missingRequired = requiredQuestions.filter((_, index) => {
      const answer = answers[index];
      return !answer || !answer.score || answer.score === '';
    });
    
    if (missingRequired.length > 0) {
      addToast({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: `กรุณาตอบคำถามบังคับ ${missingRequired.length} ข้อที่เหลือ`
      });
      return;
    }
    
    finishAssessmentMutation.mutate();
  }, [form, answers, addToast, finishAssessmentMutation]);
  
  // Check user permissions  
  const hasPermission = useMemo(() => {
    if (!user?.roles) return false;
    const allowedRoles = ['superAdmin', 'csmAuditor', 'auditor'];
    if (Array.isArray(user.roles)) {
      return user.roles.some(role => allowedRoles.includes(role));
    }
    return allowedRoles.includes(user.roles);
  }, [user?.roles]);


  
  // Loading and error states
  if (!finalVdCode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบรหัสผู้รับเหมา</h3>
          <p className="text-gray-500">กรุณาตรวจสอบ URL และลองใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }
  
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ไม่มีสิทธิ์เข้าถึง</h3>
          <p className="text-gray-500">คุณไม่มีสิทธิ์ในการประเมิน CSM</p>
        </div>
      </div>
    );
  }
  
  if (vendorLoading || formLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบข้อมูลผู้รับเหมา</h3>
          <p className="text-gray-500">รหัส: {finalVdCode}</p>
        </div>
      </div>
    );
  }
  
  if (!form || !form.fields || form.fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">ไม่พบแบบฟอร์มการประเมิน</h3>
          <p className="text-gray-500">ไม่สามารถโหลด CSMChecklist ได้</p>
        </div>
      </div>
    );
  }
  
  // ✅ Calculate scores with null checks
  const currentQuestion = form.fields[selectedQuestionIndex];
  const currentAnswer = answers[selectedQuestionIndex];
  const totalScore = calculateTotalScore(answers);
  const maxScore = calculateMaxScore(form.fields);
  const avgScore = calculateAvgScore(answers, form.fields);
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Questions List */}
      <QuestionSidebar
        questions={form.fields}
        answers={answers}
        selectedIndex={selectedQuestionIndex}
        onQuestionSelect={handleQuestionSelect}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/csm')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                กลับ
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  ประเมิน CSM: {vendor.vdName}
                </h1>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <span>รหัส: {vendor.vdCode}</span>
                  <span>•</span>
                  <span>หมวดหมู่: {vendor.category}</span>
                  {company && (
                    <>
                      <span>•</span>
                      <span>บริษัท: {company.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-save Status */}
              <div className="text-sm text-gray-500">
                {isSaving && (
                  <span className="inline-flex items-center text-blue-600">
                    <Clock className="w-4 h-4 mr-1 animate-spin" />
                    กำลังบันทึก...
                  </span>
                )}
                {lastSaved && !isSaving && (
                  <span className="text-green-600">
                    บันทึกล่าสุด: {lastSaved.toLocaleTimeString('th-TH')}
                  </span>
                )}
              </div>
              
              {/* Score Display */}
              <div className="text-sm">
                <span className="text-gray-600">คะแนน: </span>
                <span className="font-semibold text-blue-600">
                  {totalScore.toFixed(1)} / {maxScore} ({avgScore}%)
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => saveAssessment({})}
                  disabled={isSaving}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1" />
                  บันทึก
                </button>
                <button
                  onClick={handleFinishAssessment}
                  disabled={finishAssessmentMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {finishAssessmentMutation.isPending ? 'กำลังบันทึก...' : 'จบการประเมิน'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Vendor Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">ผู้รับเหมา</p>
                <p className="text-sm font-medium text-gray-900">{vendor.vdName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">พื้นที่ทำงาน</p>
                <p className="text-sm font-medium text-gray-900">
                  {Array.isArray(vendor.workingArea) ? vendor.workingArea.join(', ') : vendor.workingArea || 'ไม่ระบุ'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">ผู้ประเมิน</p>
                <p className="text-sm font-medium text-gray-900">{auditor.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentQuestion && currentAnswer && (
            <QuestionForm
              question={currentQuestion}
              answer={currentAnswer}
              onChange={(changes) => handleAnswerChange(selectedQuestionIndex, changes)}
              onNext={handleNext}
              onPrev={handlePrev}
              hasNext={selectedQuestionIndex < form.fields.length - 1}
              hasPrev={selectedQuestionIndex > 0}
              questionNumber={selectedQuestionIndex + 1}
              totalQuestions={form.fields.length}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CSMEvaluatePage;