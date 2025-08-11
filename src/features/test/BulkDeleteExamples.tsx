// src/features/test/BulkDeleteExamples.tsx
// src/examples/BulkDeleteExamples.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useBulkDelete, BulkDeleteHelpers, type DeleteCondition } from '../../hooks/useBulkDelete';
import StandaloneBulkDelete from '../../utils/BulkDeleteUtility';

// Example 1: Simple delete by company
const DeleteByCompanyExample: React.FC = () => {
  const { quickDelete, isDeleting, error } = useBulkDelete();
  const [company, setCompany] = useState('');

  const handleDelete = async () => {
    if (!company.trim()) return;
    
    if (confirm(`ต้องการลบข้อมูลพนักงานของบริษัท "${company}" ทั้งหมดหรือไม่?`)) {
      try {
        const result = await quickDelete('employees', 'company', company);
        alert(`ลบสำเร็จ ${result.deleted} รายการ`);
        setCompany('');
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">ลบข้อมูลตามบริษัท</h3>
      <p className="text-sm text-gray-600 mb-4">ใช้ Hook useBulkDelete() สำหรับการลบแบบง่าย</p>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="ชื่อบริษัท (เช่น AAA, BBB)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleDelete}
          disabled={isDeleting || !company.trim()}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'กำลังลบ...' : 'ลบ'}
        </button>
      </div>
      
      {error && <p className="text-red-600 text-sm">{error}</p>}
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-start space-x-2">
          <FaInfoCircle className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">โค้ดตัวอย่าง:</p>
            <code className="text-xs bg-blue-100 px-1 rounded">
              await quickDelete('employees', 'company', '{company}')
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 2: Advanced delete with multiple conditions
const AdvancedDeleteExample: React.FC = () => {
  const { previewDelete, executeDelete, isLoading, isDeleting, error } = useBulkDelete();
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('AAA');
  const [selectedStatus, setSelectedStatus] = useState('inactive');

  // Dynamic conditions based on user input
  const conditions: DeleteCondition[] = [
    { field: 'status', operator: '==', value: selectedStatus },
    { field: 'company', operator: '==', value: selectedCompany }
  ];

  const handlePreview = async () => {
    try {
      const data = await previewDelete('employees', conditions);
      setPreviewData(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  const handleDelete = async () => {
    if (previewData.length === 0) return;
    
    if (confirm(`ต้องการลบข้อมูล ${previewData.length} รายการหรือไม่?`)) {
      try {
        const result = await executeDelete('employees', conditions, {
          batchSize: 100,
          onProgress: ({ current, total }) => {
            console.log(`Progress: ${current}/${total}`);
          }
        });
        alert(`ลบสำเร็จ ${result.deleted} รายการ`);
        setShowPreview(false);
        setPreviewData([]);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">ลบข้อมูลแบบหลายเงื่อนไข</h3>
      <p className="text-sm text-gray-600 mb-4">ตั้งเงื่อนไขหลายแบบและ Preview ก่อนลบ</p>
      
      {/* Condition Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">บริษัท</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="AAA">AAA</option>
            <option value="BBB">BBB</option>
            <option value="CCC">CCC</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="suspended">ระงับ</option>
            <option value="test">ทดสอบ</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'กำลังโหลด...' : 'ดูตัวอย่าง'}
        </button>
        
        {showPreview && previewData.length > 0 && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'กำลังลบ...' : `ลบ ${previewData.length} รายการ`}
          </button>
        )}
      </div>

      {showPreview && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">ตัวอย่างข้อมูลที่จะถูกลบ ({previewData.length} รายการ)</h4>
          {previewData.length === 0 ? (
            <p className="text-gray-500">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {previewData.slice(0, 5).map((item, index) => (
                <div key={index} className="text-sm border-b pb-1">
                  <span className="font-mono">{item.empId}</span> - {item.firstName} {item.lastName} ({item.company})
                </div>
              ))}
              {previewData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">...และอีก {previewData.length - 5} รายการ</p>
              )}
            </div>
          )}
        </div>
      )}
      
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="flex items-start space-x-2">
          <FaInfoCircle className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">เงื่อนไขปัจจุบัน:</p>
            <code className="text-xs bg-blue-100 px-1 rounded">
              company == "{selectedCompany}" AND status == "{selectedStatus}"
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 3: Using helper functions
const HelperFunctionsExample: React.FC = () => {
  const { executeDelete, isDeleting, error } = useBulkDelete();

  const deleteTestData = async () => {
    const conditions = BulkDeleteHelpers.combineConditions(
      BulkDeleteHelpers.createTestDataCondition(),
      BulkDeleteHelpers.createDisabledCondition()
    );

    if (confirm('ต้องการลบข้อมูลทดสอบที่ปิดใช้งานทั้งหมดหรือไม่?')) {
      try {
        const result = await executeDelete('employees', conditions);
        alert(`ลบข้อมูลทดสอบสำเร็จ ${result.deleted} รายการ`);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const deleteInactiveEmployees = async () => {
    const condition = BulkDeleteHelpers.createInactiveCondition();
    
    if (confirm('ต้องการลบพนักงานที่ไม่ใช้งานทั้งหมดหรือไม่?')) {
      try {
        const result = await executeDelete('employees', [condition]);
        alert(`ลบพนักงานไม่ใช้งานสำเร็จ ${result.deleted} รายการ`);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const deleteByCompanyHelper = async (companyName: string) => {
    const condition = BulkDeleteHelpers.createCompanyCondition(companyName);
    
    if (confirm(`ต้องการลบข้อมูลของบริษัท ${companyName} ทั้งหมดหรือไม่?`)) {
      try {
        const result = await executeDelete('employees', [condition]);
        alert(`ลบข้อมูลบริษัท ${companyName} สำเร็จ ${result.deleted} รายการ`);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">ใช้ Helper Functions</h3>
      <p className="text-sm text-gray-600 mb-4">ฟังก์ชันช่วยสำหรับเงื่อนไขที่ใช้บ่อย</p>
      
      <div className="space-y-3">
        <button
          onClick={deleteTestData}
          disabled={isDeleting}
          className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-left"
        >
          {isDeleting ? 'กำลังลบ...' : '🧪 ลบข้อมูลทดสอบที่ปิดใช้งาน'}
        </button>
        
        <button
          onClick={deleteInactiveEmployees}
          disabled={isDeleting}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-left"
        >
          {isDeleting ? 'กำลังลบ...' : '❌ ลบพนักงานที่ไม่ใช้งาน'}
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={() => deleteByCompanyHelper('AAA')}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isDeleting ? 'กำลังลบ...' : '🏢 ลบบริษัท AAA'}
          </button>
          <button
            onClick={() => deleteByCompanyHelper('BBB')}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {isDeleting ? 'กำลังลบ...' : '🏢 ลบบริษัท BBB'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
        <div className="flex items-start space-x-2">
          <FaInfoCircle className="text-green-600 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">Helper Functions ที่มี:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• <code>createInactiveCondition()</code> - ลบข้อมูลไม่ใช้งาน</li>
              <li>• <code>createTestDataCondition()</code> - ลบข้อมูลทดสอบ</li>
              <li>• <code>createCompanyCondition()</code> - ลบตามบริษัท</li>
              <li>• <code>createDisabledCondition()</code> - ลบข้อมูลปิดใช้งาน</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Examples Page
const BulkDeleteExamples: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'examples' | 'standalone'>('examples');

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
          >
            <FaArrowLeft className="mr-2" />
            กลับ
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ตัวอย่างการใช้งาน Bulk Delete</h1>
            <p className="text-gray-600">เครื่องมือและตัวอย่างสำหรับการลบข้อมูลแบบกลุ่ม</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <FaExclamationTriangle className="text-red-600 text-xl mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">⚠️ คำเตือนสำคัญ</h3>
              <p className="text-sm text-red-700">
                การลบข้อมูลไม่สามารถยกเลิกได้ กรุณาทดสอบในสภาพแวดล้อมการพัฒนาก่อน และใช้ฟีเจอร์ "ดูตัวอย่าง" เสมอ
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('examples')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'examples'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ตัวอย่างการใช้ Hook
              </button>
              <button
                onClick={() => setActiveTab('standalone')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'standalone'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                เครื่องมือลบข้อมูล
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'examples' ? (
          <div className="space-y-6">
            <DeleteByCompanyExample />
            <AdvancedDeleteExample />
            <HelperFunctionsExample />
            
            {/* Code Examples */}
            <div className="p-6 bg-gray-900 text-white rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-green-400">📝 โค้ดตัวอย่าง</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-300 mb-2">1. การใช้งานพื้นฐาน:</p>
                  <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`const { quickDelete } = useBulkDelete();
await quickDelete('employees', 'company', 'AAA');`}
                  </pre>
                </div>
                
                <div>
                  <p className="text-gray-300 mb-2">2. การใช้งานแบบหลายเงื่อนไข:</p>
                  <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`const conditions = [
  { field: 'company', operator: '==', value: 'AAA' },
  { field: 'status', operator: '==', value: 'inactive' }
];
const result = await executeDelete('employees', conditions);`}
                  </pre>
                </div>
                
                <div>
                  <p className="text-gray-300 mb-2">3. การใช้ Helper Functions:</p>
                  <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
{`const conditions = BulkDeleteHelpers.combineConditions(
  BulkDeleteHelpers.createCompanyCondition('AAA'),
  BulkDeleteHelpers.createInactiveCondition()
);`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <StandaloneBulkDelete 
              onComplete={(stats) => {
                alert(`การลบเสร็จสิ้น!\n- ลบสำเร็จ: ${stats.deleted} รายการ\n- ล้มเหลว: ${stats.failed} รายการ`);
              }}
              onError={(error) => {
                console.error('Bulk delete error:', error);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkDeleteExamples;