// src/features/csm/components/DynamicFormEditPage.tsx

import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ArrowLeft, Move, HelpCircle, AlertCircle } from 'lucide-react';
import type { FormDoc, FormField } from '../../../types/types';
import csmService from '../../../services/csmService';

interface FormEditorPageProps {
  formId?: string;
  onSave?: (form: FormDoc) => void;
  onCancel?: () => void;
}

const FormEditorPage: React.FC<FormEditorPageProps> = ({ formId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<FormDoc, 'id'>>({
    formCode: '',
    formTitle: '',
    isActive: true,
    applicableTo: ['csm'],
    updatedAt: new Date(),
    createdBy: 'current-user@example.com', // TODO: Get from auth context
    fields: []
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing form for editing
  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;

    try {
      setLoading(true);
      const formData = await csmService.forms.getAll();
      const existingForm = formData.find(f => f.id === formId);
      
      if (existingForm) {
        setForm({
          formCode: existingForm.formCode,
          formTitle: existingForm.formTitle,
          isActive: existingForm.isActive,
          applicableTo: existingForm.applicableTo,
          updatedAt: existingForm.updatedAt,
          createdBy: existingForm.createdBy,
          fields: existingForm.fields || []
        });
      }
    } catch (error) {
      console.error('Error loading form:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลแบบฟอร์ม');
    } finally {
      setLoading(false);
    }
  };

  // Add new field
  const addField = () => {
    const newField: FormField = {
      ckItem: (form.fields.length + 1).toString(),
      ckType: 'M',
      ckQuestion: '',
      ckRequirement: '',
      fScore: '5',
      required: true,
      allowAttach: false
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  // Update field
  const updateField = (index: number, updates: Partial<FormField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      )
    }));

    // Clear validation errors for this field
    if (errors[`field_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`field_${index}`];
        return newErrors;
      });
    }
  };

  // Delete field
  const deleteField = (index: number) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
      setForm(prev => ({
        ...prev,
        fields: prev.fields.filter((_, i) => i !== index)
      }));
      
      // Reorder ckItem numbers
      setForm(prev => ({
        ...prev,
        fields: prev.fields.map((field, i) => ({
          ...field,
          ckItem: (i + 1).toString()
        }))
      }));
    }
  };

  // Move field up/down
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    const newFields = [...form.fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    
    // Update ckItem numbers
    const reorderedFields = newFields.map((field, i) => ({
      ...field,
      ckItem: (i + 1).toString()
    }));

    setForm(prev => ({
      ...prev,
      fields: reorderedFields
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newFields = [...form.fields];
    const draggedField = newFields[draggedIndex];
    
    // Remove dragged field
    newFields.splice(draggedIndex, 1);
    
    // Insert at new position
    newFields.splice(dropIndex, 0, draggedField);
    
    // Update ckItem numbers
    const reorderedFields = newFields.map((field, i) => ({
      ...field,
      ckItem: (i + 1).toString()
    }));

    setForm(prev => ({
      ...prev,
      fields: reorderedFields
    }));

    setDraggedIndex(null);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate form metadata
    if (!form.formCode.trim()) {
      newErrors.formCode = 'กรุณาระบุรหัสแบบฟอร์ม';
    }
    if (!form.formTitle.trim()) {
      newErrors.formTitle = 'กรุณาระบุชื่อแบบฟอร์ม';
    }

    // Validate fields
    form.fields.forEach((field, index) => {
      if (!field.ckQuestion.trim()) {
        newErrors[`field_${index}`] = 'กรุณาระบุคำถาม';
      }
      if (!field.fScore || parseFloat(field.fScore) <= 0) {
        newErrors[`field_${index}_score`] = 'กรุณาระบุน้ำหนักคะแนนที่ถูกต้อง';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save form
  const handleSave = async () => {
    if (!validateForm()) {
      alert('กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วน');
      return;
    }

    try {
      setSaving(true);

      if (formId) {
        // Update existing form
        await csmService.forms.update(formId, form);
        alert('อัพเดทแบบฟอร์มเรียบร้อยแล้ว');
      } else {
        // Create new form
        await csmService.forms.create(form);
        alert('สร้างแบบฟอร์มเรียบร้อยแล้ว');
      }

      if (onSave) {
        onSave({ ...form, id: formId } as FormDoc);
      } else {
        // Navigate back to forms list
        window.location.href = '/admin/forms';
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกแบบฟอร์ม');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะยกเลิก? การเปลี่ยนแปลงจะไม่ถูกบันทึก')) {
      if (onCancel) {
        onCancel();
      } else {
        window.location.href = '/admin/forms';
      }
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับ</span>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {formId ? 'แก้ไขแบบฟอร์ม' : 'สร้างแบบฟอร์มใหม่'}
                </h1>
                <p className="text-sm text-gray-600">
                  {formId ? 'แก้ไขคำถามและการตั้งค่าของแบบฟอร์ม' : 'สร้างแบบฟอร์มประเมิน CSM ใหม่'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Form Metadata */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลแบบฟอร์ม</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสแบบฟอร์ม <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.formCode}
                onChange={(e) => setForm(prev => ({ ...prev, formCode: e.target.value }))}
                placeholder="เช่น CSMChecklist"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.formCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.formCode && (
                <p className="text-red-500 text-sm mt-1">{errors.formCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อแบบฟอร์ม <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.formTitle}
                onChange={(e) => setForm(prev => ({ ...prev, formTitle: e.target.value }))}
                placeholder="เช่น แบบฟอร์มตรวจประเมิน CSM Vendor"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.formTitle ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.formTitle && (
                <p className="text-red-500 text-sm mt-1">{errors.formTitle}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ใช้สำหรับ
              </label>
              <select
                value={form.applicableTo[0] || 'csm'}
                onChange={(e) => setForm(prev => ({ ...prev, applicableTo: [e.target.value] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="csm">CSM Assessment</option>
                <option value="safety">Safety Assessment</option>
                <option value="hr">HR Assessment</option>
                <option value="quality">Quality Assessment</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">เปิดใช้งานแบบฟอร์มนี้</span>
              </label>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">คำถามในแบบฟอร์ม</h2>
            <button
              onClick={addField}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              เพิ่มคำถาม
            </button>
          </div>

          <div className="p-6">
            {form.fields.length > 0 ? (
              <div className="space-y-4">
                {form.fields.map((field, index) => (
                  <FieldEditor
                    key={index}
                    field={field}
                    index={index}
                    onUpdate={(updates) => updateField(index, updates)}
                    onDelete={() => deleteField(index)}
                    onMoveUp={() => moveField(index, 'up')}
                    onMoveDown={() => moveField(index, 'down')}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    canMoveUp={index > 0}
                    canMoveDown={index < form.fields.length - 1}
                    error={errors[`field_${index}`] || errors[`field_${index}_score`]}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีคำถาม</h3>
                <p className="text-gray-600 mb-4">เริ่มต้นเพิ่มคำถามแรกของคุณ</p>
                <button
                  onClick={addField}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มคำถาม
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">สรุปแบบฟอร์ม</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">จำนวนคำถาม:</span>
              <span className="ml-1 font-medium">{form.fields.length} ข้อ</span>
            </div>
            <div>
              <span className="text-blue-700">ข้อจำเป็น:</span>
              <span className="ml-1 font-medium">
                {form.fields.filter(f => f.required).length} ข้อ
              </span>
            </div>
            <div>
              <span className="text-blue-700">แนบไฟล์ได้:</span>
              <span className="ml-1 font-medium">
                {form.fields.filter(f => f.allowAttach).length} ข้อ
              </span>
            </div>
            <div>
              <span className="text-blue-700">คะแนนรวม:</span>
              <span className="ml-1 font-medium">
                {form.fields.reduce((sum, f) => sum + (parseFloat(f.fScore || '0') * 5), 0)} คะแนน
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Field Editor Component
interface FieldEditorProps {
  field: FormField;
  index: number;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  error?: string;
}

const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  //index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  canMoveUp,
  canMoveDown,
  error
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`border rounded-lg p-4 bg-gray-50 ${error ? 'border-red-300' : 'border-gray-200'} hover:shadow-sm transition-shadow`}
    >
      {/* Field Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="cursor-move text-gray-400 hover:text-gray-600">
            <Move className="w-5 h-5" />
          </div>
          <h3 className="font-medium text-gray-900">ข้อ {field.ckItem}</h3>
          <div className="flex items-center gap-2">
            <select
              value={field.ckType}
              onChange={(e) => onUpdate({ ckType: e.target.value as 'M' | 'P' })}
              className="text-xs px-2 py-1 border border-gray-300 rounded"
            >
              <option value="M">จำเป็น (M)</option>
              <option value="P">ตัวเลือก (P)</option>
            </select>
            
            <input
              type="number"
              value={field.fScore}
              onChange={(e) => onUpdate({ fScore: e.target.value })}
              placeholder="น้ำหนัก"
              className="w-16 text-xs px-2 py-1 border border-gray-300 rounded"
              min="0"
              step="0.1"
            />
            <span className="text-xs text-gray-500">คะแนน</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="ย้ายขึ้น"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="ย้ายลง"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-700"
            title="ลบคำถาม"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Field Content */}
      <div className="grid grid-cols-1 gap-4">
        {/* Question */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            คำถาม <span className="text-red-500">*</span>
          </label>
          <textarea
            value={field.ckQuestion}
            onChange={(e) => onUpdate({ ckQuestion: e.target.value })}
            placeholder="ระบุคำถามที่ต้องการประเมิน..."
            rows={2}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error && error.includes('คำถาม') ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Requirement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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


        {/* Options */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">ข้อนี้จำเป็นต้องตอบ</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.allowAttach}
              onChange={(e) => onUpdate({ allowAttach: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">อนุญาตให้แนบไฟล์</span>
          </label>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormEditorPage;