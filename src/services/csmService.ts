// 📁 src/services/csmService.ts - แก้ไขให้สอดคล้องกับ CSMVendor system
import { collection, doc, getDocs, getDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, Timestamp, writeBatch, startAfter, FieldValue} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDate } from '../utils/dateUtils'; 
import type { CSMFormDoc, CSMAssessment, CSMAssessmentDoc, CSMAssessmentSummary, CSMVendor, CSMAssessmentAnswer, CSMFormField, DateInput
} from '../types';
import { cacheService } from './cacheService';
import { withRetry } from '../utils/retryUtils';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CSMError, CSMErrorCodes } from '../features/errors/CSMError';
import { errorReporter } from './errorReporting';

// =================== TYPE DEFINITIONS ===================
type FirestoreData = {
  [x: string]: FieldValue | Partial<unknown> | undefined;
};

// =================== ENHANCED CIRCUIT BREAKER ===================
class EnhancedCircuitBreaker extends CircuitBreaker {
  private metrics = {
    successCount: 0,
    failureCount: 0,
    avgResponseTime: 0
  };

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await super.execute(operation);
      this.metrics.successCount++;
      this.updateResponseTime(Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.failureCount++;
      throw error;
    }
  }

  private updateResponseTime(time: number): void {
    const total = this.metrics.successCount + this.metrics.failureCount;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (total - 1) + time) / total;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// สร้าง enhanced circuit breaker instance
const firestoreCircuitBreaker = new EnhancedCircuitBreaker(5, 60000);

// =================== OPTIMIZED UTILITY FUNCTIONS ===================
/**
 * ลบค่า undefined ออกจาก object ก่อนส่งไปยัง Firestore (Optimized)
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
    const entries = Object.entries(obj as Record<string, unknown>);
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (value !== undefined) {
        cleaned[key] = cleanUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

/**
 * เตรียมข้อมูลสำหรับ Firestore
 */
const prepareFirestoreData = (data: Record<string, unknown>): FirestoreData => {
  const cleaned = cleanUndefinedValues(data) as Record<string, unknown>;
  
  if (cleaned && typeof cleaned === 'object') {
    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      if (value instanceof Date) {
        cleaned[key] = Timestamp.fromDate(value);
      }
    });
  }
  
  return cleaned as FirestoreData;
};

// Optimized date parsing with memoization
const DATE_CACHE = new Map<string, Date>();
const MAX_CACHE_SIZE = 1000;

/**
 * แปลง DateInput เป็น Date object ใช้ parseDate จาก dateUtils (with caching)
 */
const safeParseDate = (dateValue: unknown): Date => {
  if (!dateValue) return new Date();
  
  const cacheKey = String(dateValue);
  
  if (DATE_CACHE.has(cacheKey)) {
    return DATE_CACHE.get(cacheKey)!;
  }
  
  const parsed = parseDate(dateValue as DateInput) || new Date();
  
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
//  แก้ไข: ใช้ CSMVendor แทน Company และเชื่อมต่อกับ csmVendors collection
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
          collection(db, 'csmVendors'), //  เปลี่ยนจาก companies เป็น csmVendors
          where('isActive', '==', true),
          orderBy('vdName', 'asc') //  เปลี่ยนจาก name เป็น vdName
        )        
      );
      const vendors = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id //  เปลี่ยนจาก companyId เป็น id
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
      const vendors = await this.getAll(); // ใช้ cached data
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
        cacheService.set(cacheKey, vendor, 30); // Cache for 30 minutes
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
        const doc = querySnapshot.docs[0];
        const vendor = { ...doc.data(), id: doc.id } as CSMVendor;
        
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
      
      const vendors = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

// =================== FORMS SERVICES (Enhanced) ===================
export const formsService = {
  async getAll(): Promise<CSMFormDoc[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), orderBy('updatedAt', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as CSMFormDoc));
    } catch (error) {
      console.error('Error fetching forms:', error);
      throw error;
    }
  },

  async getByFormCode(formCode: string | 'CSMChecklist'): Promise<CSMFormDoc | null> { //CSMChecklist
    
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'forms'), where('formCode', '==', formCode), limit(1))
      );
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { ...doc.data(), id: doc.id } as CSMFormDoc;
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
      cacheService.set(cacheKey, form, 30); // Cache for 30 minutes
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

