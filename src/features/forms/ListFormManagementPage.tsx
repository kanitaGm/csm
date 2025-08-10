// src/features/forms/ListFormManagementPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, FileText, Eye, AlertCircle, Filter, SortAsc, SortDesc, RefreshCw } from 'lucide-react';
import type { FormDoc, DateInput, FilterState, ModalState, FormListPageProps} from '../../types';
import csmService from '../../services/csmService';
import { formatDate } from '../../utils/dateUtils';

// =================== TYPE DEFINITIONS ===================
// Types are now imported from ../../types

// =================== UTILITY FUNCTIONS ===================
function safeFormatDate(dateValue: unknown): string {
  try {
    if (!dateValue) return 'ไม่ระบุ';
    return formatDate(dateValue as DateInput);
  } catch {
    return 'ไม่ระบุ';
  }
}

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for click outside
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
}

// =================== COMPONENTS ===================
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const EmptyState = React.memo<{ 
  searchTerm: string; 
  onCreateForm: () => void; 
}>(({ searchTerm, onCreateForm }) => (
  <div className="py-12 text-center">
    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    <h3 className="mb-2 text-lg font-medium text-gray-900">
      {searchTerm ? 'ไม่พบแบบฟอร์มที่ตรงกับการค้นหา' : 'ยังไม่มีแบบฟอร์ม'}
    </h3>
    <p className="mb-4 text-gray-600">
      {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นสร้างแบบฟอร์มประเมิน CSM แรกของคุณ'}
    </p>
    {!searchTerm && (
      <button
        onClick={onCreateForm}
        className="flex items-center gap-2 px-4 py-2 mx-auto text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" />
        สร้างแบบฟอร์มใหม่
      </button>
    )}
  </div>
));

EmptyState.displayName = 'EmptyState';

const FormCard = React.memo<{
  form: FormDoc;
  onEdit: (form: FormDoc) => void;
  onDelete: (form: FormDoc) => void;
  onPreview: (form: FormDoc) => void;
}>(({ form, onEdit, onDelete, onPreview }) => {
  const requiredFields = useMemo(() => 
    form.fields?.filter(f => f.required).length || 0, [form.fields]
  );
  
  const attachableFields = useMemo(() => 
    form.fields?.filter(f => f.allowAttach).length || 0, [form.fields]
  );

  const lastUpdated = useMemo(() => 
    safeFormatDate(form.updatedAt), [form.updatedAt]
  );

  const handleEdit = useCallback(() => {
    onEdit(form);
  }, [onEdit, form]);

  const handleDelete = useCallback(() => {
    onDelete(form);
  }, [onDelete, form]);

  const handlePreview = useCallback(() => {
    onPreview(form);
  }, [onPreview, form]);

  return (
    <div className="transition-all duration-200 bg-white border rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1">
      <div className="p-6">
        {/* Form Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">{form.formCode}</span>
              {form.isActive ? (
                <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                  ใช้งาน
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full">
                  ปิดใช้งาน
                </span>
              )}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-2">{form.formTitle}</h3>
          </div>
        </div>

        {/* Form Details */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">จำนวนคำถาม:</span>
            <span className="font-medium">{form.fields?.length || 0} ข้อ</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">ใช้สำหรับ:</span>
            <span className="font-medium text-right truncate max-w-[150px]" title={form.applicableTo?.join(', ') || 'ไม่ระบุ'}>
              {form.applicableTo?.join(', ') || 'ไม่ระบุ'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">สร้างโดย:</span>
            <span className="font-medium truncate max-w-[150px]" title={form.createdBy || 'ไม่ระบุ'}>
              {form.createdBy || 'ไม่ระบุ'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">อัพเดท:</span>
            <span className="font-medium">{lastUpdated}</span>
          </div>
        </div>

        {/* Form Stats */}
        <div className="pt-4 mb-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-600">{requiredFields}</div>
              <div className="text-xs text-gray-600">ข้อจำเป็น</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">{attachableFields}</div>
              <div className="text-xs text-gray-600">แนบไฟล์ได้</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-3 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1 text-gray-600 transition-colors hover:text-gray-800"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">ดูตัวอย่าง</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 text-blue-600 transition-colors hover:text-blue-800"
            >
              <Edit className="w-4 h-4" />
              <span className="text-sm">แก้ไข</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-red-600 transition-colors hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">ลบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

FormCard.displayName = 'FormCard';

const FilterDropdown = React.memo<{
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}>(({ filter, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  useClickOutside(dropdownRef, closeDropdown);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ 
      ...filter, 
      status: e.target.value as FilterState['status'] 
    });
  }, [filter, onFilterChange]);

  const handleSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ 
      ...filter, 
      sortBy: e.target.value as FilterState['sortBy'] 
    });
  }, [filter, onFilterChange]);

  const handleSortOrderAsc = useCallback(() => {
    onFilterChange({ ...filter, sortOrder: 'asc' });
  }, [filter, onFilterChange]);

  const handleSortOrderDesc = useCallback(() => {
    onFilterChange({ ...filter, sortOrder: 'desc' });
  }, [filter, onFilterChange]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">ตัวกรอง</span>
        {filter.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 w-64 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4 space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">สถานะ</label>
              <select
                value={filter.status}
                onChange={handleStatusChange}
                className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <option value="active">ใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">เรียงตาม</label>
              <select
                value={filter.sortBy}
                onChange={handleSortByChange}
                className="w-full px-3 py-2 transition-colors border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="updated">วันที่อัปเดต</option>
                <option value="title">ชื่อแบบฟอร์ม</option>
                <option value="code">รหัสแบบฟอร์ม</option>
                <option value="created">วันที่สร้าง</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">ลำดับ</label>
              <div className="flex gap-2">
                <button
                  onClick={handleSortOrderAsc}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    filter.sortOrder === 'asc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  น้อย → มาก
                </button>
                <button
                  onClick={handleSortOrderDesc}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    filter.sortOrder === 'desc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  มาก → น้อย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FilterDropdown.displayName = 'FilterDropdown';

const FormPreview = React.memo<{
  form: FormDoc;
}>(({ form }) => {
  const lastUpdated = useMemo(() => 
    safeFormatDate(form.updatedAt), [form.updatedAt]
  );

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <h2 className="mb-2 text-xl font-bold text-blue-900">{form.formTitle}</h2>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <span className="font-medium text-blue-700">รหัสฟอร์ม:</span>
            <span className="ml-2">{form.formCode}</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">สถานะ:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
              form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {form.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-700">ใช้สำหรับ:</span>
            <span className="ml-2">{form.applicableTo?.join(', ') || 'ไม่ระบุ'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">จำนวนคำถาม:</span>
            <span className="ml-2">{form.fields?.length || 0} ข้อ</span>
          </div>
          <div className="md:col-span-2">
            <span className="font-medium text-blue-700">อัปเดต:</span>
            <span className="ml-2">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">รายการคำถาม</h3>
        
        {form.fields?.map((field) => (          
          <div key={field.ckItem} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-blue-600">ข้อ {field.ckItem}</span>
                {field.ckType === 'M' && (
                  <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                    จำเป็น
                  </span>
                )}
                {field.fScore && (
                  <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded-full">
                    น้ำหนัก {field.fScore}
                  </span>
                )}
                {field.allowAttach && (
                  <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                    แนบไฟล์ได้
                  </span>
                )}
              </div>
            </div>
            
            <h4 className="mb-2 font-medium text-gray-900">{field.ckQuestion}</h4>
            
            {field.ckRequirement && (
              <div className="p-3 mb-2 border border-blue-200 rounded bg-blue-50">
                <p className="text-sm text-blue-800">
                  <strong>เกณฑ์การประเมิน:</strong> {field.ckRequirement}
                </p>
              </div>
            )}            
          </div>
        ))}
      </div>
      
      {(!form.fields || form.fields.length === 0) && (
        <div className="py-8 text-center text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>ยังไม่มีคำถามในแบบฟอร์มนี้</p>
        </div>
      )}
    </div>
  );
});

FormPreview.displayName = 'FormPreview';

// Modal components
const DeleteModal = React.memo<{
  isOpen: boolean;
  form: FormDoc | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}>(({ isOpen, form, onConfirm, onCancel, isLoading = false }) => {
  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบ</h3>
        </div>
        
        <p className="mb-6 text-gray-600">
          คุณแน่ใจหรือไม่ที่จะลบแบบฟอร์ม "<strong>{form.formTitle}</strong>"? 
          การดำเนินการนี้ไม่สามารถย้อนกลับได้
        </p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />}
            ลบแบบฟอร์ม
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteModal.displayName = 'DeleteModal';

const PreviewModal = React.memo<{
  isOpen: boolean;
  form: FormDoc | null;
  onClose: () => void;
}>(({ isOpen, form, onClose }) => {
  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b">
          <h3 className="text-lg font-semibold text-gray-900">ตัวอย่างแบบฟอร์ม</h3>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <span className="sr-only">ปิด</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <FormPreview form={form} />
        </div>
      </div>
    </div>
  );
});

PreviewModal.displayName = 'PreviewModal';

// =================== MAIN COMPONENT ===================
const FormListPage: React.FC<FormListPageProps> = ({ onEditForm, onCreateForm }) => {
  const [forms, setForms] = useState<FormDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterState>({
    status: 'all',
    sortBy: 'updated',
    sortOrder: 'desc',
    search: ''
  });
  const [modal, setModal] = useState<ModalState>({
    showDeleteModal: false,
    showPreviewModal: false,
    selectedForm: null
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Load forms
  const loadForms = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      const data = await csmService.forms.getAll();
      setForms(data as FormDoc[]);
    } catch (error) {
      console.error('Error loading forms:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลแบบฟอร์ม');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Filter and sort forms
  const filteredAndSortedForms = useMemo(() => {
    const filtered = forms.filter(form => {
      const matchesSearch = 
        form.formTitle.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        form.formCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = 
        filter.status === 'all' || 
        (filter.status === 'active' && form.isActive) ||
        (filter.status === 'inactive' && !form.isActive);

      return matchesSearch && matchesStatus;
    });

    // Sort with proper error handling
    return filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      try {
        switch (filter.sortBy) {
          case 'title':
            aValue = (a.formTitle || '').toLowerCase();
            bValue = (b.formTitle || '').toLowerCase();
            break;
          case 'code':
            aValue = (a.formCode || '').toLowerCase();
            bValue = (b.formCode || '').toLowerCase();
            break;
          case 'updated':
            aValue = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
            bValue = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
            break;
          case 'created':
            aValue = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
            break;
          default:
            return 0;
        }

        if (filter.sortOrder === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      } catch (error) {
        console.error('Sort error:', error);
        return 0;
      }
    });
  }, [forms, debouncedSearchTerm, filter]);

  // Event handlers
  const handleDeleteForm = useCallback(async () => {
    if (!modal.selectedForm || typeof modal.selectedForm !== 'object' || !('id' in modal.selectedForm)) return;
    
    const form = modal.selectedForm as FormDoc;
    if (!form.id) return;

    try {
      setDeleting(true);
      await csmService.forms.delete(form.id);
      await loadForms(true);
      setModal({ showDeleteModal: false, showPreviewModal: false, selectedForm: null });
      alert('ลบแบบฟอร์มเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting form:', error);
      alert('เกิดข้อผิดพลาดในการลบแบบฟอร์ม');
    } finally {
      setDeleting(false);
    }
  }, [modal.selectedForm, loadForms]);

  const handleEditForm = useCallback((form: FormDoc) => {
    if (onEditForm && form.id) {
      onEditForm(form.id);
    } else {
      window.location.href = `/admin/forms/e/${form.id}`;
    }
  }, [onEditForm]);

  const handleCreateForm = useCallback(() => {
    if (onCreateForm) {
      onCreateForm();
    } else {
      window.location.href = '/admin/forms/c';
    }
  }, [onCreateForm]);

  const handleRefresh = useCallback(() => {
    loadForms(true);
  }, [loadForms]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDeleteClick = useCallback((form: FormDoc) => {
    setModal({ 
      showDeleteModal: true, 
      showPreviewModal: false, 
      selectedForm: form 
    });
  }, []);

  const handlePreviewClick = useCallback((form: FormDoc) => {
    setModal({ 
      showDeleteModal: false, 
      showPreviewModal: true, 
      selectedForm: form 
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal({ 
      showDeleteModal: false, 
      showPreviewModal: false, 
      selectedForm: null 
    });
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">เกิดข้อผิดพลาด</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={() => loadForms()}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">จัดการแบบฟอร์ม</h1>
                <p className="mt-1 text-gray-600">ระบบจัดการแบบฟอร์มประเมินต่างๆ ({forms.length} รายการ)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              <button
                onClick={handleCreateForm}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                สร้างแบบฟอร์มใหม่
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="ค้นหาแบบฟอร์มตามชื่อหรือรหัส..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full py-2 pl-10 pr-4 transition-colors border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <FilterDropdown filter={filter} onFilterChange={setFilter} />
        </div>

        {/* Results Summary */}
        {debouncedSearchTerm && (
          <div className="p-3 mb-6 border border-blue-200 rounded-lg bg-blue-50">
            <p className="text-blue-800">
              พบ <strong>{filteredAndSortedForms.length}</strong> รายการจากการค้นหา "<strong>{debouncedSearchTerm}</strong>"
            </p>
          </div>
        )}

        {/* Forms Grid */}
        {filteredAndSortedForms.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={handleEditForm}
                onDelete={handleDeleteClick}
                onPreview={handlePreviewClick}
              />
            ))}
          </div>
        ) : (
          <EmptyState 
            searchTerm={debouncedSearchTerm} 
            onCreateForm={handleCreateForm}
          />
        )}
      </div>

      {/* Modals */}
      <DeleteModal
        isOpen={modal.showDeleteModal}
        form={modal.selectedForm as FormDoc}
        onConfirm={handleDeleteForm}
        onCancel={handleCloseModal}
        isLoading={deleting}
      />

      <PreviewModal
        isOpen={modal.showPreviewModal}
        form={modal.selectedForm as FormDoc}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default FormListPage;