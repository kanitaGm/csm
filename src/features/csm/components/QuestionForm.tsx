// src/features/csm/components/QuestionForm.tsx
import React, { useState, useEffect } from 'react';
import { Save, Check, AlertCircle, FileText,  HelpCircle } from 'lucide-react';
import type { FormField, AssessmentAnswer, Score } from '../../../types/types';
import MultiFileInput from '../../../components/utils/MultiFileInput';

interface QuestionFormProps {
  formFields: FormField[];
  initialAnswers?: AssessmentAnswer[];
  vdCode: string;
  onAnswersChange: (answers: AssessmentAnswer[]) => void;
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
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize answers from formFields and merge with existing answers
  useEffect(() => {
    // ใช้ JSON.stringify เพื่อเปรียบเทียบ deep equality
    const currentAnswersString = JSON.stringify(answers.map(a => a.ckItem).sort());
    const requiredAnswersString = JSON.stringify(formFields.map(f => f.ckItem).sort());
    
    // อัปเดตเฉพาะเมื่อ structure เปลี่ยน
    if (currentAnswersString !== requiredAnswersString || answers.length === 0) {
      const initializedAnswers: AssessmentAnswer[] = formFields.map(field => {
        const existingAnswer = initialAnswers.find(answer => answer.ckItem === field.ckItem);
        
        return existingAnswer || {
          ckItem: field.ckItem,
          ckType: field.ckType,
          comment: '',
          score: '',
          action: 'n',
          files: [],
          isFinish: false
        };
      });

      setAnswers(initializedAnswers);
      onAnswersChange(initializedAnswers);
    }
  }, [formFields, initialAnswers]); 

  // Update a specific answer
  const updateAnswer = (ckItem: string, updates: Partial<AssessmentAnswer>) => {
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
  };

  // Calculate total score (รวม tScore)
  const calculateTotalScore = (): number => {
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
  };

  // Calculate average score
  const calculateAverageScore = (): number => {
    const validAnswers = answers.filter(answer => answer.score && answer.score !== 'n/a');
    if (validAnswers.length === 0) return 0;
    
    const totalScore = calculateTotalScore();
    const maxPossibleScore = validAnswers.reduce((total, answer) => {
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      const fScore = parseFloat(field?.fScore || '1');
      return total + (5 * fScore); // คะแนนเต็ม 5 คูณ fScore
    }, 0);
    
    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 5 : 0;
  };

