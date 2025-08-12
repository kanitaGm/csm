// 📁 src/features/csm/pages/CSMVendorAddPage.tsx
// Add new CSM vendor page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Building2, MapPin, 
  User, AlertCircle 
} from 'lucide-react';
import type { CSMVendor } from '../../../types';
import { csmVendorService } from '../../../services/csmVendorService';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { CSM_VENDOR_CATEGORIES, ASSESSMENT_FREQUENCIES } from '../../../types/csm';

const CSMVendorAddPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleInputChange = (field: keyof CSMVendor, value: unknown) => {
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

    if (!validateForm()) {
      addToast({
        type: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณาตรวจสอบข้อมูลและกรอกให้ครบถ้วน'
      });
      return;
    }

    try {
      setLoading(true);

      const vendorData: Omit<CSMVendor, 'id'> = {
        vdCode: formData.vdCode!,
        vdName: formData.vdName!,
        companyId: formData.companyId!,
        category: formData.category || '1',
        freqAss: formData.freqAss || '1year',
        workingArea: formData.workingArea || [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user@example.com', // จะต้องเอาจาก auth context
        laseUpdateBy: 'current-user@example.com'
      };

      const newVendorId = await csmVendorService.create(vendorData);

      addToast({
        type: 'success',
        title: 'สำเร็จ',
        message: 'เพิ่มผู้รับเหมาใหม่เรียบร้อยแล้ว'
      });

      // Navigate to vendor detail or back to list
      setTimeout(() => {
        navigate(`/csm/vendors/${newVendorId}`);
      }, 1000);

    } catch (error) {
      console.error('Error creating vendor:', error);
      addToast({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถเพิ่มผู้รับเหมาได้ กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryCode: string) => {
    return CSM_VENDOR_CATEGORIES.find(cat => cat.code === categoryCode);
  };

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/csm')}
            className="flex items-center mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปยังรายการผู้รับเหมา
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">เพิ่มผู้รับเหมาใหม่</h1>
              <p className="text-gray-600">กรอกข้อมูลผู้รับเหมาเพื่อเพิ่มเข้าสู่ระบบ CSM</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="flex items-center mb-6 text-lg font-semibold text-gray-900">
              <User className="w-5 h-5 mr-2" />
              ข้อมูลพื้นฐาน
            </h2>

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

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/csm')}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  บันทึก
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CSMVendorAddPage;