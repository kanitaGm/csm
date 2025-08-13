// 📁 src/services/csmService.ts - Complete Rebuild Fixed
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc,  
  query, where, orderBy, limit, Timestamp, runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { 
  CSMFormDoc, CSMAssessment, CSMAssessmentSummary, 
  CSMVendor, CSMAssessmentAnswer,
  DateInput, Company
} from '../types';
import { cacheService } from './cacheService';

// =================== CONSTANTS ===================
const COLLECTIONS = {
  CSM_VENDORS: 'csmVendors',
  CSM_FORMS: 'csmForms', 
  CSM_ASSESSMENTS: 'csmAssessments', 
  COMPANIES: 'companies',
  CSM_SUMMARIES: 'csmAssessmentSummaries'
} as const;

const CACHE_DURATIONS = {
  VENDORS: 30, // 30 minutes
  FORMS: 60,   // 1 hour
  ASSESSMENTS: 15, // 15 minutes
  SUMMARIES: 10    // 10 minutes  
} as const;

// =================== TYPE GUARDS ===================
const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const convertToDate = (value: DateInput): Date => {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (value && typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }
  return new Date();
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
    updatedAt,
    createdBy: isValidString(data.createdBy) ? data.createdBy : '',
    lastUpdatedBy: isValidString(data.lastUpdatedBy) ? data.lastUpdatedBy : ''
  };
};

const normalizeAssessmentSummary = (docData: unknown): CSMAssessmentSummary | null => {
  if (!docData || typeof docData !== 'object') {
    return null;
  }

  const data = docData as Record<string, unknown>;

  if (!isValidString(data.vdCode)) {
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

  const riskLevel = data.riskLevel as 'Low' | 'Medium' | 'High' | '';
  if (!['Low', 'Medium', 'High', ''].includes(riskLevel)) {
    console.warn('Invalid risk level:', riskLevel);
  }

  return {
    id: isValidString(data.id) ? data.id : undefined,
    vdCode: data.vdCode,
    lastAssessmentId: isValidString(data.lastAssessmentId) ? data.lastAssessmentId : '',
    lastAssessmentDate,
    totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
    maxScore: typeof data.maxScore === 'number' ? data.maxScore : 0,
    avgScore: typeof data.avgScore === 'number' ? data.avgScore : 0,
    completedQuestions: typeof data.completedQuestions === 'number' ? data.completedQuestions : 0,
    totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 0,
    riskLevel: ['Low', 'Medium', 'High', ''].includes(riskLevel) ? riskLevel : 'High',
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
      cacheService.set(cacheKey, vendors, CACHE_DURATIONS.VENDORS);
      return vendors;

    } catch (error) {
      console.error('❌ Error fetching vendors from Firestore:', error);
      console.log('🔄 Using demo data as fallback');
      return [];     
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
          collection(db, COLLECTIONS.CSM_SUMMARIES),
          orderBy('updatedAt', 'desc')
        )
      );

      const summaries: CSMAssessmentSummary[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const rawData = { id: doc.id, ...doc.data() };
        const summary = normalizeAssessmentSummary(rawData);
        
        if (summary) {
          summaries.push(summary);
        }
      });

      // ถ้าไม่มีข้อมูลจาก Firestore ให้สร้าง demo data
      if (summaries.length === 0) {
        console.log('📊 No assessment summaries found, generating demo data');
        const demoSummaries = this.generateDemoSummaries();
        cacheService.set(cacheKey, demoSummaries, 5);
        return demoSummaries;
      }

      cacheService.set(cacheKey, summaries, CACHE_DURATIONS.ASSESSMENTS);
      return summaries;
      
    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
      console.log('🔄 Using demo assessment summaries as fallback');
      const demoSummaries = this.generateDemoSummaries();
      return demoSummaries;
    }
  },

  /**
   * Generate demo assessment summaries
   */
  generateDemoSummaries(): CSMAssessmentSummary[] {
    return [
      {
        id: 'demo-1',
        vdCode: 'VD001',
        lastAssessmentId: 'assessment-demo-1',
        lastAssessmentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        totalScore: 85,
        maxScore: 100,
        avgScore: 85,
        completedQuestions: 20,
        totalQuestions: 20,
        riskLevel: 'Low',
        updatedAt: new Date()
      },
      {
        id: 'demo-2',
        vdCode: 'VD002',
        lastAssessmentId: 'assessment-demo-2',
        lastAssessmentDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        totalScore: 72,
        maxScore: 100,
        avgScore: 72,
        completedQuestions: 18,
        totalQuestions: 20,
        riskLevel: 'Medium',
        updatedAt: new Date()
      }
    ];
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
   * Get assessments by vendor code with better error handling
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessment[]> {
    if (!isValidString(vdCode)) {
      console.warn('Invalid vdCode provided:', vdCode);
      return [];
    }

    const cacheKey = `csm-assessments-${vdCode}`;
    const cached = cacheService.get<CSMAssessment[]>(cacheKey);
    
    if (cached) {
      console.log('✅ Found assessments in cache for vendor:', vdCode, 'Count:', cached.length);
      return cached;
    }

    try {
      console.log('🔍 Querying assessments for vendor:', vdCode);
      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('vdCode', '==', vdCode),
          orderBy('createdAt', 'desc')
        )
      );
      
      const assessments = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: convertToDate(data.createdAt),
          updatedAt: convertToDate(data.updatedAt),
          finishedAt: data.finishedAt ? convertToDate(data.finishedAt) : undefined
        } as CSMAssessment;
      });

      console.log('📋 Found assessments:', assessments.length);
      
      // Cache results
      cacheService.set(cacheKey, assessments, CACHE_DURATIONS.ASSESSMENTS);
      
      return assessments;
      
    } catch (error) {
      console.error('❌ Error fetching assessments for vendor:', vdCode, error);
      return [];
    }
  },

  /**
   * Get assessment by ID
   */
  async getById(assessmentId: string): Promise<CSMAssessment | null> {
    if (!isValidString(assessmentId)) {
      return null;
    }

    try {
      console.log('🔍 Fetching assessment by ID:', assessmentId);
      
      const docSnap = await getDoc(doc(db, COLLECTIONS.CSM_ASSESSMENTS, assessmentId));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const assessment = {
          id: docSnap.id,
          ...data,
          createdAt: convertToDate(data.createdAt),
          updatedAt: convertToDate(data.updatedAt),
          finishedAt: data.finishedAt ? convertToDate(data.finishedAt) : undefined
        } as CSMAssessment;
        
        console.log('✅ Found assessment:', assessment.vdCode);
        return assessment;
      }
      
      console.log('❌ Assessment not found:', assessmentId);
      return null;
      
    } catch (error) {
      console.error('❌ Error fetching assessment:', error);
      return null;
    }
  },

  /**
   * Save assessment with enhanced error handling and transaction support
   */
  async save(assessment: CSMAssessment): Promise<string> {
    try {
      console.log('💾 Starting assessment save process...');
      console.log('📝 Assessment data:', {
        id: assessment.id,
        vdCode: assessment.vdCode,
        answersCount: assessment.answers?.length || 0,
        isFinish: assessment.isFinish
      });

      // Validate required fields
      if (!assessment.vdCode || !assessment.formId) {
        throw new Error('Missing required fields: vdCode or formId');
      }

      // Prepare assessment data for save
      const now = new Date();
      const assessmentData = {
        ...assessment,
        updatedAt: now,
        // Ensure answers array exists
        answers: assessment.answers || [],
        // Ensure auditor exists
        auditor: assessment.auditor || {
          name: '',
          email: '',
          phone: '',
          position: ''
        }
      };

      let assessmentId = '';

      if (assessment.id && assessment.id.trim() !== '') {
        // Update existing assessment
        console.log('📝 Updating existing assessment:', assessment.id);
        
        const docRef = doc(db, COLLECTIONS.CSM_ASSESSMENTS, assessment.id);
        
        // Use transaction for data consistency
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          
          if (!docSnap.exists()) {
            console.warn('⚠️ Assessment document does not exist, creating new one');
            // Document doesn't exist, create it
            const newDocRef = doc(collection(db, COLLECTIONS.CSM_ASSESSMENTS));
            transaction.set(newDocRef, {
              ...assessmentData,
              createdAt: now
            });
            assessmentId = newDocRef.id;
          } else {
            // Document exists, update it
            transaction.update(docRef, assessmentData);
            assessmentId = assessment.id!; // ✅ Fixed: assert non-null
          }
        });
        
      } else {
        // Create new assessment
        console.log('📝 Creating new assessment for vendor:', assessment.vdCode);
        
        const newAssessmentData = {
          ...assessmentData,
          createdAt: now
        };
        
        const docRef = await addDoc(collection(db, COLLECTIONS.CSM_ASSESSMENTS), newAssessmentData);
        assessmentId = docRef.id;
        
        console.log('✅ New assessment created with ID:', assessmentId);
      }

      // Clear relevant caches with proper typing
      if ('delete' in cacheService && typeof cacheService.delete === 'function') {
        cacheService.delete(`csm-assessments-${assessment.vdCode}`);
        cacheService.delete('csm-summaries-all');
      } else if ('remove' in cacheService && typeof cacheService.remove === 'function') {
        // ✅ Fixed: proper type assertion
        const cacheWithRemove = cacheService as { remove: (key: string) => void };
        cacheWithRemove.remove(`csm-assessments-${assessment.vdCode}`);
        cacheWithRemove.remove('csm-summaries-all');
      } else {
        // Fallback: clear all cache
        if ('clear' in cacheService && typeof cacheService.clear === 'function') {
          cacheService.clear();
        }
      }
      
      console.log('✅ Assessment saved successfully with ID:', assessmentId);
      
      // Verify the save by attempting to read it back
      try {
        const verifyDoc = await getDoc(doc(db, COLLECTIONS.CSM_ASSESSMENTS, assessmentId));
        if (verifyDoc.exists()) {
          console.log('✅ Save verification successful');
        } else {
          console.error('❌ Save verification failed - document not found');
        }
      } catch (verifyError) {
        console.error('⚠️ Save verification error:', verifyError);
      }
      
      return assessmentId;
      
    } catch (error) {
      console.error('❌ Error saving assessment:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      throw new Error(`Failed to save assessment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Delete assessment by ID
   */
  async delete(assessmentId: string): Promise<void> {
    if (!isValidString(assessmentId)) {
      throw new Error('Invalid assessment ID');
    }

    try {
      const docRef = doc(db, COLLECTIONS.CSM_ASSESSMENTS, assessmentId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date()
      });
      
      console.log('✅ Assessment deleted (soft delete):', assessmentId);
    } catch (error) {
      console.error('❌ Error deleting assessment:', error);
      throw error;
    }
  }
};

