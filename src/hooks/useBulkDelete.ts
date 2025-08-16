// src/hooks/useBulkDelete.ts - Enhanced Version
import { useState, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  doc
} from 'firebase/firestore';
import type { WhereFilterOp, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';

// ========================================
// TYPES & INTERFACES
// ========================================

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
  duration: number; // execution time in ms
  batchesProcessed: number;
}

export interface BulkDeleteOptions {
  batchSize?: number;
  dryRun?: boolean;
  enableUndo?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onProgress?: (progress: ProgressInfo) => void;
  onBatchComplete?: (batchInfo: BatchInfo) => void;
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
}

export interface BatchInfo {
  batchNumber: number;
  totalBatches: number;
  itemsInBatch: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface UndoInfo {
  collectionName: string;
  deletedDocuments: Array<{ id: string; data: DocumentData }>;
  timestamp: number;
  conditions: DeleteCondition[];
}

export interface UseBulkDeleteReturn {
  // States
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  lastStats: DeleteStats | null;
  canUndo: boolean;
  
  // Methods
  previewDelete: (collectionName: string, conditions: DeleteCondition[]) => Promise<DocumentData[]>;
  executeDelete: (collectionName: string, conditions: DeleteCondition[], options?: BulkDeleteOptions) => Promise<DeleteStats>;
  quickDelete: (collectionName: string, field: string, value: unknown, operator?: WhereFilterOp) => Promise<DeleteStats>;
  undoLastDelete: () => Promise<boolean>;
  reset: () => void;
  
