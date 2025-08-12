// 📁 src/features/csm/pages/CSMVendorEditPage.tsx
// Edit CSM vendor page
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Building2, MapPin, 
  User, AlertCircle, Trash2
} from 'lucide-react';
import type { CSMVendor } from '../../../types';
import { csmVendorService } from '../../../services/csmVendorService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';
import { CSM_VENDOR_CATEGORIES, ASSESSMENT_FREQUENCIES } from '../../../types/csm';

const CSMVendorEditPage: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalVendor, setOriginalVendor] = useState<CSMVendor | null>(null);

  const [formData, setFormData] = useState<Partial<CSMVendor>>({
    vdCode: '',
    vdName: '',
    companyId: '',
    category: '1',
    freqAss: '1year',
    workingArea: [],
    isActive: true
  });

  const [workingAreaInput, setWorkingAreaInput] = useState('');

  useEffect(() => {
    if (vendorId) {
      loadVendorData();
    }
  }, [vendorId]);

  const loadVendorData = async () => {
    if (!vendorId) return;

    try {
      setLoading(true);
      const vendor = await csmVendorService.getById(vendorId);
      
      if (!vendor) {
        addToast({
          type: 'error',
          title: 'ไม่พบข้อมูล',
          message: 'ไม่พบข้อมูลผู้รับเหมาที่ระบุ'
        });
        navigate('/csm');
        return;
      }

      setOriginalVendor(vendor);
      setFormData({
        vdCode: vendor.vdCode,
        vdName: vendor.vdName,
        companyId: vendor.companyId,
        category: vendor.category,
        freqAss: vendor.freqAss,
        workingArea: vendor.workingArea || [],
        isActive: vendor.isActive
      });

    } catch (error) {
      console.error('Error loading vendor:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถโหลดข้อมูลผู้รับเหมาได้'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vdCode?.trim()) {
      newErrors.vdCode = 'กรุณากรอกรหัสผู้รับเหมา';
    }

    if (!formData.vdName?.trim()) {
      newErrors.vdName = 'กรุณากรอกชื่อผู้รับเหมา';
    }

    if (!formData.companyId?.trim()) {
      newErrors.companyId = 'กรุณากรอกรหัสบริษัท';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CSMVendor, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddWorkingArea = () => {
    if (workingAreaInput.trim() && !formData.workingArea?.includes(workingAreaInput.trim())) {
      setFormData(prev => ({
        ...prev,
        workingArea: [...(prev.workingArea || []), workingAreaInput.trim()]
      }));
      setWorkingAreaInput('');
    }
  };

  const handleRemoveWorkingArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      workingArea: prev.workingArea?.filter(a => a !== area) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !originalVendor) {
      addToast({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาตรวจสอบข้อมูลและกรอกให้ครบถ้วน'
      });
      return;
    }

    try {
      setSaving(true);

      const updateData: Partial<CSMVendor> = {
        vdCode: formData.vdCode!,
        vdName: formData.vdName!,
        companyId: formData.companyId!,
        category: formData.category || '1',
        freqAss: formData.freqAss || '1year',
        workingArea: formData.workingArea || [],
        isActive: formData.isActive,
        lastUpdateBy: 'current-user@example.com' // จะต้องเอาจาก auth context
      };

      await csmVendorService.update(originalVendor.id!, updateData);

      addToast({
        type: 'success',
        title: 'สำเร็จ',
        message: 'อัปเดตข้อมูลผู้รับเหมาเรียบร้อยแล้ว'
      });

      // Navigate back to detail page
      setTimeout(() => {
        navigate(`/csm/vendors/${originalVendor.id}`);
      }, 1000);

    } catch (error) {
      console.error('Error updating vendor:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถอัปเดตข้อมูลผู้รับเหมาได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    const newStatus = !formData.isActive;
    const action = newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    
    if (confirm(`คุณต้องการ${action}ผู้รับเหมานี้หรือไม่?`)) {
      handleInputChange('isActive', newStatus);
    }
  };

  const getCategoryInfo = (categoryCode: string) => {
    return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode);
  };

  const hasChanges = () => {
    if (!originalVendor) return false;
    
    return (
      formData.vdCode !== originalVendor.vdCode ||
      formData.vdName !== originalVendor.vdName ||
      formData.companyId !== originalVendor.companyId ||
      formData.category !== originalVendor.category ||
      formData.freqAss !== originalVendor.freqAss ||
      formData.isActive !== originalVendor.isActive ||
      JSON.stringify(formData.workingArea?.sort()) !== JSON.stringify(originalVendor.workingArea?.sort())
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  if (!originalVendor) {
    return (
      <div className="min-h-screen py-8 bg-gray-50">
        <div className="max-w-4xl px-4 mx-auto text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">ไม่พบข้อมูลผู้รับเหมา</h1>
          <button
            onClick={() => navigate('/csm')}
            className="text-blue-600 hover:text-blue-800"
          >
            กลับไปยังรายการผู้รับเหมา
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/csm/vendors/${originalVendor.id}`)}
            className="flex items-center mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปยังรายละเอียดผู้รับเหมา
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูลผู้รับเหมา</h1>
              <p className="text-gray-600">{originalVendor.vdName} ({originalVendor.vdCode})</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center text-lg font-semibold text-gray-900">
                <User className="w-5 h-5 mr-2" />
                ข้อมูลพื้นฐาน
              </h2>
              
              <button
                type="button"
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                  formData.isActive 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {formData.isActive ? (
                  <>
                    <Trash2 className="w-4 h-4 mr-1" />
                    ปิดใช้งาน
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    เปิดใช้งาน
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  รหัสผู้รับเหมา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vdCode || ''}
                  onChange={(e) => handleInputChange('vdCode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.vdCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="เช่น VD001, CONTRACTOR_001"
                />
                {errors.vdCode && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.vdCode}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  ชื่อผู้รับเหมา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vdName || ''}
                  onChange={(e) => handleInputChange('vdName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.vdName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="ชื่อบริษัทผู้รับเหมา"
                />
                {errors.vdName && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.vdName}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  รหัสบริษัท <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyId || ''}
                  onChange={(e) => handleInputChange('companyId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="รหัสบริษัทในระบบ"
                />
                {errors.companyId && (
                  <p className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyId}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category || '1'}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CSM_VENDOR_CATEGORIES.map(category => (
                    <option key={category.code} value={category.code}>
                      {category.name} - {category.description}
                    </option>
                  ))}
                </select>
                {formData.category && (
                  <p className="mt-1 text-sm text-gray-600">
                    ความถี่ประเมินเริ่มต้น: {getCategoryInfo(formData.category)?.defaultFrequency || 'ไม่ระบุ'}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  ความถี่การประเมิน
                </label>
                <select
                  value={formData.freqAss || '1year'}
                  onChange={(e) => handleInputChange('freqAss', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ASSESSMENT_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  สถานะ
                </label>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded text-sm ${
                    formData.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Working Areas */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-6 text-lg font-semibold text-gray-900">
              <MapPin className="w-5 h-5 mr-2" />
              พื้นที่ปฏิบัติงาน
            </h2>

            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={workingAreaInput}
                  onChange={(e) => setWorkingAreaInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWorkingArea())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น SCCC, CWT, AGG"
                />
                <button
                  type="button"
                  onClick={handleAddWorkingArea}
                  className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  เพิ่ม
                </button>
              </div>

              {formData.workingArea && formData.workingArea.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.workingArea.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 text-sm text-blue-800 bg-blue-100 rounded-full"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkingArea(area)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Changes Summary */}
          {hasChanges() && (
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <h3 className="mb-2 text-sm font-medium text-yellow-800">การเปลี่ยนแปลงที่จะบันทึก:</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                {formData.vdCode !== originalVendor.vdCode && (
                  <li>• รหัสผู้รับเหมา: {originalVendor.vdCode} → {formData.vdCode}</li>
                )}
                {formData.vdName !== originalVendor.vdName && (
                  <li>• ชื่อผู้รับเหมา: {originalVendor.vdName} → {formData.vdName}</li>
                )}
                {formData.companyId !== originalVendor.companyId && (
                  <li>• รหัสบริษัท: {originalVendor.companyId} → {formData.companyId}</li>
                )}
                {formData.category !== originalVendor.category && (
                  <li>• หมวดหมู่: {originalVendor.category} → {formData.category}</li>
                )}
                {formData.freqAss !== originalVendor.freqAss && (
                  <li>• ความถี่การประเมิน: {originalVendor.freqAss} → {formData.freqAss}</li>
                )}
                {formData.isActive !== originalVendor.isActive && (
                  <li>• สถานะ: {originalVendor.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'} → {formData.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}</li>
                )}
                {JSON.stringify(formData.workingArea?.sort()) !== JSON.stringify(originalVendor.workingArea?.sort()) && (
                  <li>• พื้นที่ปฏิบัติงาน: มีการเปลี่ยนแปลง</li>
                )}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(`/csm/vendors/${originalVendor.id}`)}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                ยกเลิก
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    vdCode: originalVendor.vdCode,
                    vdName: originalVendor.vdName,
                    companyId: originalVendor.companyId,
                    category: originalVendor.category,
                    freqAss: originalVendor.freqAss,
                    workingArea: originalVendor.workingArea || [],
                    isActive: originalVendor.isActive
                  });
                  setErrors({});
                }}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving || !hasChanges()}
              >
                รีเซ็ต
              </button>
            </div>

            <button
              type="submit"
              disabled={saving || !hasChanges()}
              className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>
          </div>
        </form>

        {/* Metadata */}
        <div className="p-4 mt-8 bg-gray-100 rounded-lg">
          <h3 className="mb-2 text-sm font-medium text-gray-700">ข้อมูลระบบ</h3>
          <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-2">
            <div>
              <span className="font-medium">สร้างเมื่อ:</span>
              <span className="ml-2">
                {new Date(originalVendor.createdAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div>
              <span className="font-medium">อัปเดตล่าสุด:</span>
              <span className="ml-2">
                {new Date(originalVendor.updatedAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {originalVendor.createdBy && (
              <div>
                <span className="font-medium">สร้างโดย:</span>
                <span className="ml-2">{originalVendor.createdBy}</span>
              </div>
            )}
            {originalVendor.lastUpdateBy && (
              <div>
                <span className="font-medium">อัปเดตโดย:</span>
                <span className="ml-2">{originalVendor.lastUpdateBy}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CSMVendorEditPage;