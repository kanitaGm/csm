// ================================
// Enhanced CSM Service (Fixed TypeScript Errors)
// ไฟล์: src/services/enhancedCsmService.ts
// ================================

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { circuitBreaker } from '../utils/circuitBreaker';
import { withPerformanceTracking } from '../utils/performanceMonitor';
import { cacheService } from '../utils/cacheService';
import type { 
  CSMVendor, 
  CSMAssessment, 
  CSMAssessmentDoc, 
  CSMAssessmentSummary, 
  CSMFormDoc  
} from '../types';

// ================================
// Error Handling
// ================================

export class CSMServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'CSMServiceError';
  }
}

const handleServiceError = (error: unknown, operation: string): CSMServiceError => {
  console.error(`CSM Service Error in ${operation}:`, error);
  
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string };
    
    if (firebaseError.code === 'unavailable') {
      return new CSMServiceError(
        'ระบบไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่',
        'CONNECTION_ERROR',
        operation,
        true
      );
    }
    
    if (firebaseError.code === 'permission-denied') {
      return new CSMServiceError(
        'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
        'PERMISSION_DENIED',
        operation,
        false
      );
    }
  }

  const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
  return new CSMServiceError(message, 'UNKNOWN_ERROR', operation, true);
};

// ================================
// Date Conversion Utilities
// ================================

const convertToDate = (timestamp: unknown): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    const firestoreTimestamp = timestamp as { toDate: () => Date };
    return firestoreTimestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return new Date();
};

