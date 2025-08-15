// 📁 src/services/csmService.ts - Fixed version with fallback data
import { 
  collection, doc, getDocs, getDoc, query, where, orderBy, limit, Timestamp,deleteDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CSMFormDoc, CSMAssessment, CSMAssessmentSummary, 
  CSMVendor, CSMAssessmentAnswer,  Company} from '../types';
import { cacheService } from './cacheService';
import type { DateInput } from '../utils/dateUtils'; 
// =================== CONSTANTS ===================
const COLLECTIONS = {
  CSM_VENDORS: 'csmVendors',
  CSM_FORMS: 'forms', 
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

// =================== DEMO DATA FOR FALLBACK ===================
const DEMO_VENDORS: CSMVendor[] = [
  {
    id: 'demo-vendor-1',
    companyId: 'COM001',
    vdCode: 'VD001',
    vdName: 'บริษัท ทดสอบระบบ จำกัด',
    freqAss: '365',
    isActive: true,
    category: '1',
    workingArea: ['กรุงเทพ', 'ปริมณฑล'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    createdBy: 'system',
    lastUpdatedBy: 'system'
  },
  {
    id: 'demo-vendor-2',
    companyId: 'COM002',
    vdCode: 'VD002',
    vdName: 'ห้างหุ้นส่วน ตัวอย่างข้อมูล',
    freqAss: '180',
    isActive: true,
    category: '2',
    workingArea: ['ภาคกลาง'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    createdBy: 'system',
    lastUpdatedBy: 'system'
  },
  {
    id: 'demo-vendor-3',
    companyId: 'COM003',
    vdCode: 'VD003',
    vdName: 'บริษัท รักษาความปลอดภัย จำกัด',
    freqAss: '365',
    isActive: true,
    category: 'security',
    workingArea: ['ทั่วประเทศ'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
    createdBy: 'system',
    lastUpdatedBy: 'system'
  }
];

const DEMO_COMPANIES: Company[] = [
  {
    id: 'demo-company-1',
    companyId: 'COM001',
    name: 'บริษัท ทดสอบระบบ จำกัด',
    type: 'main',
    contactPerson: 'นาย ทดสอบ ระบบ',
    email: 'test@company.com',
    phone: '02-123-4567',
    address: '123 ถนนทดสอบ กรุงเทพ 10100',
    isActive: true,
    workingArea: ['กรุงเทพ', 'ปริมณฑล'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: 'demo-company-2',
    companyId: 'COM002',
    name: 'ห้างหุ้นส่วน ตัวอย่างข้อมูล',
    type: 'sub',
    contactPerson: 'นาง ตัวอย่าง ข้อมูล',
    email: 'sample@company.com',
    phone: '02-765-4321',
    address: '456 ถนนตัวอย่าง กรุงเทพ 10200',
    isActive: true,
    workingArea: ['ภาคกลาง'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: 'demo-company-3',
    companyId: 'COM003',
    name: 'บริษัท รักษาความปลอดภัย จำกัด',
    type: 'security',
    contactPerson: 'นาย รักษา ความปลอดภัย',
    email: 'security@company.com',
    phone: '02-555-0000',
    address: '789 ถนนรักษาความปลอดภัย กรุงเทพ 10300',
    isActive: true,
    workingArea: ['ทั่วประเทศ'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
  }
];

const DEMO_SUMMARIES: CSMAssessmentSummary[] = [
  {
    id: 'demo-summary-1',
    vdCode: 'VD001',
    lastAssessmentId: 'demo-assessment-1',
    lastAssessmentDate: new Date('2024-03-01'),
    totalScore: 85,
    maxScore: 100,
    avgScore: 85,
    completedQuestions: 20,
    totalQuestions: 20,
    riskLevel: 'Low',
    updatedAt: new Date()
  },
  {
    id: 'demo-summary-2',
    vdCode: 'VD002',
    lastAssessmentId: 'demo-assessment-2',
    lastAssessmentDate: new Date('2024-02-15'),
    totalScore: 65,
    maxScore: 100,
    avgScore: 65,
    completedQuestions: 18,
    totalQuestions: 20,
    riskLevel: 'Moderate',
    updatedAt: new Date()
  }
];

// =================== TYPE GUARDS ===================
const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const convertToDate = (value: DateInput | (object & Record<"seconds", unknown>)): Date => {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') return new Date(value);
  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return new Date();
};

// =================== DATA VALIDATION ===================
const normalizeVendorData = (docData: unknown): CSMVendor | null => {
  if (!docData || typeof docData !== 'object') {
    console.error('Invalid vendor document data:', docData);
    return null;
  }

  const data = docData as Record<string, unknown>;
  
  // Required fields validation
  if (!isValidString(data.vdCode) || !isValidString(data.vdName)) {
    console.warn('Missing required vendor fields:', data);
    return null;
  }

  return {
    id: isValidString(data.id) ? data.id : undefined,
    companyId: isValidString(data.companyId) ? data.companyId : '',
    vdCode: data.vdCode as string,
    vdName: data.vdName as string,
    freqAss: isValidString(data.freqAss) ? data.freqAss : '365',
    isActive: data.isActive !== false,
    category: isValidString(data.category) ? data.category : '',
    workingArea: Array.isArray(data.workingArea) ? data.workingArea : [],
    createdAt: (data.createdAt && typeof data.createdAt === 'string' || data.createdAt instanceof Date || data.createdAt instanceof Timestamp || (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt))
      ? convertToDate(data.createdAt)
      : new Date(),
    updatedAt: (data.updatedAt && typeof data.updatedAt === 'string' || data.updatedAt instanceof Date || data.updatedAt instanceof Timestamp || (data.updatedAt && typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt))
      ? convertToDate(data.updatedAt)
      : new Date(),
    createdBy: isValidString(data.createdBy) ? data.createdBy : '',
    lastUpdatedBy: isValidString(data.lastUpdatedBy)
      ? data.lastUpdatedBy
      : (isValidString(data.createdBy) ? data.createdBy : '')
  };
};

const normalizeAssessmentSummary = (data: unknown): CSMAssessmentSummary | null => {
  if (!data || typeof data !== 'object' || !('vdCode' in data) || !isValidString((data as { vdCode: unknown }).vdCode)) {
    return null;
  }

  const d = data as Record<string, unknown>;
  const lastAssessmentDate = d.lastAssessmentDate ? convertToDate(d.lastAssessmentDate as DateInput) : new Date();
  const updatedAt = d.updatedAt ? convertToDate(d.updatedAt as DateInput) : new Date();

  const riskLevel = d.riskLevel as string;
  if (!['Low', 'Moderate', 'High', ''].includes(riskLevel)) {
    console.warn('Invalid risk level:', riskLevel);
  }

  return {
    id: isValidString(d.id) ? d.id as string : undefined,
    vdCode: d.vdCode as string,
    lastAssessmentId: isValidString(d.lastAssessmentId) ? d.lastAssessmentId as string : '',
    lastAssessmentDate,
    totalScore: typeof d.totalScore === 'number' ? d.totalScore as number : 0,
    maxScore: typeof d.maxScore === 'number' ? d.maxScore as number : 0,
    avgScore: typeof d.avgScore === 'number' ? d.avgScore as number : 0,
    completedQuestions: typeof d.completedQuestions === 'number' ? d.completedQuestions as number : 0,
    totalQuestions: typeof d.totalQuestions === 'number' ? d.totalQuestions as number : 0,
    riskLevel: ['Low', 'Moderate', 'High', ''].includes(riskLevel) ? riskLevel as 'Low' | 'Moderate' | 'High' : 'High',
    updatedAt
  };
};

// =================== VENDORS SERVICE ===================
export const vendorsService = {
  /**
   * Get all active CSM vendors from Firestore with fallback
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

      if (vendors.length > 0) {
        console.log(`✅ Loaded ${vendors.length} vendors from Firestore`);      
        cacheService.set(cacheKey, vendors, CACHE_DURATIONS.VENDORS);
        return vendors;
      } else {
        console.log('⚠️ No vendors found in Firestore, using demo data');
        cacheService.set(cacheKey, DEMO_VENDORS, 5); // Cache for 5 minutes
        return DEMO_VENDORS;
      }

    } catch (error) {
      console.error('❌ Error fetching vendors from Firestore:', error);
      console.log('🔄 Using demo data as fallback');
      return DEMO_VENDORS;     
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
        // Try to find in demo data
        const demoVendor = DEMO_VENDORS.find(v => v.vdCode === vdCode);
        return demoVendor || null;
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
      // Fallback to demo data
      const demoVendor = DEMO_VENDORS.find(v => v.vdCode === vdCode);
      return demoVendor || null;
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
   * Get all assessment summaries from Firestore with fallback
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

      if (summaries.length > 0) {
        cacheService.set(cacheKey, summaries, CACHE_DURATIONS.SUMMARIES);
        return summaries;
      } else {
        console.log('📊 No assessment summaries found, using demo data');
        cacheService.set(cacheKey, DEMO_SUMMARIES, 5);
        return DEMO_SUMMARIES;
      }

    } catch (error) {
      console.error('Error fetching assessment summaries:', error);
      return DEMO_SUMMARIES;
    }
  },

  /**
   * Get summary by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessmentSummary | null> {
    if (!isValidString(vdCode)) {
      return null;
    }

    try {
      const summaries = await this.getAll();
      return summaries.find(s => s.vdCode === vdCode) || null;
    } catch (error) {
      console.error('Error fetching summary by vdCode:', error);
      return null;
    }
  }
};

// =================== FORMS SERVICE ===================
export const formsService = {
  /**
   * Get CSM assessment form
   */
  async getCSMChecklist(): Promise<CSMFormDoc | null> {
    const cacheKey = 'csm-form-checklist';
    const cached = cacheService.get<CSMFormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_FORMS),
          where('formName', '==', 'CSMChecklist'),
          where('isActive', '==', true),
          limit(1)
        )
      );

      if (querySnapshot.empty) {
        console.log('No CSM form found, creating demo form');
        return formsService.createDemoForm();
      }

      const doc = querySnapshot.docs[0];
      const formDoc = { id: doc.id, ...doc.data() } as CSMFormDoc;
      
      cacheService.set(cacheKey, formDoc, CACHE_DURATIONS.FORMS);
      return formDoc;
      
    } catch (error) {
      console.error('Error fetching CSM form:', error);
      return formsService.createDemoForm();
    }
  },

  async getAll(): Promise<CSMFormDoc[]> {
    const cacheKey = 'csm-forms-all';
    const cached = cacheService.get<CSMFormDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      //console.log('🔍 Fetching all CSM forms from Firestore...');      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_FORMS),
          where('isActive', '==', true),
          orderBy('formTitle', 'asc')
        )
      );

      const forms: CSMFormDoc[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMFormDoc));

      //console.log(`✅ Loaded ${forms.length} forms from Firestore`);
      cacheService.set(cacheKey, forms, CACHE_DURATIONS.FORMS);
      
      return forms;
    } catch (error) {
      console.error('❌ Error fetching forms:', error);
      // Return demo form as fallback
      return [formsService.createDemoForm()];
    }
  },

  // เพิ่ม delete method ที่หายไป
  async delete(formId: string): Promise<void> {
    if (!isValidString(formId)) {
      throw new Error('Invalid form ID');
    }

    try {
      console.log('🗑️ Deleting form:', formId);
      
      await deleteDoc(doc(db, COLLECTIONS.CSM_FORMS, formId));
      
      // Clear cache
      cacheService.delete('csm-forms-all');
      cacheService.delete('csm-form-checklist');
      
      console.log('✅ Form deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting form:', error);
      throw new Error('Failed to delete form');
    }
  },  
  /**
   * Create a demo CSM form for fallback
   */
  createDemoForm(): CSMFormDoc {
    return {
      id: 'demo-form-1',
      formCode: 'CSMChecklist',
      formTitle: 'formTitlexxxxxxxxxxx',
      formDescription: 'formDescriptionxxxxxxxxxxxx',
      applicableTo: ["csm"],
      createdBy: 'tsseeee',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [
        {
          id: 'q1',
          ckItem: 'ตัวอย่างคำถามที่ 1',
          type: 'score',
          ckQuestion: '<คำถามที่ 1>',
          ckType: '',
          ckRequirement: '',
          fScore:'5'
        },
        {
          id: 'q2',
          ckItem: 'ตัวอย่างคำถามที่ 2',
          type: 'score',
          ckQuestion: '<คำถามที่ 2>',
          ckType: '',
          ckRequirement: '',
          fScore:'2'
        }
      ],




    };
  }
};

// =================== ASSESSMENTS SERVICE ===================
export const assessmentsService = {
  /**
   * Get assessments by vendor code
   */
  async getByVdCode(vdCode: string): Promise<CSMAssessment[]> {
    if (!isValidString(vdCode)) {
      return [];
    }

    const cacheKey = `csm-assessments-${vdCode}`;
    const cached = cacheService.get<CSMAssessment[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 Fetching assessments for vendor:', vdCode);
      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          where('vdCode', '==', vdCode),
          orderBy('createdAt', 'desc')
        )
      );

      const assessments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
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
        
        return assessment;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching assessment by ID:', error);
      return null;
    }
  },

  async delete(assessmentId: string): Promise<void> {
    if (!isValidString(assessmentId)) {
      throw new Error('Invalid assessment ID');
    }

    try {
      console.log('🗑️ Deleting assessment:', assessmentId);
      
      await deleteDoc(doc(db, COLLECTIONS.CSM_ASSESSMENTS, assessmentId));
      
      // Clear related caches
      cacheService.clear(); // Clear all caches as we don't know which vendor this belongs to
      
      console.log('✅ Assessment deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting assessment:', error);
      throw new Error('Failed to delete assessment');
    }
  },

  //  เพิ่ม getAll method (ถ้าต้องการ)
  async getAll(): Promise<CSMAssessment[]> {
    const cacheKey = 'csm-assessments-all';
    const cached = cacheService.get<CSMAssessment[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 Fetching all assessments from Firestore...');
      
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.CSM_ASSESSMENTS),
          orderBy('createdAt', 'desc')
        )
      );

      const assessments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertToDate(data.createdAt),
          updatedAt: convertToDate(data.updatedAt),
          finishedAt: data.finishedAt ? convertToDate(data.finishedAt) : undefined
        } as CSMAssessment;
      });

      console.log(`✅ Loaded ${assessments.length} assessments from Firestore`);
      cacheService.set(cacheKey, assessments, CACHE_DURATIONS.ASSESSMENTS);
      
      return assessments;
    } catch (error) {
      console.error('❌ Error fetching all assessments:', error);
      return [];
    }
  }

};

