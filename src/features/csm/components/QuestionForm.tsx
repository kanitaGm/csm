// 🔧 Enhanced CSM Question Form Component
// src/features/csm/components/QuestionForm.tsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, AlertCircle, Save, FileText } from 'lucide-react';
import type { CSMFormField, CSMAssessmentAnswer } from '../../../types';

// =================== TYPES ===================
interface QuestionFormProps {
  formFields: CSMFormField[];
  answers: CSMAssessmentAnswer[];
  confirmations: Record<string, boolean>; //  isConfirmed ใช้แบบ controlled จาก parent
  onAnswersChange: (answers: CSMAssessmentAnswer[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
  autoSaveEnabled?: boolean;
  onConfirmChange: (id: string, confirmed: boolean) => void; // callback ไป parent
  onSubmit?: () => void; // ✅ เพิ่ม callback สำหรับ submit 

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
interface ScoreOption {
  value: string;
  label: string;
  disabled?: boolean; // ใส่ ? เพื่อให้ไม่บังคับ
}
const SCORE_OPTIONS: ScoreOption[] = [
  { value: '', label: 'เลือกคะแนน', disabled: true },
  { value: '0', label: '0 - ไม่ผ่าน/ไม่มี' },
  { value: '1', label: '1 - ผ่านบางส่วน' },
  { value: '2', label: '2 - ผ่านเกณฑ์' },
  { value: 'n/a', label: 'N/A - ไม่ใช้งาน' }
] as const;

// =================== QUESTION CARD COMPONENT ===================
const QuestionCard: React.FC<QuestionCardProps> = React.memo(
  ({
    field,
    answer,
    onAnswerChange,
    readOnly = false,
    validationError,
    isConfirmed = false,
    onConfirmChange
  }) => {
    const [localComment, setLocalComment] = useState<string>(answer.comment || '');
    const [localScore, setLocalScore] = useState<string>(answer.score || '');

    // ✅ ใช้ ref สำหรับ debounce เพื่อให้ cleanup ได้จริง
    const commentDebounceRef = useRef<number | null>(null);

    // Sync เมื่อ answer จาก parent เปลี่ยน
    useEffect(() => {
      setLocalComment(answer.comment || '');
      setLocalScore(answer.score || '');
    }, [answer.comment, answer.score]);

    // Handle comment change with debouncing (fixed cleanup)
    const handleCommentChange = useCallback(
      (value: string) => {
        setLocalComment(value);

        if (commentDebounceRef.current) {
          window.clearTimeout(commentDebounceRef.current);
        }
        commentDebounceRef.current = window.setTimeout(() => {
          onAnswerChange({ comment: value });
        }, 500);
      },
      [onAnswerChange]
    );

    // Cleanup เมื่อ unmount
    useEffect(() => {
      return () => {
        if (commentDebounceRef.current) {
          window.clearTimeout(commentDebounceRef.current);
        }
      };
    }, []);

    // Handle score change
    const handleScoreChange = useCallback(
      (value: string) => {
        // ✅ ห้าม N/A สำหรับ M
        if (field.ckType === 'M' && value === 'n/a') {
          // รักษาพฤติกรรมเดิม (alert)      
          alert('⚠️ ข้อคำถามแบบ Mandatory (M) ไม่สามารถเลือก N/A ได้');
          return;
        }
        setLocalScore(value);
        onAnswerChange({ score: value });
      },
      [field.ckType, onAnswerChange]
    );

    // Handle confirmation toggle (ใช้ toggle แทนปุ่ม แต่ฟังก์ชันเดิมทุกอย่าง)
    const handleConfirmToggle = useCallback(() => {
      const newConfirmed = !isConfirmed;
      onConfirmChange?.(newConfirmed);
    }, [isConfirmed, onConfirmChange]);

    // Available score options ตามประเภทคำถาม
    const availableScoreOptions = useMemo(() => {
      if (field.ckType === 'M') {
        return SCORE_OPTIONS.filter((option) => option.value !== 'n/a');
      }
      return SCORE_OPTIONS;
    }, [field.ckType]);

    // Question type display
    const questionTypeDisplay = useMemo(() => {
      switch (field.ckType) {
        case 'M':
          return { label: 'Mandatory', color: 'bg-red-100 text-red-800', icon: '🔴' };
        case 'P':
          return { label: 'Preferred', color: 'bg-blue-100 text-blue-800', icon: '🔵' };
        default:
          return { label: 'Other', color: 'bg-gray-100 text-gray-800', icon: '⚪' };
      }
    }, [field.ckType]);

    // Card status styling
    const cardStatus = useMemo(() => {
      if (isConfirmed) {
        return {
          borderColor: 'border-green-500',
          bgColor: 'bg-green-50',
          headerColor: 'bg-green-100'
        };
      }
      if (localScore && localScore !== '') {
        return {
          borderColor: 'border-yellow-500',
          bgColor: 'bg-yellow-50',
          headerColor: 'bg-yellow-100'
        };
      }
      return {
        borderColor: 'border-gray-300',
        bgColor: 'bg-gray-50',
        headerColor: 'bg-gray-100'
      };
    }, [isConfirmed, localScore]);

    const confirmDisabled = readOnly || !localScore || localScore === '';

    return (
      <div
        className={`
          border-2 rounded-lg transition-all duration-200 
          ${cardStatus.borderColor} ${cardStatus.bgColor}
          ${validationError ? 'border-red-400 bg-red-50' : ''}
        `}
      >
        {/* Card Header */}
        <div className={`p-4 ${cardStatus.headerColor} rounded-t-md`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-600">ข้อ {field.ckItem}</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${questionTypeDisplay.color}`}
                >
                  {questionTypeDisplay.icon} {questionTypeDisplay.label}
                </span>
                {field.ckType === 'M' && (
                  <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                    ⚠️ ห้าม N/A
                  </span>
                )}
              </div>
              <h3 className="text-base font-medium text-gray-900 break-words">{field.ckQuestion}</h3>
              {field.ckRequirement && (
                <p className="mt-2 text-sm text-gray-600">
                  <strong>เกณฑ์:</strong> {field.ckRequirement}
                </p>
              )}
            </div>

            {/* ✅ Confirmation Toggle (แทนปุ่มเดิม) */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  onChange={handleConfirmToggle}
                  checked={isConfirmed}
                  disabled={confirmDisabled}
                  aria-label="ยืนยันคำตอบ"
                />
                <div
                  className={`
                    w-11 h-6 rounded-full transition-colors duration-300 ease-in-out
                    ${confirmDisabled ? 'bg-gray-200 cursor-not-allowed opacity-70' : 'bg-gray-300 peer-checked:bg-green-600'}
                    peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300
                  `}
                />
                <span
                  className="absolute w-4 h-4 transition-transform duration-300 ease-in-out bg-white rounded-full left-1 top-1 peer-checked:translate-x-5 peer-checked:scale-110"
                />
              </label>
              <span className="text-sm font-medium text-gray-700">
                {isConfirmed ? '✅ ยืนยันแล้ว' : '⏳ ยืนยัน'}
              </span>
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
              aria-invalid={Boolean(validationError)}
            >
              {availableScoreOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comment/Note */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">ความเห็น/หมายเหตุ *</label>
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
  }
);

QuestionCard.displayName = 'QuestionCard';

// =================== MAIN COMPONENT ===================
export const QuestionForm: React.FC<QuestionFormProps> = ({
  formFields,
  answers,
  confirmations,           // ✅ ใช้จาก props (controlled)
  onAnswersChange,
  onSave,
  readOnly = false,
  autoSaveEnabled = true,
  onConfirmChange           // ✅ callback ไป parent
}) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  // Calculate progress and completion status (อิง confirmations จาก props)
  const { completedQuestions, progress } = useMemo(() => {
    const completed = answers.filter(
      (answer) => answer.score && answer.score !== '' && answer.comment.trim() !== ''
    ).length;

    const confirmedCount = Object.values(confirmations).filter(Boolean).length;
    const prog = formFields.length > 0 ? (confirmedCount / formFields.length) * 100 : 0;

    return {
      completedQuestions: completed,
      confirmedQuestions: confirmedCount,
      progress: prog
    };
  }, [answers, formFields.length, confirmations]);

  // Update a specific answer
  const updateAnswer = useCallback(
    (ckItem: string, updates: Partial<CSMAssessmentAnswer>) => {
      const updatedAnswers = answers.map((answer) =>
        answer.ckItem === ckItem ? { ...answer, ...updates } : answer
      );

      onAnswersChange(updatedAnswers);

      // Clear validation error for this field
      if (validationErrors[ckItem]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[ckItem];
          return newErrors;
        });
      }
    },
    [answers, onAnswersChange, validationErrors]
  );

  // Handle confirmation changes (delegate ไป parent)
  const handleConfirmationChange = useCallback(
    (ckItem: string, confirmed: boolean) => {
      onConfirmChange(ckItem, confirmed);
    },
    [onConfirmChange]
  );

  // Validate question
  const validateQuestion = (answer: CSMAssessmentAnswer, field: CSMFormField): string | null => {
    if (field.ckType === 'M') {
      if (!answer.comment.trim()) {
        return 'ข้อคำถาม Mandatory ต้องมีความเห็น/หมายเหตุ';
      }
      if (!answer.score || answer.score === '' || answer.score === 'n/a') {
        return 'ข้อคำถาม Mandatory ต้องมีคะแนนและไม่สามารถเลือก N/A ได้';
      }
    } else {
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

    formFields.forEach((field) => {
      const answer = answers.find((a) => a.ckItem === field.ckItem);
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

    const timeoutId = window.setTimeout(() => {
      if (Object.keys(validationErrors).length === 0) {
        setAutoSaveStatus('saving');
        onSave?.();
        window.setTimeout(() => setAutoSaveStatus('saved'), 1000);
      }
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [answers, autoSaveEnabled, readOnly, validationErrors, onSave]);

  // Handle manual save
  const handleSave = useCallback(() => {
    if (validateAllQuestions()) {
      setAutoSaveStatus('saving');
      onSave?.();
      window.setTimeout(() => setAutoSaveStatus('saved'), 1000);
    }
  }, [validateAllQuestions, onSave]);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="text-lg font-semibold text-blue-900">ความคืบหน้าการประเมิน</h3>
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
                type="button"
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
          <p className="mt-1 text-xs text-gray-600">{progress.toFixed(1)}% เสร็จสิ้น</p>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid gap-6">
        {formFields.map((field) => {
          const answer = answers.find((a) => a.ckItem === field.ckItem);
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
                {formFields.filter((f) => f.ckType === 'M').length} ข้อ
              </div>
              <div className="text-xs text-gray-500">ห้ามเลือก N/A</div>
            </div>

            <div className="p-3 bg-white border rounded">
              <div className="mb-1 text-gray-600">คำถาม Preferred (P)</div>
              <div className="text-lg font-semibold text-blue-600">
                {formFields.filter((f) => f.ckType === 'P').length} ข้อ
              </div>
              <div className="text-xs text-gray-500">อนุญาต N/A</div>
            </div>

            <div className="p-3 bg-white border rounded">
              <div className="mb-1 text-gray-600">รวมทั้งหมด</div>
              <div className="text-lg font-semibold text-gray-900">{formFields.length} ข้อ</div>
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
