// ===================================================================
// 📁 src/features/csm/components/VendorForm.tsx - Form สำหรับสร้าง/แก้ไข vendor
// ===================================================================
import React, { useState, useEffect } from 'react';
import type { CSMVendor, Company } from '../../../types';
import { CSM_VENDOR_CATEGORIES, ASSESSMENT_FREQUENCIES } from '../../../types/csm';

interface VendorFormProps {
  vendor?: CSMVendor;
  companies: Company[];
  onSave: (vendorData: Omit<CSMVendor, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const VendorForm: React.FC<VendorFormProps> = ({ vendor, companies, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<CSMVendor, 'id'>>({
    companyId: vendor?.companyId || '',
    vdCode: vendor?.vdCode || '',
    vdName: vendor?.vdName || '',
    freqAss: vendor?.freqAss || '1year',
    isActive: vendor?.isActive ?? true,
    category: vendor?.category || 'admin',
    workingArea: vendor?.workingArea || [],
    createdAt: vendor?.createdAt || new Date(),
    updatedAt: vendor?.updatedAt || new Date(),
    createdBy: vendor?.createdBy || 'system',
    lastUpdatedBy: vendor?.lastUpdatedBy || 'system'
  });

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (formData.companyId) {
      const company = companies.find(c => c.companyId === formData.companyId);
      setSelectedCompany(company || null);
    }
  }, [formData.companyId, companies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Selection */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          บริษัทหลัก
        </label>
        <select
          value={formData.companyId}
          onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">เลือกบริษัท</option>
          {companies.map(company => (
            <option key={company.companyId} value={company.companyId}>
              {company.name}
            </option>
          ))}
        </select>
        
        {/* Show company info */}
        {selectedCompany && (
          <div className="p-3 mt-2 text-sm rounded-lg bg-gray-50">
            <p><strong>ติดต่อ:</strong> {selectedCompany.contactPerson}</p>
            <p><strong>อีเมล:</strong> {selectedCompany.email}</p>
            <p><strong>โทร:</strong> {selectedCompany.phone}</p>
          </div>
        )}
      </div>

      {/* Vendor Code */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          รหัส Vendor
        </label>
        <input
          type="text"
          value={formData.vdCode}
          onChange={(e) => setFormData({ ...formData, vdCode: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="เช่น VD001"
          required
        />
      </div>

      {/* Vendor Name */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          ชื่อ Vendor/หน่วยงาน
        </label>
        <input
          type="text"
          value={formData.vdName}
          onChange={(e) => setFormData({ ...formData, vdName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="ชื่อหน่วยงานย่อย หรือ ชื่อเฉพาะ"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          หมวดหมู่
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          {CSM_VENDOR_CATEGORIES.map(category => (
            <option key={category.code} value={category.code}>
              {category.name} - {category.description}
            </option>
          ))}
        </select>
      </div>

      {/* Assessment Frequency */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          รอบการประเมิน
        </label>
        <select
          value={formData.freqAss}
          onChange={(e) => setFormData({ ...formData, freqAss: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        >
          {ASSESSMENT_FREQUENCIES.map(freq => (
            <option key={freq.value} value={freq.value}>
              {freq.label}
            </option>
          ))}
        </select>
      </div>

      {/* Working Areas */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          พื้นที่ทำงาน
        </label>
        <input
          type="text"
          value={formData.workingArea?.join(', ') || ''}
          onChange={(e) => setFormData({ 
            ...formData, 
            workingArea: e.target.value.split(',').map(area => area.trim()).filter(Boolean)
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="พื้นที่ 1, พื้นที่ 2, พื้นที่ 3"
        />
        <p className="mt-1 text-xs text-gray-500">แยกด้วยเครื่องหมายจุลภาค (,)</p>
      </div>

      {/* Active Status */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="block ml-2 text-sm text-gray-900">
          ใช้งาน
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {vendor ? 'อัพเดต' : 'สร้าง'} Vendor
        </button>
      </div>
    </form>
  );
};

export default VendorForm;
