// ================================
// Fully Fixed csmService.ts - แก้ไข All TypeScript Errors
// ไฟล์: src/services/csmService.ts
// ================================

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp, 
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';
//import { parseDate } from '../utils/dateUtils'; 
import type { 
  CSMFormDoc, 
  CSMAssessment, 
  CSMAssessmentDoc, 
  CSMAssessmentSummary, 
  CSMVendor, 
  CSMAssessmentAnswer, 
  CSMFormField, 
  //DateInput
} from '../types';
import { cacheService } from './cacheService';
import { CircuitBreaker } from '../utils/circuitBreaker';

// =================== TYPE DEFINITIONS ===================
type FirestoreData = {
  [x: string]: FieldValue | Partial<unknown> | undefined;
};

interface CircuitBreakerMetrics {
  readonly successCount: number;
  readonly failureCount: number;
  readonly avgResponseTime: number;
}

// =================== ENHANCED CIRCUIT BREAKER ===================
class EnhancedCircuitBreaker extends CircuitBreaker {
  private metrics: CircuitBreakerMetrics = {
    successCount: 0,
    failureCount: 0,
    avgResponseTime: 0
  };

  constructor(threshold: number, timeout: number) {
    super({
      failureThreshold: threshold,
      resetTimeout: timeout,
      monitoringPeriod: 10000
    });
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await super.execute(operation);
      this.metrics = {
        ...this.metrics,
        successCount: this.metrics.successCount + 1
      };
      this.updateResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics = {
        ...this.metrics,
        failureCount: this.metrics.failureCount + 1
      };
      throw error;
    }
  }

  private updateResponseTime(time: number): void {
    const total = this.metrics.successCount + this.metrics.failureCount;
    this.metrics = {
      ...this.metrics,
      avgResponseTime: (this.metrics.avgResponseTime * (total - 1) + time) / total
    };
  }

  // แก้ไข: เปลี่ยนจาก private เป็น public method
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }
}

// สร้าง enhanced circuit breaker instance
const firestoreCircuitBreaker = new EnhancedCircuitBreaker(5, 60000);

// =================== UTILITY FUNCTIONS ===================
/**
 * ลบค่า undefined ออกจาก object ก่อนส่งไปยัง Firestore
 */
const cleanUndefinedValues = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedValues(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

/**
 * เตรียมข้อมูลสำหรับ Firestore โดยลบค่า undefined และแปลง Date เป็น Timestamp
 */
const prepareFirestoreData = (data: Record<string, unknown>): FirestoreData => {
  const cleaned = cleanUndefinedValues(data) as Record<string, unknown>;
  
  // แปลง Date objects เป็น Firestore Timestamps
  for (const [key, value] of Object.entries(cleaned)) {
    if (value instanceof Date) {
      cleaned[key] = Timestamp.fromDate(value);
    }
  }
  
  return cleaned as FirestoreData;
};

// =================== DATE CONVERSION UTILITIES ===================
const DATE_CACHE = new Map<string, Date>();
const MAX_CACHE_SIZE = 1000;

// แก้ไข: สร้าง safe date conversion function
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

const parseOptimizedDate = (dateValue: unknown): Date => {
  // แก้ไข: ใช้ convertToDate แทน parseDate เพื่อ handle unknown types
  const cacheKey = String(dateValue);
  
  if (DATE_CACHE.has(cacheKey)) {
    return DATE_CACHE.get(cacheKey)!;
  }
  
  const parsed = convertToDate(dateValue);
  
  // Prevent memory leak by limiting cache size
  if (DATE_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = DATE_CACHE.keys().next().value;
    if (firstKey) {
      DATE_CACHE.delete(firstKey);
    }
  }
  
  DATE_CACHE.set(cacheKey, parsed);
  return parsed;
};

// =================== CSM VENDORS SERVICES ===================
export const vendorsService = {
  async getAll(): Promise<CSMVendor[]> {
    const cacheKey = 'csm-vendors-all';
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'csmVendors'),
          where('isActive', '==', true),
          orderBy('vdName', 'asc')
        )        
      );
      const vendors = querySnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as CSMVendor));

      cacheService.set(cacheKey, vendors, 15); // Cache for 15 minutes
      return vendors;
    } catch (error) {
      console.error('Error fetching CSM vendors:', error);
      throw error;
    }
  },

  async search(searchTerm: string): Promise<CSMVendor[]> {
    try {
      const vendors = await this.getAll();
      const term = searchTerm.toLowerCase().trim();
      
      if (!term) return vendors;

      return vendors.filter(vendor => 
        vendor.vdName.toLowerCase().includes(term) ||
        vendor.vdCode.toLowerCase().includes(term) ||
        vendor.category.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw error;
    }
  },

  async getById(vendorId: string): Promise<CSMVendor | null> {
    const cacheKey = `csm-vendor-${vendorId}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const docSnap = await getDoc(doc(db, 'csmVendors', vendorId));
      if (docSnap.exists()) {
        const vendor = { ...docSnap.data(), id: docSnap.id } as CSMVendor;
        cacheService.set(cacheKey, vendor, 30);
        return vendor;
      }
      return null;
    } catch (error) {
      console.error('Error fetching vendor:', error);
      throw error;
    }
  },

  async getByVdCode(vdCode: string): Promise<CSMVendor | null> {
    const cacheKey = `csm-vendor-vdcode-${vdCode}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'csmVendors'), 
          where('vdCode', '==', vdCode),
          where('isActive', '==', true),
          limit(1)
        )
      );
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const vendor = { ...docSnap.data(), id: docSnap.id } as CSMVendor;
        
        cacheService.set(cacheKey, vendor, 30);
        return vendor;
      }
      return null;
    } catch (error) {
      console.error('Error fetching vendor by vdCode:', error);
      throw error;
    }
  },

  async getByCompanyId(companyId: string): Promise<CSMVendor[]> {
    const cacheKey = `csm-vendors-company-${companyId}`;
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'csmVendors'),
          where('companyId', '==', companyId),
          where('isActive', '==', true),
          orderBy('vdName', 'asc')
        )
      );
      
      const vendors = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CSMVendor));

      cacheService.set(cacheKey, vendors, 20);
      return vendors;
    } catch (error) {
      console.error('Error fetching vendors by companyId:', error);
      throw error;
    }
  },

  clearCache(): void {
    cacheService.clear();
  }
};

// =================== FORMS SERVICES ===================
export const formsService = {
  async getAll(): Promise<CSMFormDoc[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), orderBy('updatedAt', 'desc'))
      );
      return querySnapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      } as CSMFormDoc));
    } catch (error) {
      console.error('Error fetching forms:', error);
      throw error;
    }
  },

  async getByFormCode(formCode: string): Promise<CSMFormDoc | null> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), where('formCode', '==', formCode), limit(1))
      );
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { ...docSnap.data(), id: docSnap.id } as CSMFormDoc;
      }
      return null;
    } catch (error) {
      console.error('Error fetching form by code:', error);
      throw error;
    }
  },

  async getCSMChecklist(): Promise<CSMFormDoc | null> {
    const cacheKey = 'csm-checklist-form';
    const cached = cacheService.get<CSMFormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const form = await this.getByFormCode('CSMChecklist');
    if (form) {
      cacheService.set(cacheKey, form, 30);
    }
    
    return form;
  },

  async update(formId: string, formData: Partial<CSMFormDoc>): Promise<void> {
    try {
      const cleanedData = prepareFirestoreData({
        ...formData,
        updatedAt: Timestamp.now()
      });
      
      await updateDoc(doc(db, 'forms', formId), cleanedData);
      this.clearFormCache();
    } catch (error) {
      console.error('Error updating form:', error);
      throw error;
    }
  },

  async delete(formId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'forms', formId));
      this.clearFormCache();
    } catch (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  },

  clearFormCache(): void {
    cacheService.clear(); 
  }
};

