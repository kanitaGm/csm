// src/features/csm/components/QuestionForm.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Check, AlertCircle, FileText, HelpCircle, Eye, ArrowLeft, ArrowRight } from 'lucide-react';
import type { CSMFormField, CSMAssessmentAnswer, Score } from '../../../types';
import MultiFileInput from '../../../utils/MultiFileInput';

interface QuestionFormProps {
  formFields: CSMFormField[];
  initialAnswers?: CSMAssessmentAnswer[];
  vdCode: string;
  onAnswersChange: (answers: CSMAssessmentAnswer[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  formFields,
  initialAnswers = [],
  vdCode,
  onAnswersChange,
  onSave,
  readOnly = false
}) => {
  const [answers, setAnswers] = useState<CSMAssessmentAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Initialize answers from formFields and merge with existing answers
  useEffect(() => {
    const currentAnswersString = JSON.stringify(answers.map(a => a.ckItem).sort());
    const requiredAnswersString = JSON.stringify(formFields.map(f => f.ckItem).sort());
    
    if (currentAnswersString !== requiredAnswersString || answers.length === 0) {
      const initializedAnswers: CSMAssessmentAnswer[] = formFields.map(field => {
        const existingAnswer = initialAnswers.find(answer => answer.ckItem === field.ckItem);
        
        return existingAnswer || {
          ckItem: field.ckItem,
          ckType: field.ckType,
          comment: '',
          score: '',
          tScore:'',
          files: [],
          isFinish: false
        };
      });

      setAnswers(initializedAnswers);
      onAnswersChange(initializedAnswers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formFields, initialAnswers]);

  // Get question status for navigation - MOVED BEFORE useMemo
  const getQuestionStatus = useCallback((field: CSMFormField): 'completed' | 'partial' | 'empty' => {
    const answer = answers.find(a => a.ckItem === field.ckItem);
    if (!answer) return 'empty';
    
    if (answer.isFinish && answer.comment.trim() && answer.score && answer.score !== '') {
      return 'completed';
    } else if (answer.comment.trim() || (answer.score && answer.score !== '')) {
      return 'partial';
    }
    return 'empty';
  }, [answers]);

  // Memoized calculations for better performance
  const totalScore = useMemo(() => {
    return answers.reduce((total, answer) => {
      if (answer.tScore) {
        return total + (parseFloat(answer.tScore) || 0);
      } else if (answer.score && answer.score !== 'n/a') {
        const score = parseFloat(answer.score) || 0;
        const field = formFields.find(f => f.ckItem === answer.ckItem);
        const fScore = parseFloat(field?.fScore || '1');
        return total + (score * fScore);
      }
      return total;
    }, 0);
  }, [answers, formFields]);

  const averageScore = useMemo(() => {
    const validAnswers = answers.filter(answer => answer.score && answer.score !== 'n/a');
    if (validAnswers.length === 0) return 0;
    
    const maxPossibleScore = validAnswers.reduce((total, answer) => {
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      const fScore = parseFloat(field?.fScore || '1');
      return total + (5 * fScore);
    }, 0);
    
    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 5 : 0;
  }, [answers, formFields, totalScore]);

  const { completedQuestions, partialQuestions, progress } = useMemo(() => {
    const completed = formFields.filter(field => getQuestionStatus(field) === 'completed').length;
    const partial = formFields.filter(field => getQuestionStatus(field) === 'partial').length;
    const prog = formFields.length > 0 ? (completed / formFields.length) * 100 : 0;
    return { 
      completedQuestions: completed, 
      partialQuestions: partial,
      progress: prog 
    };
    
  }, [formFields, getQuestionStatus]); // Added getQuestionStatus to dependencies *answers

  // Update a specific answer
  const updateAnswer = useCallback((ckItem: string, updates: Partial<CSMAssessmentAnswer>) => {
    const updatedAnswers = answers.map(answer => 
      answer.ckItem === ckItem 
        ? { ...answer, ...updates }
        : answer
    );
    
    setAnswers(updatedAnswers);
    onAnswersChange(updatedAnswers);
    
    // Clear validation error for this field
    if (validationErrors[ckItem]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[ckItem];
        return newErrors;
      });
    }
  }, [answers, onAnswersChange, validationErrors]);

  
  // Validate all questions
const validateAllQuestions = useCallback((): boolean => {
  const errors: Record<string, string> = {};  
  formFields.forEach(field => {
    const answer = answers.find(a => a.ckItem === field.ckItem);
    if (answer) {
      const error = validateQuestion(answer, field);
      if (error) {
        errors[field.ckItem] = error;
      }
    }
  });

  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
}, [formFields, answers]);

  // Validate current question
  const validateQuestion = (answer: CSMAssessmentAnswer, field: CSMFormField): string | null => {
    if (field.required || field.ckType === 'M') {
      if (!answer.comment.trim()) {
        return 'กรุณาใส่ความเห็น/หมายเหตุ';
      }
      if (!answer.score || answer.score === '') {
        return 'กรุณาเลือกคะแนน';
      }
    }
    return null;
  };

  // Handle save with validation
  const handleSave = useCallback(() => {
    if (validateAllQuestions()) {
      setAutoSaveStatus('saving');
      onSave?.();
      setTimeout(() => setAutoSaveStatus('saved'), 10000);
      setTimeout(() => setAutoSaveStatus('idle'), 5000);
    } else {
      const errorCount = Object.keys(validationErrors).length;
      alert(`กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วน (${errorCount} ข้อ)`);
      // Jump to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorIndex = formFields.findIndex(f => f.ckItem === firstErrorField);
      if (errorIndex !== -1) {
        setCurrentQuestionIndex(errorIndex);
        setShowAllQuestions(false);
      }
    }
  }, [validateAllQuestions, onSave, validationErrors, formFields]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentQuestionIndex < formFields.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, formFields.length]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    setCurrentQuestionIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'ArrowLeft':
            if (!showAllQuestions) {
              e.preventDefault();
              goToPrevious();
            }
            break;
          case 'ArrowRight':
            if (!showAllQuestions) {
              e.preventDefault();
              goToNext();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSave, showAllQuestions, goToPrevious, goToNext]);

