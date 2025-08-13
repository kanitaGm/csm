// 🔧 Enhanced CSM Question Form Component
// src/features/csm/components/QuestionForm.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Save, 
  FileText,
  CheckSquare
} from 'lucide-react';
import type { 
  CSMFormField, 
  CSMAssessmentAnswer 
} from '../../../types';

// =================== TYPES ===================
interface QuestionFormProps {
  formFields: CSMFormField[];
  answers: CSMAssessmentAnswer[];
  onAnswersChange: (answers: CSMAssessmentAnswer[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
  autoSaveEnabled?: boolean;
}

interface QuestionCardProps {
  field: CSMFormField;
  answer: CSMAssessmentAnswer;
  onAnswerChange: (updates: Partial<CSMAssessmentAnswer>) => void;
  readOnly?: boolean;
  validationError?: string;
  isConfirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
}

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// =================== SCORE OPTIONS ===================
const SCORE_OPTIONS = [
  { value: '', label: 'เลือกคะแนน', disabled: true },
  { value: '1', label: '1 - ไม่ผ่าน/ไม่มี' },
  { value: '2', label: '2 - ผ่านบางส่วน' },
  { value: '3', label: '3 - ผ่านเกณฑ์' },
  { value: '4', label: '4 - ดี' },
  { value: '5', label: '5 - ยอดเยี่ยม' },
  { value: 'n/a', label: 'N/A - ไม่ใช้งาน' }
];

// =================== QUESTION CARD COMPONENT ===================
const QuestionCard: React.FC<QuestionCardProps> = React.memo(({
  field,
  answer,
  onAnswerChange,
  readOnly = false,
  validationError,
  isConfirmed = false,
  onConfirmChange
}) => {
  const [localComment, setLocalComment] = useState(answer.comment || '');
  const [localScore, setLocalScore] = useState(answer.score || '');

  // Update local state when answer changes
  useEffect(() => {
    setLocalComment(answer.comment || '');
    setLocalScore(answer.score || '');
  }, [answer.comment, answer.score]);

  // Handle comment change with debouncing
  const handleCommentChange = useCallback((value: string) => {
    setLocalComment(value);
    
    // Debounce the actual update
    const timeoutId = setTimeout(() => {
      onAnswerChange({ comment: value });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [onAnswerChange]);

  // Handle score change
  const handleScoreChange = useCallback((value: string) => {
    // ✅ Enhanced validation for M type questions
    if (field.ckType === 'M' && value === 'n/a') {
      // Show error or warning for M type
      alert('⚠️ ข้อคำถามแบบ Mandatory (M) ไม่สามารถเลือก N/A ได้');
      return; // Don't allow N/A for M type
    }

    setLocalScore(value);
    onAnswerChange({ score: value });
  }, [field.ckType, onAnswerChange]);

  // Handle confirmation toggle
  const handleConfirmToggle = useCallback(() => {
    const newConfirmed = !isConfirmed;
    onConfirmChange?.(newConfirmed);
  }, [isConfirmed, onConfirmChange]);

  // Get available score options based on question type
  const availableScoreOptions = useMemo(() => {
    if (field.ckType === 'M') {
      // For Mandatory questions, exclude N/A option
      return SCORE_OPTIONS.filter(option => option.value !== 'n/a');
    }
    return SCORE_OPTIONS; // All options for non-mandatory questions
  }, [field.ckType]);

  // Get question type display
  const questionTypeDisplay = useMemo(() => {
    switch (field.ckType) {
      case 'M': return { label: 'Mandatory', color: 'bg-red-100 text-red-800', icon: '🔴' };
      case 'P': return { label: 'Preferred', color: 'bg-blue-100 text-blue-800', icon: '🔵' };
      default: return { label: 'Other', color: 'bg-gray-100 text-gray-800', icon: '⚪' };
    }
  }, [field.ckType]);

  // Get card status styling
  const cardStatus = useMemo(() => {
    if (isConfirmed) {
      return {
        borderColor: 'border-green-500',
        bgColor: 'bg-green-50',
        headerColor: 'bg-green-100'
      };
    } else if (localScore && localScore !== '') {
      return {
        borderColor: 'border-yellow-500',
        bgColor: 'bg-yellow-50',
        headerColor: 'bg-yellow-100'
      };
    } else {
      return {
        borderColor: 'border-gray-300',
        bgColor: 'bg-gray-50',
        headerColor: 'bg-gray-100'
      };
    }
  }, [isConfirmed, localScore]);

  return (
    <div className={`
      border-2 rounded-lg transition-all duration-200 
      ${cardStatus.borderColor} ${cardStatus.bgColor}
      ${validationError ? 'border-red-400 bg-red-50' : ''}
    `}>
      {/* Card Header */}
      <div className={`p-4 ${cardStatus.headerColor} rounded-t-md`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">
                ข้อ {field.ckItem}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${questionTypeDisplay.color}`}>
                {questionTypeDisplay.icon} {questionTypeDisplay.label}
              </span>
              {field.ckType === 'M' && (
                <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                  ⚠️ ห้าม N/A
                </span>
              )}
            </div>
            <h3 className="text-base font-medium text-gray-900">
              {field.ckQuestion}
            </h3>
            {field.ckRequirement && (
              <p className="mt-2 text-sm text-gray-600">
                <strong>เกณฑ์:</strong> {field.ckRequirement}
              </p>
            )}
          </div>

          {/* Confirmation Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmToggle}
              disabled={readOnly || !localScore || localScore === ''}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all
                ${isConfirmed 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
                ${(!localScore || localScore === '') ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <CheckSquare className="w-4 h-4" />
              {isConfirmed ? '✅ ยืนยันแล้ว' : '⏳ ยืนยัน'}
            </button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-4">
        {/* Score Selection */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            คะแนนประเมิน *
            {field.ckType === 'M' && (
              <span className="ml-1 text-xs text-red-600">(ไม่สามารถเลือก N/A)</span>
            )}
          </label>
          <select
            value={localScore}
            onChange={(e) => handleScoreChange(e.target.value)}
            disabled={readOnly}
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${validationError ? 'border-red-400 bg-red-50' : 'border-gray-300'}
              ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
          >
            {availableScoreOptions.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comment/Note */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            ความเห็น/หมายเหตุ *
          </label>
          <textarea
            value={localComment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="กรุณาใส่ความเห็นหรือหมายเหตุประกอบการประเมิน..."
            disabled={readOnly}
            rows={3}
            className={`
              w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none
              ${validationError ? 'border-red-400 bg-red-50' : 'border-gray-300'}
              ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
          />
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{validationError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';

// =================== MAIN COMPONENT ===================
export const QuestionForm: React.FC<QuestionFormProps> = ({
  formFields,
  answers,
  onAnswersChange,
  onSave,
  readOnly = false,
  autoSaveEnabled = true
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});

  // Calculate progress and completion status
  const { completedQuestions, progress } = useMemo(() => {
    const completed = answers.filter(answer => 
      answer.score && 
      answer.score !== '' && 
      answer.comment.trim() !== ''
    ).length;
    
    const confirmedCount = Object.values(confirmations).filter(Boolean).length;
    const prog = formFields.length > 0 ? (confirmedCount / formFields.length) * 100 : 0;
    
    return { 
      completedQuestions: completed,
      confirmedQuestions: confirmedCount,
      progress: prog 
    };
  }, [answers, formFields, confirmations]);

  // Update a specific answer
  const updateAnswer = useCallback((ckItem: string, updates: Partial<CSMAssessmentAnswer>) => {
    const updatedAnswers = answers.map(answer => 
      answer.ckItem === ckItem 
        ? { ...answer, ...updates }
        : answer
    );
    
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

  // Handle confirmation changes
  const handleConfirmationChange = useCallback((ckItem: string, confirmed: boolean) => {
    setConfirmations(prev => ({
      ...prev,
      [ckItem]: confirmed
    }));
  }, []);

  // Validate question
  const validateQuestion = (answer: CSMAssessmentAnswer, field: CSMFormField): string | null => {
    // Enhanced validation for M type
    if (field.ckType === 'M') {
      if (!answer.comment.trim()) {
        return 'ข้อคำถาม Mandatory ต้องมีความเห็น/หมายเหตุ';
      }
      if (!answer.score || answer.score === '' || answer.score === 'n/a') {
        return 'ข้อคำถาม Mandatory ต้องมีคะแนนและไม่สามารถเลือก N/A ได้';
      }
    } else {
      // Standard validation for other types
      if (!answer.comment.trim()) {
        return 'กรุณาใส่ความเห็น/หมายเหตุ';
      }
      if (!answer.score || answer.score === '') {
        return 'กรุณาเลือกคะแนน';
      }
    }
    return null;
  };

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

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || readOnly) return;

    const timeoutId = setTimeout(() => {
      if (Object.keys(validationErrors).length === 0) {
        setAutoSaveStatus('saving');
        onSave?.();
        setTimeout(() => setAutoSaveStatus('saved'), 1000);
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [answers, autoSaveEnabled, readOnly, validationErrors, onSave]);

  // Handle manual save
  const handleSave = useCallback(() => {
    if (validateAllQuestions()) {
      setAutoSaveStatus('saving');
      onSave?.();
      setTimeout(() => setAutoSaveStatus('saved'), 1000);
    }
  }, [validateAllQuestions, onSave]);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900">
            ความคืบหน้าการประเมิน
          </h3>
          <div className="flex items-center gap-4">
            {/* Auto-save Status */}
            {autoSaveEnabled && (
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <>
                    <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-600">กำลังบันทึก...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">บันทึกแล้ว</span>
                  </>
                )}
              </div>
            )}
            
            {/* Manual Save Button */}
            {!readOnly && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                บันทึก
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">ตอบแล้ว:</span>
            <span className="ml-2 font-medium text-blue-900">
              {completedQuestions} / {formFields.length} ข้อ
            </span>
          </div>
          <div>
            <span className="text-gray-600">ยืนยันแล้ว:</span>
            <span className="ml-2 font-medium text-green-900">
              {Object.values(confirmations).filter(Boolean).length} / {formFields.length} ข้อ
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {progress.toFixed(1)}% เสร็จสิ้น
          </p>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid gap-6">
        {formFields.map((field) => {
          const answer = answers.find(a => a.ckItem === field.ckItem);
          if (!answer) return null;

          return (
            <QuestionCard
              key={field.ckItem}
              field={field}
              answer={answer}
              onAnswerChange={(updates) => updateAnswer(field.ckItem, updates)}
              readOnly={readOnly}
              validationError={validationErrors[field.ckItem]}
              isConfirmed={confirmations[field.ckItem] || false}
              onConfirmChange={(confirmed) => handleConfirmationChange(field.ckItem, confirmed)}
            />
          );
        })}
      </div>

      {/* Summary */}
      {formFields.length > 0 && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">สรุปการประเมิน</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div className="p-3 bg-white border rounded">
              <div className="mb-1 text-gray-600">คำถาม Mandatory (M)</div>
              <div className="text-lg font-semibold text-red-600">
                {formFields.filter(f => f.ckType === 'M').length} ข้อ
              </div>
              <div className="text-xs text-gray-500">
                ห้ามเลือก N/A
              </div>
            </div>
            
            <div className="p-3 bg-white border rounded">
              <div className="mb-1 text-gray-600">คำถาม Preferred (P)</div>
              <div className="text-lg font-semibold text-blue-600">
                {formFields.filter(f => f.ckType === 'P').length} ข้อ
              </div>
              <div className="text-xs text-gray-500">
                อนุญาต N/A
              </div>
            </div>
            
            <div className="p-3 bg-white border rounded">
              <div className="mb-1 text-gray-600">รวมทั้งหมด</div>
              <div className="text-lg font-semibold text-gray-900">
                {formFields.length} ข้อ
              </div>
              <div className="text-xs text-gray-500">
                ยืนยันแล้ว {Object.values(confirmations).filter(Boolean).length} ข้อ
              </div>
            </div>
          </div>

          {/* Validation Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-3 mt-4 border border-red-200 rounded bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  ข้อที่ต้องแก้ไข ({Object.keys(validationErrors).length} ข้อ)
                </span>
              </div>
              <div className="text-sm text-red-700">
                {Object.entries(validationErrors).map(([ckItem, error]) => (
                  <div key={ckItem} className="mb-1">
                    • ข้อ {ckItem}: {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionForm;