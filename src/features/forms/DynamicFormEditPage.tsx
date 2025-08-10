// src/features/csm/components/DynamicFormEditPage.tsx - Part 1
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Plus, ArrowLeft, HelpCircle, AlertCircle, Eye} from 'lucide-react';
import type { FormDoc, FormField, FormEditorPageProps} from '../../types';
import { formService } from '../../services/formService';
import { useFormValidation, generateFormCode, validateFormCode } from '../../hooks/formHooks';
import { AccessibleInput } from '../../components/ui/AccessibleInput';
import {SearchableSelect} from '../../components/ui/SearchableSelect';
import { FieldEditor } from './components/FieldEditor'; // แยก component ออกมา

const FormEditorPage: React.FC<FormEditorPageProps> = ({ formId, onSave, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<FormDoc, 'id'>>({
    formCode: '',
    formTitle: '',
    formDescription: '',
    version: '1.0',
    isActive: true,
    status: 'draft',
    applicableTo: ['csm'],
    category: 'assessment',
    tags: [],
    updatedAt: new Date(),
    createdAt: new Date(),
    createdBy: 'current-user@example.com', // TODO: Get from auth context
    fields: [],
    allowedRoles: ['admin', 'manager'],
    allowedDepartments: ['all'],
    settings: {
      allowMultipleSubmissions: false,
      requireAuthentication: true,
      enableNotifications: true,
      showProgressBar: true,
      validateOnSubmit: true
    }
  });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  // Validation
  const validation = useFormValidation(form);

  // Load existing form for editing
const loadForm = useCallback(async () => {
  if (!formId) return;
  try {
    setLoading(true);
    const existingForm = await formService.getFormById(formId);
    if (existingForm) {
      setForm({
        formCode: existingForm.formCode,
        formTitle: existingForm.formTitle,
        formDescription: existingForm.formDescription || '',
        version: existingForm.version,
        isActive: existingForm.isActive,
        status: existingForm.status,
        applicableTo: existingForm.applicableTo,
        category: existingForm.category,
        tags: existingForm.tags,
        updatedAt: existingForm.updatedAt,
        createdAt: existingForm.createdAt,
        createdBy: existingForm.createdBy,
        fields: existingForm.fields,
        allowedRoles: existingForm.allowedRoles,
        allowedDepartments: existingForm.allowedDepartments,
        settings: existingForm.settings
      });
    }
  } catch (error) {
    console.error('Error loading form:', error);
    alert('เกิดข้อผิดพลาดในการโหลดข้อมูลแบบฟอร์ม');
  } finally {
    setLoading(false);
  }
}, [formId]);

useEffect(() => {
  if (formId) {
    loadForm();
  }
}, [formId, loadForm]);


  // Auto-generate form code from title
  const handleTitleChange = useCallback((title: string) => {
    setForm(prev => {
      const updates: Partial<typeof prev> = { formTitle: title };
      
      // Auto-generate code if it's empty or hasn't been manually edited
      if (!prev.formCode || prev.formCode === generateFormCode(prev.formTitle)) {
        updates.formCode = generateFormCode(title);
      }
      
      return { ...prev, ...updates };
    });
  }, []);

  // Add new field
  const addField = useCallback(() => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      ckItem: (form.fields.length + 1).toString(),
      type: 'text',
      ckType: 'M',
      ckQuestion: '',
      ckRequirement: '',
      fScore: '5',
      required: true,
      allowAttach: false,
      order: form.fields.length,
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: form.createdBy
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));

    setExpandedField(newField.id);
  }, [form.fields.length, form.createdBy]);

  // Update field
  const updateField = useCallback((index: number, updates: Partial<FormField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates, updatedAt: new Date() } : field
      )
    }));
  }, []);

  // Delete field
  const deleteField = useCallback((index: number) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
      setForm(prev => {
        const newFields = prev.fields.filter((_, i) => i !== index);
        // Reorder ckItem numbers
        const reorderedFields = newFields.map((field, i) => ({
          ...field,
          ckItem: (i + 1).toString(),
          order: i
        }));
        
        return {
          ...prev,
          fields: reorderedFields
        };
      });
    }
  }, []);

  // Move field up/down
  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= form.fields.length) return;

    setForm(prev => {
      const newFields = [...prev.fields];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      
      // Update ckItem numbers and order
      const reorderedFields = newFields.map((field, i) => ({
        ...field,
        ckItem: (i + 1).toString(),
        order: i
      }));

      return {
        ...prev,
        fields: reorderedFields
      };
    });
  }, [form.fields.length]);

  // Drag and drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setForm(prev => {
      const newFields = [...prev.fields];
      const draggedField = newFields[draggedIndex];
      
      // Remove dragged field
      newFields.splice(draggedIndex, 1);
      
      // Insert at new position
      newFields.splice(dropIndex, 0, draggedField);
      
      // Update ckItem numbers and order
      const reorderedFields = newFields.map((field, i) => ({
        ...field,
        ckItem: (i + 1).toString(),
        order: i
      }));

      return {
        ...prev,
        fields: reorderedFields
      };
    });

    setDraggedIndex(null);
  }, [draggedIndex]);

  // Save form
  const handleSave = async () => {
    if (!validation.isValid) {
      alert('กรุณาตรวจสอบข้อมูลที่ยังไม่ครบถ้วน');
      return;
    }

    try {
      setSaving(true);

      if (formId) {
        // Update existing form
        await formService.updateForm(formId, form);
        alert('อัพเดทแบบฟอร์มเรียบร้อยแล้ว');
      } else {
        // Create new form
        const createdForm = await formService.createForm(form);
        alert('สร้างแบบฟอร์มเรียบร้อยแล้ว');
        
        if (onSave) {
          onSave(createdForm);
        }
      }

      if (onSave && formId) {
        onSave({ ...form, id: formId } as FormDoc);
      } else if (!onSave) {
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
  const handleCancel = useCallback(() => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะยกเลิก? การเปลี่ยนแปลงจะไม่ถูกบันทึก')) {
      if (onCancel) {
        onCancel();
      } else {
        window.location.href = '/admin/forms';
      }
    }
  }, [onCancel]);

  // Duplicate field
  const duplicateField = useCallback((index: number) => {
    const fieldToDuplicate = form.fields[index];
    const newField: FormField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}`,
      ckItem: (form.fields.length + 1).toString(),
      ckQuestion: `${fieldToDuplicate.ckQuestion} (Copy)`,
      order: form.fields.length,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  }, [form.fields]);

  // Form statistics
  const formStats = useMemo(() => {
    const totalFields = form.fields.length;
    const requiredFields = form.fields.filter(f => f.required).length;
    const attachableFields = form.fields.filter(f => f.allowAttach).length;
    const totalScore = form.fields.reduce((sum, f) => sum + (parseFloat(f.fScore || '0') * 5), 0);
    
    return { totalFields, requiredFields, attachableFields, totalScore };
  }, [form.fields]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>กลับ</span>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {formId ? 'แก้ไขแบบฟอร์ม' : 'สร้างแบบฟอร์มใหม่'}
                </h1>
                <p className="text-sm text-gray-600">
                  {formId ? 'แก้ไขคำถามและการตั้งค่าของแบบฟอร์ม' : 'สร้างแบบฟอร์มใหม่ Checklist'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'แก้ไข' : 'ดูตัวอย่าง'}
              </button>
              
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || !validation.isValid}
                className="flex items-center gap-2 px-6 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Validation Summary */}
        {!validation.isValid && (
          <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">พบข้อผิดพลาดในแบบฟอร์ม</h3>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validation.generalErrors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form Metadata */}
        <div className="p-6 mb-6 bg-white border rounded-lg shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ข้อมูลแบบฟอร์ม</h2>
          
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <AccessibleInput
              label="ชื่อแบบฟอร์ม"
              value={form.formTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="เช่น แบบฟอร์มตรวจประเมิน CSM Vendor"
              required              
              error={validation.generalErrors.find((e: string) => e.includes('title'))}
            />

            <AccessibleInput
              label="รหัสแบบฟอร์ม"
              value={form.formCode}
              onChange={(e) => setForm(prev => ({ ...prev, formCode: e.target.value }))}
              placeholder="เช่น CSM_VENDOR_001"
              required
              error={!validateFormCode(form.formCode).isValid ? validateFormCode(form.formCode).error : undefined}
              helperText="ใช้เฉพาะตัวอักษร ตัวเลข _ และ -"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              รายละเอียดแบบฟอร์ม
            </label>
            <textarea
              value={form.formDescription}
              onChange={(e) => setForm(prev => ({ ...prev, formDescription: e.target.value }))}
              placeholder="อธิบายวัตถุประสงค์และการใช้งานของแบบฟอร์ม..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                หมวดหมู่
              </label>
              <SearchableSelect
                options={[
                  { value: 'inspection', label: 'การตรวจสอบ' },
                  { value: 'assessment', label: 'การประเมิน' },
                  { value: 'survey', label: 'การสำรวจ' },
                  { value: 'audit', label: 'การตรวจสอบบัญชี' },
                  { value: 'report', label: 'รายงาน' },
                  { value: 'other', label: 'อื่นๆ' }
                ]}
                value={{ value: form.category, label: form.category }}
                onChange={(option) => setForm(prev => ({ 
                  ...prev, 
                  category: option?.value as typeof form.category || 'assessment' 
                }))}
                placeholder="เลือกหมวดหมู่"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                เวอร์ชัน
              </label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm(prev => ({ ...prev, version: e.target.value }))}
                placeholder="1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">เปิดใช้งานแบบฟอร์มนี้</span>
              </label>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">คำถามในแบบฟอร์ม</h2>
              <p className="text-sm text-gray-600">
                จัดการคำถามและลำดับการแสดงผล
              </p>
            </div>
            <button
              onClick={addField}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
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
                    key={field.id}
                    field={field}
                    index={index}
                    isExpanded={expandedField === field.id}
                    onToggleExpand={() => setExpandedField(
                      expandedField === field.id ? null : field.id
                    )}
                    onUpdate={(updates) => updateField(index, updates)}
                    onDelete={() => deleteField(index)}
                    onDuplicate={() => duplicateField(index)}
                    onMoveUp={() => moveField(index, 'up')}
                    onMoveDown={() => moveField(index, 'down')}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    canMoveUp={index > 0}
                    canMoveDown={index < form.fields.length - 1}
                    validationResult={validation.fieldResults[field.id]}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">ยังไม่มีคำถาม</h3>
                <p className="mb-4 text-gray-600">เริ่มต้นเพิ่มคำถามแรกของคุณ</p>
                <button
                  onClick={addField}
                  className="flex items-center gap-2 px-4 py-2 mx-auto text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มคำถาม
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Summary */}
        <div className="p-4 mt-6 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="mb-2 font-medium text-blue-900">สรุปแบบฟอร์ม</h3>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div>
              <span className="text-blue-700">จำนวนคำถาม:</span>
              <span className="ml-1 font-medium">{formStats.totalFields} ข้อ</span>
            </div>
            <div>
              <span className="text-blue-700">ข้อจำเป็น:</span>
              <span className="ml-1 font-medium">{formStats.requiredFields} ข้อ</span>
            </div>
            <div>
              <span className="text-blue-700">แนบไฟล์ได้:</span>
              <span className="ml-1 font-medium">{formStats.attachableFields} ข้อ</span>
            </div>
            <div>
              <span className="text-blue-700">คะแนนรวม:</span>
              <span className="ml-1 font-medium">{formStats.totalScore} คะแนน</span>
            </div>
            <div>
              <span className="text-blue-700">คุณภาพ:</span>
              <span className="ml-1 font-medium">{validation.score?.overall || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEditorPage;