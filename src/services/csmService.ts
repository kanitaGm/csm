// 📁 src/services/csmService.ts - Strict TypeScript with Real Data Only
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc,  
  query, where, orderBy, limit,  Timestamp,    
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { 
  CSMFormDoc, CSMAssessmentDoc, CSMAssessmentSummary, 
  CSMVendor, CSMAssessmentAnswer
} from '../types';
import { cacheService } from './cacheService';

// =================== CONSTANTS ===================
const COLLECTIONS = {
  CSM_VENDORS: 'csmVendors',
  CSM_FORMS: 'csmForms', 
  CSM_ASSESSMENTS: 'csmAssessments',
  COMPANIES: 'companies'
} as const;

const CACHE_DURATIONS = {
  VENDORS: 30, // 30 minutes
  FORMS: 60,   // 1 hour
  ASSESSMENTS: 15 // 15 minutes
} as const;

// =================== TYPE GUARDS ===================
const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const isValidArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value);
};

const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

const isTimestamp = (value: unknown): value is Timestamp => {
  return value !== null && 
         typeof value === 'object' && 
         'seconds' in (value as object) && 
         'nanoseconds' in (value as object);
};

// =================== DATA VALIDATION ===================
const normalizeVendorData = (docData: unknown): CSMVendor | null => {
  if (!docData || typeof docData !== 'object') {
    console.error('Invalid vendor document data:', docData);
    return null;
  }

  const data = docData as Record<string, unknown>;
  
  // Required fields validation
  if (!isValidString(data.vdCode) || !isValidString(data.vdName) || !isValidString(data.companyId)) {
    console.error('Missing required vendor fields:', data);
    return null;
  }

  // Normalize working area
  let workingArea: string[] = [];
  if (isValidArray<string>(data.workingArea)) {
    workingArea = data.workingArea.filter(isValidString);
  } else if (isValidString(data.workingArea)) {
    workingArea = [data.workingArea];
  }

  // Normalize dates
  let createdAt: Date = new Date();
  let updatedAt: Date = new Date();

  if (isTimestamp(data.createdAt)) {
    createdAt = data.createdAt.toDate();
  } else if (isValidDate(data.createdAt)) {
    createdAt = data.createdAt;
  } else if (isValidString(data.createdAt)) {
    createdAt = new Date(data.createdAt);
  }

  if (isTimestamp(data.updatedAt)) {
    updatedAt = data.updatedAt.toDate();
  } else if (isValidDate(data.updatedAt)) {
    updatedAt = data.updatedAt;
  } else if (isValidString(data.updatedAt)) {
    updatedAt = new Date(data.updatedAt);
  }

  return {
    id: isValidString(data.id) ? data.id : undefined,
    companyId: data.companyId,
    vdCode: data.vdCode,
    vdName: data.vdName,
    freqAss: isValidString(data.freqAss) ? data.freqAss : '1year',
    isActive: data.isActive === true,
    category: isValidString(data.category) ? data.category : '1',
    workingArea,
    createdAt,
    updatedAt
  };
};

const normalizeAssessmentSummary = (docData: unknown): CSMAssessmentSummary | null => {
  if (!docData || typeof docData !== 'object') {
    return null;
  }

  const data = docData as Record<string, unknown>;

  if (!isValidString(data.vdCode) || !isValidString(data.vdName)) {
    return null;
  }

  let lastAssessmentDate = new Date();
  if (isTimestamp(data.lastAssessmentDate)) {
    lastAssessmentDate = data.lastAssessmentDate.toDate();
  } else if (isValidDate(data.lastAssessmentDate)) {
    lastAssessmentDate = data.lastAssessmentDate;
  }

  let updatedAt = new Date();
  if (isTimestamp(data.updatedAt)) {
    updatedAt = data.updatedAt.toDate();
  } else if (isValidDate(data.updatedAt)) {
    updatedAt = data.updatedAt;
  }

  const riskLevel = data.riskLevel as 'Low' | 'Moderate' | 'High' | '';
  if (!['Low', 'Moderate', 'High', ''].includes(riskLevel)) {
    console.warn('Invalid risk level:', riskLevel);
  }

  return {
    vdCode: data.vdCode,
    vdName: data.vdName,
    lastAssessmentId: isValidString(data.lastAssessmentId) ? data.lastAssessmentId : '',
    lastAssessmentDate,
    totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
    avgScore: typeof data.avgScore === 'number' ? data.avgScore : 0,
    riskLevel: ['Low', 'Moderate', 'High', ''].includes(riskLevel) ? riskLevel : '',
    summaryByCategory: typeof data.summaryByCategory === 'object' ? 
      data.summaryByCategory as Record<string, unknown> : {},
    updatedAt
  };
};

// =================== VENDORS SERVICE ===================
export const vendorsService = {
  /**
   * Get all active CSM vendors from Firestore
   */
  async getAll(): Promise<CSMVendor[]> {
    const cacheKey = 'csm-vendors-all';
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached) {
      console.log(`🔄 Loading ${cached.length} vendors from cache`);
      return cached;
    }

    try {
      console.log('🔍 Fetching vendors from Firestore...');
      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_VENDORS),
          where('isActive', '==', true),
          orderBy('vdName', 'asc')
        )
      );

      const vendors: CSMVendor[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const rawData = { id: doc.id, ...doc.data() };
        const normalizedVendor = normalizeVendorData(rawData);
        
        if (normalizedVendor) {
          vendors.push(normalizedVendor);
        } else {
          console.warn('Skipped invalid vendor document:', doc.id);
        }
      });

      console.log(`✅ Loaded ${vendors.length} vendors from Firestore`);
      
      if (vendors.length > 0) {
        cacheService.set(cacheKey, vendors, CACHE_DURATIONS.VENDORS);
      }
      
      return vendors;

    } catch (error) {
      console.error('❌ Error fetching vendors from Firestore:', error);
      throw new Error('Failed to fetch vendors from database');
    }
  },

  /**
   * Search vendors by term
   */
  async search(searchTerm: string): Promise<CSMVendor[]> {
    if (!isValidString(searchTerm)) {
      return this.getAll();
    }

    try {
      const vendors = await this.getAll();
      const term = searchTerm.toLowerCase().trim();
      
      return vendors.filter(vendor => 
        vendor.vdName.toLowerCase().includes(term) ||
        vendor.vdCode.toLowerCase().includes(term) ||
        vendor.category.toLowerCase().includes(term) ||
        (vendor.workingArea && vendor.workingArea.some(area => 
          area.toLowerCase().includes(term)
        ))
      );
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw error;
    }
  },

  /**
   * Get vendor by ID
   */
  async getById(vendorId: string): Promise<CSMVendor | null> {
    if (!isValidString(vendorId)) {
      throw new Error('Invalid vendor ID');
    }

    const cacheKey = `csm-vendor-${vendorId}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.CSM_VENDORS, vendorId));
      
      if (!docSnap.exists()) {
        return null;
      }

      const rawData = { id: docSnap.id, ...docSnap.data() };
      const vendor = normalizeVendorData(rawData);
      
      if (vendor) {
        cacheService.set(cacheKey, vendor, CACHE_DURATIONS.VENDORS);
        return vendor;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching vendor by ID:', error);
      throw error;
    }
  },

  /**
   * Get vendor by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMVendor | null> {
    if (!isValidString(vdCode)) {
      throw new Error('Invalid vendor code');
    }

    const cacheKey = `csm-vendor-vdcode-${vdCode}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_VENDORS),
          where('vdCode', '==', vdCode),
          where('isActive', '==', true),
          limit(1)
        )
      );
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const rawData = { id: doc.id, ...doc.data() };
      const vendor = normalizeVendorData(rawData);
      
      if (vendor) {
        cacheService.set(cacheKey, vendor, CACHE_DURATIONS.VENDORS);
        return vendor;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching vendor by vdCode:', error);
      throw error;
    }
  },

  /**
   * Get vendors by company ID
   */
  async getByCompanyId(companyId: string): Promise<CSMVendor[]> {
    if (!isValidString(companyId)) {
      throw new Error('Invalid company ID');
    }

    const cacheKey = `csm-vendors-company-${companyId}`;
    const cached = cacheService.get<CSMVendor[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_VENDORS),
          where('companyId', '==', companyId),
          where('isActive', '==', true),
          orderBy('vdName', 'asc')
        )
      );
      
      const vendors: CSMVendor[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const rawData = { id: doc.id, ...doc.data() };
        const vendor = normalizeVendorData(rawData);
        
        if (vendor) {
          vendors.push(vendor);
        }
      });

      cacheService.set(cacheKey, vendors, CACHE_DURATIONS.VENDORS);
      return vendors;
      
    } catch (error) {
      console.error('Error fetching vendors by companyId:', error);
      throw error;
    }
  },

  /**
   * Create new vendor
   */
  async create(vendorData: Omit<CSMVendor, 'id'>): Promise<string> {
    // Validate required fields
    if (!isValidString(vendorData.vdCode) || 
        !isValidString(vendorData.vdName) || 
        !isValidString(vendorData.companyId)) {
      throw new Error('Missing required vendor fields');
    }

    // Check if vdCode already exists
    const existing = await this.getByVdCode(vendorData.vdCode);
    if (existing) {
      throw new Error(`Vendor with code ${vendorData.vdCode} already exists`);
    }

    try {
      const cleanedData = {
        companyId: vendorData.companyId,
        vdCode: vendorData.vdCode,
        vdName: vendorData.vdName,
        freqAss: vendorData.freqAss || '1year',
        isActive: true,
        category: vendorData.category || '1',
        workingArea: isValidArray<string>(vendorData.workingArea) ? vendorData.workingArea : [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.CSM_VENDORS), cleanedData);
      
      // Clear related caches
      this.clearCache();
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  },

  /**
   * Update vendor
   */
  async update(vendorId: string, vendorData: Partial<CSMVendor>): Promise<void> {
    if (!isValidString(vendorId)) {
      throw new Error('Invalid vendor ID');
    }

    try {
      const updateData: Record<string, unknown> = {
        ...vendorData,
        updatedAt: Timestamp.now()
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await updateDoc(doc(db, COLLECTIONS.CSM_VENDORS, vendorId), updateData);

      // Clear related caches
      this.clearCache();
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  },

  /**
   * Soft delete vendor
   */
  async delete(vendorId: string): Promise<void> {
    if (!isValidString(vendorId)) {
      throw new Error('Invalid vendor ID');
    }

    try {
      await updateDoc(doc(db, COLLECTIONS.CSM_VENDORS, vendorId), {
        isActive: false,
        updatedAt: Timestamp.now()
      });

      // Clear related caches
      this.clearCache();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  },

  /**
   * Clear vendor caches
   */
  clearCache(): void {
    cacheService.clear();
  }
};

// =================== ASSESSMENT SUMMARIES SERVICE ===================
export const assessmentSummariesService = {
  /**
   * Get all assessment summaries from Firestore
   */
  async getAll(): Promise<CSMAssessmentSummary[]> {
    const cacheKey = 'csm-assessment-summaries-all';
    const cached = cacheService.get<CSMAssessmentSummary[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'csmAssessmentSummaries'),
          orderBy('updatedAt', 'desc')
        )
      );

      const summaries: CSMAssessmentSummary[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const rawData = doc.data();
        const summary = normalizeAssessmentSummary(rawData);
        
        if (summary) {
          summaries.push(summary);
        }
      });

      cacheService.set(cacheKey, summaries, CACHE_DURATIONS.ASSESSMENTS);
      return summaries;
      
    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
      return []; // Return empty array instead of throwing
    }
  },

  /**
   * Get assessment summary by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessmentSummary | null> {
    if (!isValidString(vdCode)) {
      return null;
    }

    try {
      const summaries = await this.getAll();
      return summaries.find(s => s.vdCode === vdCode) || null;
    } catch (error) {
      console.error('Error fetching assessment summary:', error);
      return null;
    }
  }
};

// =================== FORMS SERVICE ===================
export const formsService = {
  /**
   * Get all CSM forms from Firestore
   */
  async getAll(): Promise<CSMFormDoc[]> {
    const cacheKey = 'csm-forms-all';
    const cached = cacheService.get<CSMFormDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_FORMS),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc')
        )
      );
      
      const forms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMFormDoc));

      cacheService.set(cacheKey, forms, CACHE_DURATIONS.FORMS);
      return forms;
      
    } catch (error) {
      console.error('Error fetching forms:', error);
      throw error;
    }
  },

  /**
   * Get form by code
   */
  async getByFormCode(formCode: string): Promise<CSMFormDoc | null> {
    if (!isValidString(formCode)) {
      return null;
    }

    try {
      const forms = await this.getAll();
      return forms.find(form => form.formCode === formCode) || null;
    } catch (error) {
      console.error('Error fetching form by code:', error);
      return null;
    }
  }
};