// =================== CSM ASSESSMENTS SERVICES (Fully Optimized) ===================
export const csmAssessmentsService = {
  // Memoize form fields to avoid repeated fetches
  formFieldsCache: null as { fields: CSMFormField[]; timestamp: number } | null,
  FORM_FIELDS_CACHE_TTL: 30 * 60 * 1000, // 30 minutes

  async getFormFields(): Promise<CSMFormField[]> {
    const now = Date.now();
    
    if (this.formFieldsCache && 
        (now - this.formFieldsCache.timestamp) < this.FORM_FIELDS_CACHE_TTL) {
      return this.formFieldsCache.fields;
    }

    const formData = await formsService.getCSMChecklist();
    const fields = formData?.fields || [];
    
    this.formFieldsCache = {
      fields,
      timestamp: now
    };
    
    return fields;
  },

  async getAll(): Promise<CSMAssessmentDoc[]> {
    try {
      return await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const querySnapshot = await getDocs(
            query(collection(db, 'csmAssessments'), orderBy('createdAt', 'desc'))
          );
          return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as CSMAssessmentDoc));
        });
      });
    } catch (error) {
      const csmError = new CSMError(
        'Failed to fetch assessments',
        CSMErrorCodes.FIRESTORE_ERROR,
        'medium',
        true,
        error as Error
      );
      errorReporter.reportError(csmError);
      throw csmError;
    }
  },

  async getByVdCode(vdCode: string): Promise<CSMAssessmentDoc[]> {
    const cacheKey = `assessments-${vdCode}`;
    const cached = cacheService.get<CSMAssessmentDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const result = await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const querySnapshot = await getDocs(
            query(
              collection(db, 'csmAssessments'), 
              where('vdCode', '==', vdCode),
              orderBy('createdAt', 'desc')
            )
          );
          return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as CSMAssessmentDoc));
        });
      });

      cacheService.set(cacheKey, result, 10); // Cache for 10 minutes
      return result;
    } catch (error) {
      const csmError = new CSMError(
        'Failed to fetch assessments',
        CSMErrorCodes.FIRESTORE_ERROR, 
        'medium',
        true,
        error as Error
      );
      errorReporter.reportError(csmError);
      throw csmError;
    }
  },

  async getById(assessmentId: string): Promise<CSMAssessmentDoc | null> {
    try {
      return await firestoreCircuitBreaker.execute(async () => {
        return await withRetry(async () => {
          const docSnap = await getDoc(doc(db, 'csmAssessments', assessmentId));
          if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id } as CSMAssessmentDoc;
          }
          return null;
        });
      });
   } catch (error) {
      const csmError = new CSMError(
        'Failed to fetch assessments',
        CSMErrorCodes.FIRESTORE_ERROR,
        'medium',
        true,
        error as Error
      );
      errorReporter.reportError(csmError);
      throw csmError;
    }
  },

  // =================== OPTIMIZED SCORE CALCULATION FUNCTIONS ===================
  calculateTotalScore(answers: CSMAssessmentAnswer[], formFields: CSMFormField[]): number {
    if (!answers?.length || !formFields?.length) return 0;
    
    // Create field lookup map for O(1) access
    const fieldMap = new Map(
      formFields.map(field => [field.ckItem, parseFloat(field.fScore || '1')])
    );

    return answers.reduce((total, answer) => {
      if (!answer?.score || answer.score === 'n/a') return total;

      const score = parseFloat(answer.score);
      if (isNaN(score)) return total;

      const fScore = fieldMap.get(answer.ckItem) || 1;
      return total + (score * fScore);
    }, 0);
  },

  calculateMaxScore(answers: CSMAssessmentAnswer[], formFields: CSMFormField[], maxScorePerQuestion: number = 2): number {
    if (!answers?.length || !formFields?.length) return 0;

    const fieldMap = new Map(
      formFields.map(field => [field.ckItem, parseFloat(field.fScore || '1')])
    );

    return answers.reduce((total, answer) => {
      if (!answer?.score || answer.score === 'n/a') return total;

      const fScore = fieldMap.get(answer.ckItem) || 1;
      return total + (maxScorePerQuestion * fScore);
    }, 0);
  },

  calculateAverageScore(answers: CSMAssessmentAnswer[], formFields: CSMFormField[], maxScorePerQuestion: number = 2): number {
    const totalScore = this.calculateTotalScore(answers, formFields);
    const maxScore = this.calculateMaxScore(answers, formFields, maxScorePerQuestion);
    
    if (maxScore === 0) return 0;
    return (totalScore / maxScore) * 100;
  },

  updateAnswerScores(answers: CSMAssessmentAnswer[], formFields: CSMFormField[]): CSMAssessmentAnswer[] {
    if (!answers?.length || !formFields?.length) return answers;

    const fieldMap = new Map(
      formFields.map(field => [field.ckItem, parseFloat(field.fScore || '1')])
    );

    return answers.map(answer => {
      if (!answer?.score || answer.score === 'n/a') {
        return { ...answer, tScore: undefined };
      }

      const score = parseFloat(answer.score);
      if (isNaN(score)) {
        return { ...answer, tScore: undefined };
      }

      const fScore = fieldMap.get(answer.ckItem) || 1;
      const tScore = score * fScore;

      return { ...answer, tScore: tScore.toString() };
    });
  },

  calculateAssessmentStats(answers: CSMAssessmentAnswer[], formFields: CSMFormField[]) {
    const totalQuestions = formFields.length;
    const answeredQuestions = answers.filter(a => a.score && a.score !== '').length;
    const naQuestions = answers.filter(a => a.score === 'n/a').length;
    const scoredQuestions = answers.filter(a => a.score && a.score !== 'n/a' && a.score !== '').length;
    
    const totalScore = this.calculateTotalScore(answers, formFields);
    const maxScore = this.calculateMaxScore(answers, formFields);
    const avgScore = this.calculateAverageScore(answers, formFields);

    return {
      totalQuestions,
      answeredQuestions,
      naQuestions,
      scoredQuestions,
      totalScore,
      maxScore,
      avgScore: Math.round(avgScore * 100) / 100
    };
  },

  //  อัพเดต getAllSummaries เพื่อใช้ CSMVendor
  async getAllSummaries(cLimit: number = 20, lastDoc?: unknown): Promise<{ summaries: CSMAssessmentSummary[]; hasMore: boolean; lastVisible: unknown }> {
    const cacheKey = `latest-assessments-${cLimit}`;
    const cached = cacheService.get<{ summaries: CSMAssessmentSummary[]; hasMore: boolean; lastVisible: unknown }>(cacheKey);
    
    if (cached && !lastDoc) {
      return cached;
    }

    try {
      let q = query(
        collection(db, 'csmAssessments'), 
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(cLimit)
      );
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      const querySnapshot = await getDocs(q);
      const summaries: CSMAssessmentSummary[] = [];
      
      // ใช้ cached form fields
      const formFields = await this.getFormFields();

      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as CSMAssessmentDoc;
        
        const totalScore = this.calculateTotalScore(data.answers, formFields);
        const avgScore = this.calculateAverageScore(data.answers, formFields);
        
        const createdAtDate = safeParseDate(data.createdAt);
        const updatedAtDate = safeParseDate(data.updatedAt || data.createdAt);
        
        summaries.push({
          vdCode: data.vdCode,
          vdName: data.vdName, //  ใช้ vdName แทน companyName
          lastAssessmentId: doc.id,
          lastAssessmentDate: createdAtDate,
          totalScore,
          avgScore,
          riskLevel: (data.riskLevel as 'Low' | 'Moderate' | 'High' | '') || '',
          updatedAt: updatedAtDate
        });
      });

      const result = {
        summaries: summaries.sort((a, b) => b.lastAssessmentDate.getTime() - a.lastAssessmentDate.getTime()),
        hasMore: querySnapshot.docs.length === cLimit,
        lastVisible: querySnapshot.docs[querySnapshot.docs.length - 1]
      };

      if (!lastDoc) {
        cacheService.set(cacheKey, result, 5); // Cache for 5 minutes
      }

      return result;
      
    } catch (error) {
      console.error('Error fetching latest assessments:', error);
      return { summaries: [], hasMore: false, lastVisible: null };
    }
  },

  async create(assessmentData: Omit<CSMAssessment, 'id'>): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      // Parallel execution for better performance
      const [existingAssessments, formFields] = await Promise.all([
        this.getByVdCode(assessmentData.vdCode),
        this.getFormFields()
      ]);

      // Batch deactivate existing assessments
      existingAssessments.forEach(assessment => {
        if (assessment.isActive) {
          const assessmentRef = doc(db, 'csmAssessments', assessment.id);
          batch.update(assessmentRef, { isActive: false });
        }
      });

      const newAssessmentRef = doc(collection(db, 'csmAssessments'));
      
      // Calculate scores with optimized functions
      const updatedAnswers = this.updateAnswerScores(assessmentData.answers, formFields);
      const totalScore = this.calculateTotalScore(updatedAnswers, formFields);
      const avgScore = this.calculateAverageScore(updatedAnswers, formFields);

      const cleanedData = prepareFirestoreData({
        ...assessmentData,
        answers: updatedAnswers,
        finalScore: totalScore.toString(),
        avgScore: avgScore.toString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      batch.set(newAssessmentRef, cleanedData);
      await batch.commit();
      
      // Clear related caches
      await this.clearAssessmentCaches(assessmentData.vdCode);
      
      return newAssessmentRef.id;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  },

  async update(assessmentId: string, assessmentData: Partial<CSMAssessment>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        ...assessmentData,
        updatedAt: Timestamp.now()
      };

      if (assessmentData.answers) {
        const formFields = await this.getFormFields();
        
        const updatedAnswers = this.updateAnswerScores(assessmentData.answers, formFields);
        const totalScore = this.calculateTotalScore(updatedAnswers, formFields);
        const avgScore = this.calculateAverageScore(updatedAnswers, formFields);

        updateData.answers = updatedAnswers;
        updateData.finalScore = totalScore.toString();
        updateData.avgScore = avgScore.toString();
      }

      const cleanedData = prepareFirestoreData(updateData);
      await updateDoc(doc(db, 'csmAssessments', assessmentId), cleanedData);
      
      // Clear related caches
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
    vendorsAssessed: number; //  เปลี่ยนจาก companiesAssessed เป็น vendorsAssessed
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
      const uniqueVendors = new Set(assessments.map(a => a.vdCode)); //  เปลี่ยนเป็น vendors
      
      const totalScore = activeAssessments.reduce((sum, assessment) => {
        return sum + parseFloat(assessment.avgScore || '0');
      }, 0);
      
      const averageScore = activeAssessments.length > 0 ? totalScore / activeAssessments.length : 0;

      const stats = {
        totalAssessments: assessments.length,
        activeAssessments: activeAssessments.length,
        vendorsAssessed: uniqueVendors.size, //  เปลี่ยนจาก companiesAssessed
        averageScore: Math.round(averageScore * 100) / 100
      };

      cacheService.set(cacheKey, stats, 10); // Cache for 10 minutes
      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalAssessments: 0,
        activeAssessments: 0,
        vendorsAssessed: 0, //  เปลี่ยน field name
        averageScore: 0
      };
    }
  },

  async clearAssessmentCaches(vdCode?: string): Promise<void> {
    await cacheService.clear();
    if (vdCode) {
      await cacheService.clear();
    }
  },

  // Get circuit breaker metrics
  getCircuitBreakerMetrics() {
    return firestoreCircuitBreaker.getMetrics();
  }
};

//  อัพเดต export ให้สอดคล้องกับ CSMVendor system
export default {
  vendors: vendorsService, //  ใช้ vendorsService แทน csmVendorService
  forms: formsService,
  assessments: csmAssessmentsService
};
