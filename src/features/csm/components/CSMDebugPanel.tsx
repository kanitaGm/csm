// 📁 src/features/csm/components/CSMDebugPanel.tsx
// Debug panel component สำหรับตรวจสอบข้อมูล CSM

import React, { useState } from 'react';
import { Bug, RefreshCw, Plus, Eye, AlertTriangle } from 'lucide-react';
import { useCSMDebug } from '../../../utils/debugCSMData';

interface Vendor {
  vdCode: string;
  vdName: string;
  // Add other vendor fields if needed
}

interface Company {
  companyId: string;
  name: string;
  // Define company fields if needed
}

interface DebugResult {
  vendors: { count: number; vendors: Vendor[] };
  companies: { count: number; companies: Company[] };
  timestamp: string;
}

const CSMDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const { debugData, checkData, createSample } = useCSMDebug();

  const handleCheckData = async () => {
    setLoading(true);
    try {
      const data = await checkData();
      setResult(data);
    } catch (error) {
      console.error('Check data failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSample = async () => {
    setLoading(true);
    try {
      await createSample();
      // Recheck data after creating
      const data = await checkData();
      setResult(data);
    } catch (error) {
      console.error('Create sample failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFullDebug = async () => {
    setLoading(true);
    try {
      await debugData();
      const data = await checkData();
      setResult(data);
    } catch (error) {
      console.error('Full debug failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // ใช้เฉพาะใน development mode
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed z-50 bottom-4 right-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 text-white transition-colors bg-yellow-500 rounded-full shadow-lg hover:bg-yellow-600"
        title="CSM Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="absolute right-0 p-4 bg-white border border-gray-200 rounded-lg shadow-xl bottom-16 w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">CSM Debug Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 space-y-2">
            <button
              onClick={handleCheckData}
              disabled={loading}
              className="flex items-center justify-center w-full px-3 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อมูล'}
            </button>

            <button
              onClick={handleCreateSample}
              disabled={loading}
              className="flex items-center justify-center w-full px-3 py-2 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              สร้างข้อมูลตัวอย่าง
            </button>

            <button
              onClick={handleFullDebug}
              disabled={loading}
              className="flex items-center justify-center w-full px-3 py-2 text-white bg-purple-500 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Debug เต็มรูปแบบ
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="pt-4 border-t">
              <h4 className="mb-2 font-medium text-gray-900">ผลลัพธ์:</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Vendors:</span>
                  <span className={`font-medium ${result.vendors.count > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.vendors.count} รายการ
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Companies:</span>
                  <span className={`font-medium ${result.companies.count > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.companies.count} รายการ
                  </span>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  อัปเดตล่าสุด: {new Date(result.timestamp).toLocaleString('th-TH')}
                </div>
              </div>

              {/* Warnings */}
              {(result.vendors.count === 0 || result.companies.count === 0) && (
                <div className="p-2 mt-3 border border-yellow-200 rounded bg-yellow-50">
                  <div className="flex items-center text-yellow-800">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">ไม่พบข้อมูลใน Firestore</span>
                  </div>
                </div>
              )}

              {/* Sample Data Details */}
              {result.vendors.count > 0 && (
                <div className="mt-3">
                  <details className="text-xs">
                    <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                      รายละเอียด Vendors ({result.vendors.count})
                    </summary>
                    <div className="pl-4 mt-1 space-y-1">
                      {result.vendors.vendors.slice(0, 5).map((vendor: Vendor, idx: number) => (
                        <div key={idx} className="text-gray-600">
                          {vendor.vdCode} - {vendor.vdName}
                        </div>
                      ))}
                      {result.vendors.vendors.length > 5 && (
                        <div className="text-gray-500">... และอีก {result.vendors.vendors.length - 5} รายการ</div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CSMDebugPanel;