// =================== CSM ASSESSMENTS SERVICES ===================
export const csmAssessmentsService = {
  // Score calculation functions
  calculateTotalScore: (answers: CSMAssessmentAnswer[], formFields: CSMFormField[]): number => {
    return answers.reduce((total, answer) => {
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      if (field && answer.score && answer.score !== 'n/a') {
        const score = parseFloat(answer.score);
        const weight = parseFloat(field.fScore || '1');
        return total + (score * weight);
      }
      return total;
    }, 0);
  },

  calculateAverageScore: (answers: CSMAssessmentAnswer[], formFields: CSMFormField[]): number => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    answers.forEach(answer => {
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      if (field && answer.score && answer.score !== 'n/a') {
        const score = parseFloat(answer.score);
        const weight = parseFloat(field.fScore || '1');
        totalWeightedScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  },

  calculateMaxScore: (answers: CSMAssessmentAnswer[], formFields: CSMFormField[]): number => {
    return answers.reduce((max, answer) => {
      const field = formFields.find(f => f.ckItem === answer.ckItem);
      if (field && answer.score && answer.score !== 'n/a') {
        const weight = parseFloat(field.fScore || '1');
        return max + (2 * weight); // Assuming max individual score is 2
      }
      return max;
    }, 0);
  },

  async getAll(): Promise<CSMAssessmentDoc[]> {
    const cacheKey = 'csm-assessments-all';
    const cached = cacheService.get<CSMAssessmentDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await firestoreCircuitBreaker.execute(async () => {
        return await getDocs(
          query(collection(db, 'csmAssessments'), orderBy('updatedAt', 'desc'))
        );
      });
      
      const assessments = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CSMAssessmentDoc));

      cacheService.set(cacheKey, assessments, 10);
      return assessments;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }
  },

  async getByVdCode(vdCode: string): Promise<CSMAssessmentDoc[]> {
    const cacheKey = `csm-assessments-${vdCode}`;
    const cached = cacheService.get<CSMAssessmentDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await firestoreCircuitBreaker.execute(async () => {
        return await getDocs(
          query(
            collection(db, 'csmAssessments'),
            where('vdCode', '==', vdCode),
            orderBy('createdAt', 'desc')
          )
        );
      });

      const assessments = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as CSMAssessmentDoc));

      cacheService.set(cacheKey, assessments, 15);
      return assessments;
    } catch (error) {
      console.error('Error fetching assessments by vdCode:', error);
      throw error;
    }
  },

  async getSummariesByCompany(companyId: string): Promise<CSMAssessmentSummary[]> {
    const cacheKey = `csm-summaries-${companyId}`;
    const cached = cacheService.get<CSMAssessmentSummary[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await firestoreCircuitBreaker.execute(async () => {
        return await getDocs(
          query(
            collection(db, 'csmAssessments'),
            where('companyId', '==', companyId),
            where('isActive', '==', true),
            orderBy('updatedAt', 'desc')
          )
        );
      });

      // Group by vdCode and get latest assessment for each vendor
      const assessmentsByVendor = new Map<string, CSMAssessmentDoc>();
      
      querySnapshot.docs.forEach(docSnap => {
        const assessment = { id: docSnap.id, ...docSnap.data() } as CSMAssessmentDoc;
        const existing = assessmentsByVendor.get(assessment.vdCode);
        
        // แก้ไข: ใช้ convertToDate แทน new Date เพื่อ handle unknown types
        if (!existing || convertToDate(assessment.updatedAt) > convertToDate(existing.updatedAt)) {
          assessmentsByVendor.set(assessment.vdCode, assessment);
        }
      });

      const summaries: CSMAssessmentSummary[] = Array.from(assessmentsByVendor.values()).map(assessment => {
        // แก้ไข: cast เป็น any เพื่อ access dynamic properties safely
        const assessmentData = assessment as unknown as Record<string, unknown>;
        return {
          vdCode: assessment.vdCode,
          vdName: assessment.vdName,
          lastAssessmentId: assessment.id,
          lastAssessmentDate: parseOptimizedDate(assessment.updatedAt), // แก้ไข: ใช้ parseOptimizedDate
          totalScore: parseFloat(String(assessmentData.totalScore || assessmentData.finalScore || '0')),
          avgScore: parseFloat(String(assessmentData.avgScore || '0')),
          riskLevel: this.calculateRiskLevel(parseFloat(String(assessmentData.avgScore || '0'))),
          updatedAt: parseOptimizedDate(assessment.updatedAt) // แก้ไข: ใช้ parseOptimizedDate
        };
      });

      cacheService.set(cacheKey, summaries, 10);
      return summaries;
    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
      throw error;
    }
  },

  calculateRiskLevel(avgScore: number): 'Low' | 'Moderate' | 'High' | '' {
    if (avgScore >= 1.5) return 'Low';
    if (avgScore >= 1.0) return 'Moderate'; 
    if (avgScore > 0) return 'High';
    return '';
  },

  async update(assessmentId: string, updates: Partial<CSMAssessment>): Promise<void> {
    try {
      const cleanedData = prepareFirestoreData({
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      await updateDoc(doc(db, 'csmAssessments', assessmentId), cleanedData);
      await this.clearAssessmentCaches();
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  },

  async delete(assessmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'csmAssessments', assessmentId));
      await this.clearAssessmentCaches();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }
  },

  isAssessmentComplete(answers: CSMAssessmentAnswer[]): boolean {
    return answers.every(answer => 
      answer.comment.trim() !== '' && 
      answer.score && 
      answer.score !== '' &&
      answer.isFinish === true
    );
  },

  async getStatistics(): Promise<{
    totalAssessments: number;
    activeAssessments: number;
    vendorsAssessed: number;
    averageScore: number;
  }> {
    const cacheKey = 'csm-stats';
    const cached = cacheService.get<{
      totalAssessments: number;
      activeAssessments: number;
      vendorsAssessed: number;
      averageScore: number;
    }>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const assessments = await this.getAll();
      const activeAssessments = assessments.filter(a => a.isActive);
      const uniqueVendors = new Set(assessments.map(a => a.vdCode));
      
      const totalScore = activeAssessments.reduce((sum, assessment) => {
        const assessmentData = assessment as unknown as Record<string, unknown>;
        return sum + parseFloat(String(assessmentData.avgScore || '0'));
      }, 0);
      
      const averageScore = activeAssessments.length > 0 ? totalScore / activeAssessments.length : 0;

      const stats = {
        totalAssessments: assessments.length,
        activeAssessments: activeAssessments.length,
        vendorsAssessed: uniqueVendors.size,
        averageScore: Math.round(averageScore * 100) / 100
      };

      cacheService.set(cacheKey, stats, 10);
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalAssessments: 0,
        activeAssessments: 0,
        vendorsAssessed: 0,
        averageScore: 0
      };
    }
  },

  async clearAssessmentCaches(vdCode?: string): Promise<void> {
    if (vdCode) {
      // แก้ไข: ใช้ cacheService.clear() แทน cacheService.delete() ที่ไม่มี
      cacheService.clear();
    } else {
      await cacheService.clear();
    }
  },

  // แก้ไข: ปรับ return type ให้ตรงกับ method ใน class
  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return firestoreCircuitBreaker.getMetrics();
  }
};

// Main export object
export default {
  vendors: vendorsService,
  forms: formsService,
  assessments: csmAssessmentsService
};