  // Utilities
  validateConditions: (conditions: DeleteCondition[]) => string | null;
  estimateDeleteTime: (itemCount: number, batchSize?: number) => number;
}

// ========================================
// MAIN HOOK
// ========================================

/**
 * Enhanced Bulk Delete Hook
 * - Progress tracking with time estimation
 * - Retry mechanism for failed batches  
 * - Undo functionality
 * - Better error handling
 * - Performance monitoring
 */
export const useBulkDelete = (): UseBulkDeleteReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastStats, setLastStats] = useState<DeleteStats | null>(null);
  
  // Undo functionality
  const undoInfoRef = useRef<UndoInfo | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  
  // Performance tracking
  const startTimeRef = useRef<number>(0);
  const processedItemsRef = useRef<number>(0);

  // ========================================
  // VALIDATION & UTILITIES
  // ========================================

  const convertValue = useCallback((value: string | number | boolean | null): unknown => {
    if (value === null || value === 'null') return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      if (value.toLowerCase() === 'null') return null;
      
      if (!isNaN(Number(value)) && value.trim() !== '') {
        return Number(value);
      }
    }
    
    return value;
  }, []);

  const validateConditions = useCallback((conditions: DeleteCondition[]): string | null => {
    if (conditions.length === 0) {
      return 'กรุณาเพิ่มเงื่อนไขอย่างน้อย 1 เงื่อนไข';
    }

    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      if (!c?.field.trim()) {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุชื่อฟิลด์`;
      }
      if (c.value === '' && !['in', 'not-in', 'array-contains-any'].includes(c.operator)) {
        return `เงื่อนไขที่ ${i + 1}: กรุณาระบุค่า`;
      }
    }

    return null;
  }, []);

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

  const estimateDeleteTime = useCallback((itemCount: number, batchSize: number = 500): number => {
    // Estimate based on: 100ms per batch + 50ms per item + network overhead
    const batches = Math.ceil(itemCount / batchSize);
    const baseTime = batches * 100; // 100ms per batch
    const itemTime = itemCount * 50; // 50ms per item  
    const networkOverhead = batches * 200; // 200ms network overhead per batch
    
    return baseTime + itemTime + networkOverhead;
  }, []);

  // ========================================
  // CORE OPERATIONS
  // ========================================

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

  const executeDelete = useCallback(async (
    collectionName: string,
    conditions: DeleteCondition[],
    options: BulkDeleteOptions = {}
  ): Promise<DeleteStats> => {
    const { 
      batchSize = 500, 
      dryRun = false, 
      enableUndo = false,
      maxRetries = 3,
      retryDelay = 1000,
      onProgress,
      onBatchComplete
    } = options;
    
    setIsDeleting(true);
    setError(null);
    startTimeRef.current = Date.now();
    processedItemsRef.current = 0;

    const stats: DeleteStats = {
      found: 0,
      deleted: 0,
      failed: 0,
      errors: [],
      duration: 0,
      batchesProcessed: 0
    };

    let undoData: Array<{ id: string; data: DocumentData }> = [];

    try {
      const firestoreQuery = buildQuery(collectionName, conditions);
      const snapshot = await getDocs(firestoreQuery);
      
      stats.found = snapshot.docs.length;

      if (stats.found === 0) {
        stats.duration = Date.now() - startTimeRef.current;
        setLastStats(stats);
        return stats;
      }

      // If dry run, just return the count
      if (dryRun) {
        stats.duration = Date.now() - startTimeRef.current;
        setLastStats(stats);
        return stats;
      }

      // Store data for undo if enabled
      if (enableUndo) {
        undoData = snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data() || '',
        }));
      }

      // Calculate batch information
      const docRefs = snapshot.docs.map(doc => doc.ref);
      const totalBatches = Math.ceil(docRefs.length / batchSize);
      const estimatedTime = estimateDeleteTime(stats.found, batchSize);
      
      // Process batches with retry logic
      for (let i = 0; i < docRefs.length; i += batchSize) {
        const currentBatch = Math.floor(i / batchSize) + 1;
        const batchRefs = docRefs.slice(i, i + batchSize);
        
        let batchSuccess = false;
        let retryCount = 0;
        let batchErrors: string[] = [];

        // Retry logic for each batch
        while (!batchSuccess && retryCount < maxRetries) {
          try {
            const batch = writeBatch(db);
            batchRefs.forEach(docRef => {
              batch.delete(docRef);
            });

            await batch.commit();
            stats.deleted += batchRefs.length;
            stats.batchesProcessed++;
            batchSuccess = true;
            
            // Progress reporting with time estimation
            processedItemsRef.current = stats.deleted;
            const elapsed = Date.now() - startTimeRef.current;
            const progressPercentage = (stats.deleted / stats.found) * 100;
            const estimatedTimeRemaining = progressPercentage > 0 
              ? (elapsed / progressPercentage) * (100 - progressPercentage)
              : estimatedTime;

            onProgress?.({
              current: stats.deleted,
              total: stats.found,
              percentage: Math.round(progressPercentage),
              currentBatch,
              totalBatches,
              estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
            });

            onBatchComplete?.({
              batchNumber: currentBatch,
              totalBatches,
              itemsInBatch: batchRefs.length,
              successCount: batchRefs.length,
              failureCount: 0,
              errors: []
            });

          } catch (err) {
            retryCount++;
            const errorMsg = `Batch ${currentBatch}/${totalBatches} (Attempt ${retryCount}/${maxRetries}): ${err instanceof Error ? err.message : 'Unknown error'}`;
            batchErrors.push(errorMsg);
            
            if (retryCount < maxRetries) {
              // Wait before retry with exponential backoff
              await new Promise(resolve => 
                setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1))
              );
            } else {
              // Final failure
              stats.failed += batchRefs.length;
              stats.errors.push(...batchErrors);
              
              onBatchComplete?.({
                batchNumber: currentBatch,
                totalBatches,
                itemsInBatch: batchRefs.length,
                successCount: 0,
                failureCount: batchRefs.length,
                errors: batchErrors
              });
            }
          }
        }

        // Small delay between batches to avoid overwhelming Firestore
        if (i + batchSize < docRefs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Store undo information
      if (enableUndo && stats.deleted > 0) {
        undoInfoRef.current = {
          collectionName,
          deletedDocuments: undoData,
          timestamp: Date.now(),
          conditions
        };
        setCanUndo(true);
      }

      stats.duration = Date.now() - startTimeRef.current;
      setLastStats(stats);
      return stats;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
      setError(errorMessage);
      stats.errors.push(errorMessage);
      stats.duration = Date.now() - startTimeRef.current;
      setLastStats(stats);
      throw new Error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }, [buildQuery, estimateDeleteTime]);

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

  // ========================================
  // UNDO FUNCTIONALITY
  // ========================================

  const undoLastDelete = useCallback(async (): Promise<boolean> => {
    if (!undoInfoRef.current || !canUndo) {
      setError('ไม่มีการลบที่สามารถยกเลิกได้');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const { collectionName, deletedDocuments } = undoInfoRef.current;
      const batchSize = 500;
      let restoredCount = 0;

      // Restore documents in batches
      for (let i = 0; i < deletedDocuments.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = deletedDocuments.slice(i, i + batchSize);
        
        batchDocs.forEach(({ id, data }) => {
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, data);
        });

        await batch.commit();
        restoredCount += batchDocs.length;
      }

      // Clear undo information
      undoInfoRef.current = null;
      setCanUndo(false);

      console.log(`Successfully restored ${restoredCount} documents`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกการลบ';
      setError(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [canUndo]);

  // ========================================
  // RESET & CLEANUP
  // ========================================

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsDeleting(false);
    setError(null);
    setLastStats(null);
    undoInfoRef.current = null;
    setCanUndo(false);
    processedItemsRef.current = 0;
  }, []);

  return {
    // States
    isLoading,
    isDeleting,
    error,
    lastStats,
    canUndo,
    
    // Methods
    previewDelete,
    executeDelete,
    quickDelete,
    undoLastDelete,
    reset,
    
    // Utilities
    validateConditions,
    estimateDeleteTime
  };
};

// ========================================
// HELPER UTILITIES
// ========================================

export const BulkDeleteHelpers = {
  createInactiveCondition: (statusField = 'status'): DeleteCondition => ({
    field: statusField,
    operator: '==',
    value: 'inactive'
  }),

  createTestDataCondition: (typeField = 'type'): DeleteCondition => ({
    field: typeField,
    operator: '==',
    value: 'test'
  }),

  createCompanyCondition: (company: string, companyField = 'company'): DeleteCondition => ({
    field: companyField,
    operator: '==',
    value: company
  }),

  createDisabledCondition: (activeField = 'isActive'): DeleteCondition => ({
    field: activeField,
    operator: '==',
    value: false
  }),

  createCreatedByCondition: (email: string, createdByField = 'createdBy'): DeleteCondition => ({
    field: createdByField,
    operator: '==',
    value: email
  }),

  createDateRangeConditions: (
    dateField: string, 
    startDate: Date, 
    endDate?: Date
  ): DeleteCondition[] => {
    const conditions: DeleteCondition[] = [
      { field: dateField, operator: '>=', value: startDate.toISOString() }
    ];
    
    if (endDate) {
      conditions.push({ 
        field: dateField, 
        operator: '<=', 
        value: endDate.toISOString() 
      });
    }
    
    return conditions;
  },

  combineConditions: (...conditions: DeleteCondition[]): DeleteCondition[] => {
    return conditions.filter(condition => 
      condition.field.trim() !== '' && condition.value !== ''
    );
  },

  // Performance estimation helper
  estimateOperationCost: (itemCount: number, batchSize: number = 500) => {
    const batches = Math.ceil(itemCount / batchSize);
    return {
      batches,
      estimatedTime: `${Math.ceil((batches * 300) / 1000)} วินาที`, // 300ms per batch
      firestoreReads: itemCount, // For query
      firestoreWrites: itemCount, // For delete
      estimatedCost: `${(itemCount * 0.02).toFixed(2)} บาท` // Rough Firebase cost
    };
  }
};

export default useBulkDelete;