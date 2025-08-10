// src/features/forms/components/FieldEditor.tsx - Field Editor Component
import React from 'react';
import { 
  Move, Copy, Settings, Trash2, ChevronUp, ChevronDown, AlertCircle 
} from 'lucide-react';
import type { FieldEditorProps } from '../../../types';
import { getFieldTypeIcon } from '../../../hooks/formHooks';
import {SearchableSelect} from '../../../components/ui/SearchableSelect';

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  canMoveUp,
  canMoveDown,
  validationResult
}) => {
  const hasError = validationResult && !validationResult.isValid;
  const hasWarnings = validationResult && (validationResult?.warnings?.length ?? 0) > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`border rounded-lg p-4 transition-all duration-200 ${
        hasError 
          ? 'border-red-300 bg-red-50' 
          : hasWarnings 
            ? 'border-yellow-300 bg-yellow-50'
            : 'border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-gray-400 cursor-move hover:text-gray-600">
            <Move className="w-5 h-5" />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-lg">{getFieldTypeIcon(field.type)}</span>
            <h3 className="font-medium text-gray-900">ข้อ {field.ckItem}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              field.type === 'text' ? 'bg-blue-100 text-blue-800' :
              field.type === 'number' ? 'bg-green-100 text-green-800' :
              field.type === 'radio' ? 'bg-purple-100 text-purple-800' :
              field.type === 'checkbox' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {field.type}
            </span>
            
            {field.required && (
              <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                จำเป็น
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Field Actions */}
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="ย้ายขึ้น"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="ย้ายลง"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDuplicate}
            className="p-1 text-blue-500 transition-colors hover:text-blue-700"
            title="ทำสำเนา"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleExpand}
            className="p-1 text-gray-500 transition-colors hover:text-gray-700"
            title={isExpanded ? "ย่อ" : "ขยาย"}
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 text-red-500 transition-colors hover:text-red-700"
            title="ลบคำถาม"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Field Preview */}
      <div className="mb-3">
        <div className="p-3 border rounded-lg bg-gray-50">
          <p className="font-medium text-gray-900">
            {field.ckQuestion || <span className="italic text-gray-400">ยังไม่ได้ระบุคำถาม</span>}
          </p>
          {field.ckRequirement && (
            <p className="mt-1 text-sm text-gray-600">{field.ckRequirement}</p>
          )}
        </div>
      </div>

      {/* Expanded Field Editor */}
      {isExpanded && (
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-4">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  ประเภทคำถาม <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={[
                    { value: 'text', label: '📝 ข้อความสั้น' },
                    { value: 'textarea', label: '📄 ข้อความยาว' },
                    { value: 'number', label: '🔢 ตัวเลข' },
                    { value: 'email', label: '📧 อีเมล' },
                    { value: 'phone', label: '📞 เบอร์โทร' },
                    { value: 'date', label: '📅 วันที่' },
                    { value: 'radio', label: '🔘 เลือกหนึ่งตัวเลือก' },
                    { value: 'checkbox', label: '☑️ เลือกหลายตัวเลือก' },
                    { value: 'select', label: '📋 รายการแบบเลื่อน' },
                    { value: 'file', label: '📎 อัปโหลดไฟล์' },
                    { value: 'rating', label: '⭐ คะแนน' },
                    { value: 'yesno', label: '✅ ใช่/ไม่ใช่' }
                  ]}
                  value={{ value: field.type, label: field.type }}
                  onChange={(option) => onUpdate({ type: option?.value as typeof field.type || 'text' })}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  น้ำหนักคะแนน
                </label>
                <input
                  type="number"
                  value={field.fScore}
                  onChange={(e) => onUpdate({ fScore: e.target.value })}
                  placeholder="5"
                  min="0"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Question */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                คำถาม <span className="text-red-500">*</span>
              </label>
              <textarea
                value={field.ckQuestion}
                onChange={(e) => onUpdate({ ckQuestion: e.target.value })}
                placeholder="ระบุคำถามที่ต้องการประเมิน..."
                rows={2}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  hasError && validationResult?.errors.some(e => e.includes('Question')) 
                    ? 'border-red-500' 
                    : 'border-gray-300'
                }`}
              />
            </div>

            {/* Requirement */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                เกณฑ์การประเมิน
              </label>
              <textarea
                value={field.ckRequirement}
                onChange={(e) => onUpdate({ ckRequirement: e.target.value })}
                placeholder="ระบุเกณฑ์หรือข้อกำหนดในการประเมิน..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Help Text */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                ข้อความช่วยเหลือ
              </label>
              <input
                type="text"
                value={field.helpText || ''}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="คำแนะนำสำหรับผู้ตอบ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => onUpdate({ required: e.target.checked })}
                    className="text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">ข้อนี้จำเป็นต้องตอบ</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.allowAttach}
                    onChange={(e) => onUpdate({ allowAttach: e.target.checked })}
                    className="text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">อนุญาตให้แนบไฟล์</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.isVisible}
                    onChange={(e) => onUpdate({ isVisible: e.target.checked })}
                    className="text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">แสดงคำถามนี้</span>
                </label>
              </div>
            </div>

            {/* Field Type Specific Settings */}
            {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  ตัวเลือกคำตอบ
                </label>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600">
                    ฟีเจอร์การจัดการตัวเลือกจะเพิ่มในอนาคต
                  </p>
                </div>
              </div>
            )}

            {field.type === 'file' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    จำนวนไฟล์สูงสุด
                  </label>
                  <input
                    type="number"
                    value={field.attachmentConfig?.maxFiles || 1}
                    onChange={(e) => onUpdate({ 
                      attachmentConfig: {
                        ...field.attachmentConfig,
                        maxFiles: parseInt(e.target.value) || 1
                      }
                    })}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    ขนาดไฟล์สูงสุด (MB)
                  </label>
                  <input
                    type="number"
                    value={field.attachmentConfig?.maxSize || 10}
                    onChange={(e) => onUpdate({ 
                      attachmentConfig: {
                        ...field.attachmentConfig,
                        maxSize: parseInt(e.target.value) || 10
                      }
                    })}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    ประเภทไฟล์ที่รองรับ
                  </label>
                  <select
                    value={field.attachmentConfig?.allowedTypes?.[0] || 'image/*'}
                    onChange={(e) => onUpdate({ 
                      attachmentConfig: {
                        ...field.attachmentConfig,
                        allowedTypes: [e.target.value]
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="image/*">รูปภาพทั้งหมด</option>
                    <option value="application/pdf">PDF เท่านั้น</option>
                    <option value="application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word Documents</option>
                    <option value="*/*">ไฟล์ทุกประเภท</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors & Warnings */}
          {validationResult && (
            <div className="mt-4 space-y-2">
              {validationResult.errors.map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              ))}
              
              {(validationResult?.warnings ?? []).map((warning, index) => (
                <div key={index} className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};