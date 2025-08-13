// 📁 src/services/enhancedCSMFormsService.ts - Fixed ESLint Errors
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  doc,
  getDoc,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CSMFormDoc, CSMFormField } from '../types';

// =================== CONSTANTS ===================
const FORMS_COLLECTION = 'forms';
const CACHE_DURATION = 300; // 5 minutes
const CSM_FORM_CODES = ['CSMChecklist', 'CSM_Assessment', 'CSM_Evaluation'];

// =================== TYPES ===================
interface FormQueryOptions {
  includeInactive?: boolean;
  formCodes?: string[];
  applicableTo?: string[];
}

// =================== SIMPLE CACHE ===================
const simpleCache = new Map<string, { data: unknown; expiry: number }>();

const cacheGet = <T>(key: string): T | null => {
  const item = simpleCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  simpleCache.delete(key);
  return null;
};

const cacheSet = <T>(key: string, data: T, ttlSeconds: number): void => {
  const expiry = Date.now() + (ttlSeconds * 1000);
  simpleCache.set(key, { data, expiry });
};

const cacheDelete = (key: string): void => {
  simpleCache.delete(key);
};

const cacheClearPattern = (pattern: RegExp): void => {
  const keysToDelete = Array.from(simpleCache.keys()).filter(key => pattern.test(key));
  keysToDelete.forEach(key => simpleCache.delete(key));
};

// =================== ENHANCED CSM FORMS SERVICE ===================
export class EnhancedCSMFormsService {
  private readonly collectionName = FORMS_COLLECTION;
  private readonly cacheDuration = CACHE_DURATION;