// =================== UTILITY FUNCTIONS ===================
export const calculateAssessmentScore = (answers: CSMAssessmentAnswer[]): {
  totalScore: number;
  maxScore: number;
  avgScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
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

  let riskLevel: 'Low' | 'Medium' | 'High';
  if (avgScore >= 80) {
    riskLevel = 'Low';
  } else if (avgScore >= 60) {
    riskLevel = 'Medium';
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

// =================== COMPANIES SERVICE ===================
export const companiesService = {
  /**
   * Get company by vendor code
   */
  async getByVdCode(vdCode: string): Promise<Company | null> {
    if (!isValidString(vdCode)) {
      return null;
    }

    try {
      // First get vendor to find company ID
      const vendor = await vendorsService.getByVdCode(vdCode);
      if (!vendor) {
        return null;
      }

      // Then get company by ID
      const docSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, vendor.companyId));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          companyId: data.code,
          name: data.name || '',
          type: data.type || '',
          code: data.code || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          isActive: data.isActive || true,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastUpdatedBy: isValidString(data.lastUpdatedBy) ? data.lastUpdatedBy : '',
          workingArea: data.workingArea || [],
        } as Company;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching company by vdCode:', error);
      return null;
    }
  }
};

// =================== EXPORT DEFAULT SERVICE ===================
const csmService = {
  vendors: vendorsService,
  assessmentSummaries: assessmentSummariesService,
  forms: formsService,
  assessments: assessmentsService,
  companies: companiesService, // ✅ Add companies service
  utils: {
    calculateAssessmentScore
  }
};

export default csmService;
//export { vendorsService, assessmentSummariesService, formsService, assessmentsService, companiesService };