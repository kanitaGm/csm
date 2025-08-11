// src/hooks/useBulkDelete.ts
import { useState, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import type {  WhereFilterOp,  DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';


export interface DeleteCondition {
  field: string;
  operator: WhereFilterOp;
  value: string | number | boolean | null;
}

export interface DeleteStats {
  found: number;
  deleted: number;
  failed: number;
  errors: string[];
}

export interface BulkDeleteOptions {
  batchSize?: number;
  dryRun?: boolean;
  onProgress?: (progress: { current: number; total: number }) => void;
}

export interface UseBulkDeleteReturn {
  // States
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Methods
  previewDelete: (collectionName: string, conditions: DeleteCondition[]) => Promise<DocumentData[]>;
  executeDelete: (collectionName: string, conditions: DeleteCondition[], options?: BulkDeleteOptions) => Promise<DeleteStats>;
  quickDelete: (collectionName: string, field: string, value: unknown, operator?: WhereFilterOp) => Promise<DeleteStats>;
  reset: () => void;
}

/**
 * Hook สำหรับการลบข้อมูลแบบกลุ่มใน Firestore
 * รองรับการตั้งเงื่อนไขหลายแบบและการ preview ก่อนลบ
 */
export const useBulkDelete = (): UseBulkDeleteReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert value based on type and operator
  const convertValue = useCallback((value: string | number | boolean | null): unknown => {
    if (value === null || value === 'null') return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Handle boolean strings
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      if (value.toLowerCase() === 'null') return null;
      
      // Handle numeric strings
      if (!isNaN(Number(value)) && value.trim() !== '') {
        return Number(value);
      }
    }
    
    return value;
  }, []);

  // Validate conditions
  const validateConditions = useCallback((conditions: DeleteCondition[]): string | null => {
    if (conditions.length === 0) {
      return 'กรุณาเพิ่มเงื่อนไขอย่างน้อย 1 เงื่อนไข';
    }

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (!condition.field.trim()) {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุชื่อฟิลด์`;
      }
      if (condition.value === '' && !['in', 'not-in', 'array-contains-any'].includes(condition.operator)) {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุค่า`;
      }
    }

    return null;
  }, []);

  // Build Firestore query
  const buildQuery = useCallback((collectionName: string, conditions: DeleteCondition[]) => {
    const validationError = validateConditions(conditions);
    if (validationError) {
      throw new Error(validationError);
    }

    let baseQuery = collection(db, collectionName);
    let firestoreQuery: any = baseQuery;

    conditions.forEach(condition => {
      const convertedValue = convertValue(condition.value);
      firestoreQuery = query(firestoreQuery, where(condition.field, condition.operator, convertedValue));
    });

    return firestoreQuery;
  }, [validateConditions, convertValue]);

  // Preview documents that will be deleted
  const previewDelete = useCallback(async (
    collectionName: string, 
    conditions: DeleteCondition[]
  ): Promise<DocumentData[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const firestoreQuery = buildQuery(collectionName, conditions);
      const snapshot = await getDocs(firestoreQuery);
      const documents = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data() as DocumentData;
        return { 
          id: docSnapshot.id, 
          ...data 
        };
      });
      
      return documents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  // Execute bulk delete
  const executeDelete = useCallback(async (
    collectionName: string,
    conditions: DeleteCondition[],
    options: BulkDeleteOptions = {}
  ): Promise<DeleteStats> => {
    const { batchSize = 500, dryRun = false, onProgress } = options;
    
    setIsDeleting(true);
    setError(null);

    const stats: DeleteStats = {
      found: 0,
      deleted: 0,
      failed: 0,
      errors: []
    };

    try {
      const firestoreQuery = buildQuery(collectionName, conditions);
      const snapshot = await getDocs(firestoreQuery);
      
      stats.found = snapshot.docs.length;

      if (stats.found === 0) {
        return stats;
      }

      // If dry run, just return the count
      if (dryRun) {
        return stats;
      }

      // Delete in batches (Firestore limit: 500 operations per batch)
      const docRefs = snapshot.docs.map(doc => doc.ref);
      const totalBatches = Math.ceil(docRefs.length / batchSize);
      
      for (let i = 0; i < docRefs.length; i += batchSize) {
        const currentBatch = Math.floor(i / batchSize) + 1;
        const batch = writeBatch(db);
        const batchRefs = docRefs.slice(i, i + batchSize);
        
        batchRefs.forEach(docRef => {
          batch.delete(docRef);
        });

        try {
          await batch.commit();
          stats.deleted += batchRefs.length;
          
          // Report progress
          onProgress?.({
            current: stats.deleted,
            total: stats.found
          });
        } catch (err) {
          stats.failed += batchRefs.length;
          const errorMsg = `Batch ${currentBatch}/${totalBatches}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          stats.errors.push(errorMsg);
        }

        // Small delay between batches to avoid overwhelming Firestore
        if (i + batchSize < docRefs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
      setError(errorMessage);
      stats.errors.push(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [buildQuery]);

  // Quick delete helper for simple conditions
  const quickDelete = useCallback(async (
    collectionName: string,
    field: string,
    value: unknown,
    operator: WhereFilterOp = '=='
  ): Promise<DeleteStats> => {
    const conditions: DeleteCondition[] = [{
      field,
      operator,
      value: value as string | number | boolean | null
    }];

    return executeDelete(collectionName, conditions);
  }, [executeDelete]);

  // Reset all states
  const reset = useCallback(() => {
    setIsLoading(false);
    setIsDeleting(false);
    setError(null);
  }, []);

  return {
    // States
    isLoading,
    isDeleting,
    error,
    
    // Methods
    previewDelete,
    executeDelete,
    quickDelete,
    reset
  };
};

// Utility functions for common delete operations
export const BulkDeleteHelpers = {
  /**
   * สร้างเงื่อนไขสำหรับลบข้อมูลที่ไม่ใช้งาน
   */
  createInactiveCondition: (statusField = 'status'): DeleteCondition => ({
    field: statusField,
    operator: '==',
    value: 'inactive'
  }),

  /**
   * สร้างเงื่อนไขสำหรับลบข้อมูลทดสอบ
   */
  createTestDataCondition: (typeField = 'type'): DeleteCondition => ({
    field: typeField,
    operator: '==',
    value: 'test'
  }),

  /**
   * สร้างเงื่อนไขสำหรับลบข้อมูลของบริษัทเฉพาะ
   */
  createCompanyCondition: (company: string, companyField = 'company'): DeleteCondition => ({
    field: companyField,
    operator: '==',
    value: company
  }),

  /**
   * สร้างเงื่อนไขสำหรับลบข้อมูลที่ไม่เปิดใช้งาน
   */
  createDisabledCondition: (activeField = 'isActive'): DeleteCondition => ({
    field: activeField,
    operator: '==',
    value: false
  }),

  /**
   * สร้างเงื่อนไขสำหรับลบข้อมูลที่สร้างโดยผู้ใช้เฉพาะ
   */
  createCreatedByCondition: (email: string, createdByField = 'createdBy'): DeleteCondition => ({
    field: createdByField,
    operator: '==',
    value: email
  }),

  /**
   * รวมเงื่อนไขหลายๆ แบบ
   */
  combineConditions: (...conditions: DeleteCondition[]): DeleteCondition[] => {
    return conditions.filter(condition => 
      condition.field.trim() !== '' && condition.value !== ''
    );
  }
};

export default useBulkDelete;