  /**
   * Get all forms with optional filtering
   */
  async getAllForms(options: FormQueryOptions = {}): Promise<CSMFormDoc[]> {
    const cacheKey = `forms-all-${JSON.stringify(options)}`;
    const cached = cacheGet<CSMFormDoc[]>(cacheKey);
    
    if (cached) {
      console.log('✅ Found forms in cache:', cached.length);
      return cached;
    }

    try {
      console.log('🔍 Querying forms from Firestore...');
      
      // Build base query
      const queryRef = collection(db, this.collectionName);
      const constraints: QueryConstraint[] = [];

      // Add active filter unless including inactive
      if (!options.includeInactive) {
        constraints.push(where('isActive', '==', true));
      }

      // Add form codes filter
      if (options.formCodes && options.formCodes.length > 0) {
        constraints.push(where('formCode', 'in', options.formCodes));
      }

      // Add applicable to filter
      if (options.applicableTo && options.applicableTo.length > 0) {
        constraints.push(where('applicableTo', 'array-contains-any', options.applicableTo));
      }

      // Add ordering
      constraints.push(orderBy('updatedAt', 'desc'));

      const q = query(queryRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      const forms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMFormDoc));

      console.log('📋 Found forms:', forms.length);
      
      // Filter and sort results
      const filteredForms = forms.filter(() => {
        // Additional filtering if needed
        return true;
      }).sort((a, b) => {
        // Sort by updated date descending
        const aDate = a.updatedAt ? new Date(a.updatedAt as string) : new Date(0);
        const bDate = b.updatedAt ? new Date(b.updatedAt as string) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      
      // Validate form structure
      const validForms = filteredForms.filter((form) => this.validateFormStructure(form));
      
      if (validForms.length !== filteredForms.length) {
        console.warn(`⚠️ ${filteredForms.length - validForms.length} forms failed validation`);
      }

      cacheSet(cacheKey, validForms, this.cacheDuration);
      return validForms;
      
    } catch (error) {
      console.error('Error fetching forms:', error);
      console.log('🔄 Returning empty array due to error');
      return [];
    }
  }

  /**
   * Get CSM checklist form specifically
   */
  async getCSMChecklist(): Promise<CSMFormDoc | null> {
    const cacheKey = 'csm-checklist-form';
    const cached = cacheGet<CSMFormDoc>(cacheKey);
    
    if (cached) {
      console.log('✅ Found CSM checklist in cache');
      return cached;
    }

    try {
      console.log('🔍 Looking for CSM checklist in forms collection...');
      
      // Try exact match first with simple queries
      for (const formCode of CSM_FORM_CODES) {
        try {
          const forms = await this.getFormsByCode(formCode);
          if (forms.length > 0) {
            const form = forms[0];
            console.log(`✅ Found CSM form with code "${formCode}":`, form.formTitle || form.formCode);
            cacheSet(cacheKey, form, this.cacheDuration);
            return form;
          }
        } catch (formError) {
          console.log(`⚠️ Could not find form with code ${formCode}, trying next...`, formError);
          continue;
        }
      }

      // Try broader search with simple query
      try {
        const allForms = await this.getAllForms();
        
        // Look for CSM-related forms
        const csmForm = allForms.find(form => 
          form.applicableTo?.includes('csm') ||
          form.formCode?.toLowerCase().includes('csm') ||
          form.formTitle?.toLowerCase().includes('csm')
        );

        if (csmForm) {
          console.log('✅ Found CSM form by search:', csmForm.formTitle || csmForm.formCode);
          cacheSet(cacheKey, csmForm, this.cacheDuration);
          return csmForm;
        }
      } catch (searchError) {
        console.log('⚠️ Could not search all forms, will create mock form', searchError);
      }

      console.log('❌ No CSM form found, creating mock form for development');
      const mockForm = this.createMockCSMForm();
      cacheSet(cacheKey, mockForm, 60); // Cache for 1 minute only
      return mockForm;
      
    } catch (error) {
      console.error('Error fetching CSM checklist:', error);
      console.log('🔄 Creating mock form as fallback');
      return this.createMockCSMForm();
    }
  }

  /**
   * Get forms by code
   */
  async getFormsByCode(formCode: string): Promise<CSMFormDoc[]> {
    try {
      return await this.getAllForms({ 
        formCodes: [formCode],
        includeInactive: false 
      });
    } catch (error) {
      console.error(`Error fetching forms by code ${formCode}:`, error);
      return [];
    }
  }

  /**
   * Get form by ID
   */
  async getFormById(formId: string): Promise<CSMFormDoc | null> {
    const cacheKey = `form-${formId}`;
    const cached = cacheGet<CSMFormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const docSnap = await getDoc(doc(db, this.collectionName, formId));
      
      if (docSnap.exists()) {
        const form = {
          id: docSnap.id,
          ...docSnap.data()
        } as CSMFormDoc;
        
        if (this.validateFormStructure(form)) {
          cacheSet(cacheKey, form, this.cacheDuration);
          return form;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching form by ID:', error);
      return null;
    }
  }

  /**
   * Validate form structure
   */
  private validateFormStructure(form: unknown): form is CSMFormDoc {
    if (!form || typeof form !== 'object') {
      return false;
    }

    const formData = form as Record<string, unknown>;

    // Check required properties
    const requiredFields = ['formCode', 'formTitle', 'isActive'];
    for (const field of requiredFields) {
      if (!(field in formData)) {
        console.warn(`Form missing required field: ${field}`);
        return false;
      }
    }

    // Validate fields array
    if (formData.fields && Array.isArray(formData.fields)) {
      for (const field of formData.fields) {
        if (!this.validateFormField(field)) {
          console.warn('Form contains invalid field:', field);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate individual form field
   */
  private validateFormField(field: unknown): field is CSMFormField {
    if (!field || typeof field !== 'object') {
      return false;
    }

    const fieldData = field as Record<string, unknown>;

    const requiredFields = ['ckItem', 'ckQuestion'];
    for (const reqField of requiredFields) {
      if (!(reqField in fieldData) || !fieldData[reqField]) {
        console.warn(`Field missing required property: ${reqField}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Clear forms cache
   */
  clearCache(): void {
    console.log('🧹 Clearing forms cache...');
    cacheClearPattern(/^forms-/);
    cacheDelete('csm-checklist-form');
  }

  /**
   * Create mock CSM form for testing
   */
  createMockCSMForm(): CSMFormDoc {
    return {
      id: 'mock-csm-form',
      formCode: 'CSMChecklist',
      formTitle: 'CSM Assessment Checklist (Mock)',
      formDescription: 'Mock CSM assessment form for testing purposes',
      isActive: true,
      applicableTo: ['csm'],
      fields: [
        {
          ckItem: '1',
          ckType: 'M',
          ckQuestion: 'มีการจัดการด้านความปลอดภัยหรือไม่?',
          ckRequirement: 'ต้องมีระบบจัดการความปลอดภัยที่ครอบคลุม',
          fScore: '5',
          tScore: '5',
          type: 'text'
        },
        {
          ckItem: '2',
          ckType: 'M',
          ckQuestion: 'มีการฝึกอบรมพนักงานหรือไม่?',
          ckRequirement: 'ควรมีการฝึกอบรมอย่างสม่ำเสมอและมีหลักฐาน',
          fScore: '5',
          tScore: '5',
          type: 'text'
        },
        {
          ckItem: '3',
          ckType: 'P',
          ckQuestion: 'มีใบรับรองมาตรฐานที่เกี่ยวข้องหรือไม่?',
          ckRequirement: 'ควรมีใบรับรองมาตรฐานที่เกี่ยวข้อง',
          fScore: '3',
          tScore: '3',
          type: 'text'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }
}

// =================== CREATE SERVICE INSTANCE ===================
export const enhancedCSMFormsService = new EnhancedCSMFormsService();

// =================== EXPORT FOR COMPATIBILITY ===================
export default enhancedCSMFormsService;