// =================== ASSESSMENTS SERVICE ===================
export const assessmentsService = {
  /**
   * Get all assessments from Firestore
   */
  async getAll(): Promise<CSMAssessmentDoc[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          orderBy('createdAt', 'desc')
        )
      );
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMAssessmentDoc));
      
    } catch (error) {
      console.error('Error fetching assessments:', error);
      return [];
    }
  },

  /**
   * Get assessment by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessmentDoc[]> {
    if (!isValidString(vdCode)) {
      return [];
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('vdCode', '==', vdCode),
          orderBy('createdAt', 'desc')
        )
      );
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMAssessmentDoc));
      
    } catch (error) {
      console.error('Error fetching assessments by vdCode:', error);
      return [];
    }
  }
};

// =================== UTILITY FUNCTIONS ===================
export const calculateAssessmentScore = (answers: CSMAssessmentAnswer[]): {
  totalScore: number;
  maxScore: number;
  avgScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
} => {
  const validAnswers = answers.filter(answer => 
    answer.score && answer.score !== 'n/a' && !isNaN(Number(answer.score))
  );

  if (validAnswers.length === 0) {
    return {
      totalScore: 0,
      maxScore: 0,
      avgScore: 0,
      riskLevel: 'High'
    };
  }

  const totalScore = validAnswers.reduce((sum, answer) => {
    const score = Number(answer.score) || 0;
    const weight = Number(answer.tScore) || 5;
    return sum + (score * weight);
  }, 0);

  const maxScore = validAnswers.reduce((sum, answer) => {
    const weight = Number(answer.tScore) || 5;
    return sum + (5 * weight);
  }, 0);

  const avgScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let riskLevel: 'Low' | 'Moderate' | 'High';
  if (avgScore >= 80) {
    riskLevel = 'Low';
  } else if (avgScore >= 60) {
    riskLevel = 'Moderate';
  } else {
    riskLevel = 'High';
  }

  return {
    totalScore: Math.round(totalScore),
    maxScore: Math.round(maxScore),
    avgScore,
    riskLevel
  };
};

// =================== EXPORT DEFAULT SERVICE ===================
const csmService = {
  vendors: vendorsService,
  assessmentSummaries: assessmentSummariesService,
  forms: formsService,
  assessments: assessmentsService,
  utils: {
    calculateAssessmentScore
  }
};

export default csmService;
//export { vendorsService, assessmentSummariesService, formsService, assessmentsService };