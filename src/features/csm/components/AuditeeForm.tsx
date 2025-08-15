// ===================================================================
// 📁 src/features/csm/components/AuditeeForm.tsx - Form สำหรับข้อมูล auditee
// ===================================================================
import React, { useState } from 'react';
import type { CSMAuditee } from '../../../types/csm';

interface AuditeeFormProps {
  auditee?: CSMAuditee;
  onChange: (auditee: CSMAuditee) => void;
  required?: boolean;
}

const AuditeeForm: React.FC<AuditeeFormProps> = ({ auditee, onChange, required = true }) => {
  const [formData, setFormData] = useState<CSMAuditee>(auditee || {
    name: '',
    email: '',
    position: ''
  });

  const handleChange = (field: keyof CSMAuditee, value: string) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onChange(updatedData);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">ข้อมูลผู้รับการตรวจประเมิน</h3>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Name */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ชื่อ-นามสกุล {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="นาย/นางสาว ชื่อ นามสกุล ผู้รับการประเมิน"
            required={required}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            อีเมล {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="auditee@vendor.com"
            required={required}
          />
        </div>

        {/* Position */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            ตำแหน่งงาน
          </label>
          <input
            type="text"
            value={formData.position || ''}
            onChange={(e) => handleChange('position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Safety Manager / Site Supervisor"
          />
        </div>
      </div>
      
      <div className="p-3 mt-4 rounded-lg bg-blue-50">
        <p className="text-sm text-blue-700">
          <strong>หมายเหตุ:</strong> ข้อมูลผู้รับการตรวจประเมินคือตัวแทนจากบริษัท vendor ที่จะเข้าร่วมการประเมิน CSM
        </p>
      </div>
    </div>
  );
};

export default AuditeeForm;