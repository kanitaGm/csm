// 📁 src/services/enhancedCsmService.ts
// High-Performance CSM Service with Caching and Batch Operations
import { 
  collection, doc, getDocs,  getDoc, addDoc, updateDoc, writeBatch,
  query, where, orderBy, limit, startAfter, Timestamp, 
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { 
  CSMFormDoc, CSMAssessment, CSMAssessmentSummary, 
  CSMVendor, Company} from '../types';
import { cacheService } from './cacheService';
import type {DateInput} from '../utils/dateUtils';
// =================== CONSTANTS ===================
const COLLECTIONS = {
  CSM_VENDORS: 'csmVendors',
  CSM_FORMS: 'forms', // Using existing forms collection
  CSM_ASSESSMENTS: 'csmAssessments', 
  COMPANIES: 'companies',
  CSM_SUMMARIES: 'csmAssessmentSummaries'
} as const;

const CACHE_DURATIONS = {
  VENDORS: 5 * 60 * 1000,     // 5 minutes
  FORMS: 30 * 60 * 1000,      // 30 minutes (forms change rarely)
  ASSESSMENTS: 2 * 60 * 1000,  // 2 minutes
  SUMMARIES: 3 * 60 * 1000     // 3 minutes  
} as const;

const PAGINATION_SIZE = 50; // Default page size for performance

// =================== UTILITIES ===================
const convertToDate = (value: DateInput): Date => {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (value && typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }
  return new Date();
};

const normalizeVendorData = (data: Partial<CSMVendor>): CSMVendor => ({
  id: data.id,
  companyId: data.companyId || '',
  vdCode: data.vdCode || '',
  vdName: data.vdName || '',
  freqAss: data.freqAss || '365', // Default 1 year
  isActive: data.isActive !== false, // Default true
  category: data.category || '',
  workingArea: data.workingArea || [],
  createdAt: convertToDate(data.createdAt),
  updatedAt: convertToDate(data.updatedAt),
  createdBy: data.createdBy || '',
  lastUpdatedBy: data.lastUpdatedBy || data.createdBy || ''
});

// =================== ENHANCED VENDORS SERVICE ===================
export class EnhancedVendorsService {
  private static instance: EnhancedVendorsService;
  private vendorCache = new Map<string, CSMVendor>();
  private lastFetchTime = 0;
  
  static getInstance(): EnhancedVendorsService {
    if (!this.instance) {
      this.instance = new EnhancedVendorsService();
    }
    return this.instance;
  }

  /**
   * Get all vendors with smart caching
   */
  async getAll(): Promise<CSMVendor[]> {
    const cacheKey = 'csm-vendors-all';
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached && Date.now() - this.lastFetchTime < CACHE_DURATIONS.VENDORS) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_VENDORS),
          where('isActive', '==', true),
          orderBy('vdName')
        )
      );
      
      const vendors = querySnapshot.docs.map(doc => {
        const vendor = normalizeVendorData({ id: doc.id, ...doc.data() });
        this.vendorCache.set(vendor.vdCode, vendor);
        return vendor;
      });

      cacheService.set(cacheKey, vendors, CACHE_DURATIONS.VENDORS);
      this.lastFetchTime = Date.now();
      
      return vendors;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  }

  /**
   * Get vendors with pagination for better performance
   */
  async getPaginated(
    pageSize: number = PAGINATION_SIZE,
    lastDoc?: QueryDocumentSnapshot,
    filters?: {
      category?: string;
      search?: string;
    }
  ): Promise<{
    vendors: CSMVendor[];
    lastDoc: QueryDocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      let q = query(
        collection(db, COLLECTIONS.CSM_VENDORS),
        where('isActive', '==', true),
        orderBy('vdName'),
        limit(pageSize + 1) // Get one extra to check if there are more
      );

      // Add category filter
      if (filters?.category && filters.category !== 'all') {
        q = query(q, where('category', '==', filters.category));
      }

      // Add pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;
      
      // Remove the extra document if it exists
      const vendorDocs = hasMore ? docs.slice(0, pageSize) : docs;
      
      const vendors = vendorDocs.map(doc => 
        normalizeVendorData({ id: doc.id, ...doc.data() })
      );

      // Apply search filter client-side (for now)
      let filteredVendors = vendors;
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredVendors = vendors.filter(v => 
          v.vdName.toLowerCase().includes(searchTerm) ||
          v.vdCode.toLowerCase().includes(searchTerm)
        );
      }

      return {
        vendors: filteredVendors,
        lastDoc: hasMore ? vendorDocs[vendorDocs.length - 1] : null,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching paginated vendors:', error);
      throw error;
    }
  }

  /**
   * Get vendor by code with caching
   */
  async getByVdCode(vdCode: string): Promise<CSMVendor | null> {
    // Check instance cache first
    if (this.vendorCache.has(vdCode)) {
      return this.vendorCache.get(vdCode)!;
    }

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_VENDORS),
          where('vdCode', '==', vdCode),
          where('isActive', '==', true),
          limit(1)
        )
      );

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const vendor = normalizeVendorData({ id: doc.id, ...doc.data() });
      
      // Cache the result
      this.vendorCache.set(vdCode, vendor);
      
      return vendor;
    } catch (error) {
      console.error('Error fetching vendor by vdCode:', error);
      return null;
    }
  }

  /**
   * Get vendors needing assessment
   */
  async getVendorsNeedingAssessment(): Promise<CSMVendor[]> {
    const cacheKey = 'vendors-needing-assessment';
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const vendors = await this.getAll();
      const assessmentSummaries = await enhancedAssessmentSummariesService.getAll();
      
      const needingAssessment = vendors.filter(vendor => {
        const summary = assessmentSummaries.find(s => s.vdCode === vendor.vdCode);
        
        if (!summary) return true; // Never assessed
        
        const now = new Date();
        const lastAssessment = new Date(summary.lastAssessmentDate);
        const daysSince = Math.floor((now.getTime() - lastAssessment.getTime()) / (1000 * 60 * 60 * 24));
        const frequency = parseInt(vendor.freqAss) || 365;
        
        return daysSince >= frequency - 30; // Due within 30 days or overdue
      });

      cacheService.set(cacheKey, needingAssessment, 10 * 60 * 1000); // 10 minutes
      return needingAssessment;
    } catch (error) {
      console.error('Error getting vendors needing assessment:', error);
      return [];
    }
  }

  /**
   * Bulk update vendors
   */
  async bulkUpdate(updates: { id: string; data: Partial<CSMVendor> }[]): Promise<void> {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTIONS.CSM_VENDORS, id);
      batch.update(docRef, {
        ...data,
        updatedAt: new Date()
      });
    });
    
    await batch.commit();
    this.clearCache();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.vendorCache.clear();
    cacheService.delete('csm-vendors-all');
    cacheService.delete('vendors-needing-assessment');
    this.lastFetchTime = 0;
  }
}

// =================== ENHANCED FORMS SERVICE ===================
export class EnhancedFormsService {
  /**
   * Get CSM Checklist form specifically
   */
  async getCSMChecklist(): Promise<CSMFormDoc | null> {
    const cacheKey = 'csm-checklist-form';
    const cached = cacheService.get<CSMFormDoc>(cacheKey);
    
    if (cached) return cached;

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_FORMS),
          where('formCode', '==', 'CSMChecklist'),
          where('isActive', '==', true),
          limit(1)
        )
      );
      
      if (snapshot.empty) {
        console.warn('CSMChecklist form not found');
        return null;
      }
      
      const doc = snapshot.docs[0];
      const form: CSMFormDoc = {
        id: doc.id,
        ...doc.data()
      } as CSMFormDoc;
      
      cacheService.set(cacheKey, form, CACHE_DURATIONS.FORMS);
      return form;
    } catch (error) {
      console.error('Error fetching CSM form:', error);
      return null;
    }
  }

  /**
   * Get all CSM-related forms
   */
  async getCSMForms(): Promise<CSMFormDoc[]> {
    const cacheKey = 'csm-forms-all';
    const cached = cacheService.get<CSMFormDoc[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_FORMS),
          where('applicableTo', 'array-contains', 'csm'),
          where('isActive', '==', true),
          orderBy('formTitle')
        )
      );
      
      const forms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMFormDoc));
      
      cacheService.set(cacheKey, forms, CACHE_DURATIONS.FORMS);
      return forms;
    } catch (error) {
      console.error('Error fetching CSM forms:', error);
      return [];
    }
  }
}

