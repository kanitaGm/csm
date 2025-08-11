// ===================================================================
// 📁 src/services/csmVendorService.ts - แก้ไข errors
// ===================================================================
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, query, 
  where, orderBy, writeBatch,Timestamp  } from 'firebase/firestore';
import { db } from '../config/firebase';
import { cacheService } from './cacheService';
import type { CSMVendor, Company, CSMAssessment } from '../types';
import {  getFrequencyInfo, getCategoryInfo  } from '../types/csm'; //  เพิ่ม import


// ===================================================================
// Helper function สำหรับจัดการ date conversion
// ===================================================================
const convertFirestoreDateToDate = (firestoreDate: Timestamp | Date | string | undefined): Date => {
  if (!firestoreDate) {
    return new Date(); // Default to current date
  }

  if (firestoreDate instanceof Date) {
    return firestoreDate;
  }

  if (typeof firestoreDate === 'string') {
    return new Date(firestoreDate);
  }

  if (firestoreDate instanceof Timestamp) {
    return firestoreDate.toDate();
  }

  // Handle legacy timestamp objects
  if (typeof firestoreDate === 'object' && 'toDate' in firestoreDate) {
    return (firestoreDate as { toDate(): Date }).toDate();
  }

  // Final fallback
  return new Date();
};

export const csmVendorService = {
  // =============== CRUD Operations ===============
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
      
      const vendors = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMVendor));

      cacheService.set(cacheKey, vendors, 15);
      return vendors;
    } catch (error) {
      console.error('Error fetching CSM vendors:', error);
      throw error;
    }
  },

  //  Get vendor with company information
  async getVendorWithCompany(vdCode: string): Promise<{
    vendor: CSMVendor;
    company: Company;
  } | null> {
    try {
      const vendor = await this.getByVdCode(vdCode);
      if (!vendor) return null;

      // Get company information
      const companyDoc = await getDoc(doc(db, 'companies', vendor.companyId));
      if (!companyDoc.exists()) return null;

      const company = { 
        companyId: companyDoc.id, 
        ...companyDoc.data() 
      } as Company;

      return { vendor, company };
    } catch (error) {
      console.error('Error fetching vendor with company:', error);
      throw error;
    }
  },

  async getByVdCode(vdCode: string): Promise<CSMVendor | null> {
    const cacheKey = `csm-vendor-${vdCode}`;
    const cached = cacheService.get<CSMVendor>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const q = query(
        collection(db, 'csmVendors'),
        where('vdCode', '==', vdCode),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const vendor = { id: doc.id, ...doc.data() } as CSMVendor;
      
      cacheService.set(cacheKey, vendor, 30);
      return vendor;
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
      const q = query(
        collection(db, 'csmVendors'),
        where('companyId', '==', companyId),
        where('isActive', '==', true),
        orderBy('vdName', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
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

  //  Get vendors by category and frequency
  async getVendorsByFrequency(frequency: string): Promise<CSMVendor[]> {
    try {
      const vendors = await this.getAll();
      return vendors.filter(vendor => vendor.freqAss === frequency);
    } catch (error) {
      console.error('Error fetching vendors by frequency:', error);
      throw error;
    }
  },

  //  แก้ไข getVendorsNeedingAssessment - ปรับปรุง type และ logic
  async getVendorsNeedingAssessment(): Promise<CSMVendor[]> {
    try {
      const vendors = await this.getAll();
      const currentDate = new Date();
      const needingAssessment: CSMVendor[] = [];

      for (const vendor of vendors) {
        // Get last assessment date
        const assessments = await this.getAssessmentHistory(vendor.vdCode);
        const lastAssessment = assessments[0]; // Most recent

        if (!lastAssessment) {
          // Never assessed
          needingAssessment.push(vendor);
          continue;
        }

        // Check if assessment is due based on frequency
        const frequencyInfo = getFrequencyInfo(vendor.freqAss); //  ใช้ imported function
        if (!frequencyInfo) continue;

        //  แก้ไข: ใช้ helper function แทน manual type handling
        const assessmentData = lastAssessment as CSMAssessment;
        const lastAssessmentDate = convertFirestoreDateToDate(assessmentData.createdAt);

        const monthsSinceLastAssessment = Math.floor(
          (currentDate.getTime() - lastAssessmentDate.getTime()) / 
          (1000 * 60 * 60 * 24 * 30)
        );

        if (monthsSinceLastAssessment >= frequencyInfo.months) {
          needingAssessment.push(vendor);
        }
      }

      return needingAssessment;
    } catch (error) {
      console.error('Error getting vendors needing assessment:', error);
      throw error;
    }
  },

  //  แก้ไข getAssessmentHistory - ปรับปรุง return type
  async getAssessmentHistory(vdCode: string): Promise<CSMAssessment[]> {
    try {
      const assessmentsSnapshot = await getDocs(
        query(
          collection(db, 'csmAssessments'),
          where('vdCode', '==', vdCode),
          orderBy('createdAt', 'desc')
        )
      );
      
      return assessmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CSMAssessment)); //  Cast เป็น CSMAssessment แทน generic object
    } catch (error) {
      console.error('Error fetching assessment history:', error);
      return [];
    }
  },

  async create(vendorData: Omit<CSMVendor, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'csmVendors'), {
        ...vendorData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      this.clearCache();
      return docRef.id;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  },

  async update(id: string, vendorData: Partial<CSMVendor>): Promise<void> {
    try {
      await updateDoc(doc(db, 'csmVendors', id), {
        ...vendorData,
        updatedAt: new Date()
      });
      
      this.clearCache();
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      // Soft delete - set isActive to false
      await updateDoc(doc(db, 'csmVendors', id), {
        isActive: false,
        updatedAt: new Date()
      });
      
      this.clearCache();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw error;
    }
  },

  // =============== Utility Methods ===============
  async getVendorsByCategory(category: string): Promise<CSMVendor[]> {
    try {
      const vendors = await this.getAll();
      return vendors.filter(vendor => vendor.category === category);
    } catch (error) {
      console.error('Error fetching vendors by category:', error);
      throw error;
    }
  },

  clearCache(): void {
    cacheService.clear();
  },

  // =============== Migration Helper ===============
  async migrateFromCompanies(): Promise<void> {
    try {
      console.log('Starting migration from companies to csmVendors...');
      
      // Get existing companies with type 'csm'
      const companiesSnapshot = await getDocs(
        query(
          collection(db, 'companies'),
          where('type', '==', 'csm')
        )
      );

      const batch = writeBatch(db);
      let migratedCount = 0;

      for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data();
        
        // สร้าง CSMVendor record ใหม่
        const csmVendorRef = doc(collection(db, 'csmVendors'));
        const csmVendorData: Omit<CSMVendor, 'id'> = {
          companyId: companyDoc.id,
          vdCode: companyData.vdCode || `VD${companyDoc.id.substring(0, 6).toUpperCase()}`,
          vdName: companyData.name || 'Unknown',
          freqAss: this.getCategoryFrequency(companyData.category || 'admin'), //  แก้ไข category default
          isActive: companyData.isActive !== false,
          category: companyData.category || 'admin', //  แก้ไข category default
          workingArea: companyData.workingArea || [],
          createdAt: companyData.createdAt || new Date(),
          updatedAt: new Date()
        };

        batch.set(csmVendorRef, csmVendorData);
        migratedCount++;
      }

      await batch.commit();
      console.log(`Migration completed: ${migratedCount} vendors migrated`);
      
      this.clearCache();
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  },

  //  แก้ไข private method
  getCategoryFrequency(category: string): string {
    const categoryInfo = getCategoryInfo(category); //  ใช้ imported function
    return categoryInfo?.defaultFrequency || '1year';
  }
};