// =================== ASSESSMENT UTILITIES ===================
const calculateAssessmentScore = (answers: CSMAssessmentAnswer[]): {
  totalScore: number;
  maxScore: number;
  avgScore: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
} => {
  if (answers.length === 0) {
    return { totalScore: 0, maxScore: 0, avgScore: 0, riskLevel: 'High' };
  }

  const totalScore = answers.reduce((sum, answer) => {
    const score = parseInt(answer.score || '') || 0;
    return sum + score;
  }, 0);

  const maxScore = answers.length * 5; // Assuming max score per question is 5
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

      // Check demo companies first
      const demoCompany = DEMO_COMPANIES.find(c => c.companyId === vendor.companyId);
      if (demoCompany) {
        return demoCompany;
      }

      // Then get company by ID from Firestore
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
  },

  /**
   * Get all companies
   */
  async getAll(): Promise<Company[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.COMPANIES));
      
      if (querySnapshot.empty) {
        console.log('No companies found in Firestore, using demo data');
        return DEMO_COMPANIES;
      }

      const companies = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          companyId: data.code || data.companyId,
          name: data.name || '',
          type: data.type || '',
          code: data.code || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          isActive: data.isActive !== false,
          createdAt: data.createdAt ? convertToDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? convertToDate(data.updatedAt) : new Date(),
          lastUpdatedBy: data.lastUpdatedBy || '',
          workingArea: Array.isArray(data.workingArea) ? data.workingArea : []
        } as Company;
      });

      return companies;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return DEMO_COMPANIES;
    }
  }
};

// =================== EXPORT DEFAULT SERVICE ===================
export const csmService = {
  vendors: vendorsService,
  assessmentSummaries: assessmentSummariesService,
  forms: formsService,
  assessments: assessmentsService,
  companies: companiesService,
  utils: {
    calculateAssessmentScore
  }
};

//  Keep default export for backward compatibility
export default csmService;