  // Helper functions
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Current question data
  const currentField = formFields[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.ckItem === currentField?.ckItem) || {
    ckItem: currentField?.ckItem || '',
    ckType: currentField?.ckType || 'M',
    comment: '',
    score: '' as Score,
    tScore: '',
    files: [],
    isFinish: false
  };

  // No questions state
  if (!currentField) {
    return (
      <div className="py-8 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">ไม่พบข้อคำถามในแบบฟอร์ม</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl p-6 mx-auto">
      {/* Enhanced Progress Header */}
      <div className="p-6 mb-6 bg-white border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">แบบประเมิน CSM</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">              
              {/* Progress Ring */}
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600 transition-all duration-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-600">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              <span className="text-sm text-gray-600">
                ข้อ {currentQuestionIndex + 1} จาก {formFields.length}
              </span>
            </div>
            <button
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showAllQuestions ? 'แสดงทีละข้อ' : 'แสดงทุกข้อ'}
            </button>
          </div>
        </div>

        {/* Enhanced Progress Bar with segments */}
        <div className="w-full h-3 mb-4 overflow-hidden bg-gray-200 rounded-full">
          <div className="flex h-full">
            {formFields.map((field, index) => {
              const status = getQuestionStatus(field);
              const segmentWidth = 100 / formFields.length;
              const statusColor = status === 'completed' ? 'bg-green-500' : 
                               status === 'partial' ? 'bg-yellow-500' : 'bg-gray-200';
              
              return (
                <div
                  key={field.ckItem}
                  className={`${statusColor} transition-all duration-300 hover:opacity-80 cursor-pointer border-r border-white first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${segmentWidth}%` }}
                  onClick={() => {
                    goToQuestion(index);
                    setShowAllQuestions(false);
                  }}
                  title={`ข้อ ${field.ckItem}: ${status === 'completed' ? 'เสร็จสิ้น' : status === 'partial' ? 'ทำบางส่วน' : 'ยังไม่ได้ทำ'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{completedQuestions}</div>
            <div className="text-xs text-gray-500">เสร็จสิ้น</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{partialQuestions}</div>
            <div className="text-xs text-gray-500">ทำบางส่วน</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{totalScore.toFixed(1)}</div>
            <div className="text-xs text-gray-500">คะแนนรวม</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{averageScore.toFixed(1)}</div>
            <div className="text-xs text-gray-500">คะแนนเฉลี่ย</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Enhanced Navigation Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky p-4 bg-white border rounded-lg shadow-sm top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">รายการคำถาม</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded"></div>
                  <span>เสร็จ</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                  <span>บางส่วน</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 overflow-y-auto max-h-96">
              {formFields.map((field, index) => {
                const status = getQuestionStatus(field);
                const isActive = index === currentQuestionIndex;
                const answer = answers.find(a => a.ckItem === field.ckItem);
                
                return (
                  <button
                    key={field.ckItem}
                    onClick={() => {
                      goToQuestion(index);
                      setShowAllQuestions(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${
                      isActive 
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm' 
                        : `hover:bg-gray-50 hover:shadow-sm ${getStatusColor(status)}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ข้อ {field.ckItem}</span>
                      <div className="flex items-center gap-1">
                        {answer?.score && (
                          <span className="px-1.5 py-0.5 text-xs bg-white rounded border">
                            {answer.score}
                          </span>
                        )}
                        {status === 'completed' && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                        {(field.ckType === 'M' || field.required) && (
                          <span className="px-1 text-xs text-red-800 bg-red-100 rounded">
                            *
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2 group-hover:text-gray-800">
                      {field.ckQuestion}
                    </p>
                    {validationErrors[field.ckItem] && (
                      <div className="flex items-center gap-1 mt-1 text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">ข้อมูลไม่ครบ</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {showAllQuestions ? (
            // Show All Questions View
            <div className="space-y-6">
              {formFields.map((field, index) => {
                const answer = answers.find(a => a.ckItem === field.ckItem) || {
                  id: index,
                  ckItem: field.ckItem,
                  ckType: field.ckType,
                  comment: '',
                  score: '' as Score,
                  tScore: '',
                  files: [],
                  isFinish: false
                };

                return (
                  <QuestionCard
                    key={field.ckItem}
                    field={field}
                    answer={answer}
                    vdCode={vdCode}
                    onUpdate={updateAnswer}
                    validationError={validationErrors[field.ckItem]}
                    readOnly={readOnly}
                  />
                );
              })}
            </div>
          ) : (
            // Single Question View
            <QuestionCard
              field={currentField}
              answer={currentAnswer}
              vdCode={vdCode}
              onUpdate={updateAnswer}
              validationError={validationErrors[currentField.ckItem]}
              readOnly={readOnly}
            />
          )}

          {/* Enhanced Navigation and Save Controls */}
          <div className="p-6 mt-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {!showAllQuestions && (
                  <>
                    <button
                      onClick={goToPrevious}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      ข้อก่อนหน้า
                    </button>
                    <button
                      onClick={goToNext}
                      disabled={currentQuestionIndex === formFields.length - 1}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ข้อถัดไป
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Auto-save status */}
                {autoSaveStatus !== 'idle' && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      autoSaveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                    }`}></div>
                    <span className="text-gray-500">
                      {autoSaveStatus === 'saving' ? 'กำลังบันทึก...' : 'บันทึกแล้ว'}
                    </span>
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={readOnly}
                  className={`flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md ${
                    Object.keys(validationErrors).length > 0 ? 'ring-2 ring-red-300' : ''
                  }`}
                >
                  <Save className="w-4 h-4" />
                  บันทึก
                  {Object.keys(validationErrors).length > 0 && (
                    <span className="px-2 py-1 text-xs bg-red-500 rounded-full">
                      {Object.keys(validationErrors).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="mt-3 text-xs text-center text-gray-400">
              💡 เคล็ดลับ: ใช้ Ctrl+← / Ctrl+→ เพื่อเปลี่ยนข้อ, Ctrl+S เพื่อบันทึก
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Question Card Component
interface QuestionCardProps {
  field: CSMFormField;
  answer: CSMAssessmentAnswer;
  vdCode: string;
  onUpdate: (ckItem: string, updates: Partial<CSMAssessmentAnswer>) => void;
  validationError?: string;
  readOnly?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = React.memo(({
  field,
  answer,
  vdCode,
  onUpdate,
  validationError,
  readOnly = false
}) => {
  const scoreOptions: { value: Score; label: string; color: string }[] = [
    { value: 'n/a', label: 'N/A (ไม่เกี่ยวข้อง)', color: 'bg-gray-100 text-gray-600 border-gray-400' },
    { value: '0', label: '0 - ไม่ผ่าน', color: 'bg-red-100 text-red-700 border-red-400' },
    { value: '1', label: '1 - พอใช้', color: 'bg-orange-100 text-orange-700 border-orange-400' },
    { value: '2', label: '2 - ครบถ้วน', color: 'bg-green-100 text-green-700 border-green-400' },
  ];

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{validationError}</span>
          </div>
        </div>
      )}

      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-blue-600">ข้อ {field.ckItem}</span>
            {(field.ckType === 'M' || field.required) && (
              <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                *Require (จำเป็น)
              </span>
            )}
            {field.fScore && (
              <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                Rating score (น้ำหนัก) {field.fScore}
              </span>
            )}
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            {field.ckQuestion}
          </h3>
          {field.ckRequirement && (
            <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="mb-1 text-sm font-medium text-blue-900">เกณฑ์การประเมิน:</p>
                  <p className="text-sm text-blue-800">{field.ckRequirement}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Score Selection */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-medium text-gray-700">
          คะแนนประเมิน <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {scoreOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={readOnly}
              onClick={() => onUpdate(field.ckItem, { score: option.value })}
              className={`p-4 text-left border rounded-xl transition-all duration-200 group hover:shadow-md
                ${answer.score === option.value
                  ? `${option.color} border-2 shadow-md scale-105` 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:scale-102'}
                ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-base font-bold">{option.value}</div>
                {answer.score === option.value && (
                  <Check className="w-4 h-4 text-current" />
                )}
              </div>
              <div className="mt-1 text-sm opacity-75 group-hover:opacity-100">
                {option.label.split(' - ')[1] || option.label}
              </div>
            </button>
          ))}
        </div>

        {/* Show calculated tScore if exists */}
        {answer.score && answer.score !== 'n/a' && field.fScore && (
          <div className="p-2 mt-2 rounded-lg bg-blue-50">
            <div className="text-sm text-blue-800">
              <span className="font-medium">คะแนนรวม:</span> {answer.score} × {field.fScore} = {parseFloat(answer.score) * parseFloat(field.fScore)} คะแนน
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Comment */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          ความเห็น/หมายเหตุ <span className="text-red-500">*</span>
        </label>
        <textarea
          value={answer.comment}
          onChange={(e) => onUpdate(field.ckItem, { comment: e.target.value })}
          placeholder="กรุณาระบุรายละเอียด ผลการตรวจสอบ หรือข้อเสนอแนะ..."
          rows={4}
          disabled={readOnly}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors ${
            validationError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
      </div>

      {/* File Attachments */}
      {field.allowAttach && (
        <div className="mb-6">
          <MultiFileInput
            value={answer.files}
            onFilesChange={(files) => onUpdate(field.ckItem, { files })}
            maxFiles={2}
            vdCode={vdCode}
            disabled={readOnly}
          />
        </div>
      )}

      {/* Enhanced Completion Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={answer.isFinish}
                onChange={(e) => onUpdate(field.ckItem, { isFinish: e.target.checked })}
                disabled={readOnly}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer transition-all duration-300 ${
                  readOnly ? 'opacity-50' : 'hover:shadow-sm'
                }`}
              ></div>
              <div
                className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                  answer.isFinish ? 'translate-x-5' : ''
                } ${readOnly ? '' : 'peer-checked:translate-x-5'}`}
              ></div>
            </label>
            <span className={`text-sm transition-colors ${
              answer.isFinish ? 'text-green-700 font-medium' : 'text-gray-700'
            }`}>
              {answer.isFinish
                ? '✅ ประเมินข้อนี้เรียบร้อยแล้ว'
                : '⏳ คลิกเพื่อยืนยันผลการประเมินข้อนี้'}
            </span>
          </div>
        </div>

        {/* Progress indicator for this question */}
        <div className="flex items-center gap-2">
          {answer.comment.trim() && (
            <div className="flex items-center gap-1 text-blue-600">
              <FileText className="w-4 h-4" />
              <span className="text-xs">มีความเห็น</span>
            </div>
          )}
          {answer.score && answer.score !== '' && (
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-xs">มีคะแนน</span>
            </div>
          )}
          {validationError && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">ไม่ครบถ้วน</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default QuestionForm;