const safeParseFloat = (value: unknown, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// ================================
// Enhanced Vendors Service
// ================================

export class EnhancedVendorsService {
  private readonly COLLECTION_NAME = 'csmVendors';
  private readonly DEFAULT_CACHE_TTL = 30; // minutes

  async getAll(): Promise<readonly CSMVendor[]> {
    const cacheKey = 'csm-vendors-all';
    const cached = cacheService.get<readonly CSMVendor[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-getAll', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('isActive', '==', true),
              orderBy('vdName', 'asc')
            )
          );

          const vendors: CSMVendor[] = querySnapshot.docs.map(docSnap => ({
            ...docSnap.data(),
            id: docSnap.id
          } as CSMVendor));

          const readonlyVendors = vendors as readonly CSMVendor[];
          cacheService.set(cacheKey, readonlyVendors, this.DEFAULT_CACHE_TTL);
          return readonlyVendors;
        } catch (error) {
          throw handleServiceError(error, 'getAll');
        }
      });

      return operation();
    });
  }

  async getByVdCode(vdCode: string): Promise<CSMVendor | null> {
    if (!vdCode || typeof vdCode !== 'string') {
      throw new CSMServiceError('Invalid vdCode provided', 'INVALID_INPUT', 'getByVdCode');
    }

    const cacheKey = `csm-vendor-vdcode-${vdCode}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-getByVdCode', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('vdCode', '==', vdCode),
              where('isActive', '==', true),
              limit(1)
            )
          );

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const vendor = { ...docSnap.data(), id: docSnap.id } as CSMVendor;
            
            cacheService.set(cacheKey, vendor, this.DEFAULT_CACHE_TTL);
            return vendor;
          }
          return null;
        } catch (error) {
          throw handleServiceError(error, 'getByVdCode');
        }
      });

      return operation();
    });
  }

  async getByCompanyId(companyId: string): Promise<readonly CSMVendor[]> {
    if (!companyId || typeof companyId !== 'string') {
      throw new CSMServiceError('Invalid companyId provided', 'INVALID_INPUT', 'getByCompanyId');
    }

    const cacheKey = `csm-vendors-company-${companyId}`;
    const cached = cacheService.get<readonly CSMVendor[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-getByCompanyId', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('companyId', '==', companyId),
              where('isActive', '==', true),
              orderBy('vdName', 'asc')
            )
          );

          const vendors: CSMVendor[] = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as CSMVendor));

          const readonlyVendors = vendors as readonly CSMVendor[];
          cacheService.set(cacheKey, readonlyVendors, 20);
          return readonlyVendors;
        } catch (error) {
          throw handleServiceError(error, 'getByCompanyId');
        }
      });

      return operation();
    });
  }

  async create(vendor: Omit<CSMVendor, 'id'>): Promise<string> {
    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-create', async () => {
        try {
          const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
            ...vendor,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          this.clearCache();
          return docRef.id;
        } catch (error) {
          throw handleServiceError(error, 'create');
        }
      });

      return operation();
    });
  }

  async update(vendorId: string, updates: Partial<CSMVendor>): Promise<void> {
    if (!vendorId || typeof vendorId !== 'string') {
      throw new CSMServiceError('Invalid vendorId provided', 'INVALID_INPUT', 'update');
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-update', async () => {
        try {
          await updateDoc(doc(db, this.COLLECTION_NAME, vendorId), {
            ...updates,
            updatedAt: Timestamp.now()
          });

          this.clearCache();
        } catch (error) {
          throw handleServiceError(error, 'update');
        }
      });

      return operation();
    });
  }

  async delete(vendorId: string): Promise<void> {
    if (!vendorId || typeof vendorId !== 'string') {
      throw new CSMServiceError('Invalid vendorId provided', 'INVALID_INPUT', 'delete');
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('vendors-delete', async () => {
        try {
          // Soft delete
          await updateDoc(doc(db, this.COLLECTION_NAME, vendorId), {
            isActive: false,
            updatedAt: Timestamp.now()
          });

          this.clearCache();
        } catch (error) {
          throw handleServiceError(error, 'delete');
        }
      });

      return operation();
    });
  }

  clearCache(): void {
    cacheService.deleteKeysMatching(/^csm-vendor/);
  }
}

// ================================
// Enhanced Assessments Service
// ================================

export class EnhancedAssessmentsService {
  private readonly COLLECTION_NAME = 'csmAssessments';
  private readonly DEFAULT_CACHE_TTL = 15; // minutes

  async getByVdCode(vdCode: string): Promise<readonly CSMAssessmentDoc[]> {
    if (!vdCode || typeof vdCode !== 'string') {
      throw new CSMServiceError('Invalid vdCode provided', 'INVALID_INPUT', 'getByVdCode');
    }

    const cacheKey = `csm-assessments-${vdCode}`;
    const cached = cacheService.get<readonly CSMAssessmentDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('assessments-getByVdCode', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('vdCode', '==', vdCode),
              orderBy('createdAt', 'desc')
            )
          );

          const assessments: CSMAssessmentDoc[] = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as CSMAssessmentDoc));

          const readonlyAssessments = assessments as readonly CSMAssessmentDoc[];
          cacheService.set(cacheKey, readonlyAssessments, this.DEFAULT_CACHE_TTL);
          return readonlyAssessments;
        } catch (error) {
          throw handleServiceError(error, 'getByVdCode');
        }
      });

      return operation();
    });
  }

  async getById(assessmentId: string): Promise<CSMAssessmentDoc | null> {
    if (!assessmentId || typeof assessmentId !== 'string') {
      throw new CSMServiceError('Invalid assessmentId provided', 'INVALID_INPUT', 'getById');
    }

    const cacheKey = `csm-assessment-${assessmentId}`;
    const cached = cacheService.get<CSMAssessmentDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('assessments-getById', async () => {
        try {
          const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, assessmentId));
          
          if (docSnap.exists()) {
            const assessment = { id: docSnap.id, ...docSnap.data() } as CSMAssessmentDoc;
            cacheService.set(cacheKey, assessment, this.DEFAULT_CACHE_TTL);
            return assessment;
          }
          return null;
        } catch (error) {
          throw handleServiceError(error, 'getById');
        }
      });

      return operation();
    });
  }

  async create(assessment: Omit<CSMAssessment, 'id'>): Promise<string> {
    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('assessments-create', async () => {
        try {
          const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
            ...assessment,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          this.clearAssessmentCache(assessment.vdCode);
          return docRef.id;
        } catch (error) {
          throw handleServiceError(error, 'create');
        }
      });

      return operation();
    });
  }

  async update(assessmentId: string, updates: Partial<CSMAssessment>): Promise<void> {
    if (!assessmentId || typeof assessmentId !== 'string') {
      throw new CSMServiceError('Invalid assessmentId provided', 'INVALID_INPUT', 'update');
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('assessments-update', async () => {
        try {
          await updateDoc(doc(db, this.COLLECTION_NAME, assessmentId), {
            ...updates,
            updatedAt: Timestamp.now()
          });

          // Clear related caches
          if (updates.vdCode) {
            this.clearAssessmentCache(updates.vdCode);
          }
          cacheService.delete(`csm-assessment-${assessmentId}`);
        } catch (error) {
          throw handleServiceError(error, 'update');
        }
      });

      return operation();
    });
  }

  // Get assessment summaries for a company
  async getSummariesByCompany(companyId: string): Promise<readonly CSMAssessmentSummary[]> {
    if (!companyId || typeof companyId !== 'string') {
      throw new CSMServiceError('Invalid companyId provided', 'INVALID_INPUT', 'getSummariesByCompany');
    }

    const cacheKey = `csm-summaries-${companyId}`;
    const cached = cacheService.get<readonly CSMAssessmentSummary[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('assessments-getSummariesByCompany', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('companyId', '==', companyId),
              where('isActive', '==', true),
              orderBy('updatedAt', 'desc')
            )
          );

          const assessmentsByVendor = new Map<string, CSMAssessmentDoc>();
          
          // Get the latest assessment for each vendor
          querySnapshot.docs.forEach(docSnap => {
            const assessment = { id: docSnap.id, ...docSnap.data() } as CSMAssessmentDoc;
            const existing = assessmentsByVendor.get(assessment.vdCode);
            
            // แก้ไข: ใช้ convertToDate function เพื่อ handle unknown types
            if (!existing || convertToDate(assessment.updatedAt) > convertToDate(existing.updatedAt)) {
              assessmentsByVendor.set(assessment.vdCode, assessment);
            }
          });

          const summaries: CSMAssessmentSummary[] = Array.from(assessmentsByVendor.values()).map(assessment => {
            // แก้ไข: ใช้ helper functions เพื่อ handle unknown types safely
            const assessmentData = assessment as unknown as Record<string, unknown>;
            
            return {
              vdCode: assessment.vdCode,
              vdName: assessment.vdName,
              lastAssessmentId: assessment.id,
              lastAssessmentDate: convertToDate(assessment.updatedAt),
              totalScore: safeParseFloat(assessmentData.totalScore || assessmentData.finalScore, 0),
              avgScore: safeParseFloat(assessmentData.avgScore, 0),
              riskLevel: this.calculateRiskLevel(safeParseFloat(assessmentData.avgScore, 0)),
              updatedAt: convertToDate(assessment.updatedAt)
            };
          });

          const readonlySummaries = summaries as readonly CSMAssessmentSummary[];
          cacheService.set(cacheKey, readonlySummaries, 10); // Shorter cache for summaries
          return readonlySummaries;
        } catch (error) {
          throw handleServiceError(error, 'getSummariesByCompany');
        }
      });

      return operation();
    });
  }

  private calculateRiskLevel(avgScore: number): 'Low' | 'Moderate' | 'High' | '' {
    if (avgScore >= 1.5) return 'Low';
    if (avgScore >= 1.0) return 'Moderate';
    if (avgScore > 0) return 'High';
    return '';
  }

  private clearAssessmentCache(vdCode: string): void {
    cacheService.delete(`csm-assessments-${vdCode}`);
    cacheService.deleteKeysMatching(/^csm-summaries-/);
  }
}

// ================================
// Enhanced Forms Service
// ================================

export class EnhancedFormsService {
  private readonly COLLECTION_NAME = 'forms';
  private readonly DEFAULT_CACHE_TTL = 60; // Forms change less frequently

  async getCSMChecklist(): Promise<CSMFormDoc | null> {
    const cacheKey = 'csm-checklist-form';
    const cached = cacheService.get<CSMFormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return circuitBreaker.execute(async () => {
      const operation = withPerformanceTracking('forms-getCSMChecklist', async () => {
        try {
          const querySnapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where('formCode', '==', 'CSMChecklist'),
              where('isActive', '==', true),
              limit(1)
            )
          );

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const form = { id: docSnap.id, ...docSnap.data() } as CSMFormDoc;
            
            cacheService.set(cacheKey, form, this.DEFAULT_CACHE_TTL);
            return form;
          }
          return null;
        } catch (error) {
          throw handleServiceError(error, 'getCSMChecklist');
        }
      });

      return operation();
    });
  }

  clearFormCache(): void {
    cacheService.deleteKeysMatching(/^csm.*form/);
  }
}

// ================================
// Service Instances and Exports
// ================================

export const enhancedVendorsService = new EnhancedVendorsService();
export const enhancedAssessmentsService = new EnhancedAssessmentsService();
export const enhancedFormsService = new EnhancedFormsService();

// Main enhanced CSM service object
export const enhancedCSMService = {
  vendors: enhancedVendorsService,
  assessments: enhancedAssessmentsService,
  forms: enhancedFormsService,
  
  // Utility methods
  clearAllCache: () => {
    cacheService.clear();
  },
  
  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: Date }> => {
    try {
      // Try a simple read operation
      await getDocs(query(collection(db, 'csmVendors'), limit(1)));
      return { status: 'healthy', timestamp: new Date() };
    } catch (_error) {
      // แก้ไข: ใส่ underscore prefix เพื่อบอกว่าไม่ใช้ error parameter
      console.log(_error);
      return { status: 'unhealthy', timestamp: new Date() };
    }
  }
} as const;

export default enhancedCSMService;