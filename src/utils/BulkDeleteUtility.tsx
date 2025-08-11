// src/utils/BulkDeleteUtility.tsx
// ใช้สำหรับลบข้อมูลใน Collection ที่มีเงื่อนไขตามที่กำหนดเท่านีั้น
import React, { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import type {  WhereFilterOp,  DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  FaTrash, 
  FaSpinner, FaPlus,
  FaExclamationTriangle, 
  FaTimes,
  FaEye,
  FaDownload
} from 'react-icons/fa';

// Types
interface DeleteCondition {
  field: string;
  operator: WhereFilterOp;
  value: string | number | boolean | null;
}

interface DeleteStats {
  found: number;
  deleted: number;
  failed: number;
  errors: string[];
}

interface StandaloneBulkDeleteProps {
  onComplete?: (stats: DeleteStats) => void;
  onError?: (error: Error) => void;
}

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  documentCount?: number;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'danger',
  documentCount
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const iconStyles = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  };

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
        <div className={`p-6 border rounded-t-lg ${typeStyles[type]}`}>
          <div className="flex items-center space-x-3">
            <FaExclamationTriangle className={`text-2xl ${iconStyles[type]}`} />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        
        <div className="p-6">
          <p className="mb-4 text-gray-700">{message}</p>
          
          {documentCount !== undefined && (
            <div className="p-3 mb-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                จำนวนเอกสารที่จะถูกลบ: <span className="font-semibold text-red-600">{documentCount}</span> รายการ
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-lg focus:ring-2 focus:ring-offset-2 ${buttonStyles[type]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Preview Documents Component
interface DocumentPreviewProps {
  documents: DocumentData[];
  isOpen: boolean;
  onClose: () => void;
  collectionName: string;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  documents,
  isOpen,
  onClose,
  collectionName
}) => {
  const exportToCSV = useCallback(() => {
    if (documents.length === 0) return;

    // Get all unique keys from documents
    const allKeys = new Set<string>();
    documents.forEach(document => {
      Object.keys(document).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvData = documents.map(document => 
      headers.map(header => {
        const value = document[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      })
    );

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${collectionName}_preview_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [documents, collectionName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">ตัวอย่างเอกสารที่จะถูกลบ ({documents.length} รายการ)</h3>
          <div className="flex space-x-2">
            <button
              onClick={exportToCSV}
              className="flex items-center px-3 py-2 space-x-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <FaDownload />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-auto">
          {documents.length === 0 ? (
            <p className="text-center text-gray-500">ไม่พบเอกสารที่ตรงกับเงื่อนไข</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(documents[0]).slice(0, 6).map(key => (
                      <th key={key} className="px-3 py-2 text-left border-b">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.slice(0, 50).map((document, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.keys(documents[0]).slice(0, 6).map(key => (
                        <td key={key} className="px-3 py-2 border-b">
                          {String(document[key] || '').substring(0, 50)}
                          {String(document[key] || '').length > 50 && '...'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {documents.length > 50 && (
                <p className="mt-2 text-sm text-gray-500">
                  แสดง 50 รายการแรกจากทั้งหมด {documents.length} รายการ
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Component
const StandaloneBulkDelete: React.FC<StandaloneBulkDeleteProps> = ({
  onComplete,
  onError
}) => {
  // States
  const [collectionName, setCollectionName] = useState<string>('');
  const [conditions, setConditions] = useState<DeleteCondition[]>([
    { field: '', operator: '==', value: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDocs, setPreviewDocs] = useState<DocumentData[]>([]);
  const [deleteStats, setDeleteStats] = useState<DeleteStats | null>(null);
  const [error, setError] = useState<string>('');

  // Add condition
  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, { field: '', operator: '==', value: '' }]);
  }, []);

  // Remove condition
  const removeCondition = useCallback((index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update condition
  const updateCondition = useCallback((index: number, updates: Partial<DeleteCondition>) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, ...updates } : condition
    ));
  }, []);

  // Convert value based on operator and field
  const convertValue = useCallback((value: string): unknown => {
    if (value === '') return null;
    
    // Handle boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'null') return null;
    
    // Handle numeric values
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    
    return value;
  }, []);

  // Validate conditions
  const validateConditions = useCallback((): string | null => {
    if (!collectionName.trim()) {
      return 'กรุณาระบุชื่อ Collection';
    }

    if (conditions.length === 0) {
      return 'กรุณาเพิ่มเงื่อนไขอย่างน้อย 1 เงื่อนไข';
    }

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (!condition.field.trim()) {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุชื่อฟิลด์`;
      }
      if (condition.value === '' && condition.operator !== 'in' && condition.operator !== 'not-in') {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุค่า`;
      }
    }

    return null;
  }, [collectionName, conditions]);

  // Build Firestore query
  const buildQuery = useCallback(() => {
    const validationError = validateConditions();
    if (validationError) {
      throw new Error(validationError);
    }

    let baseQuery = collection(db, collectionName.trim());
    let firestoreQuery: any = baseQuery;

    conditions.forEach(condition => {
      const convertedValue = convertValue(String(condition.value));
      firestoreQuery = query(firestoreQuery, where(condition.field, condition.operator, convertedValue));
    });

    return firestoreQuery;
  }, [collectionName, conditions, validateConditions, convertValue]);

  // Preview documents that will be deleted
  const handlePreviewDocuments = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');

    try {
      const firestoreQuery = buildQuery();
      const snapshot = await getDocs(firestoreQuery);
      const documents = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as DocumentData;
        return { id: docSnapshot.id, ...data };
      });
      
      setPreviewDocs(documents);
      setShowPreview(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, onError]);

  // Execute delete
  const executeDelete = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setError('');
    setShowConfirmation(false);

    const stats: DeleteStats = {
      found: 0,
      deleted: 0,
      failed: 0,
      errors: []
    };

    try {
      const firestoreQuery = buildQuery();
      const snapshot = await getDocs(firestoreQuery);
      
      stats.found = snapshot.docs.length;

      if (stats.found === 0) {
        setDeleteStats(stats);
        return;
      }

      // Delete in batches (Firestore limit: 500 operations per batch)
      const batchSize = 500;
      const docRefs = snapshot.docs.map(docSnapshot => docSnapshot.ref);
      
      for (let i = 0; i < docRefs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchRefs = docRefs.slice(i, i + batchSize);
        
        batchRefs.forEach(docRef => {
          batch.delete(docRef);
        });

        try {
          await batch.commit();
          stats.deleted += batchRefs.length;
        } catch (err) {
          stats.failed += batchRefs.length;
          stats.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setDeleteStats(stats);
      onComplete?.(stats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
      setError(errorMessage);
      stats.errors.push(errorMessage);
      setDeleteStats(stats);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsDeleting(false);
    }
  }, [buildQuery, onComplete, onError]);

  // Handle delete button click
  const handleDeleteClick = useCallback(async (): Promise<void> => {
    try {
      const firestoreQuery = buildQuery();
      const snapshot = await getDocs(firestoreQuery);
      
      if (snapshot.docs.length === 0) {
        setError('ไม่พบเอกสารที่ตรงกับเงื่อนไขที่ระบุ');
        return;
      }

      setShowConfirmation(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล';
      setError(errorMessage);
    }
  }, [buildQuery]);

  // Reset form
  const resetForm = useCallback(() => {
    setCollectionName('');
    setConditions([{ field: '', operator: '==', value: '' }]);
    setDeleteStats(null);
    setError('');
    setPreviewDocs([]);
    setShowPreview(false);
  }, []);

  // Quick fill for common collections
  const quickFillCollection = useCallback((name: string) => {
    setCollectionName(name);
    setError('');
  }, []);

  // Operator options
  const operatorOptions: Array<{ value: WhereFilterOp; label: string }> = [
    { value: '==', label: 'เท่ากับ (==)' },
    { value: '!=', label: 'ไม่เท่ากับ (!=)' },
    { value: '<', label: 'น้อยกว่า (<)' },
    { value: '<=', label: 'น้อยกว่าหรือเท่ากับ (<=)' },
    { value: '>', label: 'มากกว่า (>)' },
    { value: '>=', label: 'มากกว่าหรือเท่ากับ (>=)' },
    { value: 'array-contains', label: 'อาร์เรย์มีค่า (array-contains)' },
    { value: 'in', label: 'อยู่ใน (in)' },
    { value: 'not-in', label: 'ไม่อยู่ใน (not-in)' }
  ];

  // Common collections
  const commonCollections = [
    'employees',
    'forms', 
    'csmAssessments',
    'form_submissions',
    'training_records'
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          ลบข้อมูลแบบกลุ่ม
        </h2>
        <p className="text-sm text-gray-600">
          ระบุ Collection และเงื่อนไขสำหรับการลบข้อมูล โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ
        </p>
      </div>

      {/* Collection Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ชื่อ Collection <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="ระบุชื่อ collection (เช่น employees, forms, csmAssessments)"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Quick Fill Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center">ทางลัด:</span>
          {commonCollections.map(name => (
            <button
              key={name}
              onClick={() => quickFillCollection(name)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FaExclamationTriangle className="text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-700 mb-3">
          เงื่อนไขการลบ <span className="text-red-500">*</span>
        </h3>
        
        {conditions.map((condition, index) => (
          <div key={index} className="flex items-center space-x-2 mb-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="ชื่อฟิลด์ (เช่น type, company, status)"
                value={condition.field}
                onChange={e => updateCondition(index, { field: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={condition.operator}
              onChange={e => updateCondition(index, { operator: e.target.value as WhereFilterOp })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            >
              {operatorOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <div className="flex-1">
              <input
                type="text"
                placeholder="ค่า (เช่น AAA, 123, true, inactive)"
                value={String(condition.value)}
                onChange={e => updateCondition(index, { value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {conditions.length > 1 && (
              <button
                onClick={() => removeCondition(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="ลบเงื่อนไข"
              >
                <FaTimes />
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={addCondition}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <FaPlus className="text-xs" />
          <span>เพิ่มเงื่อนไข</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={handlePreviewDocuments}
          disabled={isLoading || !collectionName.trim()}
          className="flex items-center px-4 py-2 space-x-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <FaSpinner className="animate-spin" /> : <FaEye />}
          <span>ดูตัวอย่าง</span>
        </button>
        
        <button
          onClick={handleDeleteClick}
          disabled={isLoading || isDeleting || !collectionName.trim()}
          className="flex items-center px-4 py-2 space-x-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
          <span>ลบข้อมูล</span>
        </button>
        
        <button
          onClick={resetForm}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          รีเซ็ต
        </button>
      </div>

      {/* Delete Results */}
      {deleteStats && (
        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <h3 className="text-md font-medium text-gray-700 mb-3">ผลการลบข้อมูล</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{deleteStats.found}</div>
              <div className="text-sm text-gray-600">พบ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{deleteStats.deleted}</div>
              <div className="text-sm text-gray-600">ลบสำเร็จ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{deleteStats.failed}</div>
              <div className="text-sm text-gray-600">ลบไม่สำเร็จ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{deleteStats.errors.length}</div>
              <div className="text-sm text-gray-600">ข้อผิดพลาด</div>
            </div>
          </div>
          
          {deleteStats.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-red-700 mb-2">ข้อผิดพลาด:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {deleteStats.errors.map((errorMsg, index) => (
                  <li key={index}>• {errorMsg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">ตัวอย่างการใช้งาน:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• ลบพนักงานบริษัท AAA: <code>company == "AAA"</code></p>
          <p>• ลบข้อมูลที่ไม่ใช้งาน: <code>status == "inactive"</code></p>
          <p>• ลบข้อมูลทดสอบ: <code>type == "test"</code></p>
          <p>• ลบฟอร์มที่ไม่เปิดใช้งาน: <code>isActive == false</code></p>
          <p>• ลบข้อมูลเก่า: <code>createdAt &lt; "2024-01-01"</code></p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={executeDelete}
        onCancel={() => setShowConfirmation(false)}
        title="ยืนยันการลบข้อมูล"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลใน Collection "${collectionName}"? การดำเนินการนี้ไม่สามารถยกเลิกได้`}
        confirmText="ยืนยันลบ"
        cancelText="ยกเลิก"
        type="danger"
        documentCount={previewDocs.length}
      />

      {/* Preview Documents Modal */}
      <DocumentPreview
        documents={previewDocs}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        collectionName={collectionName}
      />
    </div>
  );
};

export default StandaloneBulkDelete;

// Export types for external use
export type { DeleteCondition, DeleteStats };