  // Validate current question
  const validateQuestion = (answer: AssessmentAnswer, field: FormField): string | null => {
    if (field.required) {
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
  const validateAllQuestions = (): boolean => {
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
  };

  // Handle save
  const handleSave = () => {
    if (validateAllQuestions()) {
      onSave?.();
    } else {
      alert('กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วน');
      return;
    }
  };



  // Navigation functions
  const goToNext = () => {
    if (currentQuestionIndex < formFields.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Get question status for navigation
  const getQuestionStatus = (field: FormField): 'completed' | 'partial' | 'empty' => {
    const answer = answers.find(a => a.ckItem === field.ckItem);
    if (!answer) return 'empty';
    
    if (answer.isFinish && answer.comment.trim() && answer.score && answer.score !== '') {
      return 'completed';
    } else if (answer.comment.trim() || (answer.score && answer.score !== '')) {
      return 'partial';
    }
    return 'empty';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

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
  const completedQuestions = formFields.filter(field => getQuestionStatus(field) === 'completed').length;
  const progress = formFields.length > 0 ? (completedQuestions / formFields.length) * 100 : 0;

  if (!currentField) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">ไม่พบข้อคำถามในแบบฟอร์ม</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">แบบประเมิน CSM</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              ข้อ {currentQuestionIndex + 1} จาก {formFields.length}
            </span>
            <button
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showAllQuestions ? 'แสดงทีละข้อ' : 'แสดงทุกข้อ'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>เสร็จสิ้น: {completedQuestions}/{formFields.length} ข้อ</span>
          <div className="flex gap-4">
            <span>คะแนนรวม: {calculateTotalScore().toFixed(1)} คะแนน</span>
            <span>คะแนนเฉลี่ย: {calculateAverageScore().toFixed(1)} คะแนน</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">รายการคำถาม</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {formFields.map((field, index) => {
                const status = getQuestionStatus(field);
                const isActive = index === currentQuestionIndex;
                
                return (
                  <button
                    key={field.ckItem}
                    onClick={() => goToQuestion(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-blue-50 border-blue-300 text-blue-900' 
                        : `hover:bg-gray-50 ${getStatusColor(status)}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ข้อ {field.ckItem}</span>
                      {status === 'completed' && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                      {field.ckType === 'M' && (
                        <span className="text-xs bg-red-100 text-red-800 px-1 rounded">
                          จำเป็น
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {field.ckQuestion}
                    </p>
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
              {formFields.map((field, _index) => {
                const answer = answers.find(a => a.ckItem === field.ckItem) || {
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

          {/* Navigation and Save Controls */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {!showAllQuestions && (
                  <>
                    <button
                      onClick={goToPrevious}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← ข้อก่อนหน้า
                    </button>
                    <button
                      onClick={goToNext}
                      disabled={currentQuestionIndex === formFields.length - 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ข้อถัดไป →
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={readOnly}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Question Card Component
interface QuestionCardProps {
  field: FormField;
  answer: AssessmentAnswer;
  vdCode: string;
  onUpdate: (ckItem: string, updates: Partial<AssessmentAnswer>) => void;
  validationError?: string;
  readOnly?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  field,
  answer,
  vdCode,
  onUpdate,
  validationError,
  readOnly = false
}) => {
  const scoreOptions: { value: Score; label: string; color: string }[] = [
  { value: 'n/a', label: 'N/A (ไม่เกี่ยวข้อง)', color: 'bg-gray-100 text-gray-600 border-gray-400' },
  { value: '0', label: '0 - ไม่ผ่าน', color: 'bg-purple-100 text-red-700 border-purple-400' },
  { value: '1', label: '1 - พอใช้', color: 'bg-blue-100 text-blue-700 border-blue-400' },
  { value: '2', label: '2 - ครบถ้วน', color: 'bg-green-100 text-green-700 border-green-400' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-bold text-blue-600">ข้อ {field.ckItem}</span>
            {field.ckType === 'M' && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                *Require (จำเป็น)
              </span>
            )}
            {field.fScore && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Rating score (น้ำหนัก) {field.fScore}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {field.ckQuestion}
          </h3>
          {field.ckRequirement && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">เกณฑ์การประเมิน:</p>
                  <p className="text-sm text-blue-800">{field.ckRequirement}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          คะแนนประเมิน <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {scoreOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={readOnly}
              onClick={() => onUpdate(field.ckItem, { score: option.value })}
              className={`p-3 text-left border rounded-lg transition-colors
                ${answer.score === option.value
                  ? `${option.color} border-2` // ใช้สีตามที่กำหนดไว้ พร้อมกรอบหนาขึ้น
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="font-medium text-sm">{option.value}</div>
              <div className={`text-xs`}>{option.label.split(' - ')[1] || option.label}</div>
            </button>

          ))}
        </div>
      </div>

        {/* แสดง tScore ถ้ามี */}
        {answer.tScore && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">คะแนนรวม:</span> {answer.score} × {field.fScore} = {answer.tScore} คะแนน
            </div>
          </div>
        )}
  

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ความเห็น/หมายเหตุ <span className="text-red-500">*</span>
        </label>
        <textarea
          value={answer.comment}
          onChange={(e) => onUpdate(field.ckItem, { comment: e.target.value })}
          placeholder="กรุณาระบุรายละเอียด ผลการตรวจสอบ หรือข้อเสนอแนะ..."
          rows={4}
          disabled={readOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
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
          />
        </div>
      )}

      {/* Completion Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={answer.isFinish}
                onChange={(e) => onUpdate(field.ckItem, { isFinish: e.target.checked })}
                disabled={readOnly}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-gray-300 peer-checked:bg-green-500 rounded-full peer transition-colors duration-300 ${
                  readOnly ? 'opacity-50' : ''
                }`}
              ></div>
              <div
                className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  readOnly ? '' : 'peer-checked:translate-x-5'
                }`}
              ></div>
            </label>
            <span className="text-sm text-gray-700">
              {answer.isFinish
                ? '😎👌 ประเมินข้อนี้เรียบร้อยแล้ว'
                : '⏳🥱 คลิกเพื่อยืนยันผลการประเมินข้อนี้'}
            </span>
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{validationError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionForm;