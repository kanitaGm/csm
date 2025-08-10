// src/services/formService.ts

import {
  collection, doc, getDocs, getDoc, updateDoc,
  query, where, orderBy, limit, writeBatch,
  serverTimestamp, Query, } from 'firebase/firestore';   
import type {DocumentData} from 'firebase/firestore';   
import { db } from '../config/firebase';
import type {FormDoc, FormQueryOptions, FormSubmission,FormServiceConfig} from '../types';

// =================== CONFIGURATION ===================
const DEFAULT_CONFIG: FormServiceConfig = {
  cacheTimeout: 300000, // 5 minutes
  batchSize: 10,
  retryAttempts: 3,
  enableOffline: true,
  apiTimeout: 30000, // 30 seconds (เพิ่ม)
  enableDebug: false, // เพิ่ม
  maxCacheSize: 100, // เพิ่ม
  compressionEnabled: false // เพิ่ม
};

// =================== CACHE MANAGEMENT ===================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheManager {
  cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttl: number = DEFAULT_CONFIG.cacheTimeout): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// =================== ERROR HANDLING ===================
export class FormServiceError extends Error {
  public code: string;
  public details?: unknown;
  constructor(
    message: string,
    code: string, // แก้ไข: ลบ public ออกจาก parameter
    details?: unknown
  ) {
    super(message);
    this.name = 'FormServiceError';
    this.code = code;
    this.details = details;
  }
}

// =================== RETRY MECHANISM ===================
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = DEFAULT_CONFIG.retryAttempts
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        throw new FormServiceError(
          `Operation failed after ${maxAttempts} attempts`,
          'RETRY_EXHAUSTED',
          lastError
        );
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// =================== FORM SERVICE CLASS ===================
class FormService {
  private cache = new CacheManager();
  private config: FormServiceConfig = DEFAULT_CONFIG;
  
  constructor(config?: Partial<FormServiceConfig>) {
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
    
    // Cleanup cache every 10 minutes
    setInterval(() => this.cache.cleanup(), 10 * 60 * 1000);
  }

  // =================== BASIC CRUD OPERATIONS ===================
  
  async getAllForms(options: FormQueryOptions = {}): Promise<readonly FormDoc[]> {
    const cacheKey = `forms_all_${JSON.stringify(options)}`;
    const cached = this.cache.get<readonly FormDoc[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return withRetry(async () => {
      try {
        //let q = collection(db, 'forms');
        let q: Query<DocumentData> = collection(db, 'forms');
        
        // Apply filters
        if (options.filters) {
          if (options.filters.status && options.filters.status !== 'all') {
            q = query(q, where('status', '==', options.filters.status));
          }
          
          if (options.filters.category && options.filters.category !== 'all') {
            q = query(q, where('category', '==', options.filters.category));
          }
          
          if (options.filters.applicableTo && options.filters.applicableTo !== 'all') {
            q = query(q, where('applicableTo', 'array-contains', options.filters.applicableTo));
          }
        }

        // Apply sorting
        if (options.sortBy) {
          const direction = options.sortOrder === 'desc' ? 'desc' : 'asc';
          q = query(q, orderBy(options.sortBy, direction));
        } else {
          q = query(q, orderBy('updatedAt', 'desc'));
        }

        // Apply pagination
        if (options.limit) {
          q = query(q, limit(options.limit));
        }

        const snapshot = await getDocs(q);
        const forms = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FormDoc[];

        // Filter archived forms unless specifically requested
        const filteredForms = options.includeArchived 
          ? forms 
          : forms.filter(form => form.status !== 'archived');

        const result = Object.freeze(filteredForms) as readonly FormDoc[];
        this.cache.set(cacheKey, result);
        return result;
        
      } catch (error) {
        throw new FormServiceError(
          'Failed to fetch forms',
          'FETCH_ERROR',
          error
        );
      }
    });
  }

  async getFormById(id: string, includeAnalytics: boolean = true): Promise<FormDoc | null> {
    const cacheKey = `form_${id}_${includeAnalytics}`;
    const cached = this.cache.get<FormDoc>(cacheKey);
    
    if (cached) {
      return cached;
    }

    return withRetry(async () => {
      try {
        const docRef = doc(db, 'forms', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          return null;
        }

        let form = {
          id: docSnap.id,
          ...docSnap.data()
        } as FormDoc;

        // Fetch analytics if requested
        if (includeAnalytics && !form.analytics) {
          try {
            const analyticsRef = doc(db, 'form_analytics', id);
            const analyticsSnap = await getDoc(analyticsRef);
            
            if (analyticsSnap.exists()) {
              form = {
                ...form,
                analytics: analyticsSnap.data()
              } as FormDoc;
            }
          } catch (analyticsError) {
            console.warn('Failed to fetch analytics for form', id, analyticsError);
          }
        }

        this.cache.set(cacheKey, form);
        return form;
        
      } catch (error) {
        throw new FormServiceError(
          `Failed to fetch form ${id}`,
          'FETCH_ERROR',
          error
        );
      }
    });
  }

  async createForm(formData: Omit<FormDoc, 'id'>): Promise<FormDoc> {
    return withRetry(async () => {
      try {
        const batch = writeBatch(db);
        
        // Prepare form data
        const now = serverTimestamp();
        const newFormData = {
          ...formData,
          createdAt: now,
          updatedAt: now,
          version: formData.version || '1.0',
          status: formData.status || 'draft',
          settings: {
            allowMultipleSubmissions: false,
            requireAuthentication: true,
            enableNotifications: true,
            showProgressBar: true,
            ...formData.settings
          }
        };

        // Create form document
        const formRef = doc(collection(db, 'forms'));
        batch.set(formRef, newFormData);

        // Initialize analytics
        if (formData.settings?.enableAnalytics !== false) {
          const analyticsRef = doc(db, 'form_analytics', formRef.id);
          batch.set(analyticsRef, {
            viewCount: 0,
            submitCount: 0,
            draftCount: 0,
            abandonmentCount: 0,
            conversionRate: 0,
            lastCalculated: now
          });
        }

        await batch.commit();
        
        const createdForm = {
          id: formRef.id,
          ...newFormData
        } as FormDoc;

        // Clear cache
        this.cache.clear();
        
        return createdForm;
        
      } catch (error) {
        throw new FormServiceError(
          'Failed to create form',
          'CREATE_ERROR',
          error
        );
      }
    });
  }

  async updateForm(id: string, updates: Partial<FormDoc>): Promise<void> {
    return withRetry(async () => {
      try {
        const docRef = doc(db, 'forms', id);
        
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp(),
          lastModifiedBy: updates.lastModifiedBy || updates.createdBy
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key as keyof typeof updateData] === undefined) {
            delete updateData[key as keyof typeof updateData];
          }
        });

        await updateDoc(docRef, updateData);
        
        // Clear related cache entries
        this.cache.delete(`form_${id}_true`);
        this.cache.delete(`form_${id}_false`);
        this.cache.clear(); // Clear all forms cache
        
      } catch (error) {
        throw new FormServiceError(
          `Failed to update form ${id}`,
          'UPDATE_ERROR',
          error
        );
      }
    });
  }

  async deleteForm(id: string): Promise<void> {
    return withRetry(async () => {
      try {
        const batch = writeBatch(db);
        
        // Delete form
        const formRef = doc(db, 'forms', id);
        batch.delete(formRef);
        
        // Delete analytics
        const analyticsRef = doc(db, 'form_analytics', id);
        batch.delete(analyticsRef);
        
        // Delete submissions
        const submissionsQuery = query(
          collection(db, 'form_submissions'),
          where('formId', '==', id)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        submissionsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        
        // Clear cache
        this.cache.clear();
        
      } catch (error) {
        throw new FormServiceError(
          `Failed to delete form ${id}`,
          'DELETE_ERROR',
          error
        );
      }
    });
  }

  // =================== ADVANCED OPERATIONS ===================
  
  async duplicateForm(id: string, newTitle?: string): Promise<FormDoc> {
    const originalForm = await this.getFormById(id, false);
    
    if (!originalForm) {
      throw new FormServiceError(
        `Form ${id} not found`,
        'NOT_FOUND'
      );
    }

    const duplicatedData: Omit<FormDoc, 'id'> = {
      ...originalForm,
      formTitle: newTitle || `${originalForm.formTitle} (Copy)`,
      formCode: `${originalForm.formCode}_COPY_${Date.now()}`,
      status: 'draft',
      isActive: false,
      parentFormId: id,
      version: '1.0'
    };

    // Remove analytics and timestamps
    delete (duplicatedData as Partial<FormDoc>).analytics;
    delete (duplicatedData as Partial<FormDoc>).publishedAt;
    delete (duplicatedData as Partial<FormDoc>).publishedBy;

    return this.createForm(duplicatedData);
  }

  async archiveForm(id: string): Promise<void> {
    await this.updateForm(id, {
      status: 'archived',
      isActive: false,
      archivedAt: new Date(),
      archivedBy: 'system' // Should be replaced with actual user
    });
  }

  async publishForm(id: string, publishedBy: string): Promise<void> {
    await this.updateForm(id, {
      status: 'published',
      isActive: true,
      publishedAt: new Date(),
      publishedBy
    });
  }

  // =================== BULK OPERATIONS ===================
  
  async bulkUpdateForms(
    formIds: readonly string[], 
    updates: Partial<FormDoc>
  ): Promise<void> {
    return withRetry(async () => {
      try {
        const batch = writeBatch(db);
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp()
        };

        formIds.forEach(id => {
          const docRef = doc(db, 'forms', id);
          batch.update(docRef, updateData);
        });

        await batch.commit();
        this.cache.clear();
        
      } catch (error) {
        throw new FormServiceError(
          'Failed to bulk update forms',
          'BULK_UPDATE_ERROR',
          error
        );
      }
    });
  }

  async bulkDeleteForms(formIds: readonly string[]): Promise<void> {
    return withRetry(async () => {
      try {
        // Process in batches to avoid Firestore limits
        const batches: string[][] = [];
        for (let i = 0; i < formIds.length; i += this.config.batchSize) {
          batches.push(formIds.slice(i, i + this.config.batchSize) as string[]);
        }

        for (const batch of batches) {
          await Promise.all(batch.map(id => this.deleteForm(id)));
        }
        
      } catch (error) {
        throw new FormServiceError(
          'Failed to bulk delete forms',
          'BULK_DELETE_ERROR',
          error
        );
      }
    });
  }

  // =================== SUBMISSIONS ===================
  
  async getFormSubmissions(formId: string): Promise<readonly FormSubmission[]> {
    return withRetry(async () => {
      try {
        const q = query(
          collection(db, 'form_submissions'),
          where('formId', '==', formId),
          orderBy('submittedAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        return Object.freeze(
          snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        ) as readonly FormSubmission[];
        
      } catch (error) {
        throw new FormServiceError(
          `Failed to fetch submissions for form ${formId}`,
          'FETCH_SUBMISSIONS_ERROR',
          error
        );
      }
    });
  }

  // =================== ANALYTICS ===================
  
  async updateFormAnalytics(formId: string): Promise<void> {
    return withRetry(async () => {
      try {
        const submissions = await this.getFormSubmissions(formId);
        const form = await this.getFormById(formId, false);
        
        if (!form) return;

        const analytics = {
          viewCount: (form.analytics?.viewCount || 0) + 1,
          submitCount: submissions.length,
          draftCount: submissions.filter(s => s.status === 'draft').length,
          abandonmentCount: 0, // Calculate based on your logic
          conversionRate: submissions.length > 0 ? (submissions.length / Math.max(1, form.analytics?.viewCount || 1)) * 100 : 0,
          lastCalculated: serverTimestamp()
        };

        const analyticsRef = doc(db, 'form_analytics', formId);
        await updateDoc(analyticsRef, analytics);
        
        // Clear cache
        this.cache.delete(`form_${formId}_true`);
        
      } catch (error) {
        throw new FormServiceError(
          `Failed to update analytics for form ${formId}`,
          'ANALYTICS_ERROR',
          error
        );
      }
    });
  }

  // =================== SEARCH ===================
  
  async searchForms(searchTerm: string): Promise<readonly FormDoc[]> {
    const allForms = await this.getAllForms();
    const searchLower = searchTerm.toLowerCase();
    
    return allForms.filter(form => 
      form.formTitle.toLowerCase().includes(searchLower) ||
      form.formCode.toLowerCase().includes(searchLower) ||
      form.formDescription?.toLowerCase().includes(searchLower) ||
      form.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // =================== CACHE MANAGEMENT ===================
  
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: readonly string[] } {
    return {
      size: this.cache['cache'].size,
      keys: Object.freeze(Array.from(this.cache['cache'].keys()))
    };
  }
}

// =================== EXPORTS ===================
export const formService = new FormService();
export default formService;