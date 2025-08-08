// src/features/csm/pages/ListManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, FileText,  Eye, AlertCircle } from 'lucide-react';
import type { FormDoc } from '../../../types/types';
import csmService from '../../../services/csmService';
import { formatDate } from '../../../components/utils/dateUtils';

interface FormListPageProps {
  onEditForm?: (formId: string) => void;
  onCreateForm?: () => void;
}

const FormListPage: React.FC<FormListPageProps> = ({ onEditForm, onCreateForm }) => {
  const [forms, setForms] = useState<FormDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<FormDoc | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await csmService.forms.getAll();
      setForms(data);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async () => {
    if (!selectedForm?.id) return;

    try {
      await csmService.forms.delete(selectedForm.id);
      await loadForms();
      setShowDeleteModal(false);
      setSelectedForm(null);
      alert('ลบแบบฟอร์มเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('เกิดข้อผิดพลาดในการลบแบบฟอร์ม');
    }
  };

  const handleEditForm = (form: FormDoc) => {
    if (onEditForm && form.id) {
      onEditForm(form.id);
    } else {
      // Navigate to edit page
      window.location.href = `/admin/forms/edit/${form.id}`;
    }
  };

  const handleCreateForm = () => {
    if (onCreateForm) {
      onCreateForm();
    } else {
      // Navigate to create page
      window.location.href = '/admin/forms/create';
    }
  };

  const filteredForms = forms.filter(form =>
    form.formTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.formCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการแบบฟอร์ม</h1>
              <p className="text-gray-600 mt-1">ระบบจัดการแบบฟอร์มประเมิน CSM</p>
            </div>
            <button
              onClick={handleCreateForm}
              className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              สร้างแบบฟอร์มใหม่
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาแบบฟอร์มตามชื่อหรือรหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Forms Grid */}
        {filteredForms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => (
              <div key={form.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Form Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">{form.formCode}</span>
                        {form.isActive ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">
                            ปิดใช้งาน
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{form.formTitle}</h3>
                    </div>
                  </div>

                  {/* Form Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">จำนวนคำถาม:</span>
                      <span className="font-medium">{form.fields?.length || 0} ข้อ</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">ใช้สำหรับ:</span>
                      <span className="font-medium">
                        {form.applicableTo?.join(', ') || 'ไม่ระบุ'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">สร้างโดย:</span>
                      <span className="font-medium">{form.createdBy || 'ไม่ระบุ'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">อัพเดท:</span>
                      <span className="font-medium">
                        {formatDate(form.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Form Stats */}
                  <div className="border-t pt-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">
                          {form.fields?.filter(f => f.required).length || 0}
                        </div>
                        <div className="text-gray-600 text-xs">ข้อจำเป็น</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">
                          {form.fields?.filter(f => f.allowAttach).length || 0}
                        </div>
                        <div className="text-gray-600 text-xs">แนบไฟล์ได้</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t bg-gray-50 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedForm(form);
                        setShowPreviewModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">ดูตัวอย่าง</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditForm(form)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-sm">แก้ไข</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedForm(form);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm">ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'ไม่พบแบบฟอร์มที่ตรองกับการค้นหา' : 'ยังไม่มีแบบฟอร์ม'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นสร้างแบบฟอร์มประเมิน CSM แรกของคุณ'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateForm}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                สร้างแบบฟอร์มใหม่
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบ</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ที่จะลบแบบฟอร์ม "<strong>{selectedForm.formTitle}</strong>"? 
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedForm(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteForm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                ลบแบบฟอร์ม
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">ตัวอย่างแบบฟอร์ม</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedForm(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">ปิด</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <FormPreview form={selectedForm} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Form Preview Component
interface FormPreviewProps {
  form: FormDoc;
}

const FormPreview: React.FC<FormPreviewProps> = ({ form }) => {
  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-blue-900 mb-2">{form.formTitle}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700 font-medium">รหัสฟอร์ม:</span>
            <span className="ml-2">{form.formCode}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">สถานะ:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {form.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">ใช้สำหรับ:</span>
            <span className="ml-2">{form.applicableTo?.join(', ') || 'ไม่ระบุ'}</span>
          </div>
          <div>
            <span className="text-blue-700 font-medium">จำนวนคำถาม:</span>
            <span className="ml-2">{form.fields?.length || 0} ข้อ</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">รายการคำถาม</h3>
        
        {form.fields?.map((field, _index) => (
          <div key={field.ckItem} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">ข้อ {field.ckItem}</span>
                {field.ckType === 'M' && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                    จำเป็น
                  </span>
                )}
                {field.fScore && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    น้ำหนัก {field.fScore}
                  </span>
                )}
                {field.allowAttach && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    แนบไฟล์ได้
                  </span>
                )}
              </div>
            </div>
            
            <h4 className="font-medium text-gray-900 mb-2">{field.ckQuestion}</h4>
            
            {field.ckRequirement && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                <p className="text-sm text-blue-800">
                  <strong>เกณฑ์การประเมิน:</strong> {field.ckRequirement}
                </p>
              </div>
            )}            
          </div>
        ))}
      </div>
      
      {(!form.fields || form.fields.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีคำถามในแบบฟอร์มนี้</p>
        </div>
      )}
    </div>
  );
};

export default FormListPage;