// =================== ENHANCED ASSESSMENTS SERVICE ===================
export class EnhancedAssessmentsService {
    
  /**
   * Create new assessment
   */
  async create(assessmentData: Omit<CSMAssessment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.CSM_ASSESSMENTS), {
        ...assessmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Update assessment summary
      await this.updateAssessmentSummary(assessmentData.vdCode);
      
      // Clear relevant caches
      cacheService.delete(`csm-assessments-${assessmentData.vdCode}`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }
  }

  /**
   * Update existing assessment
   */
  async update(id: string, data: Partial<CSMAssessment>): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.CSM_ASSESSMENTS, id), {
        ...data,
        updatedAt: new Date()
      });
      
      // Update summary if assessment is finished
      if (data.isFinish && data.vdCode) {
        await this.updateAssessmentSummary(data.vdCode);
      }
      
      // Clear cache
      if (data.vdCode) {
        cacheService.delete(`csm-assessments-${data.vdCode}`);
      }
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  }

  /**
   * Get assessments by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessment[]> {
    const cacheKey = `csm-assessments-${vdCode}`;
    const cached = cacheService.get<CSMAssessment[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('vdCode', '==', vdCode),
          orderBy('createdAt', 'desc')
        )
      );
      
      const assessments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertToDate(doc.data().createdAt),
        updatedAt: convertToDate(doc.data().updatedAt),
        finishedAt: doc.data().finishedAt ? convertToDate(doc.data().finishedAt) : undefined
      } as CSMAssessment));
      
      cacheService.set(cacheKey, assessments, CACHE_DURATIONS.ASSESSMENTS);
      return assessments;
    } catch (error) {
      console.error('Error fetching assessments:', error);
      return [];
    }
  }

    async getAllCurrent(): Promise<CSMAssessment[]> {
    const cacheKey = 'csm-current-assessments';
    const cached = cacheService.get<CSMAssessment[]>(cacheKey);
    
    if (cached) {
      console.log(`🔄 Loading ${cached.length} current assessments from cache`);
      return cached;
    }

    try {
      console.log('🔍 Fetching current assessments from Firestore...');
      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('isActive', '==', true),
          where('isFinish', '==', false),
          orderBy('updatedAt', 'desc')
        )
      );

      const assessments: CSMAssessment[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const rawData = { id: doc.id, ...doc.data() };
        const normalizedAssessment = normalizeAssessmentData(rawData);
        
        if (normalizedAssessment) {
          assessments.push(normalizedAssessment);
        }
      });

      console.log(`✅ Loaded ${assessments.length} current assessments from Firestore`);      
      cacheService.set(cacheKey, assessments, CACHE_DURATIONS.ASSESSMENTS);
      return assessments;

    } catch (error) {
      console.error('❌ Error fetching current assessments:', error);
      return [];
    }
  }


  /**
   * Update assessment and create summary if completed
   */
  async updateWithSummary(id: string, data: Partial<CSMAssessment>): Promise<CSMAssessment> {
    try {
      const docRef = doc(db, COLLECTIONS.CSM_ASSESSMENTS, id);
      const updateData = {
        ...data,
        updatedAt: new Date(),
        lastModified: new Date()
      };
      
      await updateDoc(docRef, updateData);
      
      // If assessment is completed, create/update summary
      if (data.isFinish && data.vdCode) {
        await this.createOrUpdateSummary(data as CSMAssessment);
      }
      
      // Clear relevant caches
      cacheService.delete(`csm-assessment-${id}`);
      cacheService.delete(`csm-assessments-vdcode-${data.vdCode}`);
      cacheService.delete('csm-current-assessments');
      cacheService.delete('csm-assessment-summaries-all');
      
      // Get updated assessment
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        return { id: updatedDoc.id, ...updatedDoc.data() } as CSMAssessment;
      }
      
      throw new Error('Failed to get updated assessment');
      
    } catch (error) {
      console.error('Error updating assessment with summary:', error);
      throw error;
    }
  }

  /**
   * Create or update assessment summary
   */
  async createOrUpdateSummary(assessment: CSMAssessment): Promise<void> {
    if (!assessment.vdCode) return;
    
    try {
      console.log('📊 Creating/updating summary for', assessment.vdCode);
      
      // Calculate summary data
      const totalQuestions = assessment.answers.length;
      const completedQuestions = assessment.answers.filter(a => a.isFinish).length;
      
      // Calculate scores
      let totalScore = 0;
      let maxScore = 0;
      
      assessment.answers.forEach(answer => {
        if (answer.score && answer.score !== 'n/a') {
          const score = parseInt(answer.score) || 0;
          const fScore = parseInt(answer.tScore || '0') || parseInt(answer.score || '0') || 0;

          totalScore += score;
          maxScore += fScore;
        }
      });
      
      const avgScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      
      // Determine risk level
      let riskLevel: 'Low' | 'Medium' | 'High' = 'High';
      if (avgScore >= 80) riskLevel = 'Low';
      else if (avgScore >= 60) riskLevel = 'Medium';
      
      const summaryData: Omit<CSMAssessmentSummary, 'id'> = {
        vdCode: assessment.vdCode,
        lastAssessmentId: assessment.id || '',
        lastAssessmentDate: new Date(),
        totalScore,
        maxScore,
        avgScore,
        completedQuestions,
        totalQuestions,
        riskLevel,
        updatedAt: new Date()
      };
      
      // Check if summary exists
      const existingSummary = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_SUMMARIES),
          where('vdCode', '==', assessment.vdCode),
          limit(1)
        )
      );
      
      if (!existingSummary.empty) {
        // Update existing summary
        const summaryDoc = existingSummary.docs[0];
        await updateDoc(summaryDoc.ref, summaryData);
        console.log('✅ Updated assessment summary for', assessment.vdCode);
      } else {
        // Create new summary
        await addDoc(collection(db, COLLECTIONS.CSM_SUMMARIES), summaryData);
        console.log('✅ Created new assessment summary for', assessment.vdCode);
      }
      
      // Clear summary cache
      cacheService.delete('csm-assessment-summaries-all');
      
    } catch (error) {
      console.error('Error creating/updating summary:', error);
    }
  }

  /**
   * Update assessment summary after assessment completion
   */
  private async updateAssessmentSummary(vdCode: string): Promise<void> {
    try {
      const assessments = await this.getByVdCode(vdCode);
      const completedAssessments = assessments.filter(a => a.isFinish);
      
      if (completedAssessments.length === 0) return;
      
      const latest = completedAssessments[0];
      const totalScore = parseFloat(latest.totalScore || '0');
      const maxScore = parseFloat(latest.maxScore || '100');
      const avgScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      
      // Determine risk level
      let riskLevel: 'Low' | 'Moderate' | 'High' = 'High';
      if (avgScore >= 80) riskLevel = 'Low';
      else if (avgScore >= 60) riskLevel = 'Moderate';
      
      const summary: Omit<CSMAssessmentSummary, 'id'> = {
        vdCode,
        lastAssessmentId: latest.id || '',
        // ✅ Fixed: Cast latest.createdAt to proper type
        lastAssessmentDate: convertToDate(latest.createdAt as DateInput),
        totalScore,
        maxScore,
        avgScore,
        completedQuestions: latest.answers?.filter(a => a.score && a.score !== '').length || 0,
        totalQuestions: latest.answers?.length || 0,
        riskLevel,
        updatedAt: new Date()
      };
      
      // Update or create summary
      const summarySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_SUMMARIES),
          where('vdCode', '==', vdCode),
          limit(1)
        )
      );
      
      if (summarySnapshot.empty) {
        await addDoc(collection(db, COLLECTIONS.CSM_SUMMARIES), summary);
      } else {
        const summaryDoc = summarySnapshot.docs[0];
        await updateDoc(doc(db, COLLECTIONS.CSM_SUMMARIES, summaryDoc.id), summary);
      }
      
      // Clear summary cache
      cacheService.delete('csm-assessment-summaries-all');
    } catch (error) {
      console.error('Error updating assessment summary:', error);
    }
  }
}


// Normalize assessment data function
const normalizeAssessmentData = (data: Partial<CSMAssessment> = {}): CSMAssessment | null => {
 if (!data || !data.vdCode) {
    return null;
  }

  try {
    return {
      id: data.id,
      companyId: data.companyId || '',
      vdCode: data.vdCode,
      vdName: data.vdName || '',
      docReference: data.docReference || data.vdCode,
      formCode: data.formCode || 'CSMChecklist',
      formVersion: data.formVersion || '1.0',
      answers: Array.isArray(data.answers) ? data.answers : [],
      auditor: data.auditor || { name: '', email: '' },
      auditee: data.auditee,
      assessor: data.assessor,
      vdCategory: data.vdCategory,
      vdRefDoc: data.vdRefDoc,
      vdWorkingArea: data.vdWorkingArea,
      riskLevel: data.riskLevel,
      totalScore: data.totalScore,
      maxScore: data.maxScore,
      avgScore: data.avgScore,
      finalScore: data.finalScore,
      status: data.status,
      progress: data.progress,
      lastModified: data.lastModified ? convertToDate(data.lastModified) : new Date(),
      submittedAt: data.submittedAt ? convertToDate(data.submittedAt) : undefined,
      isActive: data.isActive !== false,
      isFinish: data.isFinish || false,
      finishedAt: data.finishedAt ? convertToDate(data.finishedAt) : undefined,
      isApproved: data.isApproved || false,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt ? convertToDate(data.approvedAt) : undefined,
      createdAt: data.createdAt ? convertToDate(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? convertToDate(data.updatedAt) : new Date()
    };
  } catch (error) {
    console.error('Error normalizing assessment data:', error);
    return null;
  }
};

// =================== ENHANCED ASSESSMENT SUMMARIES SERVICE ===================
export class EnhancedAssessmentSummariesService {
  /**
   * Get all assessment summaries
   */
  async getAll(): Promise<CSMAssessmentSummary[]> {
    const cacheKey = 'csm-assessment-summaries-all';
    const cached = cacheService.get<CSMAssessmentSummary[]>(cacheKey);
    
    if (cached) return cached;

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_SUMMARIES),
          orderBy('updatedAt', 'desc')
        )
      );
      
      const summaries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastAssessmentDate: convertToDate(doc.data().lastAssessmentDate),
        updatedAt: convertToDate(doc.data().updatedAt)
      } as CSMAssessmentSummary));
      
      cacheService.set(cacheKey, summaries, CACHE_DURATIONS.SUMMARIES);
      return summaries;
    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
      return [];
    }
  }

  /**
   * Get summary by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessmentSummary | null> {
    const summaries = await this.getAll();
    return summaries.find(s => s.vdCode === vdCode) || null;
  }
}

// =================== COMPANIES SERVICE ===================
export class EnhancedCompaniesService {
  async getByVdCode(companyId: string): Promise<Company | null> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.COMPANIES),
          where('companyId', '==', companyId),
          limit(1)
        )
      );
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Company;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  }
}

// =================== SERVICE INSTANCES ===================
export const enhancedVendorsService = EnhancedVendorsService.getInstance();
export const enhancedFormsService = new EnhancedFormsService();
export const enhancedAssessmentsService = new EnhancedAssessmentsService();
export const enhancedAssessmentSummariesService = new EnhancedAssessmentSummariesService();
export const enhancedCompaniesService = new EnhancedCompaniesService();

// =================== UNIFIED SERVICE ===================
export const enhancedCSMService = {
  vendors: enhancedVendorsService,
  forms: enhancedFormsService,
  assessments: enhancedAssessmentsService,
  assessmentSummaries: enhancedAssessmentSummariesService,
  companies: enhancedCompaniesService
};

export default enhancedCSMService;